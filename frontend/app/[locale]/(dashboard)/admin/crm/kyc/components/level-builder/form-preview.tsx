"use client";

import { useEffect, type RefObject, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  Smartphone,
  Tablet,
  Laptop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DynamicForm } from "@/app/[locale]/(dashboard)/user/kyc/components/dynamic-form";
import { useTranslations } from "next-intl";

interface FormPreviewProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  activeFields: KycField[];
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  selectedField: KycField | null;
  setShowPreview: (show: boolean) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  // Store previous sidebar states
  previousLeftSidebarState: boolean;
  previousRightSidebarState: boolean;
  setPreviousLeftSidebarState: (state: boolean) => void;
  setPreviousRightSidebarState: (state: boolean) => void;
  levelName: string;
  levelDescription: string;
}

export function FormPreview({
  previewRef,
  activeFields,
  formData,
  setFormData,
  selectedField,
  setShowPreview,
  setLeftSidebarOpen,
  setRightSidebarOpen,
  previousLeftSidebarState,
  previousRightSidebarState,
  setPreviousLeftSidebarState,
  setPreviousRightSidebarState,
  levelName,
  levelDescription,
}: FormPreviewProps) {
  const t = useTranslations("dashboard");
  const [viewMode, setViewMode] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [showFieldHighlights, setShowFieldHighlights] = useState(true);
  const [previewVariant, setPreviewVariant] = useState<"card" | "default">(
    "card"
  );

  // Auto-collapse sidebars when preview is shown
  useEffect(() => {
    // Store current sidebar states
    setPreviousLeftSidebarState(true); // Assuming sidebar is open by default
    setPreviousRightSidebarState(!!selectedField); // Right sidebar is open if a field is selected

    // Close both sidebars
    setLeftSidebarOpen(false);
    setRightSidebarOpen(false);

    // Restore sidebar states when component unmounts
    return () => {
      setLeftSidebarOpen(previousLeftSidebarState);
      setRightSidebarOpen(previousRightSidebarState);
    };
  }, []);

  // Convert fields to the format expected by DynamicForm
  const formFields = activeFields.map((field) => ({
    ...field,
    order: field.order ?? 0,
    options:
      field.type === "SELECT" || field.type === "RADIO"
        ? field.options?.map((opt: any) => ({
            label: opt.label,
            value: opt.value,
          }))
        : undefined,
  }));

  const handleClosePreview = () => {
    // Restore sidebar states
    setLeftSidebarOpen(previousLeftSidebarState);
    setRightSidebarOpen(previousRightSidebarState);
    setShowPreview(false);
  };

  const getDeviceWidth = () => {
    switch (viewMode) {
      case "mobile":
        return "max-w-[375px]";
      case "tablet":
        return "max-w-[768px]";
      default:
        return "max-w-3xl";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-auto p-4 bg-gradient-to-br from-gray-50 to-white dark:from-zinc-950 dark:to-zinc-900"
    >
      <TooltipProvider>
        <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClosePreview}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t("back_to_editor")}</span>
            </Button>
            <div>
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                {t("form_preview")}
                <Badge variant="outline" className="ml-2 font-normal">
                  {t("Level")}{" "}
                  {activeFields.length > 0
                    ? (activeFields[0]?.order ?? 0) + 1
                    : 1}
                </Badge>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFieldHighlights(!showFieldHighlights)}
                  className={cn(
                    "gap-1",
                    showFieldHighlights
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {showFieldHighlights ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  <span>
                    {showFieldHighlights ? "Hide" : "Show"}{" "}
                    {t("Highlights")}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showFieldHighlights
                  ? "Hide field highlights"
                  : "Show field highlights"}
              </TooltipContent>
            </Tooltip>

            <Tabs
              defaultValue={viewMode}
              onValueChange={(v) => setViewMode(v as any)}
              className="mr-2"
            >
              <TabsList className="h-8 bg-muted/60">
                <TabsTrigger value="mobile" className="h-7 w-8 px-0">
                  <Smartphone className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="tablet" className="h-7 w-8 px-0">
                  <Tablet className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="desktop" className="h-7 w-8 px-0">
                  <Laptop className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs
              defaultValue={previewVariant}
              onValueChange={(v) => setPreviewVariant(v as any)}
            >
              <TabsList className="h-8 bg-muted/60">
                <TabsTrigger value="card" className="h-7 px-3 text-xs">
                  {t("Card")}
                </TabsTrigger>
                <TabsTrigger value="default" className="h-7 px-3 text-xs">
                  {t("Standard")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div
          className={cn(
            "mx-auto transition-all duration-300",
            getDeviceWidth()
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${previewVariant}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "relative",
                viewMode === "mobile" &&
                  "border-8 border-gray-800 dark:border-gray-700 rounded-[32px] shadow-xl",
                viewMode === "tablet" &&
                  "border-[12px] border-gray-800 dark:border-gray-700 rounded-[24px] shadow-xl"
              )}
            >
              {(viewMode === "mobile" || viewMode === "tablet") && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 dark:bg-gray-700 rounded-b-lg z-10"></div>
              )}

              <div
                ref={previewRef}
                className={cn(
                  "bg-white dark:bg-zinc-950 rounded-lg overflow-hidden",
                  viewMode === "mobile" && "rounded-[18px]",
                  viewMode === "tablet" && "rounded-[14px]",
                  showFieldHighlights && "form-preview-highlight-mode",
                  previewVariant === "default" && "p-4"
                )}
              >
                <DynamicForm
                  fields={formFields}
                  title={levelName || "Verification Form"}
                  description={
                    levelDescription ||
                    "Please complete all required fields below."
                  }
                  defaultValues={formData}
                  onSubmit={async (data) => {
                    setFormData(data);
                    return Promise.resolve();
                  }}
                  showProgressBar={true}
                  showFieldCount={true}
                  variant={previewVariant}
                  isPreview={true}
                  hideProgressBar={true}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </TooltipProvider>

      <style jsx global>{`
        .form-preview-highlight-mode [data-field-id]:hover {
          outline: 2px solid #3b82f6;
          outline-offset: 4px;
          border-radius: 4px;
          transition: outline 0.2s ease;
          position: relative;
        }

        .form-preview-highlight-mode [data-field-id]::after {
          content: attr(data-field-id);
          position: absolute;
          top: -8px;
          right: -8px;
          background: #3b82f6;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .form-preview-highlight-mode [data-field-id]:hover::after {
          opacity: 1;
        }
      `}</style>
    </motion.div>
  );
}
