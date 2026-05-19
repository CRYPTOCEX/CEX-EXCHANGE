"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import Image from "next/image";
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
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError("File size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      onUpdate(member.id, "avatar", file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveAvatar = () => {
    onUpdate(member.id, "avatar", null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
            {tCommon("remove")}
          </Button>
        )}
      </div>

      {/* Avatar Upload */}
      <div className="flex flex-col items-center mb-4">
        <label className="text-sm font-medium mb-2">Avatar</label>
        <div className="border-2 border-dashed rounded-lg p-4 w-full max-w-sm hover:border-primary/50 transition-colors">
          {previewUrl || (member.avatar && typeof member.avatar === 'string') ? (
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border">
                <Image
                  src={previewUrl || (member.avatar as string)}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {member.avatar instanceof File ? member.avatar.name : "Uploaded image"}
                </p>
                {member.avatar instanceof File && (
                  <p className="text-xs text-muted-foreground">
                    {(member.avatar.size / 1024).toFixed(2)} KB
                  </p>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {tCommon("choose_file")}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                {t("max_5mb_jpg_png_gif_webp")}
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{tCommon("name")}</label>
          <Input
            placeholder={t("full_name")}
            value={member.name}
            onChange={(e) => onUpdate(member.id, "name", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{tCommon("role")}</label>
          <Input
            placeholder={t("e_g_ceo_cto_lead_developer")}
            value={member.role}
            onChange={(e) => onUpdate(member.id, "role", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{tCommon("bio")}</label>
        <Textarea
          placeholder={t("brief_professional_background_and_experience")}
          className="min-h-[80px]"
          value={member.bio}
          onChange={(e) => onUpdate(member.id, "bio", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{tExt("linkedin")}</label>
          <Input
            placeholder="https://linkedin.com/in/profile"
            value={member.linkedin || ""}
            onChange={(e) => onUpdate(member.id, "linkedin", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("twitter_x")}</label>
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
          <label className="text-sm font-medium">{tCommon("github")}</label>
          <Input
            placeholder="https://github.com/username"
            value={member.github || ""}
            onChange={(e) => onUpdate(member.id, "github", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{tCommon("website")}</label>
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
