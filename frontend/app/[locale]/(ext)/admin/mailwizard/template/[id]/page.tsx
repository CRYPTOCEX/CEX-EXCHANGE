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

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });
export default function TemplateEdit() {
  const t = useTranslations("ext");
  const router = useRouter();
  const params = useParams();
  const { id } = params; // Now using route parameters for the ID
  const { theme } = useTheme();
  const emailEditorRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [template, setTemplate] = useState<any>({});
  const [editorReady, setEditorReady] = useState(false);
  const onLoad = (unlayer: any) => {
    console.log("Email Editor loaded", unlayer);
    emailEditorRef.current = unlayer;
    unlayer.addEventListener("design:loaded", (data: any) => {
      console.log("Design loaded", data);
    });
  };
  const onReady = (unlayer: any) => {
    console.log("Editor is ready", unlayer);
    setEditorReady(true);
  };
  const fetchTemplate = async () => {
    const { data, error } = await $fetch({
      url: `/api/admin/mailwizard/template/${id}`,
      silent: true,
    });
    if (!error) {
      setTemplate(data);
    } else {
      toast.error("Failed to fetch template");
    }
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
      }
    }
  }, [editorReady, template]);
  const save = async () => {
    setIsLoading(true);
    const unlayer = emailEditorRef.current;
    if (!unlayer) {
      toast.error("Editor not loaded");
      setIsLoading(false);
      return;
    }
    unlayer.exportHtml(async (data: any) => {
      const { design, html } = data;
      const { error } = await $fetch({
        url: `/api/admin/mailwizard/template/${id}`,
        method: "PUT",
        body: {
          content: html,
          design: JSON.stringify(design),
        },
      });
      if (!error) {
        router.push("/admin/mailwizard/template");
      } else {
        toast.error("Failed to save template");
      }
      setIsLoading(false);
    });
  };
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
          {t("Edit")}
          {template.name}
          {t("Template")}
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
            onClick={save}
            disabled={isLoading || !emailEditorRef.current}
          >
            {t("Save")}
          </Button>
        </div>
      </div>
      {/* Email Editor */}
      <div className="w-full">
        <EmailEditor
          ref={emailEditorRef}
          minHeight="calc(100vh - 18rem)"
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
