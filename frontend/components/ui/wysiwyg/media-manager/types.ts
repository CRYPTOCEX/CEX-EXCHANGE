export interface MediaFile {
  id: string;
  name: string;
  path: string;
  width?: number;
  height?: number;
  dateModified?: string;
  folder?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  count: number;
  children?: FolderItem[];
  expanded?: boolean;
}

export type MediaManagerMode = "modal" | "page";

export interface MediaManagerProps {
  // Mode: modal (in WYSIWYG) or page (standalone admin page)
  mode?: MediaManagerMode;
  // Modal-specific props
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (url: string, alt?: string) => void;
  // Common props
  uploadDir?: string;
  multiple?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  // User restriction - when true, only show user's own files (for non-admin contexts)
  userOnly?: boolean;
  // Page-specific props
  className?: string;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

export type ViewMode = "grid" | "list";
export type SortBy = "date" | "name" | "size";
export type SortOrder = "asc" | "desc";
