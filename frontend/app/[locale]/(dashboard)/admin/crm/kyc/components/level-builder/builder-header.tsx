"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
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
import { SkeletonText } from "@/components/ui/skeleton";
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
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
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
    <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/crm/kyc/level")}
          className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>

        <div className="flex items-center gap-2">
          {/* The heading ELEMENT survives in all three states, so the header
              bar keeps one height. `h-8` was 32px against a
              `text-2xl sm:text-3xl` title whose line box is 32px at the small
              breakpoint and 36px at the large — right on a phone, 4px short on
              a desktop, and pinned to neither. */}
          {loading ? (
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              <SkeletonText placeholder={t("untitled_level")} />
            </h1>
          ) : isEditing ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameChange}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-8 text-base font-medium w-[200px] border-border-strong"
            />
          ) : (
            <h1
              className="text-2xl font-bold tracking-tight sm:text-3xl cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {levelName || t("untitled_level")}
            </h1>
          )}
          <div className="text-sm text-muted-foreground flex items-center">
            <span className="mx-1">•</span>
            <span>
              {t("level")} {levelNumber}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Preview Button - Always show this */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onPreviewClick || (() => setShowPreview(!showPreview))}
                className="h-8 border-border-strong dark:hover:bg-muted dark:hover:text-foreground"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{tDashboardAdmin("editor")}</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{t("preview")}</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showPreview ? t("switch_to_editor") : t("preview_form")}</p>
            </TooltipContent>
          </Tooltip>

        {!hideViewControls && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 border-border-strong dark:hover:bg-muted dark:hover:text-foreground"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? t("exit_fullscreen") : t("fullscreen")}</p>
              </TooltipContent>
            </Tooltip>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving
            ? isEdit
              ? `${t("saving")}…`
              : `${t("creating")}…`
            : isEdit
              ? t("save")
              : t("create")}
        </Button>
      </div>
    </div>
  );
}
