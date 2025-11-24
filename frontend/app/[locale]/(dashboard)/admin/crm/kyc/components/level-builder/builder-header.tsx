"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface BuilderHeaderProps {
  loading?: boolean;
  levelName: string;
  setLevelName: (name: string) => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  handleSave: () => void;
  isSaving: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  levelNumber: number;
  hideViewControls?: boolean;
  onPreviewClick?: () => void;
  isEdit?: boolean;
}

export function BuilderHeader({
  loading,
  levelName,
  setLevelName,
  showPreview,
  setShowPreview,
  handleSave,
  isSaving,
  isFullscreen,
  setIsFullscreen,
  levelNumber,
  hideViewControls = false,
  onPreviewClick,
  isEdit = false,
}: BuilderHeaderProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(levelName);

  useEffect(() => {
    setEditedName(levelName || "");
  }, [levelName]);

  const handleNameChange = () => {
    if (editedName.trim() !== "") {
      setLevelName(editedName);
    } else {
      setEditedName(levelName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNameChange();
    } else if (e.key === "Escape") {
      setEditedName(levelName);
      setIsEditing(false);
    }
  };

  return (
    <div className="h-12 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/crm/kyc/level")}
          className="h-8 w-8 p-0 rounded-full text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>

        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-8 w-48" />
          ) : isEditing ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameChange}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-8 text-base font-medium w-[200px] dark:bg-zinc-900 dark:text-white dark:border-zinc-700"
            />
          ) : (
            <h1
              className="text-base font-medium cursor-pointer text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {levelName || "Untitled Level"}
            </h1>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <span className="mx-1 text-gray-400 dark:text-gray-500">
              {'•'}
            </span>
            <span>
              {t("Level")}{" "}
              {levelNumber}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Preview Button - Always show this */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviewClick || (() => setShowPreview(!showPreview))}
                className="h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{t("Editor")}</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{t("Preview")}</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showPreview ? "Switch to Editor" : "Preview Form"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!hideViewControls && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save"
              : "Create"}
        </Button>
      </div>
    </div>
  );
}
