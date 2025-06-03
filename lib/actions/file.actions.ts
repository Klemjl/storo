"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";

type FileTypeKey = "image" | "document" | "video" | "audio" | "other";

interface TotalSpaceRecord {
  size: number;
  latestDate: string;
}

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error;
};

export const uploadFile = async ({
  file,
  ownerId,
  accountId,
  path,
}: {
  file: File;
  ownerId: string;
  accountId: string;
  path: string;
}) => {
  const { storage, databases } = await createAdminClient();

  try {
    // 1) Конвертуємо браузерний File в ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // 2) Створюємо Node.js Buffer із цього ArrayBuffer
    // @ts-ignore
    const buffer = Buffer.from(arrayBuffer);

    // 3) Пакуємо Buffer у InputFile, якого очікує Appwrite SDK
    const inputFile = InputFile.fromBuffer(buffer, file.name);

    // 4) Завантажуємо у Appwrite Storage
    const bucketFile = await storage.createFile(
      appwriteConfig.bucketId,
      ID.unique(),
      inputFile,
    );

    // 5) Формуємо документ у базі даних
    const fileTypeInfo = getFileType(bucketFile.name);
    const fileDocument = {
      type: fileTypeInfo.type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: fileTypeInfo.extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId,
      users: [] as string[],
      bucketFileId: bucketFile.$id,
    };

    // 6) Створюємо запис у колекції файлів
    const newFile = await databases
      .createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        ID.unique(),
        fileDocument,
      )
      .catch(async (error: unknown) => {
        // Якщо запис у БД не створився — видаляємо вже завантажений файл із бакета
        await storage.deleteFile(appwriteConfig.bucketId, bucketFile.$id);
        handleError(error, "Не вдалося створити запис про файл у базі даних");
      });

    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, "Помилка під час завантаження файлу");
  }
};

const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number,
) => {
  const queries = [
    Query.or([
      Query.equal("owner", [currentUser.$id]),
      Query.contains("users", [currentUser.email]),
    ]),
  ];

  if (types.length > 0) queries.push(Query.equal("type", types));
  if (searchText) queries.push(Query.contains("name", searchText));
  if (limit) queries.push(Query.limit(limit));

  if (sort) {
    const [sortBy, orderBy] = sort.split("-");
    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
    );
  }

  return queries;
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
}: {
  types?: string[];
  searchText?: string;
  sort?: string;
  limit?: number;
}) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Користувача не знайдено");

    const queries = createQueries(currentUser, types, searchText, sort, limit);
    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      queries,
    );

    console.log({ files });
    return parseStringify(files);
  } catch (error) {
    handleError(error, "Помилка під час отримання списку файлів");
  }
};

export const renameFile = async ({
  fileId,
  name,
  extension,
  path,
}: {
  fileId: string;
  name: string;
  extension: string;
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const newName = `${name}.${extension}`;
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        name: newName,
      },
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Помилка під час перейменування файлу");
  }
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: {
  fileId: string;
  emails: string[];
  path: string;
}) => {
  const { databases } = await createAdminClient();

  try {
    const updatedFile = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
      {
        users: emails,
      },
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Помилка під час оновлення списку користувачів файлу");
  }
};

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: {
  fileId: string;
  bucketFileId: string;
  path: string;
}) => {
  const { databases, storage } = await createAdminClient();

  try {
    const deletedFile = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      fileId,
    );

    if (deletedFile) {
      await storage.deleteFile(appwriteConfig.bucketId, bucketFileId);
    }

    revalidatePath(path);
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Помилка під час видалення файлу");
  }
};

export async function getTotalSpaceUsed() {
  try {
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("Користувач не автентифікований");

    const files = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      [Query.equal("owner", [currentUser.$id])],
    );

    const totalSpace: Record<FileTypeKey, TotalSpaceRecord> & {
      used: number;
      all: number;
    } = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach((file: any) => {
      const fileType = (
        ["image", "document", "video", "audio", "other"] as const
      ).includes(file.type)
        ? (file.type as FileTypeKey)
        : "other";

      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      const updatedAt = file.$updatedAt || "";
      if (
        !totalSpace[fileType].latestDate ||
        new Date(updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Помилка під час підрахунку використаного простору");
  }
}
