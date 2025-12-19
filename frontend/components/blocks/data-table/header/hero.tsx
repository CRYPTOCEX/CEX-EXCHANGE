"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, BarChart3, Table2, Save, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HeaderClient } from "./header.client";
import { HeaderCreateButton } from "./header-create-button";
import { DesignConfig, DataTableView, FormConfig } from "../types/table";
import { DesignAnimationRenderer } from "./design-animations";
import { useTranslations } from "next-intl";
import { useTableStore } from "../store";
import { useMediaQuery } from "@/hooks/use-media-query";

// Separate component for form action buttons to isolate formState re-renders
const FormActionButtons = memo(function FormActionButtons({
  isEditView,
  hasEditPermission,
  hasCreatePermission
}: {
  isEditView: boolean;
  hasEditPermission: boolean;
  hasCreatePermission: boolean;
}) {
  const t = useTranslations("common");
  const formState = useTableStore((state) => state.formState);

  return (
    <>
      {/* Unsaved indicator */}
      {formState.isDirty && (
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-warning px-2 py-1 rounded-md bg-warning/10 border border-warning/20">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          {t("unsaved_changes")}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={formState.onCancel || undefined}
      >
        <X className="h-4 w-4 mr-1.5" />
        {t("cancel")}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={formState.onSubmit || undefined}
        disabled={
          formState.isSubmitting ||
          (isEditView ? !hasEditPermission : !hasCreatePermission)
        }
      >
        {formState.isSubmitting ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            {t("saving")}...
          </>
        ) : (
          <>
            <Save className="mr-1.5 h-4 w-4" />
            {isEditView ? t("save_changes") : t("create")}
          </>
        )}
      </Button>
    </>
  );
});

// Color mapping for text/bg classes and CSS color values
const colorMap: Record<string, { bg: string; text: string; bgLight: string; cssColor: string }> = {
  emerald: { bg: "bg-emerald-500", text: "text-emerald-500", bgLight: "bg-emerald-500/10", cssColor: "#10b981" },
  cyan: { bg: "bg-cyan-500", text: "text-cyan-500", bgLight: "bg-cyan-500/10", cssColor: "#06b6d4" },
  purple: { bg: "bg-purple-500", text: "text-purple-500", bgLight: "bg-purple-500/10", cssColor: "#a855f7" },
  blue: { bg: "bg-blue-500", text: "text-blue-500", bgLight: "bg-blue-500/10", cssColor: "#3b82f6" },
  pink: { bg: "bg-pink-500", text: "text-pink-500", bgLight: "bg-pink-500/10", cssColor: "#ec4899" },
  amber: { bg: "bg-amber-500", text: "text-amber-500", bgLight: "bg-amber-500/10", cssColor: "#f59e0b" },
  red: { bg: "bg-red-500", text: "text-red-500", bgLight: "bg-red-500/10", cssColor: "#ef4444" },
  green: { bg: "bg-green-500", text: "text-green-500", bgLight: "bg-green-500/10", cssColor: "#22c55e" },
  indigo: { bg: "bg-indigo-500", text: "text-indigo-500", bgLight: "bg-indigo-500/10", cssColor: "#6366f1" },
  violet: { bg: "bg-violet-500", text: "text-violet-500", bgLight: "bg-violet-500/10", cssColor: "#8b5cf6" },
  teal: { bg: "bg-teal-500", text: "text-teal-500", bgLight: "bg-teal-500/10", cssColor: "#14b8a6" },
  orange: { bg: "bg-orange-500", text: "text-orange-500", bgLight: "bg-orange-500/10", cssColor: "#f97316" },
  rose: { bg: "bg-rose-500", text: "text-rose-500", bgLight: "bg-rose-500/10", cssColor: "#f43f5e" },
  fuchsia: { bg: "bg-fuchsia-500", text: "text-fuchsia-500", bgLight: "bg-fuchsia-500/10", cssColor: "#d946ef" },
  lime: { bg: "bg-lime-500", text: "text-lime-500", bgLight: "bg-lime-500/10", cssColor: "#84cc16" },
  sky: { bg: "bg-sky-500", text: "text-sky-500", bgLight: "bg-sky-500/10", cssColor: "#0ea5e9" },
  primary: { bg: "bg-primary", text: "text-primary", bgLight: "bg-primary/10", cssColor: "hsl(var(--primary))" },
};

const getColorClasses = (color: string) => {
  // If it's a hex color or CSS variable, return inline styles
  if (color.startsWith("#") || color.startsWith("rgb") || color.startsWith("hsl")) {
    return {
      bg: "",
      text: "",
      bgLight: "",
      cssColor: color,
      isCustom: true,
      customColor: color,
    };
  }

  // Extract base color name (e.g., "emerald-600" -> "emerald")
  const baseColor = color.replace(/-\d+$/, "");

  // Otherwise use the color map
  const mapped = colorMap[baseColor] || colorMap[color] || colorMap.primary;
  return {
    ...mapped,
    isCustom: false,
  };
};

interface HeroProps {
  title: string;
  itemTitle: string;
  description?: string;
  createDialog?: React.ReactNode;
  dialogSize?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | undefined;
  extraTopButtons?: (refresh?: () => void) => React.ReactNode;
  refresh: () => void;
  config?: DesignConfig;
  // Form configuration for custom create/edit titles and descriptions
  formConfig?: FormConfig;
  // Analytics integration
  hasAnalytics?: boolean;
  analyticsTab?: "overview" | "analytics";
  onAnalyticsTabChange?: (tab: "overview" | "analytics") => void;
  // View state for animated transitions
  currentView?: DataTableView;
}

export function Hero({
  title,
  itemTitle,
  description,
  createDialog,
  dialogSize,
  extraTopButtons,
  refresh,
  config = {},
  formConfig,
  hasAnalytics = false,
  analyticsTab = "overview",
  onAnalyticsTabChange,
  currentView = "overview",
}: HeroProps) {
  const t = useTranslations("common");
  // Only subscribe to permissions, not formState (FormActionButtons handles that separately)
  const hasEditPermission = useTableStore((state) => state.hasEditPermission);
  const hasCreatePermission = useTableStore((state) => state.hasCreatePermission);

  // Determine if we're in a form view (create/edit)
  const isFormView = currentView === "create" || currentView === "edit";
  const isCreateView = currentView === "create";

  // Responsive breakpoints for all device sizes
  // Mobile: < 640px, Tablet: 640-1023px, Desktop: >= 1024px
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");

  // Calculate responsive values based on device
  const getResponsivePadding = () => {
    if (isFormView) {
      // Form view: clean padding for fixed header across all devices
      if (isMobile) return "1rem";
      if (isTablet) return "1.25rem";
      return "1.5rem"; // Desktop
    } else {
      // Overview: more padding above title, reduced on smaller screens
      if (isMobile) return "4rem";
      if (isTablet) return "4.8rem";
      return "5.8rem"; // Desktop
    }
  };

  const getResponsiveBottomPadding = () => {
    if (isFormView) {
      // Form view: balanced bottom padding
      if (isMobile) return "0.75rem";
      if (isTablet) return "1rem";
      return "1.25rem"; // Desktop
    } else {
      // Overview: standard bottom padding
      if (isMobile) return "1rem";
      return "1.5rem"; // Tablet & Desktop
    }
  };

  const getResponsiveSpacerHeight = () => {
    // Spacer height for form views to push content below fixed hero
    // Must account for hero height + some breathing room
    if (isMobile) return "90px";
    if (isTablet) return "130px";
    return "75px"; // Desktop
  };
  const isEditView = currentView === "edit";

  const {
    animation = "orbs",
    primaryColor = "primary",
    secondaryColor = "purple",
    intensity = 20,
    icon: Icon = Sparkles,
    badge,
    stats,
  } = config;

  const primaryClasses = getColorClasses(primaryColor);

  // Title, description, and itemTitle are passed as already-translated strings from page.tsx
  // formConfig titles/descriptions are also already human-readable from useFormConfig() hooks
  // Use them directly without additional translation

  // Dynamic title and description for form views
  // Use custom titles/descriptions from formConfig if provided (already human-readable), otherwise build from itemTitle
  const displayTitle = isCreateView
    ? (formConfig?.create?.title || `${t("create")} ${itemTitle}`)
    : isEditView
      ? (formConfig?.edit?.title || `${t("edit")} ${itemTitle}`)
      : title;

  const displayDescription = isCreateView
    ? (formConfig?.create?.description || `${t("add")} ${t("new").toLowerCase()} ${itemTitle.toLowerCase()}`)
    : isEditView
      ? (formConfig?.edit?.description || `${t("edit")} ${itemTitle.toLowerCase()}`)
      : description;

  // Only show badge in overview mode (not in create/edit)
  const displayBadge = isFormView ? null : badge;

  // Dynamic icon for form views (only used in overview badge)
  const DisplayIcon = Icon;

  // Always show description
  const shouldShowDescription = Boolean(displayDescription);

  // Calculate staggered delays based on what elements are rendered
  const baseDelay = 0.2;
  const staggerDelay = 0.15;
  const badgeDelay = baseDelay;
  const titleDelay = displayBadge ? badgeDelay + staggerDelay : baseDelay;
  const descDelay = titleDelay + staggerDelay;
  const statsDelay = shouldShowDescription ? descDelay + staggerDelay : titleDelay + staggerDelay;
  const actionsDelay = displayBadge ? badgeDelay + staggerDelay : baseDelay;

  if (!title) return null;

  return (
    <>
      {/* Spacer to push content below fixed hero in form views */}
      {/* Height varies by device: mobile needs more, tablet moderate, desktop least */}
      {isFormView && (
        <div style={{ height: getResponsiveSpacerHeight() }} />
      )}
      <motion.div
        initial={false}
        animate={{
          // Responsive padding: mobile < tablet < desktop
          paddingTop: getResponsivePadding(),
          paddingBottom: getResponsiveBottomPadding(),
        }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50",
          // Form views: always fixed at top, covering navbar entirely
          isFormView && "fixed top-0 left-0 right-0 z-60 bg-background/95 backdrop-blur-md shadow-sm"
        )}
      >
      {/* Animated background effects */}
      <DesignAnimationRenderer
        animation={animation}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        intensity={isFormView ? intensity * 0.7 : intensity}
      />

      <div className="container mx-auto relative z-10">
        <div className={cn(
          "flex flex-col lg:flex-row lg:justify-between gap-3 sm:gap-4 lg:gap-6",
          isFormView ? "lg:items-center" : "lg:items-start"
        )}>
          {/* Left side - Title and description */}
          <div className={cn(
            "flex flex-col gap-1.5 sm:gap-2",
            // Fixed height in form view to prevent layout shifts during animation
            isFormView && "min-h-10 sm:min-h-12 justify-center"
          )}>
            <AnimatePresence mode="popLayout">
              {/* Badge - only in overview, slides from left */}
              {displayBadge && (
                <motion.div
                  key={`badge-${currentView}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: badgeDelay } }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit px-2 py-1 sm:px-3 sm:py-1.5 border-0 backdrop-blur-sm",
                      primaryClasses.isCustom ? "" : primaryClasses.bgLight
                    )}
                    style={
                      primaryClasses.isCustom
                        ? { backgroundColor: `${primaryClasses.customColor}1A` }
                        : undefined
                    }
                  >
                    <DisplayIcon
                      className={cn(
                        "h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5",
                        primaryClasses.isCustom ? "" : primaryClasses.text
                      )}
                      style={
                        primaryClasses.isCustom
                          ? { color: primaryClasses.customColor }
                          : undefined
                      }
                    />
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs font-medium",
                        primaryClasses.isCustom ? "" : primaryClasses.text
                      )}
                      style={
                        primaryClasses.isCustom
                          ? { color: primaryClasses.customColor }
                          : undefined
                      }
                    >
                      {displayBadge}
                    </span>
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 sm:gap-3">
              <AnimatePresence mode="popLayout">
                <motion.h1
                  key={`title-${currentView}`}
                  initial={isFormView
                    ? { opacity: 0, y: 30, scale: 0.95 }
                    : { opacity: 0, x: -20 }
                  }
                  animate={{
                    opacity: 1, x: 0, y: 0, scale: 1,
                    transition: isFormView
                      ? { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }
                      : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: titleDelay }
                  }}
                  exit={{
                    opacity: 0,
                    ...(isFormView ? { y: 15, scale: 0.98 } : {}),
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className={cn(
                    "font-bold tracking-tight whitespace-nowrap",
                    // Responsive title sizes: mobile < tablet < desktop
                    isFormView
                      ? "text-xl sm:text-2xl md:text-3xl"
                      : "text-2xl sm:text-3xl md:text-4xl"
                  )}
                >
                  <span className="bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                    {displayTitle}
                  </span>
                </motion.h1>
              </AnimatePresence>
              {!isFormView && <HeaderClient />}
            </div>

            <AnimatePresence mode="popLayout">
              {shouldShowDescription && (
                <motion.p
                  key={`desc-${currentView}`}
                  initial={isFormView
                    ? { opacity: 0, y: 30, scale: 0.95 }
                    : { opacity: 0, x: -20 }
                  }
                  animate={{
                    opacity: 1, x: 0, y: 0, scale: 1,
                    transition: isFormView
                      ? { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }
                      : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: descDelay }
                  }}
                  exit={{
                    opacity: 0,
                    ...(isFormView ? { y: 15, scale: 0.98 } : {}),
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className={cn(
                    "text-zinc-600 dark:text-zinc-400 max-w-2xl whitespace-nowrap",
                    // Responsive description sizes
                    isFormView
                      ? "text-xs sm:text-sm"
                      : "text-sm sm:text-base md:text-lg"
                  )}
                >
                  {displayDescription}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Stats - Only show in overview mode, slides from left */}
            <AnimatePresence>
              {!isFormView && stats && stats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: statsDelay }
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                  className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 mt-2"
                >
                  {stats.map((stat, index) => {
                    const StatIcon = stat.icon;
                    const statColorClasses = stat.color
                      ? getColorClasses(stat.color)
                      : primaryClasses;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: statsDelay + index * 0.1 }}
                        className="flex items-center gap-2 sm:gap-3 group"
                      >
                        <div
                          className={cn(
                            "w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            statColorClasses.isCustom ? "" : statColorClasses.bgLight
                          )}
                          style={
                            statColorClasses.isCustom
                              ? { backgroundColor: `${statColorClasses.customColor}1A` }
                              : undefined
                          }
                        >
                          <StatIcon
                            className={cn(
                              "h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5",
                              statColorClasses.isCustom ? "" : statColorClasses.text
                            )}
                            style={
                              statColorClasses.isCustom
                                ? { color: statColorClasses.customColor }
                                : undefined
                            }
                          />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                            {stat.label}
                          </p>
                          <p
                            className={cn(
                              "font-bold text-base sm:text-lg",
                              statColorClasses.isCustom ? "" : statColorClasses.text
                            )}
                            style={
                              statColorClasses.isCustom
                                ? { color: statColorClasses.customColor }
                                : undefined
                            }
                          >
                            {stat.value}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right side - Actions and tabs in single row */}
          <div className={cn(
            "flex items-center gap-2 sm:gap-3",
            // Fixed height in form view to prevent layout shifts during animation
            isFormView && "min-h-9 justify-center"
          )}>
            <AnimatePresence mode="popLayout">
              {isFormView ? (
                /* Form view actions - Cancel and Save buttons, fade in with y movement only (no scale to prevent jitter) */
                <motion.div
                  key="form-actions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                      delay: 0.25,
                    }
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    transition: { duration: 0.3, ease: "easeOut" }
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9"
                >
                  {/* FormActionButtons handles its own formState subscription to prevent parent re-renders */}
                  <FormActionButtons
                    isEditView={isEditView}
                    hasEditPermission={hasEditPermission}
                    hasCreatePermission={hasCreatePermission}
                  />
                </motion.div>
              ) : (
                /* Overview actions - buttons and tabs in single row, slide from right */
                <motion.div
                  key="overview-actions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: actionsDelay } }}
                  exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  {extraTopButtons && (
                    <div className="flex items-center gap-2">
                      {extraTopButtons(refresh)}
                    </div>
                  )}
                  <HeaderCreateButton
                    itemTitle={itemTitle}
                    createDialog={createDialog}
                    dialogSize={dialogSize}
                  />
                  {/* Analytics tabs - inline with buttons, responsive */}
                  {hasAnalytics && onAnalyticsTabChange && (
                    <Tabs
                      value={analyticsTab}
                      onValueChange={(value) =>
                        onAnalyticsTabChange(value as "overview" | "analytics")
                      }
                      className="w-auto"
                    >
                      <TabsList
                        className={cn(
                          "grid grid-cols-2 h-9.5 p-0.5 rounded-lg",
                          "bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-sm",
                          "border border-zinc-200/50 dark:border-zinc-700/50"
                        )}
                      >
                        <TabsTrigger
                          value="overview"
                          className={cn(
                            "rounded-md gap-1 sm:gap-2 text-sm font-medium transition-all px-2 sm:px-3 h-full",
                            "data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900",
                            "data-[state=active]:shadow-sm",
                            "flex items-center justify-center"
                          )}
                          style={
                            analyticsTab === "overview"
                              ? { color: primaryClasses.cssColor }
                              : undefined
                          }
                        >
                          <Table2
                            className="h-4 w-4"
                            style={
                              analyticsTab === "overview"
                                ? { color: primaryClasses.cssColor }
                                : undefined
                            }
                          />
                          <span className="hidden sm:inline">{t("overview")}</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="analytics"
                          className={cn(
                            "rounded-md gap-1 sm:gap-2 text-sm font-medium transition-all px-2 sm:px-3 h-full",
                            "data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900",
                            "data-[state=active]:shadow-sm",
                            "flex items-center justify-center"
                          )}
                          style={
                            analyticsTab === "analytics"
                              ? { color: primaryClasses.cssColor }
                              : undefined
                          }
                        >
                          <BarChart3
                            className="h-4 w-4"
                            style={
                              analyticsTab === "analytics"
                                ? { color: primaryClasses.cssColor }
                                : undefined
                            }
                          />
                          <span className="hidden sm:inline">{t("analytics")}</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
    </>
  );
}
