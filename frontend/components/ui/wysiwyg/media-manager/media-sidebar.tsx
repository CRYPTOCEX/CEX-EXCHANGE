"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Folder,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  FileImage,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { FolderItem } from "./types";

interface MediaSidebarProps {
  folders: FolderItem[];
  allFilesCount: number;
  selectedFolder: string;
  onSelectFolder: (folder: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function MediaSidebar({
  folders,
  allFilesCount,
  selectedFolder,
  onSelectFolder,
  collapsed,
  onToggleCollapse,
}: MediaSidebarProps) {
  return (
    <motion.div
      className={cn(
        "border-r bg-muted/30 flex flex-col shrink-0",
        collapsed ? "w-12" : "w-64"
      )}
      animate={{ width: collapsed ? 48 : 256 }}
      transition={{ duration: 0.2 }}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        {!collapsed && <span className="text-sm font-medium">Folders</span>}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleCollapse}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Folder List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className={cn("space-y-1", collapsed ? "p-1" : "p-2")}>
            {/* All Files */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectFolder("all")}
                    className={cn(
                      "w-full flex items-center rounded-lg text-sm transition-colors",
                      collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                      selectedFolder === "all"
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <FileImage className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">
                          All Files
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {allFilesCount}
                        </Badge>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    All Files ({allFilesCount})
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {!collapsed && folders.length > 0 && (
              <div className="pt-2 pb-1">
                <span className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Categories
                </span>
              </div>
            )}

            {/* Dynamic Folders */}
            {folders.map((folder) => (
              <TooltipProvider key={folder.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectFolder(folder.id)}
                      className={cn(
                        "w-full flex items-center rounded-lg text-sm transition-colors",
                        collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                        selectedFolder === folder.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <Folder className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">
                            {folder.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {folder.count}
                          </Badge>
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {folder.name} ({folder.count})
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
}
