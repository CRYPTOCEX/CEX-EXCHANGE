"use client";

import { useState, useEffect } from "react";
import { useNotificationsStore } from "@/store/notification-store";
import { NotificationsList } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-list";
import { NotificationsFilters } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-filters";
import { NotificationsHeader } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-header";
import { NotificationsEmpty } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NotificationsClient() {
  const t = useTranslations("dashboard");
  const {
    notifications,
    isLoading,
    markAllAsRead,
    fetchNotifications,
    soundEnabled,
  } = useNotificationsStore();

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchNotifications();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.includes(notification.type);
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;
  const readCount = filteredNotifications.filter((n) => n.read).length;

  const handleFilterChange = (filters: string[]) => {
    setActiveFilters(filters);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "unread":
        return filteredNotifications.filter((n) => !n.read);
      case "read":
        return filteredNotifications.filter((n) => n.read);
      default:
        return filteredNotifications;
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Hero Background - Fixed behind sticky header */}
      <div className="absolute inset-0 h-[250px] bg-gradient-to-b from-muted/50 via-muted/20 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)] dark:bg-grid-black/10" />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <NotificationsHeader
            onMarkAllAsRead={markAllAsRead}
            unreadCount={unreadCount}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative pb-20">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Sticky */}
            <div className="lg:col-span-3 space-y-6">
              <div className="lg:sticky lg:top-[90px] space-y-6">
                <NotificationsFilters
                  onFilterChange={handleFilterChange}
                  activeFilters={activeFilters}
                />
              </div>
            </div>

            {/* Right Content - Scrollable Notifications */}
            <div className="lg:col-span-9 space-y-6 w-full">
              {/* Sticky Tabs above notifications */}
              <div className="sticky top-18 z-40 bg-background/95 backdrop-blur-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="text-xs w-full">
                      {t("all_(")}
                      {filteredNotifications.length}
                      )
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs w-full">
                      {t("unread_(")}
                      {unreadCount}
                      )
                    </TabsTrigger>
                    <TabsTrigger value="read" className="text-xs w-full">
                      {t("read_(")}
                      {readCount}
                      )
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Notifications Content */}
              <div className="px-6">
                {filteredNotifications.length === 0 && !isLoading ? (
                  <NotificationsEmpty />
                ) : (
                  <NotificationsList
                    notifications={getFilteredNotifications()}
                    isLoading={isLoading}
                    viewMode="list"
                    soundEnabled={soundEnabled}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          className="fixed bottom-8 right-8 rounded-full h-12 w-12 shadow-lg animate-fade-in z-30"
          onClick={scrollToTop}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
