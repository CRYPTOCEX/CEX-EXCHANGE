"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { $fetch } from "@/lib/api";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import RichTextEditor from "@/components/ui/editor";
import { useTranslations } from "next-intl";

type FormInput = {
  subject: string;
  emailBody?: string;
  smsBody?: string;
  pushBody?: string;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  shortCodes?: string;
};
export default function NotificationTemplateEdit() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { id } = useParams();
  const [template, setTemplate] = useState<FormInput | null>(null);
  const [formValues, setFormValues] = useState<FormInput>({
    subject: "",
    emailBody: "",
    smsBody: "",
    pushBody: "",
    email: false,
    sms: false,
    push: false,
    shortCodes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const fetchTemplate = async () => {
      const { data } = await $fetch({
        url: `/api/admin/system/notification/template/${id}`,
        silent: true,
      });
      setTemplate({
        subject: data.subject,
        shortCodes: data.shortCodes,
      });
      setFormValues({
        subject: data.subject,
        emailBody: data.emailBody || "",
        smsBody: data.smsBody || "",
        pushBody: data.pushBody || "",
        email: data.email || false,
        sms: data.sms || false,
        push: data.push || false,
      });
    };
    if (id) {
      fetchTemplate();
    }
  }, [id]);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const handleSwitchChange = (name: string, newValue: boolean) => {
    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: newValue,
    }));
  };
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const { error } = await $fetch({
      url: `/api/admin/system/notification/template/${id}`,
      method: "PUT",
      body: formValues,
    });
    if (!error) {
      router.push("/admin/system/notification/template");
    }
    setIsSubmitting(false);
  };
  const shortcodesMap = (item: string) => {
    const map: {
      [key: string]: string;
    } = {
      FIRSTNAME: "User first name",
      LASTNAME: "User last name",
      EMAIL: "User email",
      PHONE: "User phone",
      COMPANY: "User company",
      ADDRESS: "User address",
      CITY: "User city",
      STATE: "User state",
      ZIP: "User zip",
      COUNTRY: "User country",
      PASSWORD: "User password",
      USERNAME: "User username",
      URL: "Site url",
      CREATED_AT: "Template related Created at",
      UPDATED_AT: "Updated at date",
      SITE_NAME: "Site name",
      SITE_URL: "Site url",
      SITE_EMAIL: "Site email",
      SITE_PHONE: "Site phone",
      SITE_ADDRESS: "Site address",
      TOKEN: "Template related token",
      LAST_LOGIN: "User last login",
    };
    return map[item] || item;
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
          {t("Edit")}
          {template?.subject}
          {t("Template")}
        </h2>
        <div className="flex space-x-2">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Icon icon="line-md:confirm" className="w-5 h-5 mr-2" />
            {t("Save")}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/system/notification/template")}
          >
            <Icon icon="line-md:arrow-small-left" className="w-5 h-5 mr-2" />
            {t("Back")}
          </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Input
            name="subject"
            title="Subject"
            placeholder="Enter subject"
            value={formValues.subject}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          {/* Updated: Using the RichTextEditor for email body */}
          <RichTextEditor
            value={formValues.emailBody || ""}
            onChange={(content) =>
              setFormValues((prev) => ({ ...prev, emailBody: content }))
            }
            placeholder="Enter email body"
          />
          <Textarea
            name="smsBody"
            title="SMS Body"
            placeholder="Enter sms body"
            value={formValues.smsBody || ""}
            onChange={handleChange}
            disabled={isSubmitting}
          />
          <Textarea
            name="pushBody"
            title="Push Body"
            placeholder="Enter push body"
            value={formValues.pushBody || ""}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="text-xl font-semibold mb-4">{t("Variables")}</h2>
            <div className="space-y-2 text-sm">
              {template?.shortCodes &&
                JSON.parse(template.shortCodes).map(
                  (item: string, index: number) => (
                    <div key={index} className="flex flex-col">
                      <span className="text-muted-foreground">
                        %
                        <span className="font-semibold text-foreground">
                          {item}
                        </span>
                        %
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {shortcodesMap(item)}
                      </span>
                    </div>
                  )
                )}
            </div>
          </Card>
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="email-switch"
                  >
                    {t("Email")}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t("send_emails_notifications")}
                  </p>
                </div>
                <Switch
                  id="email-switch"
                  checked={formValues.email ?? false}
                  onCheckedChange={(checked) =>
                    handleSwitchChange("email", checked)
                  }
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="sms-switch"
                  >
                    {t("sms_(coming_soon)")}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t("send_sms_notifications")}
                  </p>
                </div>
                <Switch
                  id="sms-switch"
                  checked={formValues.sms ?? false}
                  onCheckedChange={(checked) =>
                    handleSwitchChange("sms", checked)
                  }
                  disabled={true}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    htmlFor="push-switch"
                  >
                    {t("push_(coming_soon)")}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t("send_push_notifications")}
                  </p>
                </div>
                <Switch
                  id="push-switch"
                  checked={formValues.push ?? false}
                  onCheckedChange={(checked) =>
                    handleSwitchChange("push", checked)
                  }
                  disabled={true}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
