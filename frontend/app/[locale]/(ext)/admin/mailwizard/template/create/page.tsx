"use client";
import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });
export default function TemplateCreate() {
  const t = useTranslations("ext");
  const router = useRouter();
  const { theme } = useTheme();
  const emailEditorRef = useRef<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  // Fired when the Unlayer script is loaded
  const onLoad = (unlayer: any) => {
    emailEditorRef.current = unlayer;
    unlayer.addEventListener("design:loaded", () => {
      console.log("Blank design loaded");
    });
  };
  // Fired when the editor is fully initialized
  const onReady = (unlayer: any) => {
    console.log("Editor is ready", unlayer);
    setEditorReady(true);
  };
  // Optional: Load a blank design once the editor is ready
  useEffect(() => {
    if (editorReady && emailEditorRef.current) {
      emailEditorRef.current.loadDesign({});
    }
  }, [editorReady]);
  // POST request to create a new template
  const handleCreate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setIsLoading(true);
    const unlayer = emailEditorRef.current;
    if (!unlayer) {
      toast.error("Editor not loaded");
      setIsLoading(false);
      return;
    }
    // Export the design & HTML from the editor
    unlayer.exportHtml(async (data: any) => {
      const { design, html } = data;
      const { error, data: resData } = await $fetch({
        url: "/api/admin/mailwizard/template",
        method: "POST",
        body: {
          name: templateName,
          content: html,
          design: JSON.stringify(design),
        },
      });
      if (!error) {
        toast.success("Template created successfully");
        router.push("/admin/mailwizard/template");
      } else {
        toast.error("Failed to create template");
      }
      setIsLoading(false);
    });
  };
  return (
    <div className="flex flex-col space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
          {t("create_new_template")}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/mailwizard/template")}
          >
            <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
            {t("Back")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isLoading || !editorReady || !templateName.trim()}
          >
            {t("Save")}
          </Button>
        </div>
      </div>
      {/* Main Content */}
      <div className="space-y-4">
        {/* Template Name Input */}
        <div>
          <Label htmlFor="templateName" className="mb-1">
            {t("template_name")}
          </Label>
          <Input
            id="templateName"
            placeholder="Enter template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
        </div>
      </div>
      {/* Editor Area - fills remaining space */}
      <div className="relative flex-1">
        <EmailEditor
          ref={emailEditorRef}
          minHeight="calc(100vh - 24rem)"
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
          }}
        />
      </div>
    </div>
  );
}
