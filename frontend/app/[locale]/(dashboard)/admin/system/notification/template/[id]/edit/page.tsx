"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { redirect, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { FullScreenEditor } from "./components/full-screen-editor";
import { Loader2 } from "lucide-react";

interface NotificationTemplate {
  id: number;
  name: string;
  subject: string;
  emailBody: string;
  smsBody?: string;
  pushBody?: string;
  shortCodes: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export default function NotificationTemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const [template, setTemplate] = useState<NotificationTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplate = async () => {
      const { data, error } = await $fetch({
        url: `/api/admin/system/notification/template/${templateId}`,
        silent: true,
      });

      if (error || !data) {
        redirect("/admin/system/notification/template" as any);
        return;
      }

      setTemplate(data);
      setIsLoading(false);
    };

    fetchTemplate();
  }, [templateId]);

  const handleSave = async (
    subject: string,
    emailBody: string,
    smsBody: string,
    pushBody: string,
    email: boolean,
    sms: boolean,
    push: boolean
  ) => {
    const { error } = await $fetch({
      url: `/api/admin/system/notification/template/${templateId}`,
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
      throw new Error("Failed to save template");
    }
  };

  const handleClose = () => {
    router.push("/admin/system/notification/template" as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const shortCodes = template.shortCodes ? JSON.parse(template.shortCodes) : [];

  return (
    <FullScreenEditor
      templateId={templateId}
      initialSubject={template.subject}
      initialEmailBody={template.emailBody}
      initialSmsBody={template.smsBody || ""}
      initialPushBody={template.pushBody || ""}
      initialEmail={template.email}
      initialSms={template.sms}
      initialPush={template.push}
      initialShortCodes={shortCodes}
      onClose={handleClose}
      onSave={handleSave}
    />
  );
}
