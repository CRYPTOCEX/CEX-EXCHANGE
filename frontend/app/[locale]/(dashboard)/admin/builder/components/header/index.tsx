"use client";
import { useBuilderStore } from "@/store/builder-store";
import { Button } from "@/components/ui/button";
import { Save, Undo, Redo, Eye, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import DevicePreview from "./device-preview";
import { PageSelectionModal } from "../modals/page-selection-modal";
import { ThemeToggle } from "../theme-toggle";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function BuilderHeader() {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const router = useRouter();
  const [isPageSelectionOpen, setIsPageSelectionOpen] = useState(false);
  const {
    undoAction,
    redoAction,
    canUndo,
    canRedo,
    savePage,
    togglePreviewMode,
    currentPageTitle,
    isPreviewMode,
  } = useBuilderStore();

  const handleSave = async () => {
    if (savePage) {
      await savePage();
      // Toast is handled by $fetch in the save function
    } else {
      toast({
        title: "Error",
        description: "Unable to save page. Save function not available.",
        variant: "destructive",
      });
    }
  };

  const handleBackToPages = () => {
    router.push("/admin/builder");
  };

  return (
    <>
      <header className="flex items-center justify-between h-10 px-3 border-b bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPages}
            className="h-8 text-xs flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("Back")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPageSelectionOpen(true)}
            className="text-sm font-medium px-3 py-1 h-8"
          >
            {currentPageTitle || "Untitled Page"}
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={undoAction}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="h-8 w-8"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={redoAction}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="h-8 w-8"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <DevicePreview />

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            title={isPreviewMode ? "Exit Preview" : "Preview"}
            onClick={togglePreviewMode}
            className="h-8 w-8"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 h-8 text-xs px-3 py-1 flex items-center text-white dark:text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            {t("Save")}
          </Button>
        </div>
      </header>

      {isPageSelectionOpen && (
        <PageSelectionModal onClose={() => setIsPageSelectionOpen(false)} />
      )}
    </>
  );
}
