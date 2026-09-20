"use client";
import { useBuilderStore } from "@/store/builder-store";
import { Button } from "@/components/ui/button";
import { Loadable } from "@/components/ui/skeleton";
import { Save, Undo, Redo, Eye, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import DevicePreview from "./device-preview";
import { PageSelectionModal } from "../modals/page-selection-modal";
import { ThemeToggle } from "../theme-toggle";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

/**
 * `loading` is the page fetch this bar sits above.
 *
 * The bar itself is entirely static — Back, undo/redo, the device preview
 * group, the theme toggle, Preview and Save — so it renders unchanged in both
 * states. The single unknown is the page TITLE, and the single behaviour that
 * must not be reachable before the page arrives is Save, which would otherwise
 * write the store's empty default over a real page.
 */
export default function BuilderHeader({ loading = false }: { loading?: boolean }) {
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
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
        title: t("error"),
        description: t("unable_to_save_page_save_function_not_available"),
        variant: "destructive",
      });
    }
  };

  const handleBackToPages = () => {
    router.push("/admin/builder");
  };

  return (
    <>
      <header className="flex items-center justify-between h-10 px-3 border-b bg-card border-border ">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPages}
            className="h-8 text-xs flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPageSelectionOpen(true)}
            className="text-sm font-medium py-1 h-8"
          >
            {/* Inside the button, not instead of it: the button is `h-8` and
                keeps its own height, and the placeholder only has to stop the
                label collapsing from "Untitled Page" to nothing and back. */}
            <Loadable loading={loading} placeholder={t("untitled_page")}>
              {currentPageTitle || t("untitled_page")}
            </Loadable>
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={undoAction}
            disabled={!canUndo}
            title={`${tDashboardAdmin("undo_ctrl_z")} (Ctrl+Z)`}
            className="h-8 w-8"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={redoAction}
            disabled={!canRedo}
            title={`${tDashboardAdmin("redo_ctrl_y")} (Ctrl+Y)`}
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
            title={isPreviewMode ? t("exit_preview") : t("preview")}
            onClick={togglePreviewMode}
            className="h-8 w-8"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            onClick={handleSave}
            disabled={loading}
            className="bg-primary hover:bg-primary h-8 text-xs px-3 py-1 flex items-center text-primary-foreground"
          >
            <Save className="h-4 w-4 mr-1" />
            {t("save")}
          </Button>
        </div>
      </header>

      {isPageSelectionOpen && (
        <PageSelectionModal onClose={() => setIsPageSelectionOpen(false)} />
      )}
    </>
  );
}
