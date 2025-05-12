export const navItems = [
  {
    name: "Головна",
    icon: "/assets/icons/dashboard.svg",
    url: "/",
  },
  {
    name: "Документи",
    icon: "/assets/icons/documents.svg",
    url: "/documents",
  },
  {
    name: "Зображення",
    icon: "/assets/icons/images.svg",
    url: "/images",
  },
  {
    name: "Медіа",
    icon: "/assets/icons/video.svg",
    url: "/media",
  },
  {
    name: "Інше",
    icon: "/assets/icons/others.svg",
    url: "/others",
  },
];

export const actionsDropdownItems = [
  {
    label: "Перейменувати",
    icon: "/assets/icons/edit.svg",
    value: "rename",
  },
  {
    label: "Деталі",
    icon: "/assets/icons/info.svg",
    value: "details",
  },
  {
    label: "Поділитися",
    icon: "/assets/icons/share.svg",
    value: "share",
  },
  {
    label: "Завантажити",
    icon: "/assets/icons/download.svg",
    value: "download",
  },
  {
    label: "Видалити",
    icon: "/assets/icons/delete.svg",
    value: "delete",
  },
];

export const sortTypes = [
  {
    label: "Дата створення (спочатку новіші)",
    value: "$createdAt-desc",
  },
  {
    label: "Дата створення (спочатку старіші)",
    value: "$createdAt-asc",
  },
  {
    label: "Назва (А-Я)",
    value: "name-asc",
  },
  {
    label: "Назва (Я-А)",
    value: "name-desc",
  },
  {
    label: "Розмір (спочатку найбільші)",
    value: "size-desc",
  },
  {
    label: "Розмір (спочатку найменші)",
    value: "size-asc",
  },
];

export const avatarPlaceholderUrl =
  "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
