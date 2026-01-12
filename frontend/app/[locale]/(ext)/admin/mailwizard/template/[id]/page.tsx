"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

export default function TemplateEdit() {
  const t = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { theme } = useTheme();
  const emailEditorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<any>({});
  const [editorReady, setEditorReady] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const onLoad = (unlayer: any) => {
    emailEditorRef.current = unlayer;
    unlayer.addEventListener("design:updated", () => {
      setHasUnsavedChanges(true);
    });
  };

  const onReady = (unlayer: any) => {
    setEditorReady(true);
  };

  const fetchTemplate = async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: `/api/admin/mailwizard/template/${id}`,
      silent: true,
    });
    if (!error) {
      setTemplate(data);
      setTemplateName(data.name || "");
    } else {
      toast.error("Failed to fetch template");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  useEffect(() => {
    if (editorReady && template.design) {
      const unlayer = emailEditorRef.current;
      if (unlayer && unlayer.loadDesign) {
        let design;
        try {
          design = JSON.parse(template.design);
        } catch (error) {
          design = {};
        }
        unlayer.loadDesign(design);
        // Reset unsaved changes flag after loading design
        setTimeout(() => setHasUnsavedChanges(false), 100);
      }
    }
  }, [editorReady, template]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const save = async () => {
    setIsSaving(true);
    const unlayer = emailEditorRef.current;
    if (!unlayer) {
      toast.error("Editor not loaded");
      setIsSaving(false);
      return;
    }
    unlayer.exportHtml(async (data: any) => {
      const { design, html } = data;
      const { error } = await $fetch({
        url: `/api/admin/mailwizard/template/${id}`,
        method: "PUT",
        body: {
          name: templateName,
          content: html,
          design: JSON.stringify(design),
        },
      });
      if (!error) {
        toast.success("Template saved successfully");
        setHasUnsavedChanges(false);
      } else {
        toast.error("Failed to save template");
      }
      setIsSaving(false);
    });
  };

  const saveAndExit = async () => {
    setIsSaving(true);
    const unlayer = emailEditorRef.current;
    if (!unlayer) {
      toast.error("Editor not loaded");
      setIsSaving(false);
      return;
    }
    unlayer.exportHtml(async (data: any) => {
      const { design, html } = data;
      const { error } = await $fetch({
        url: `/api/admin/mailwizard/template/${id}`,
        method: "PUT",
        body: {
          name: templateName,
          content: html,
          design: JSON.stringify(design),
        },
      });
      if (!error) {
        toast.success("Template saved successfully");
        router.push("/admin/mailwizard/template");
      } else {
        toast.error("Failed to save template");
      }
      setIsSaving(false);
    });
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?"
      );
      if (!confirmed) return;
    }
    router.push("/admin/mailwizard/template");
  };

  const exportHtml = () => {
    const unlayer = emailEditorRef.current;
    if (!unlayer) return;
    unlayer.exportHtml((data: any) => {
      const { html } = data;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${templateName || "template"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML exported successfully");
    });
  };

  const previewTemplate = () => {
    const unlayer = emailEditorRef.current;
    if (!unlayer) return;
    unlayer.exportHtml((data: any) => {
      const { html } = data;
      // Use Blob URL for safe preview
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between h-14 px-4 border-b bg-card shrink-0">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-9 w-9"
                >
                  <Icon icon="lucide:x" className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close editor</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-6 w-px bg-border" />

          {/* Template Name */}
          <div className="flex items-center gap-2">
            <Icon
              icon="lucide:mail"
              className="h-5 w-5 text-muted-foreground"
            />
            {isEditingName ? (
              <Input
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setIsEditingName(false);
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                className="h-8 w-64 text-sm font-medium"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-2 hover:bg-muted px-2 py-1 rounded-md transition-colors"
              >
                <span className="text-sm font-medium">
                  {templateName || "Untitled Template"}
                </span>
                <Icon
                  icon="lucide:pencil"
                  className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100"
                />
              </button>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Unsaved
              </span>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previewTemplate}
                  disabled={!editorReady}
                  className="h-9 w-9"
                >
                  <Icon icon="lucide:eye" className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Icon icon="lucide:download" className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportHtml}>
                <Icon icon="lucide:file-code" className="h-4 w-4 mr-2" />
                Export as HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={save}
            disabled={isSaving || !editorReady}
            className="h-9"
          >
            {isSaving ? (
              <Icon icon="lucide:loader-2" className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Icon icon="lucide:save" className="h-4 w-4 mr-2" />
            )}
            {t("save")}
          </Button>

          <Button
            size="sm"
            onClick={saveAndExit}
            disabled={isSaving || !editorReady}
            className="h-9"
          >
            {isSaving ? (
              <Icon icon="lucide:loader-2" className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Icon icon="lucide:check" className="h-4 w-4 mr-2" />
            )}
            Save & Exit
          </Button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3">
              <Icon
                icon="lucide:loader-2"
                className="h-8 w-8 animate-spin text-primary"
              />
              <span className="text-sm text-muted-foreground">
                Loading template...
              </span>
            </div>
          </div>
        )}
        <EmailEditor
          ref={emailEditorRef}
          minHeight="calc(100vh - 56px)"
          onLoad={onLoad}
          onReady={onReady}
          options={{
            displayMode: "email",
            appearance: {
              theme: theme === "dark" ? "dark" : "modern_light",
              panels: {
                tools: { dock: "left" },
              },
            },
            features: {
              preview: true,
              imageEditor: true,
              stockImages: {
                enabled: true,
                safeSearch: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
}
