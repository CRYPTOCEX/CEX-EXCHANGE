"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  ChevronLeft,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useNotificationsStore } from "@/store/notification-store";
import { Link } from "@/i18n/routing";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationsSettings } from "./notifications-settings";

interface NotificationsHeaderProps {
  onMarkAllAsRead: () => void;
  unreadCount: number;
}

export function NotificationsHeader({
  onMarkAllAsRead,
  unreadCount,
}: NotificationsHeaderProps) {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  // Read from store
  const { soundEnabled, toggleSound } = useNotificationsStore();

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead();
    toast({
      title: "All notifications marked as read",
      description: "Your notification list has been updated",
      duration: 3000,
    });
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <ChevronLeft className="h-6 w-6 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("Notifications")}</h1>
          {unreadCount > 0 && (
            <Badge variant="default" className="animate-pulse">
              {unreadCount}{" "}
              {t("unread")}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Toggle Sound */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSound}
          className={`transition-colors ${
            soundEnabled
              ? "text-green-500 hover:text-green-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={soundEnabled ? "Sound enabled" : "Sound disabled"}
        >
          {soundEnabled ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </Button>

        {/* Settings Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-muted"
          onClick={() => setSettingsOpen(true)}
          title={t("notification_settings")}
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">{t("notification_settings")}</span>
        </Button>
        {mounted && (
          <>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "p-2 rounded-full transition-colors hidden md:flex",
                isDark
                  ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              )}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <AnimatePresence mode="wait">
                {isDark ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Sun className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Moon className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            <AuthHeaderControls />
          </>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("notification_settings")}
            </DialogTitle>
          </DialogHeader>
          <NotificationsSettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
