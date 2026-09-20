import type { MediaFile, FolderItem } from "./types";
import { toast } from "sonner";

// Virtual folders based on upload paths
export const getVirtualFolders = (files: MediaFile[]): FolderItem[] => {
  const folderMap = new Map<string, number>();

  files.forEach((file) => {
    // Extract folder from path: /uploads/editor/image.jpg -> editor
    const pathParts = file.path.split("/").filter(Boolean);
    if (pathParts.length > 2) {
      const folder = pathParts[1]; // First folder after 'uploads'
      folderMap.set(folder, (folderMap.get(folder) || 0) + 1);
    }
  });

  const folders: FolderItem[] = Array.from(folderMap.entries()).map(
    ([name, count]) => ({
      id: name,
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, " "),
      count,
    })
  );

  return folders.sort((a, b) => a.name.localeCompare(b.name));
};

// Get unique months from files
export const getDateFilters = (
  files: MediaFile[]
): { value: string; label: string }[] => {
  const months = new Set<string>();

  files.forEach((file) => {
    if (file.dateModified) {
      const date = new Date(file.dateModified);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.add(key);
    }
  });

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const [year, m] = month.split("-");
      const date = new Date(parseInt(year), parseInt(m) - 1);
      return {
        value: month,
        label: date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        }),
      };
    });
};

// Format file dimensions
export const formatDimensions = (width?: number, height?: number) => {
  if (!width || !height) return "Unknown";
  return `${width} × ${height}`;
};

// Format date
export const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format date with time
export const formatDateTime = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Copy URL to clipboard
export const copyUrl = (url: string) => {
  navigator.clipboard.writeText(url);
  toast.success("URL copied to clipboard");
};
