"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

interface AnnouncementSectionProps {
  message: string;
  isActive: boolean;
  onUpdate: (key: string, value: any) => void;
}

export default function AnnouncementSection({
  message,
  isActive,
  onUpdate,
}: AnnouncementSectionProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("platform_announcement")}</h3>
      <Textarea
        id="announcement-message"
        label="Announcement Message"
        value={message ?? ""}
        onChange={(e) => onUpdate("icoAnnouncementMessage", e.target.value)}
        placeholder="Enter an announcement message to display to all users"
      />
      <div className="flex items-center space-x-2">
        <Switch
          id="announcement-active"
          checked={isActive}
          onCheckedChange={(checked) =>
            onUpdate("icoAnnouncementActive", checked)
          }
        />
        <Label htmlFor="announcement-active">{t("display_announcement")}</Label>
      </div>
    </div>
  );
}
