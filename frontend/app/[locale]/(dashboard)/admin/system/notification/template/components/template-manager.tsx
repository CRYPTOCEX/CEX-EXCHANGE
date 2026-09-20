"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { Mail, Save } from "lucide-react";
import { Loadable } from "@/components/ui/skeleton";
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
import { usePathname, useLocale } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface FullTemplate extends NotificationTemplate {
  emailBody: string;
  smsBody?: string;
  pushBody?: string;
  shortCodes: string;
}

export function TemplateManager() {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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

  /**
   * `?selected=` is an entry point, read once on mount.
   *
   * Selecting a template rewrites the URL, which updates `useSearchParams()`.
   * Deriving anything from that live value re-runs the initial load — which
   * re-flips `isLoadingTemplates` and replaces the entire screen with the
   * full-page spinner, so every click looked like a page reload.
   */
  const initialSelectedId = useRef<string | null>(searchParams.get("selected"));

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

  /**
   * Load one template into the editor. Deliberately depends only on values that
   * are constant for this route, so the sidebar's list and its expand/collapse
   * state survive a selection — only the editor pane swaps.
   */
  const loadTemplate = useCallback(
    async (template: NotificationTemplate) => {
      setIsLoadingTemplate(true);

      // Reflect the selection in the URL without navigating. `pathname` from
      // next-intl has no locale prefix, so it is added back here.
      window.history.replaceState(
        null,
        "",
        `/${locale}${pathname}?selected=${template.id}`
      );

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
    },
    [locale, pathname]
  );

  // Fetch all templates — runs once; the full-page spinner belongs to this load only
  const fetchTemplates = useCallback(async () => {
    const { data, error } = await $fetch({
      url: "/api/admin/system/notification/template?all=true",
      silent: true,
    });

    if (!error && data) {
      // Handle both array and object response
      const templateList = Array.isArray(data) ? data : data.items || [];
      setTemplates(templateList);

      const requestedId = initialSelectedId.current;
      const requested = requestedId
        ? templateList.find(
            (t: NotificationTemplate) => t.id === parseInt(requestedId, 10)
          )
        : undefined;
      // Fall back to the first template when the URL names one that is gone
      const openFirst = requested || templateList[0];
      if (openFirst) await loadTemplate(openFirst);
    }
    setIsLoadingTemplates(false);
  }, [loadTemplate]);

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
  const handleSelectTemplate = useCallback(
    async (template: NotificationTemplate) => {
      if (template.id === selectedTemplate?.id) return;

      // Check for unsaved changes
      if (hasChanges && selectedTemplate) {
        const confirmed = window.confirm(
          tDashboardAdmin("you_have_unsaved_changes_do_you")
        );
        if (!confirmed) return;
      }

      await loadTemplate(template);
    },
    [hasChanges, selectedTemplate, loadTemplate]
  );

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
      toast.error(tCommon("failed_to_save_template"));
    } else {
      toast.success(tCommon("template_saved_successfully"));
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

  /**
   * THE THREE-PANE SHELL RENDERS IMMEDIATELY. It always did exist — it was
   * just being withheld.
   * ==========================================================================
   *
   * What was here: `if (isLoadingTemplates) return <div className="fixed
   * inset-0 z-40 h-screen"><Loader2/></div>`. This component is
   * `fixed inset-0 z-40`, i.e. it covers the entire application, so its
   * pending state was not one card blinking — it was the whole product
   * replaced by a spinner on a blank ground, and then the whole product
   * arriving at once. Sidebar, search field, category tree, editor header,
   * every form label: none of it depends on the fetch, and all of it was held
   * back until the fetch returned.
   *
   * Everything below is now one tree. The two flags that used to select
   * between trees now only decide whether individual VALUES are placeholders.
   */

  /**
   * Will an editor pane open? Yes, unless the platform genuinely has no
   * templates.
   *
   * This is knowable before the list lands because `fetchTemplates` opens
   * `requested || templateList[0]` unconditionally — there is no path where a
   * successful load leaves the right-hand pane on the "Select a template"
   * card. So during the wait the editor chrome is the honest thing to draw,
   * and the empty card is reserved for the one case it actually describes: no
   * templates at all. Rendering it while loading (which is what
   * `selectedTemplate ? … : <empty/>` did) told the operator "there is nothing
   * here" and then replaced it with a full editor — the loading/empty
   * conflation, and a second full-pane reflow on top of the first.
   */
  const showEditor = selectedTemplate !== null || isLoadingTemplates;

  /**
   * Is the editor's CONTENT still in flight? True for the initial list load as
   * well as for a template switch — from the pane's point of view they are the
   * same wait, and only the first one used to be handled somewhere else.
   */
  const editorPending = isLoadingTemplate || isLoadingTemplates;

  return (
    <div className="fixed inset-0 z-40 flex bg-background">
      {/* Left Sidebar - Template List */}
      <div className="w-80 shrink-0 h-full">
        <TemplateSidebar
          templates={templates}
          selectedTemplateId={selectedTemplate?.id ?? null}
          onSelectTemplate={handleSelectTemplate}
          loading={isLoadingTemplates}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {showEditor ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                {/* The heading ELEMENTS are constant; only the words inside
                    them wait. Skeletoning the strings in place keeps the
                    header bar exactly one `text-lg` line plus one `text-sm`
                    line in both states — which is what stops the editor body
                    below from starting at a different y offset. */}
                <div>
                  <h1 className="text-lg font-semibold">
                    <Loadable
                      loading={!selectedTemplate}
                      placeholder={tDashboardAdmin("account_verification")}
                    >
                      {selectedTemplate && formatTemplateName(selectedTemplate.name)}
                    </Loadable>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("template")}
                    <Loadable loading={!selectedTemplate} placeholder="00">
                      {selectedTemplate?.id}
                    </Loadable>
                  </p>
                </div>
                {hasChanges && (
                  <span className="text-xs bg-warning/15 text-foreground px-2 py-0.5 rounded-full">
                    {tCommon("unsaved_changes")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges || editorPending}
                  size="sm"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? `${tCommon("saving")}…` : tCommon("save_changes")}
                </Button>
              </div>
            </div>

            {/*
              Content Area — ONE tree, not two.

              This used to be `isLoadingTemplate ? <centred Loader2/> : <the
              whole editor>`, so switching template threw away the subject
              field, the WYSIWYG toolbar, the SMS/Push tab bar, the channel
              switches AND the 288px variables rail, then rebuilt them. The
              editor is the expensive half of this screen to mount, and it was
              being remounted on every click in the sidebar.

              Keeping it mounted is safe because `WysiwygEditor` is controlled:
              it has a `useEffect` on `value` that re-seeds its content, which
              is the same path used when a save writes the body back. The
              fields are `disabled` while pending instead — an editable box
              holding the PREVIOUS template's text is the one thing worse than
              a spinner here, because typing into it would be silently
              discarded the moment the fetch lands.
            */}
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
                        value={editorPending ? "" : subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={editorPending}
                        placeholder={`${tCommon("enter_email_subject")}…`}
                        className="mt-1.5"
                      />
                    </div>

                    {/* Email Body */}
                    <div>
                      <Label className="text-sm font-medium">{t("email_body")}</Label>
                      <div className="mt-1.5">
                        {/* `minHeight={400}` is why this one matters most: the
                            editor is the tallest thing on the page, so
                            unmounting it collapsed the scroll container by
                            ~400px and threw the operator's scroll position
                            away on every template switch. */}
                        <WysiwygEditor
                          ref={editorRef}
                          value={editorPending ? "" : emailBody}
                          onChange={setEmailBody}
                          readOnly={editorPending}
                          placeholder={`${t("enter_email_body")}…`}
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
                          value={editorPending ? "" : smsBody}
                          onChange={(e) => setSmsBody(e.target.value)}
                          disabled={editorPending}
                          placeholder={`${t("enter_sms_body")}…`}
                          className="min-h-[120px]"
                        />
                      </TabsContent>
                      <TabsContent value="push" className="mt-3">
                        <Textarea
                          value={editorPending ? "" : pushBody}
                          onChange={(e) => setPushBody(e.target.value)}
                          disabled={editorPending}
                          placeholder={`${t("enter_push_notification_body")}…`}
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
                            checked={editorPending ? false : email}
                            onCheckedChange={setEmail}
                            disabled={editorPending}
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
                            checked={editorPending ? false : sms}
                            onCheckedChange={setSms}
                            disabled={editorPending}
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
                            checked={editorPending ? false : push}
                            onCheckedChange={setPush}
                            disabled={editorPending}
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
