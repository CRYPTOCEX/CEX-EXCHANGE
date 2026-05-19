"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Mail, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WysiwygEditor } from "@/components/ui/wysiwyg/wysiwyg-editor";
import type { WysiwygEditorRef } from "@/components/ui/wysiwyg/types";
import { TemplateSidebar, type NotificationTemplate } from "./template-sidebar";
import { VariablesPanel } from "./variables-panel";
import { useRef } from "react";
import { useRouter, usePathname, useLocale } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FullTemplate extends NotificationTemplate {
  emailBody: string;
  smsBody?: string;
  pushBody?: string;
  shortCodes: string;
}

export function TemplateManager() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FullTemplate | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emailWrapperTemplate, setEmailWrapperTemplate] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Form state
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(false);
  const [push, setPush] = useState(false);
  const [shortCodes, setShortCodes] = useState<string[]>([]);

  const editorRef = useRef<WysiwygEditorRef>(null);

  // Fetch all templates
  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    const { data, error } = await $fetch({
      url: "/api/admin/system/notification/template?all=true",
      silent: true,
    });

    if (!error && data) {
      // Handle both array and object response
      const templateList = Array.isArray(data) ? data : data.items || [];
      setTemplates(templateList);

      // Check for URL-specified template
      const selectedId = searchParams.get("selected");
      if (selectedId && !initialLoadDone) {
        const templateToSelect = templateList.find(
          (t: NotificationTemplate) => t.id === parseInt(selectedId)
        );
        if (templateToSelect) {
          handleSelectTemplate(templateToSelect);
        } else if (templateList.length > 0) {
          handleSelectTemplate(templateList[0]);
        }
      } else if (templateList.length > 0 && !selectedTemplate && !initialLoadDone) {
        handleSelectTemplate(templateList[0]);
      }
      setInitialLoadDone(true);
    }
    setIsLoadingTemplates(false);
  }, [searchParams, initialLoadDone]);

  // Fetch email wrapper
  const fetchEmailWrapper = useCallback(async () => {
    const { data, error } = await $fetch({
      url: "/api/admin/system/notification/template/wrapper",
      silent: true,
    });
    if (!error && data?.html) {
      setEmailWrapperTemplate(data.html);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchEmailWrapper();
  }, [fetchTemplates, fetchEmailWrapper]);

  // Handle template selection
  const handleSelectTemplate = async (template: NotificationTemplate) => {
    // Check for unsaved changes
    if (hasChanges && selectedTemplate) {
      const confirmed = window.confirm(
        "You have unsaved changes. Do you want to discard them?"
      );
      if (!confirmed) return;
    }

    setIsLoadingTemplate(true);

    // Update URL without navigation (include locale prefix)
    const newUrl = `/${locale}${pathname}?selected=${template.id}`;
    window.history.replaceState(null, "", newUrl);

    const { data, error } = await $fetch({
      url: `/api/admin/system/notification/template/${template.id}`,
      silent: true,
    });

    if (!error && data) {
      const fullTemplate = data as FullTemplate;
      setSelectedTemplate(fullTemplate);
      setSubject(fullTemplate.subject);
      setEmailBody(fullTemplate.emailBody || "");
      setSmsBody(fullTemplate.smsBody || "");
      setPushBody(fullTemplate.pushBody || "");
      setEmail(fullTemplate.email);
      setSms(fullTemplate.sms);
      setPush(fullTemplate.push);
      setShortCodes(
        fullTemplate.shortCodes ? JSON.parse(fullTemplate.shortCodes) : []
      );
      setHasChanges(false);
    }
    setIsLoadingTemplate(false);
  };

  // Track changes
  useEffect(() => {
    if (selectedTemplate) {
      const changed =
        subject !== selectedTemplate.subject ||
        emailBody !== (selectedTemplate.emailBody || "") ||
        smsBody !== (selectedTemplate.smsBody || "") ||
        pushBody !== (selectedTemplate.pushBody || "") ||
        email !== selectedTemplate.email ||
        sms !== selectedTemplate.sms ||
        push !== selectedTemplate.push;
      setHasChanges(changed);
    }
  }, [subject, emailBody, smsBody, pushBody, email, sms, push, selectedTemplate]);

  // Save template
  const handleSave = async () => {
    if (!selectedTemplate) return;

    setIsSaving(true);
    const { error } = await $fetch({
      url: `/api/admin/system/notification/template/${selectedTemplate.id}`,
      method: "PUT",
      body: {
        subject,
        emailBody,
        smsBody,
        pushBody,
        email,
        sms,
        push,
      },
    });

    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved successfully");
      setHasChanges(false);
      // Update local template data
      setSelectedTemplate((prev) =>
        prev
          ? {
              ...prev,
              subject,
              emailBody,
              smsBody,
              pushBody,
              email,
              sms,
              push,
            }
          : null
      );
      // Update templates list
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === selectedTemplate.id ? { ...t, subject, email, sms, push } : t
        )
      );
    }
    setIsSaving(false);
  };

  // Insert variable at cursor
  const handleInsertVariable = (variableCode: string) => {
    const variableText = `%${variableCode}%`;
    editorRef.current?.insertContent(variableText);
    editorRef.current?.focus();
  };

  // Format template name
  const formatTemplateName = (name: string): string => {
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  if (isLoadingTemplates) {
    return (
      <div className="flex items-center justify-center h-screen fixed inset-0 z-40 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-background">
      {/* Left Sidebar - Template List */}
      <div className="w-80 shrink-0 h-full">
        <TemplateSidebar
          templates={templates}
          selectedTemplateId={selectedTemplate?.id ?? null}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {selectedTemplate ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h1 className="text-lg font-semibold">
                    {formatTemplateName(selectedTemplate.name)}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("template")}{selectedTemplate.id}
                  </p>
                </div>
                {hasChanges && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                    {tCommon("unsaved_changes")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  size="sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Content Area */}
            {isLoadingTemplate ? (
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto h-full">
                  <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Subject */}
                    <div>
                      <Label htmlFor="subject" className="text-sm font-medium">
                        {t("email_subject")}
                      </Label>
                      <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={tCommon("enter_email_subject_ellipsis")}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Email Body */}
                    <div>
                      <Label className="text-sm font-medium">{t("email_body")}</Label>
                      <div className="mt-1.5">
                        <WysiwygEditor
                          ref={editorRef}
                          value={emailBody}
                          onChange={setEmailBody}
                          placeholder={t("enter_email_body_ellipsis")}
                          uploadDir="notifications"
                          minHeight={400}
                          emailPreview={{
                            enabled: true,
                            wrapperHtml: emailWrapperTemplate,
                            subject: subject,
                          }}
                        />
                      </div>
                    </div>

                    {/* SMS & Push in Tabs */}
                    <Tabs defaultValue="sms" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="sms">{t("sms_body")}</TabsTrigger>
                        <TabsTrigger value="push">{t("push_notification")}</TabsTrigger>
                      </TabsList>
                      <TabsContent value="sms" className="mt-3">
                        <Textarea
                          value={smsBody}
                          onChange={(e) => setSmsBody(e.target.value)}
                          placeholder={t("enter_sms_body_ellipsis")}
                          className="min-h-[120px]"
                        />
                      </TabsContent>
                      <TabsContent value="push" className="mt-3">
                        <Textarea
                          value={pushBody}
                          onChange={(e) => setPushBody(e.target.value)}
                          placeholder={t("enter_push_notification_body_ellipsis")}
                          className="min-h-[120px]"
                        />
                      </TabsContent>
                    </Tabs>

                    {/* Channels */}
                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium text-sm mb-4">
                        {tCommon("notification_channels")}
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm" htmlFor="email-switch">
                              Email
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t("send_email_notifications")}
                            </p>
                          </div>
                          <Switch
                            id="email-switch"
                            checked={email}
                            onCheckedChange={setEmail}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm" htmlFor="sms-switch">
                              SMS
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t("send_sms_notifications")}
                            </p>
                          </div>
                          <Switch
                            id="sms-switch"
                            checked={sms}
                            onCheckedChange={setSms}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm" htmlFor="push-switch">
                              Push
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t("send_push_notifications")}
                            </p>
                          </div>
                          <Switch
                            id="push-switch"
                            checked={push}
                            onCheckedChange={setPush}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar - Variables */}
                <div className="w-72 shrink-0 border-l h-full overflow-hidden">
                  <VariablesPanel
                    shortCodes={shortCodes}
                    onInsertVariable={handleInsertVariable}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-lg font-medium mb-2">{tCommon("select_a_template")}</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("choose_a_template_from_the_sidebar")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
