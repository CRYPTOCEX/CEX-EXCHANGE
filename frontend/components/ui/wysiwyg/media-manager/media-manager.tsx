"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  Check,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Trash2,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { imageUploader } from "@/utils/upload";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

import { MediaSidebar } from "./media-sidebar";
import { MediaToolbar } from "./media-toolbar";
import { MediaGrid } from "./media-grid";
import { MediaList } from "./media-list";
import { MediaDetailsPanel } from "./media-details-panel";
import { MediaPreviewView } from "./media-preview-view";
import { MediaUploadPanel } from "./media-upload-panel";
import { getVirtualFolders, getDateFilters } from "./utils";
import type {
  MediaFile,
  MediaManagerProps,
  PaginationState,
  ViewMode,
  SortBy,
  SortOrder,
} from "./types";

type ContentView = "library" | "upload" | "preview";

export function MediaManager({
  mode = "modal",
  isOpen = false,
  onClose,
  onSelect,
  uploadDir = "editor",
  onImageUpload,
  userOnly = false,
  className,
}: MediaManagerProps) {
  // State
  const [allFiles, setAllFiles] = useState<MediaFile[]>([]);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [detailsFile, setDetailsFile] = useState<MediaFile | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 50,
  });

  // Unified view system
  const [currentView, setCurrentView] = useState<ContentView>("library");
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if we're in insert mode (WYSIWYG editor)
  const isInsertMode = mode === "modal" && !!onSelect;

  // Computed values
  const folders = useMemo(() => getVirtualFolders(allFiles), [allFiles]);
  const dateFilters = useMemo(() => getDateFilters(allFiles), [allFiles]);

  // Fetch media files
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      // Use different API endpoint based on userOnly mode
      const apiUrl = userOnly ? "/api/user/media" : "/api/admin/content/media";
      const params: Record<string, string> = {
        page: "1",
        perPage: "200",
        sortField: "dateModified",
        sortOrder: "desc",
      };

      // For user-only mode, filter by the upload directory
      if (userOnly && uploadDir) {
        params.uploadDir = uploadDir;
      }

      const { data, error } = await $fetch({
        url: apiUrl,
        method: "GET",
        params,
        silent: true,
      });

      if (error) {
        toast.error("Failed to load media files");
        return;
      }

      setAllFiles(data.items || []);
      setPagination({
        currentPage: 1,
        totalPages: Math.ceil((data.items?.length || 0) / pagination.perPage),
        totalItems: data.items?.length || 0,
        perPage: pagination.perPage,
      });
    } catch (err) {
      console.error("Error fetching media:", err);
      toast.error("Failed to load media files");
    } finally {
      setLoading(false);
    }
  }, [pagination.perPage, userOnly, uploadDir]);

  // Filter and sort files
  useEffect(() => {
    let filtered = [...allFiles];

    // Filter by folder
    if (selectedFolder !== "all") {
      filtered = filtered.filter((file) => {
        const pathParts = file.path.split("/").filter(Boolean);
        return pathParts.length > 2 && pathParts[1] === selectedFolder;
      });
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((file) =>
        file.name.toLowerCase().includes(query)
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      filtered = filtered.filter((file) => {
        if (!file.dateModified) return false;
        const date = new Date(file.dateModified);
        const fileMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return fileMonth === dateFilter;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "size":
          comparison =
            (a.width || 0) * (a.height || 0) -
            (b.width || 0) * (b.height || 0);
          break;
        case "date":
        default:
          comparison =
            new Date(a.dateModified || 0).getTime() -
            new Date(b.dateModified || 0).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Paginate
    const start = (pagination.currentPage - 1) * pagination.perPage;
    const end = start + pagination.perPage;

    setPagination((prev) => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.perPage),
    }));

    setFiles(filtered.slice(start, end));
  }, [
    allFiles,
    searchQuery,
    dateFilter,
    selectedFolder,
    sortBy,
    sortOrder,
    pagination.currentPage,
    pagination.perPage,
  ]);

  // Load media on mount (page mode) or when opened (modal mode)
  useEffect(() => {
    if (mode === "page" || isOpen) {
      fetchMedia();
    }
  }, [mode, isOpen, fetchMedia]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const uploadFiles = Array.from(fileList);
      if (uploadFiles.length === 0) return;

      setUploading(true);
      let successCount = 0;

      for (const file of uploadFiles) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        try {
          if (onImageUpload) {
            await onImageUpload(file);
          } else {
            const response = await imageUploader({
              file,
              dir: uploadDir,
              size: { maxWidth: 1920, maxHeight: 1080 },
              oldPath: "",
            });

            if (!response.url) {
              throw new Error("Upload failed");
            }
          }
          successCount++;
        } catch (err) {
          console.error("Upload error:", err);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file(s)`);
        // Small delay to ensure backend has processed the upload
        await new Promise((resolve) => setTimeout(resolve, 500));
        await fetchMedia();
      }

      setUploading(false);
    },
    [uploadDir, onImageUpload, fetchMedia]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  // Handle clicking on image (for viewing/single select)
  const handleImageClick = (file: MediaFile) => {
    setDetailsFile(file);
    setDetailsPanelOpen(true);
  };

  // Handle checkbox toggle (for bulk selection)
  const toggleBulkSelection = (file: MediaFile, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(file.id)) {
        newSet.delete(file.id);
        if (newSet.size === 0) {
          setBulkSelectMode(false);
        }
      } else {
        newSet.add(file.id);
        if (!bulkSelectMode) {
          setBulkSelectMode(true);
        }
      }
      return newSet;
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const ids = Array.from(selectedFiles);
      const { error } = await $fetch({
        url: "/api/admin/content/media",
        method: "DELETE",
        body: { ids },
      });

      if (error) {
        toast.error("Failed to delete files");
        return;
      }

      toast.success(`Deleted ${ids.length} file(s)`);
      setSelectedFiles(new Set());
      setShowDeleteConfirm(false);
      setBulkSelectMode(false);
      setDetailsPanelOpen(false);
      await fetchMedia();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete files");
    }
  };

  // Handle insert selection (only in modal/insert mode)
  const handleInsert = () => {
    if (!isInsertMode || selectedFiles.size === 0 || !onSelect || !onClose) return;

    const selectedFile = files.find((f) => selectedFiles.has(f.id));
    if (selectedFile) {
      onSelect(selectedFile.path, selectedFile.name);
      onClose();
    }
  };

  // Select all visible files
  const selectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  };

  // Main content component (shared between modal and page modes)
  const MediaContent = (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-background">
        <div className="flex items-center gap-3">
          {mode === "page" && (
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              Media Library
            </h1>
            <p className="text-xs text-muted-foreground">
              {pagination.totalItems} files{" "}
              {selectedFolder !== "all" && `in ${selectedFolder}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentView("upload")}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Add New
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Upload View */}
        <AnimatePresence mode="wait">
          {currentView === "upload" && (
            <MediaUploadPanel
              onClose={() => setCurrentView("library")}
              onUpload={async (uploadedFiles) => {
                await handleFileUpload(uploadedFiles);
                setCurrentView("library");
              }}
              onInsertUrl={isInsertMode && onSelect && onClose ? (url, alt) => {
                onSelect(url, alt);
                onClose();
              } : undefined}
              uploading={uploading}
              showUrlTab={isInsertMode}
            />
          )}
        </AnimatePresence>

        {/* Preview View */}
        <AnimatePresence>
          {currentView === "preview" && previewFile && (
            <MediaPreviewView
              file={previewFile}
              onBack={() => {
                setCurrentView("library");
                setPreviewFile(null);
              }}
              onDelete={() => {
                setSelectedFiles(new Set([previewFile.id]));
                setShowDeleteConfirm(true);
                setCurrentView("library");
                setPreviewFile(null);
              }}
              onSelect={isInsertMode && onSelect && onClose ? () => {
                onSelect(previewFile.path, previewFile.name);
                onClose();
              } : undefined}
            />
          )}
        </AnimatePresence>

        {/* Sidebar - hide in userOnly mode since users only see their own files */}
        {!userOnly && (
          <MediaSidebar
            folders={folders}
            allFilesCount={allFiles.length}
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <MediaToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            dateFilters={dateFilters}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={fetchMedia}
            loading={loading}
          />

          {/* File Grid/List */}
          <div
            className={cn(
              "flex-1 overflow-hidden relative",
              isDragging && "bg-primary/5"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {/* Drop overlay */}
            <AnimatePresence>
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg m-4">
                  <div className="text-center">
                    <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
                    <p className="text-lg font-medium">
                      Drop files to upload
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Release to start uploading
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Loading media files...
                  </p>
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  No media files found
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  {searchQuery
                    ? "Try a different search term or clear filters"
                    : "Upload your first image to get started"}
                </p>
                <Button
                  onClick={() => setCurrentView("upload")}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Images
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-full">
                {viewMode === "grid" ? (
                  <MediaGrid
                    files={files}
                    selectedFiles={selectedFiles}
                    detailsFileId={detailsFile?.id}
                    onImageClick={handleImageClick}
                    onCheckboxClick={toggleBulkSelection}
                    onPreviewClick={(file) => {
                      setPreviewFile(file);
                      setCurrentView("preview");
                    }}
                  />
                ) : (
                  <MediaList
                    files={files}
                    selectedFiles={selectedFiles}
                    detailsFileId={detailsFile?.id}
                    onImageClick={handleImageClick}
                    onCheckboxClick={toggleBulkSelection}
                    onPreviewClick={(file) => {
                      setPreviewFile(file);
                      setCurrentView("preview");
                    }}
                  />
                )}
              </ScrollArea>
            )}

            {/* Floating Selection Bar */}
            <AnimatePresence>
              {selectedFiles.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
                >
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-card border rounded-full shadow-lg">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckSquare className="h-4 w-4 text-primary" />
                      <span>{selectedFiles.size} selected</span>
                    </div>
                    <div className="w-px h-5 bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFiles(new Set());
                        setBulkSelectMode(false);
                      }}
                      className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAll}
                      className="h-8 gap-2 text-muted-foreground hover:text-foreground"
                    >
                      {selectedFiles.size === files.length ? (
                        <>
                          <Square className="h-4 w-4" />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4" />
                          Select All
                        </>
                      )}
                    </Button>
                    <div className="w-px h-5 bg-border" />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-8 gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background shrink-0">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{pagination.totalItems} file(s)</span>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <span>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 ml-2"
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        currentPage: p.currentPage - 1,
                      }))
                    }
                    disabled={pagination.currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setPagination((p) => ({
                        ...p,
                        currentPage: p.currentPage + 1,
                      }))
                    }
                    disabled={
                      pagination.currentPage >= pagination.totalPages ||
                      loading
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Only show insert/cancel buttons in modal mode */}
            {mode === "modal" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                {isInsertMode && selectedFiles.size > 0 ? (
                  <Button onClick={handleInsert} className="gap-2">
                    <Check className="h-4 w-4" />
                    Insert {selectedFiles.size} File
                    {selectedFiles.size > 1 ? "s" : ""}
                  </Button>
                ) : isInsertMode && detailsFile ? (
                  <Button
                    onClick={() => {
                      if (onSelect && onClose) {
                        onSelect(detailsFile.path, detailsFile.name);
                        onClose();
                      }
                    }}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Insert Image
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <AnimatePresence>
          {detailsPanelOpen && detailsFile && (
            <MediaDetailsPanel
              file={detailsFile}
              onClose={() => setDetailsPanelOpen(false)}
              onPreview={() => {
                setPreviewFile(detailsFile);
                setCurrentView("preview");
              }}
              onDelete={() => {
                setSelectedFiles(new Set([detailsFile.id]));
                setShowDeleteConfirm(true);
              }}
              onInsert={isInsertMode && onSelect && onClose ? () => {
                onSelect(detailsFile.path, detailsFile.name);
                onClose();
              } : undefined}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected files?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedFiles.size} file(s)? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Render based on mode
  if (mode === "page") {
    return MediaContent;
  }

  // Modal mode
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose?.()}>
      <DialogContent className="max-w-[95vw]! w-[95vw]! xl:w-350! h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Media Library</DialogTitle>
        {MediaContent}
      </DialogContent>
    </Dialog>
  );
}

export default MediaManager;
