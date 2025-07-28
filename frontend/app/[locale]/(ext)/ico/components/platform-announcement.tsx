"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export function PlatformAnnouncement() {
  const t = useTranslations("ext");
  const { settings } = useConfigStore();
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!settings || Object.keys(settings).length === 0) return;

    const message = settings["icoAnnouncementMessage"];
    if (settings["icoAnnouncementActive"] && message) {
      // Check if this announcement has been dismissed before.
      const dismissedMessage = localStorage.getItem("dismissedAnnouncement");
      if (dismissedMessage === message) {
        setIsVisible(false);
      } else {
        setAnnouncement(message);
        setIsVisible(true);
      }
    } else {
      setAnnouncement(null);
      setIsVisible(false);
    }
  }, [settings]);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem("dismissedAnnouncement", announcement);
    }
    setIsVisible(false);
  };

  if (!announcement || !isVisible) {
    return null;
  }

  return (
    <Alert className="mb-4 container mt-5 relative bg-primary/10 border-primary">
      <AlertTitle className="font-semibold">{t("Announcement")}</AlertTitle>
      <AlertDescription className="mt-1">{announcement}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-primary"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </Alert>
  );
}
