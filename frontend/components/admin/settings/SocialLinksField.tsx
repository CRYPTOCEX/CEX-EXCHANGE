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
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SocialLinksFieldProps {
  field: FieldDefinition;
  value: string;
  onChange: (key: string, value: string) => void;
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
  return (
    <motion.div
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
            <TooltipProvider>
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
                <TooltipContent side="left">Move up</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
              <GripVertical className="w-4 h-4" />
            </div>

            <TooltipProvider>
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
                <TooltipContent side="left">Move down</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <motion.div
            whileHover={{ scale: 1.1 }}
            className={cn(
              "w-10 h-10 rounded-lg border flex items-center justify-center bg-background transition-colors",
              !link.icon && "border-dashed"
            )}
          >
            {link.icon ? (
              <Image
                src={link.icon}
                alt={link.name || "Social icon"}
                width={20}
                height={20}
                className="dark:invert"
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {link.name || "Untitled Link"}
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
              <TooltipProvider>
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
                  <TooltipContent>Open link</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
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
                <TooltipContent>Delete link</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Platform Name
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
                Profile URL
              </Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => onUpdate(link.id, "url", e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Select Icon
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((preset) => (
                  <TooltipProvider key={preset.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
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
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent>{preset.name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}

                <TooltipProvider>
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
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "w-9 h-9 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:bg-muted transition-all cursor-pointer",
                            uploadingId === link.id && "animate-pulse"
                          )}
                        >
                          <Plus className="w-4 h-4" />
                        </motion.div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Upload custom icon</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {link.icon && !PRESET_ICONS.some((p) => p.icon === link.icon) && (
                <p className="text-xs text-muted-foreground mt-2">
                  Custom icon: {link.icon.split("/").pop()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const SocialLinksField: React.FC<SocialLinksFieldProps> = ({
  field,
  value,
  onChange,
}) => {
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
          <div className="p-2 rounded-lg bg-pink-500/10">
            <Share2 className="w-5 h-5 text-pink-500" />
          </div>
          <div>
            <Label className="text-base font-semibold">{field.label}</Label>
            {field.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {field.description}
              </p>
            )}
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={addLink}
            size="sm"
            className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Social Link
          </Button>
        </motion.div>
      </div>

      {links.length > 0 && (
        <motion.div
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
        </motion.div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {links.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Share2 className="w-7 h-7 text-pink-500" />
                  </motion.div>
                  <h3 className="font-medium text-lg mb-1">No social links yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add your social media profiles to display in the footer
                  </p>
                  <Button onClick={addLink} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add your first link
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
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
