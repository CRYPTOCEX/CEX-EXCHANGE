"use client";
import { useState } from "react";
import { useBuilderStore } from "@/store/builder-store";
import { Button } from "@/components/ui/button";
import SectionRenderer from "./renderers/section-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function PreviewMode() {
  const t = useTranslations("dashboard");
  const { page, togglePreviewMode, viewMode } = useBuilderStore();
  const [showJson, setShowJson] = useState(false);

  const getCanvasWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "max-w-6xl";
    }
  };

  // Add null check for page
  if (!page) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-50 flex flex-col">
        <div className="flex items-center h-10 px-3 border-b bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
          <h2 className="flex-1 text-center font-medium">
            {t("preview_mode")}
          </h2>
          <Button
            onClick={togglePreviewMode}
            variant="default"
            className="bg-purple-600 hover:bg-purple-700 h-8 text-xs px-3 py-1"
          >
            {t("exit_preview")}
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700 dark:text-zinc-300 mb-2">
              {t("error_loading_preview")}
            </h3>
            <p className="text-gray-500 dark:text-zinc-400">
              {t("unable_to_load_page_content")}. {t("please_try_again")}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-zinc-950 z-50 flex flex-col">
      <div className="flex items-center h-10 px-3 border-b bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-sm">
        <h2 className="flex-1 text-center font-medium">{t("preview_mode")}</h2>
        <Button
          onClick={() => setShowJson(!showJson)}
          variant="outline"
          className="h-8 text-xs px-3 py-1 mr-2"
        >
          {showJson ? "Rendered View" : "JSON View"}
        </Button>
        <ThemeToggle showTooltip={false} />
        <Button
          onClick={togglePreviewMode}
          variant="default"
          className="bg-purple-600 hover:bg-purple-700 h-8 text-xs px-3 py-1 ml-2"
        >
          {t("exit_preview")}
        </Button>
      </div>
      <ScrollArea className="flex-1 overflow-auto bg-gray-100 dark:bg-zinc-950">
        {showJson ? (
          <pre className="bg-gray-100 dark:bg-zinc-900 p-4 rounded-md overflow-x-auto">
            <code className="text-sm dark:text-zinc-300">
              {JSON.stringify(page, null, 2)}
            </code>
          </pre>
        ) : (
          <div className="w-full bg-gray-100 dark:bg-zinc-950 min-h-full">
            <div className="flex justify-center p-4">
              <div
                className={cn(
                  "w-full bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300",
                  getCanvasWidth()
                )}
              >
                <div className="min-h-full p-4">
                  {/* Add null check for page.sections */}
                  {page.sections && page.sections.length > 0 ? (
                    page.sections.map((section, index) => (
                      <div key={section.id} className="relative">
                        <SectionRenderer section={section} isPreview={true} />
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center border border-dashed border-gray-300 dark:border-zinc-700 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-700 dark:text-zinc-300 mb-2">
                        {t("no_content_to_preview")}
                      </h3>
                      <p className="text-gray-500 dark:text-zinc-400">
                        {t("add_sections_and_preview_mode")}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
