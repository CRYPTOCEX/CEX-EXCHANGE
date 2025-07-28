"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FAQMedia } from "@/store/faq/admin";
import { useTranslations } from "next-intl";

interface MediaRendererProps {
  media: FAQMedia;
  className?: string;
}

export function MediaRenderer({ media, className = "" }: MediaRendererProps) {
  const t = useTranslations("ext");
  const [isOpen, setIsOpen] = useState(false);

  // Handle YouTube embeds
  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);

      // Handle youtube.com/watch?v=VIDEO_ID
      if (
        urlObj.hostname.includes("youtube.com") &&
        urlObj.pathname.includes("/watch")
      ) {
        const videoId = urlObj.searchParams.get("v");
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // Handle youtu.be/VIDEO_ID
      if (urlObj.hostname === "youtu.be") {
        const videoId = urlObj.pathname.slice(1);
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // If it's already an embed URL, return it
      if (url.includes("/embed/")) {
        return url;
      }

      // Default: return the original URL
      return url;
    } catch (error) {
      console.error("Error parsing YouTube URL:", error);
      return url;
    }
  };

  // Determine if the URL is a YouTube embed
  const isYouTube =
    media.url.includes("youtube.com") || media.url.includes("youtu.be");

  // Get the appropriate embed URL
  const embedUrl =
    media.type === "embed" && isYouTube
      ? getYouTubeEmbedUrl(media.url)
      : media.url;

  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="p-0 relative group">
          {media.type === "image" && (
            <div className="relative">
              <img
                src={media.url || "/img/placeholder.svg"}
                alt={media.caption || "FAQ image"}
                className="w-full h-auto"
                width={media.width || 600}
                height={media.height || 400}
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsOpen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {media.type === "video" && (
            <div className="relative">
              <video
                src={media.url}
                controls
                className="w-full h-auto"
                width={media.width || 600}
                height={media.height || 400}
              >
                {t("your_browser_does_not_support_the_video_tag")}.
              </video>
            </div>
          )}

          {media.type === "embed" && isYouTube && (
            <div className="relative aspect-video">
              <iframe
                src={embedUrl}
                title={media.caption || "Embedded content"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              ></iframe>
            </div>
          )}

          {media.type === "embed" && !isYouTube && (
            <div className="p-4 flex justify-center">
              <a href={media.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("open_embedded_content")}
                </Button>
              </a>
            </div>
          )}

          {media.caption && (
            <div className="p-2 text-sm text-center text-muted-foreground">
              {media.caption}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen dialog for images */}
      {media.type === "image" && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{media.caption || "Image"}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              <img
                src={media.url || "/img/placeholder.svg"}
                alt={media.caption || "FAQ image"}
                className="max-w-full max-h-[70vh]"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
