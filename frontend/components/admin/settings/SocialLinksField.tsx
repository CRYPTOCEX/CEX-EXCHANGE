"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Share2,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { FieldDefinition, SocialLink } from "./types";
import { imageUploader } from "@/utils/upload";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface SocialLinksFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (key: string, value: string) => void;
  /** Card-level chips, rendered beside the field label. See SettingsField. */
  meta?: React.ReactNode;
}

const PRESET_ICONS = [
  { name: "Facebook", icon: "/img/social/facebook.svg" },
  { name: "Twitter", icon: "/img/social/twitter.svg" },
  { name: "Instagram", icon: "/img/social/instagram.svg" },
  { name: "LinkedIn", icon: "/img/social/linkedin.svg" },
  { name: "Telegram", icon: "/img/social/telegram.svg" },
  { name: "Discord", icon: "/img/social/discord.svg" },
  { name: "YouTube", icon: "/img/social/youtube.svg" },
  { name: "GitHub", icon: "/img/social/github.svg" },
  { name: "TikTok", icon: "/img/social/tiktok.svg" },
  { name: "Reddit", icon: "/img/social/reddit.svg" },
];

const SocialLinkItem = ({
  link,
  index,
  totalLinks,
  onUpdate,
  onRemove,
  onMove,
  uploadingId,
  onIconUpload,
  onSelectPresetIcon,
}: {
  link: SocialLink;
  index: number;
  totalLinks: number;
  onUpdate: (id: string, field: keyof SocialLink, value: string) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  uploadingId: string | null;
  onIconUpload: (id: string, file: File | null) => void;
  onSelectPresetIcon: (id: string, iconPath: string) => void;
}) => {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="overflow-hidden border-muted-foreground/20 hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
          <div className="flex flex-col items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={() => onMove(index, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{tCommon("move_up")}</TooltipContent>
              </Tooltip>

            <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
              <GripVertical className="w-4 h-4" />
            </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                    onClick={() => onMove(index, "down")}
                    disabled={index === totalLinks - 1}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{tCommon("move_down")}</TooltipContent>
              </Tooltip>
          </div>

          <m.div
            whileHover={{ scale: 1.1 }}
            className={cn(
              "w-10 h-10 rounded-lg border flex items-center justify-center bg-background transition-colors",
              !link.icon && "border-dashed"
            )}
          >
            {link.icon ? (
              <Image
                src={link.icon}
                alt={link.name || t("social_icon")}
                width={20}
                height={20}
                className="dark:invert"
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </m.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {link.name || t("untitled_link")}
              </span>
              <Badge variant="secondary" className="text-xs">
                #{index + 1}
              </Badge>
            </div>
            {link.url && (
              <p className="text-xs text-muted-foreground truncate">
                {link.url}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {link.url && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{tCommon("open_link")}</TooltipContent>
                </Tooltip>
            )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => onRemove(link.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("delete_link")}</TooltipContent>
              </Tooltip>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t("platform_name")}
              </Label>
              <Input
                placeholder="e.g., Facebook"
                value={link.name}
                onChange={(e) => onUpdate(link.id, "name", e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t("profile_url")}
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => onUpdate(link.id, "url", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t("select_icon")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((preset) => (
                    <Tooltip key={preset.icon}>
                      <TooltipTrigger asChild>
                        <m.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => onSelectPresetIcon(link.id, preset.icon)}
                          className={cn(
                            "w-9 h-9 rounded-lg border flex items-center justify-center transition-all",
                            link.icon === preset.icon
                              ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50 hover:bg-muted"
                          )}
                        >
                          <Image
                            src={preset.icon}
                            alt={preset.name}
                            width={18}
                            height={18}
                            className="dark:invert"
                          />
                        </m.button>
                      </TooltipTrigger>
                      <TooltipContent>{preset.name}</TooltipContent>
                    </Tooltip>
                ))}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onIconUpload(link.id, file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingId === link.id}
                        />
                        <m.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "w-9 h-9 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:bg-muted transition-all cursor-pointer",
                            uploadingId === link.id && "animate-pulse"
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </m.div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("upload_custom_icon")}</TooltipContent>
                  </Tooltip>
              </div>

              {link.icon && !PRESET_ICONS.some((p) => p.icon === link.icon) && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t("custom_icon")}: {link.icon.split("/").pop()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
};

export const SocialLinksField: React.FC<SocialLinksFieldProps> = ({
  field,
  value,
  onChange,
  meta,
}) => {
  const t = useTranslations("components");
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setLinks(parsed);
        }
      } catch {
        setLinks([]);
      }
    }
  }, [value]);

  const updateLinks = (newLinks: SocialLink[]) => {
    setLinks(newLinks);
    onChange(field.key, JSON.stringify(newLinks));
  };

  const addLink = () => {
    const newLink: SocialLink = {
      id: Date.now().toString(),
      name: "",
      url: "",
      icon: "",
    };
    updateLinks([...links, newLink]);
  };

  const removeLink = (id: string) => {
    updateLinks(links.filter((link) => link.id !== id));
  };

  const updateLink = (id: string, fieldName: keyof SocialLink, value: string) => {
    updateLinks(
      links.map((link) => (link.id === id ? { ...link, [fieldName]: value } : link))
    );
  };

  const moveLink = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const newLinks = [...links];
    const [removed] = newLinks.splice(index, 1);
    newLinks.splice(newIndex, 0, removed);
    updateLinks(newLinks);
  };

  const handleIconUpload = async (id: string, file: File | null) => {
    if (!file) return;

    setUploadingId(id);
    try {
      const result = await imageUploader({
        file,
        dir: "social-icons",
        size: { maxWidth: 64, maxHeight: 64 },
      });

      if (result.success && result.url) {
        updateLink(id, "icon", result.url);
      }
    } catch (error) {
      console.error("Failed to upload icon:", error);
    } finally {
      setUploadingId(null);
    }
  };

  const selectPresetIcon = (id: string, iconPath: string) => {
    updateLink(id, "icon", iconPath);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Share2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-base font-semibold">{field.label}</Label>
              {meta}
            </div>
            {field.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
          </div>
        </div>

        <m.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={addLink}
            size="sm"
            className="gap-2 bg-destructive hover:bg-destructive text-destructive-foreground shadow-lg"
          >
            <Plus className="w-4 h-4" />
            {t("add_social_link")}
          </Button>
        </m.div>
      </div>

      {links.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 text-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">{links.length}</span>
            <span>social {links.length === 1 ? "link" : "links"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">
              {links.filter((l) => l.icon && l.url && l.name).length}
            </span>
            <span>complete</span>
          </div>
        </m.div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {links.length === 0 ? (
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <m.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Share2 className="w-7 h-7 text-destructive" />
                  </m.div>
                  <h3 className="font-medium text-lg mb-1">{t("no_social_links_yet")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("add_your_social_media_profiles_to")}
                  </p>
                  <Button onClick={addLink} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t("add_your_first_link")}
                  </Button>
                </CardContent>
              </Card>
            </m.div>
          ) : (
            links.map((link, index) => (
              <SocialLinkItem
                key={link.id}
                link={link}
                index={index}
                totalLinks={links.length}
                onUpdate={updateLink}
                onRemove={removeLink}
                onMove={moveLink}
                uploadingId={uploadingId}
                onIconUpload={handleIconUpload}
                onSelectPresetIcon={selectPresetIcon}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
