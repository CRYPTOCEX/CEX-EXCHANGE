"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useNotificationsStore } from "@/store/notification-store";
import { NotificationsList } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-list";
import { NotificationsFilters } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-filters";
import { NotificationsHeader } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-header";
import { NotificationsEmpty } from "@/app/[locale]/(dashboard)/user/notification/components/notifications-empty";
import { Button } from "@/components/ui/button";
import { ChevronUp, Bell, CheckCircle, Inbox, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function NotificationsClient() {
  const t = useTranslations("common");
  const tDashboardUser = useTranslations("dashboard_user");
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    const handleScroll = () => {
      if (contentRef.current) {
        setShowScrollTop(contentRef.current.scrollTop > 300);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener("scroll", handleScroll);
      return () => contentElement.removeEventListener("scroll", handleScroll);
    }
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
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const displayNotifications = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return filteredNotifications.filter((n) => !n.read);
      case "read":
        return filteredNotifications.filter((n) => n.read);
      default:
        return filteredNotifications;
    }
  }, [activeTab, filteredNotifications]);

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "unread":
        return "No unread notifications";
      case "read":
        return "No read notifications";
      default:
        return "No notifications found";
    }
  };

  const getEmptyIcon = () => {
    switch (activeTab) {
      case "unread":
        return <CheckCircle className="h-16 w-16 text-green-500/50 mb-4" />;
      case "read":
        return <Inbox className="h-16 w-16 text-muted-foreground/50 mb-4" />;
      default:
        return <Bell className="h-16 w-16 text-muted-foreground/50 mb-4" />;
    }
  };

  const getEmptyDescription = () => {
    switch (activeTab) {
      case "unread":
        return "You're all caught up! No unread notifications.";
      case "read":
        return "Notifications you've read will appear here.";
      default:
        return "When you receive notifications, they will appear here.";
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <motion.div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary)/0.3) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary)/0.2) 0%, transparent 70%)",
          }}
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
        />
      </div>

      {/* Fixed Header */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50 px-4 lg:px-6"
      >
        <div className="py-3 sm:py-4">
          <NotificationsHeader
            onMarkAllAsRead={markAllAsRead}
            unreadCount={unreadCount}
          />
        </div>
      </motion.div>

      {/* Main Content Area - Full Width */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex">
          {/* Left Sidebar - Fixed, not scrolling */}
          <motion.aside
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden lg:flex lg:flex-col w-72 xl:w-80 shrink-0 overflow-y-auto border-r border-border/50 bg-background/50"
          >
            <div className="p-4 lg:p-6">
              <NotificationsFilters
                onFilterChange={handleFilterChange}
                activeFilters={activeFilters}
              />
            </div>
          </motion.aside>

          {/* Right Content - Scrollable Notifications */}
          <motion.main
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
          >
            {/* Tabs Container - Fixed within the content area */}
            <div className="shrink-0 z-40">
              {/* Glass effect overlay */}
              <div className="bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 lg:px-6 py-4">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 sm:gap-4"
                >
                  {/* Mobile Filter Button */}
                  <Sheet
                    open={mobileFiltersOpen}
                    onOpenChange={setMobileFiltersOpen}
                  >
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="lg:hidden shrink-0 relative h-10 w-10 rounded-xl border-border/50 bg-background/50 hover:bg-muted/50"
                      >
                        <Filter className="h-4 w-4" />
                        {activeFilters.length > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {activeFilters.length}
                          </span>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className="w-[300px] sm:w-[350px] p-0"
                    >
                      <SheetHeader className="p-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          {t("filters")}
                        </SheetTitle>
                      </SheetHeader>
                      <div className="p-4 overflow-y-auto h-[calc(100dvh-80px)]">
                        <NotificationsFilters
                          onFilterChange={(filters) => {
                            handleFilterChange(filters);
                          }}
                          activeFilters={activeFilters}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Custom Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50">
                    {[
                      {
                        id: "all",
                        label: t("all"),
                        count: filteredNotifications.length,
                        color: "primary",
                      },
                      {
                        id: "unread",
                        label: tDashboardUser("unread"),
                        mobileLabel: "New",
                        count: unreadCount,
                        color: "yellow",
                      },
                      {
                        id: "read",
                        label: t("read"),
                        count: readCount,
                        color: "muted",
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                          activeTab === tab.id
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground/80"
                        )}
                      >
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        )}
                        <span className="relative z-10 hidden sm:inline">
                          {tab.label}
                        </span>
                        <span className="relative z-10 sm:hidden">
                          {tab.mobileLabel || tab.label}
                        </span>
                        <span
                          className={cn(
                            "relative z-10 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium transition-colors",
                            activeTab === tab.id
                              ? tab.color === "yellow"
                                ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                : tab.color === "primary"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              : "bg-muted/50 text-muted-foreground"
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Scrollable Notifications Content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto px-4 lg:px-6"
            >
              {/* Glass fade effect at top */}
              <div className="sticky top-0 z-10 h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none -mb-4" />

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + activeFilters.join(",")}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="py-4"
                >
                  {isLoading ? (
                    <NotificationsList
                      notifications={[]}
                      isLoading={true}
                      viewMode="list"
                      soundEnabled={soundEnabled}
                    />
                  ) : displayNotifications.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center"
                    >
                      <motion.div
                        initial={{ y: 10 }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          repeat: Infinity,
                          duration: 3,
                          ease: "easeInOut",
                        }}
                      >
                        {getEmptyIcon()}
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">
                        {getEmptyMessage()}
                      </h3>
                      <p className="text-muted-foreground max-w-md text-sm">
                        {getEmptyDescription()}
                      </p>
                      {activeFilters.length > 0 && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => handleFilterChange([])}
                        >
                          Clear filters
                        </Button>
                      )}
                    </motion.div>
                  ) : (
                    <NotificationsList
                      notifications={displayNotifications}
                      isLoading={false}
                      viewMode="list"
                      soundEnabled={soundEnabled}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Back to top button */}
              <AnimatePresence>
                {showScrollTop && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="sticky bottom-4 flex justify-center mt-8"
                  >
                    <Button
                      className="rounded-full px-4 sm:px-5 h-9 sm:h-10 shadow-xl bg-background/80 hover:bg-background backdrop-blur-xl border border-border/50 gap-2 text-foreground"
                      variant="outline"
                      onClick={scrollToTop}
                    >
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </motion.div>
                      <span className="text-xs sm:text-sm font-medium">
                        Back to top
                      </span>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
