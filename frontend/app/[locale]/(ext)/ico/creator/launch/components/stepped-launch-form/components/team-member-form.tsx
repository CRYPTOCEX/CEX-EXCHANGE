"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslations } from "next-intl";

export interface TeamMember {
  id: string | number;
  name: string;
  role: string;
  bio: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  website?: string;
  avatar?: File | string;
}

interface TeamMemberFormProps {
  member: TeamMember;
  index: number;
  canRemove: boolean;
  onUpdate: (
    id: string | number,
    field: string,
    value: string | File | null
  ) => void;
  onRemove: (id: string | number) => void;
}

export default function TeamMemberForm({
  member,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: TeamMemberFormProps) {
  const t = useTranslations("ext");
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <div className="flex items-center justify-between">
        <h5 className="font-medium">
          {t("team_member")} {index + 1}
        </h5>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(member.id)}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t("Remove")}
          </Button>
        )}
      </div>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center mb-4">
        <ImageUpload
          title="Avatar"
          value={member.avatar || null}
          onChange={(fileOrNull) => onUpdate(member.id, "avatar", fileOrNull)}
          size="sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("Name")}</label>
          <Input
            placeholder="Full Name"
            value={member.name}
            onChange={(e) => onUpdate(member.id, "name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("Role")}</label>
          <Input
            placeholder="e.g. CEO, CTO, Lead Developer"
            value={member.role}
            onChange={(e) => onUpdate(member.id, "role", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("Bio")}</label>
        <Textarea
          placeholder="Brief professional background and experience"
          className="min-h-[80px]"
          value={member.bio}
          onChange={(e) => onUpdate(member.id, "bio", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("LinkedIn")}</label>
          <Input
            placeholder="https://linkedin.com/in/profile"
            value={member.linkedin || ""}
            onChange={(e) => onUpdate(member.id, "linkedin", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("Twitter_X")}</label>
          <Input
            placeholder="https://twitter.com/username"
            value={member.twitter || ""}
            onChange={(e) => onUpdate(member.id, "twitter", e.target.value)}
          />
        </div>
      </div>

      {/* New grid for GitHub and Website */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("GitHub")}</label>
          <Input
            placeholder="https://github.com/username"
            value={member.github || ""}
            onChange={(e) => onUpdate(member.id, "github", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("Website")}</label>
          <Input
            placeholder="https://yourwebsite.com"
            value={member.website || ""}
            onChange={(e) => onUpdate(member.id, "website", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
