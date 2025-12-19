"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Save,
  X,
  Settings,
  Check,
  Loader2,
  ChevronLeft,
  Sparkles,
  Search,
  RotateCcw,
  LayoutGrid,
  List,
  Filter,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { SettingsTab } from "./SettingsTab";
import {
  FieldDefinition,
  TabDefinition,
  TabColors,
  SettingsPageConfig,
  DEFAULT_TAB_COLORS,
} from "./types";
import { useTranslations } from "next-intl";
import { imageUploader } from "@/utils/upload";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Floating action button component
const FloatingActions = ({
  hasChanges,
  isSaving,
  saveSuccess,
  onSave,
  onCancel,
}: {
  hasChanges: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  onSave: () => void;
  onCancel: () => void;
}) => {
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-xl border rounded-2xl shadow-2xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-full"
            >
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-medium text-amber-500">
                Unsaved changes
              </span>
            </motion.div>

            <div className="w-px h-8 bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSaving}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Discard</span>
            </Button>

            <Button
              onClick={onSave}
              disabled={isSaving}
              size="sm"
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save changes"}
              </span>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Success toast component
const SuccessToast = ({ show }: { show: boolean }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl">
            <div className="p-1.5 bg-emerald-500 rounded-full">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-500">
              Settings saved successfully!
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface SettingsPageProps {
  config: SettingsPageConfig;
  settings: Record<string, any>;
  onSettingsChange?: (settings: Record<string, any>) => void;
  tabIcons?: Record<string, React.ElementType>;
  tabDescriptions?: Record<string, string>;
  customComponents?: Record<string, React.FC<{
    formValues: Record<string, any>;
    handleChange: (key: string, value: string | File | null) => void;
  }>>;
  subcategoryIcons?: Record<string, React.ElementType>;
}

export function SettingsPage({
  config,
  settings,
  onSettingsChange,
  tabIcons = {},
  tabDescriptions = {},
  customComponents,
  subcategoryIcons,
}: SettingsPageProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const { tabs, fields, title, description, backUrl, apiEndpoint, tabColors, defaultValues } = config;

  // Merge default values with settings - defaults are used for newly installed sites
  const mergedSettings = useMemo(() => {
    if (!defaultValues) return settings;
    return { ...defaultValues, ...settings };
  }, [settings, defaultValues]);

  const tabFromUrl = searchParams.get("tab");
  const validTab = tabs.find((tab) => tab.id === tabFromUrl)?.id || tabs[0]?.id || "";
  const [activeTab, setActiveTab] = useState(validTab);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [draftSettings, setDraftSettings] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tabs" | "all">("tabs");

  const validFieldKeys = useMemo(() => new Set(fields.map((field) => field.key)), [fields]);

  // Merge tab colors with defaults
  const mergedTabColors = useMemo(() => {
    const merged: Record<string, TabColors> = { ...DEFAULT_TAB_COLORS };
    if (tabColors) {
      Object.entries(tabColors).forEach(([key, value]) => {
        merged[key] = value;
      });
    }
    return merged;
  }, [tabColors]);

  // Count fields per tab and changed fields
  const { fieldCounts, changedCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    const changed: Record<string, number> = {};
    tabs.forEach((tab) => {
      const tabFields = fields.filter((f) => f.category === tab.id);
      counts[tab.id] = tabFields.length;
      changed[tab.id] = tabFields.filter(
        (f) => draftSettings[f.key] !== mergedSettings[f.key]
      ).length;
    });
    return { fieldCounts: counts, changedCounts: changed };
  }, [draftSettings, mergedSettings, tabs, fields]);

  // Search filtered fields
  const filteredFields = useMemo(() => {
    if (!searchQuery.trim()) return fields;
    const query = searchQuery.toLowerCase();
    return fields.filter(
      (field) =>
        field.label.toLowerCase().includes(query) ||
        field.description?.toLowerCase().includes(query) ||
        field.key.toLowerCase().includes(query) ||
        field.subcategory?.toLowerCase().includes(query)
    );
  }, [searchQuery, fields]);

  // Get fields for current view
  const displayFields = useMemo(() => {
    if (viewMode === "all") return filteredFields;
    return filteredFields.filter((field) => field.category === activeTab);
  }, [viewMode, activeTab, filteredFields]);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTab = tabs.find((tab) => tab.id === tabFromUrl)?.id || tabs[0]?.id || "";
    setActiveTab(validTab);
  }, [searchParams, tabs]);

  useEffect(() => {
    // Initialize draftSettings with mergedSettings (defaults + actual settings)
    if (Object.keys(mergedSettings).length > 0) {
      setDraftSettings({ ...mergedSettings });
    }
  }, [mergedSettings]);

  // Helper function to normalize values for comparison
  // Handles strings, numbers, objects, arrays, null, undefined
  // Also handles JSON strings by parsing and re-stringifying them for consistent comparison
  const normalizeValue = useCallback((value: any): string => {
    if (value === undefined || value === null) return "";
    if (value instanceof File) return `[File:${value.name}:${value.size}]`;
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    // For strings, try to parse as JSON and re-stringify for consistent comparison
    // This handles cases where the stored value is a JSON string
    if (typeof value === "string") {
      const trimmed = value.trim();
      // Check if it looks like JSON (starts with { or [)
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
          (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
          const parsed = JSON.parse(trimmed);
          return JSON.stringify(parsed);
        } catch {
          // Not valid JSON, return as-is
        }
      }
    }
    return String(value);
  }, []);

  // Check for actual changes - check ALL keys in draftSettings, not just validFieldKeys
  // This is necessary because custom components may update keys that aren't defined as fields
  useEffect(() => {
    // Get all keys that exist in either draftSettings or mergedSettings
    const allKeys = new Set([
      ...Object.keys(draftSettings),
      ...Object.keys(mergedSettings),
    ]);

    const hasActualChanges = Array.from(allKeys).some((key) => {
      const draftValue = draftSettings[key];
      const configValue = mergedSettings[key];

      if (draftValue instanceof File) return true;

      const normalizedDraft = normalizeValue(draftValue);
      const normalizedConfig = normalizeValue(configValue);

      return normalizedDraft !== normalizedConfig;
    });

    setHasChanges(hasActualChanges);
  }, [draftSettings, mergedSettings, normalizeValue]);

  const handleChange = useCallback((key: string, value: string | File | null) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Apply onBeforeSave hook if provided
      let processedSettings = { ...draftSettings };
      if (config.onBeforeSave) {
        processedSettings = config.onBeforeSave(processedSettings);
      }

      const fileUploadPromises: Promise<{ key: string; url: string }>[] = [];

      Object.entries(processedSettings).forEach(([key, value]) => {
        if (validFieldKeys.has(key) && value instanceof File) {
          const fieldDef = fields.find((f) => f.key === key);
          const size = fieldDef?.fileSize || {
            maxWidth: 1024,
            maxHeight: 1024,
          };

          const uploadPromise = imageUploader({
            file: value,
            dir: "settings",
            size: {
              width: "width" in size ? size.width : undefined,
              height: "height" in size ? size.height : undefined,
              maxWidth: "width" in size ? size.width : size.maxWidth,
              maxHeight: "height" in size ? size.height : size.maxHeight,
            },
            oldPath: typeof settings[key] === "string" ? settings[key] : "",
          }).then((result) => {
            if (result.success && result.url) {
              return { key, url: result.url };
            } else {
              throw new Error(`Failed to upload ${key}: ${result.error}`);
            }
          });

          fileUploadPromises.push(uploadPromise);
        }
      });

      const uploadResults = await Promise.all(fileUploadPromises);

      const cleanPayload: Record<string, any> = {};

      uploadResults.forEach(({ key, url }) => {
        cleanPayload[key] = url;
      });

      // Include all changed settings, not just validFieldKeys
      // Custom components may update keys that aren't defined as fields
      Object.entries(processedSettings).forEach(([key, value]) => {
        if (!(value instanceof File)) {
          // Check if this value is different from the merged settings (defaults + original)
          const originalValue = mergedSettings[key];
          const normalizedDraft = normalizeValue(value);
          const normalizedOriginal = normalizeValue(originalValue);

          // Only include if it's a field key OR if the value has changed
          if (validFieldKeys.has(key) || normalizedDraft !== normalizedOriginal) {
            if (value !== null && value !== undefined) {
              let cleanValue = value;
              if (typeof value === "object" && value !== null) {
                try {
                  cleanValue = JSON.stringify(value);
                } catch (e) {
                  console.warn(`Skipping invalid setting ${key}:`, e);
                  return;
                }
              }
              cleanPayload[key] = String(cleanValue);
            }
          }
        }
      });

      const endpoint = apiEndpoint || "/api/admin/system/settings";
      const { error } = await $fetch({
        url: endpoint,
        method: "PUT",
        body: cleanPayload,
      });

      if (!error) {
        // Merge the saved changes with the current draftSettings to get the full updated state
        // This ensures we update the store with ALL settings, not just the changed ones
        const updatedSettings = { ...draftSettings };

        // Apply the cleaned values from cleanPayload (which may have JSON stringified objects)
        Object.entries(cleanPayload).forEach(([key, value]) => {
          updatedSettings[key] = value;
        });

        if (onSettingsChange) {
          onSettingsChange(updatedSettings);
        }
        setHasChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);

        // Apply onAfterSave hook if provided
        if (config.onAfterSave) {
          config.onAfterSave(cleanPayload);
        }
      } else {
        throw new Error(error);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraftSettings({ ...mergedSettings });
    setHasChanges(false);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setViewMode("tabs");
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tabId);
    router.replace(`?${newSearchParams.toString()}`, { scroll: false });
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);
  const ActiveIcon = tabIcons[activeTab] || activeTabData?.icon || Settings;
  const activeColors = mergedTabColors[activeTab] || DEFAULT_TAB_COLORS.general;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Success Toast */}
        <SuccessToast show={saveSuccess && !hasChanges} />

        {/* Floating Action Bar */}
        <FloatingActions
          hasChanges={hasChanges}
          isSaving={isSaving}
          saveSuccess={saveSuccess}
          onSave={handleSave}
          onCancel={handleCancel}
        />

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden border-b bg-card/50 backdrop-blur-xl"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <motion.div
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 20% 50%, ${activeColors.bg} 0%, transparent 50%)`,
            }}
          />

          <div className="relative container mx-auto px-4 py-6 lg:py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Title Section */}
              <div className="flex items-center gap-4">
                {backUrl && (
                  <Link href={backUrl}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </Link>
                )}

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={cn(
                    "p-3 rounded-2xl shrink-0 shadow-lg",
                    activeColors.iconBg,
                    activeColors.glow
                  )}
                >
                  <Settings className="w-6 h-6 text-white" />
                </motion.div>

                <div className="min-w-0">
                  <motion.h1
                    layout
                    className="text-2xl lg:text-3xl font-bold tracking-tight"
                  >
                    {title}
                  </motion.h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                </div>
              </div>

              {/* Search and View Toggle */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 lg:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search settings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-background/50 border-muted-foreground/20 rounded-xl"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center bg-muted/50 rounded-xl p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "tabs" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setViewMode("tabs")}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Category View</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "all" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setViewMode("all")}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>All Settings</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Mobile only */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 -mx-4 px-4 lg:hidden"
            >
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
                <LayoutGroup>
                  {tabs.map((tab, index) => {
                    const Icon = tabIcons[tab.id] || tab.icon || Settings;
                    const colors = mergedTabColors[tab.id] || DEFAULT_TAB_COLORS.general;
                    const isActive = activeTab === tab.id && viewMode === "tabs";
                    const hasChanged = changedCounts[tab.id] > 0;

                    return (
                      <motion.button
                        key={tab.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                          "relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0",
                          isActive
                            ? cn(
                                "bg-card text-foreground shadow-lg",
                                colors.border,
                                "border-2"
                              )
                            : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isActive ? colors.iconBg : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4",
                              isActive ? "text-white" : "text-muted-foreground"
                            )}
                          />
                        </motion.div>

                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span>{tab.label}</span>
                            {hasChanged && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 rounded-full bg-amber-500"
                              />
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <motion.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 rounded-xl border-2 border-primary/30"
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </LayoutGroup>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Desktop only */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden lg:block w-72 shrink-0"
            >
              <div className="sticky top-6 space-y-4">
                {/* Quick Stats Card */}
                <Card className="overflow-hidden">
                  <div
                    className={cn(
                      "h-1 w-full bg-gradient-to-r",
                      activeColors.gradient
                    )}
                  />
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Settings</span>
                        <Badge variant="secondary">{fields.length}</Badge>
                      </div>

                      {hasChanges && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="flex items-center justify-between text-amber-500"
                        >
                          <span className="text-sm font-medium">Unsaved Changes</span>
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-500"
                          >
                            {
                              Object.keys(draftSettings).filter(
                                (k) => draftSettings[k] !== mergedSettings[k]
                              ).length
                            }
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Category Navigation */}
                <Card>
                  <CardContent className="p-3">
                    <nav className="space-y-1">
                      {tabs.map((tab, index) => {
                        const Icon = tabIcons[tab.id] || tab.icon || Settings;
                        const colors = mergedTabColors[tab.id] || DEFAULT_TAB_COLORS.general;
                        const isActive = activeTab === tab.id && viewMode === "tabs";
                        const hasChanged = changedCounts[tab.id] > 0;
                        const desc = tabDescriptions[tab.id] || tab.description;

                        return (
                          <motion.button
                            key={tab.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.3 }}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group",
                              isActive
                                ? cn("bg-card shadow-md", colors.border, "border")
                                : "hover:bg-muted"
                            )}
                          >
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                isActive
                                  ? colors.iconBg
                                  : "bg-muted group-hover:bg-muted-foreground/10"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "w-4 h-4",
                                  isActive ? "text-white" : "text-muted-foreground"
                                )}
                              />
                            </motion.div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p
                                  className={cn(
                                    "font-medium text-sm",
                                    isActive
                                      ? "text-foreground"
                                      : "text-muted-foreground group-hover:text-foreground"
                                  )}
                                >
                                  {tab.label}
                                </p>
                                {hasChanged && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 rounded-full bg-amber-500"
                                  />
                                )}
                              </div>
                              {desc && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {desc}
                                </p>
                              )}
                            </div>

                            <Badge
                              variant="secondary"
                              className={cn("text-xs", isActive && colors.text)}
                            >
                              {fieldCounts[tab.id]}
                            </Badge>
                          </motion.button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>

                {/* Pro Tip Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Quick Tip</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Use the search bar to quickly find specific settings
                            across all categories.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>

            {/* Content Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-1 min-w-0 pb-24"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode === "all" ? "all" : activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {searchQuery && displayFields.length === 0 ? (
                    <Card className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-muted">
                          <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">No settings found</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Try searching with different keywords
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => setSearchQuery("")}>
                          Clear search
                        </Button>
                      </div>
                    </Card>
                  ) : viewMode === "all" ? (
                    <SettingsTab
                      tabId="all"
                      tabLabel="All Settings"
                      fields={displayFields}
                      draftSettings={draftSettings}
                      onFieldChange={handleChange}
                      tabIcon={Filter}
                      tabColors={activeColors}
                      showCategoryBadges
                      tabs={tabs}
                      customComponents={customComponents}
                      subcategoryIcons={subcategoryIcons}
                    />
                  ) : activeTabData?.customContent ? (
                    // Render custom tab content if defined
                    (() => {
                      const CustomTabContent = activeTabData.customContent;
                      return (
                        <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                          <div
                            className={cn(
                              "h-1 w-full bg-gradient-to-r",
                              activeColors.gradient || "from-primary/50 via-primary to-primary/50"
                            )}
                          />
                          <CardContent className="p-6">
                            <CustomTabContent
                              formValues={draftSettings}
                              handleChange={handleChange}
                              settings={settings}
                            />
                          </CardContent>
                        </Card>
                      );
                    })()
                  ) : (
                    <SettingsTab
                      tabId={activeTab}
                      tabLabel={activeTabData?.label || ""}
                      fields={displayFields}
                      draftSettings={draftSettings}
                      onFieldChange={handleChange}
                      tabIcon={ActiveIcon}
                      tabColors={activeColors}
                      tabs={tabs}
                      customComponents={customComponents}
                      subcategoryIcons={subcategoryIcons}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
