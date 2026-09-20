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
  ChevronLeft,
  Sparkles,
  Search,
  RotateCcw,
  LayoutGrid,
  List,
  Filter,
  RefreshCw,
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
import { m, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDirtyForm } from "@/context/dirty-form-context";
import {
  SETTINGS_BAND,
  SETTINGS_BAND_CONTROL,
  SETTINGS_BAND_INNER,
  SETTINGS_BODY,
  SETTINGS_CONTAINER,
  SETTINGS_DESCRIPTION,
  SETTINGS_MARK,
  SETTINGS_MARK_ICON,
  SETTINGS_ROOT,
  SETTINGS_SIDEBAR,
  SETTINGS_SIDEBAR_STACK,
  SETTINGS_TITLE,
} from "./layout";

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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <AnimatePresence>
      {hasChanges && (
        <m.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur-xl border rounded-2xl shadow-2xl">
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 rounded-full"
            >
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="text-sm font-medium text-warning">
                {tCommon("unsaved_changes")}
              </span>
            </m.div>

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
              loading={isSaving}
              size="sm"
              className="gap-2"
            >
              {!isSaving &&
                (saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                ))}
              <span>
                {isSaving ? `${tCommon("saving")}…` : saveSuccess ? t("saved") : tCommon("save_changes")}
              </span>
            </Button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

// Success toast component
const SuccessToast = ({ show }: { show: boolean }) => {
  const t = useTranslations("dashboard_admin");
  return (
    <AnimatePresence>
      {show && (
        <m.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-success/10 backdrop-blur-xl border border-success/20 rounded-2xl shadow-2xl">
            <div className="p-1.5 bg-success rounded-full">
              <Check className="w-3 h-3 text-success-foreground" />
            </div>
            <span className="text-sm font-medium text-success">
              {t("settings_saved_successfully_1")}
            </span>
          </div>
        </m.div>
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
  /**
   * Banners/warnings shown directly under the hero, inside the page container.
   * Rendering them here rather than above <SettingsPage> keeps them on the
   * page's own background and at the same width as the settings themselves.
   */
  alertContent?: React.ReactNode;
}

export function SettingsPage({
  config,
  settings,
  onSettingsChange,
  tabIcons = {},
  tabDescriptions = {},
  customComponents,
  subcategoryIcons,
  alertContent,
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

  /*
    WHICH FIELDS ARE SHOWING A DEFAULT RATHER THAN A SAVED VALUE.

    `mergedSettings` above is `{...DEFAULT_SETTINGS, ...databaseRows}`, and the
    controls render from it — so a switch with NO row on the server draws itself
    with the same confidence as one an operator saved. That is not a cosmetic
    gap. Nothing seeds the `settings` table (initial.sql issues zero INSERTs into
    it) and the save is changed-keys-only, so a switch nobody has touched has no
    row for the life of the install; every backend reader then decides for itself
    what an absent row means, and the panel has no way to say "this is my
    default, not the server's answer". `verifyEmailStatus` sat that way for
    years: the screen said email verification was ON and seven readers behaved as
    if it were OFF.

    `key in settings` and not a truthiness test — a saved empty string is still a
    row, and `settings` here is the raw row set from `/api/settings`, not the
    merged view. Every consumer of this component gates its render on
    `settingsFetched` and a non-empty settings object, so an empty `settings` is
    "no rows", never "not loaded yet".

    DISPLAY ONLY. This deliberately does not touch the save payload filter below,
    which is correct and load-bearing: resubmitting untouched keys 403s the whole
    save on protected keys.
  */
  const unconfiguredKeys = useMemo(() => {
    const missing = new Set<string>();
    for (const field of fields) {
      // Two keys are stripped from `/api/settings` because they are credentials
      // (backend/src/api/settings/index.get.ts:SERVER_ONLY_SETTING_KEYS), so
      // their absence here says nothing about whether a row exists. Claiming
      // "not configured" for a captcha secret that IS configured would be a
      // worse lie than the one this chip exists to fix.
      if (field.key === "captchaSecretKey" || field.key === "geoRestrictionLookupApiKey") continue;
      if (!(field.key in settings)) missing.add(field.key);
    }
    return missing;
  }, [fields, settings]);

  const tabFromUrl = searchParams.get("tab");
  const validTab = tabs.find((tab) => tab.id === tabFromUrl)?.id || tabs[0]?.id || "";
  const [activeTab, setActiveTab] = useState(validTab);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [draftSettings, setDraftSettings] = useState<Record<string, any>>({});
  // Keys the admin explicitly edited this session. Needed so a field set to
  // its config default can still be persisted when no DB row exists yet
  // (display uses defaults, but the backend only knows stored rows).
  const [touchedKeys, setTouchedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tabs" | "all">("tabs");
  const [isClearingCache, setIsClearingCache] = useState(false);

  /* A `customContent` tab owns its own editing state, and leaving the tab
     unmounts it. `useDirtyForm` is how such a tab reports that it is holding
     unsaved edits; without a DirtyFormProvider above this page the context
     default is `isDirty: false`, so this is inert for every field-only
     settings page. */
  const { isDirty: customTabDirty, setDirty: setCustomTabDirty } = useDirtyForm();
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(
    null
  );

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

      if (normalizedDraft !== normalizedConfig) return true;

      // A touched key sitting at its config default still counts as a change
      // when the persisted value differs (e.g. no DB row exists yet).
      return (
        touchedKeys.has(key) &&
        normalizedDraft !== normalizeValue(settings[key])
      );
    });

    setHasChanges(hasActualChanges);
  }, [draftSettings, mergedSettings, settings, touchedKeys, normalizeValue]);

  const handleChange = useCallback((key: string, value: string | File | null) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
    setTouchedKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
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

      // Include only settings whose value actually changed (covers custom
      // component keys too). Unchanged keys must not be resubmitted: the
      // backend treats every submitted key as a write request, and protected
      // keys (e.g. withdrawApproval) are Super-Admin-only.
      Object.entries(processedSettings).forEach(([key, value]) => {
        if (!(value instanceof File)) {
          // Check if this value is different from the merged settings (defaults + original)
          const originalValue = mergedSettings[key];
          const normalizedDraft = normalizeValue(value);
          const normalizedOriginal = normalizeValue(originalValue);

          // Send a key when it differs from the display baseline, or when the
          // admin touched it and it differs from the persisted value — that
          // second case persists a config default that has no DB row yet.
          const isChanged =
            normalizedDraft !== normalizedOriginal ||
            (touchedKeys.has(key) &&
              normalizedDraft !== normalizeValue(settings[key]));

          if (isChanged) {
            if (value === null || value === undefined) {
              // Cleared value: persist as empty string rather than dropping
              // the change (the backend stores "" for cleared settings).
              cleanPayload[key] = "";
            } else {
              let cleanValue = value;
              if (typeof value === "object") {
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

      // Last chance to inspect, amend or abandon the write. Returning null
      // leaves the form exactly as it was — still dirty, nothing sent — so a
      // cancelled confirmation is a no-op rather than a silent partial save.
      let payloadToSend = cleanPayload;
      if (config.onBeforeSaveAsync) {
        const gated = await config.onBeforeSaveAsync(cleanPayload);
        // The `finally` below clears the saving flag on this path too.
        if (!gated) return;
        payloadToSend = gated;
      }

      const endpoint = apiEndpoint || "/api/admin/system/settings";
      const { error } = await $fetch({
        url: endpoint,
        method: "PUT",
        body: payloadToSend,
      });

      if (!error) {
        // Merge only the actually-saved keys into the existing settings. The
        // defaults-merged draft must NOT be pushed into the global store — it
        // would make every config default look persisted app-wide (and feed
        // protected keys into other pages' save payloads).
        const updatedSettings = { ...settings, ...cleanPayload };

        if (onSettingsChange) {
          onSettingsChange(updatedSettings);
        }
        setTouchedKeys(new Set());
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
    setTouchedKeys(new Set());
    setHasChanges(false);
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const { data, error } = await $fetch<{
        success: boolean;
        message: string;
        settingsCount: number;
      }>({
        url: "/api/admin/system/settings/cache",
        method: "POST",
      });

      if (data?.success) {
        // Reload the page to get fresh settings
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to clear cache:", error);
    } finally {
      setIsClearingCache(false);
    }
  };

  /* Navigating away from a custom tab throws away whatever it is holding, so
     ask first. Field edits are safe — they live in draftSettings, which
     survives a tab switch — which is why this only consults the custom-tab
     dirty flag. */
  const runGuarded = (navigate: () => void) => {
    if (customTabDirty) {
      setPendingNavigation(() => navigate);
      return;
    }
    navigate();
  };

  const confirmPendingNavigation = () => {
    const navigate = pendingNavigation;
    setPendingNavigation(null);
    setCustomTabDirty(false);
    navigate?.();
  };

  const handleTabChange = (tabId: string) => {
    runGuarded(() => {
      setActiveTab(tabId);
      setViewMode("tabs");
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set("tab", tabId);
      router.replace(`?${newSearchParams.toString()}`);
    });
  };

  const handleViewModeChange = (mode: "tabs" | "all") => {
    if (mode === viewMode) return;
    runGuarded(() => setViewMode(mode));
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);
  const ActiveIcon = tabIcons[activeTab] || activeTabData?.icon || Settings;
  const activeColors = mergedTabColors[activeTab] || DEFAULT_TAB_COLORS.general;

  return (
    <TooltipProvider>
      {/* R3: the page ground is a ramp step, not a vertical wash.
       *
       * `pt-header` is header CLEARANCE, not taste. Every route using this
       * component — /admin/system/settings, /admin/trading/settings,
       * geo-restriction, blog, and the eleven addon settings pages — used to be
       * listed in `dashboard.provider.tsx`'s `excludedPaths` and rendered with no
       * chrome at all, so the band below could start at y=0. They now render
       * inside the admin shell's `fixed h-header` top bar, and without this the
       * band (and the tab rail under it) slide underneath it.
       *
       * `pt-header` and not `pt-header-clear`: the band is a full-bleed surface
       * that should sit flush against the bar, where `PageShell`'s
       * `pt-header-clear` adds the extra 2rem a contained page wants. */}
      <div className={SETTINGS_ROOT}>
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
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={SETTINGS_BAND}
        >
          {/*
           * Two background layers were removed here, and only one of them was
           * ever visible.
           *
           * The animated one interpolated `activeColors.bg` — a Tailwind CLASS
           * ("bg-primary/10") — into a CSS colour slot, so the declaration read
           * `radial-gradient(circle at 20% 50%, bg-primary/10 0%, ...)`. That is
           * invalid CSS: the browser dropped the whole rule. It has been a
           * 15-second infinite framer-motion loop repainting nothing.
           *
           * The other was a symmetric accent wash standing in for elevation,
           * which is what R3 replaces with `card` + a hairline.
           */}
          <div className={SETTINGS_BAND_INNER}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
              {/* Title Section */}
              <div className="flex items-center gap-3">
                {backUrl && (
                  // asChild rather than a <Link> wrapping a <Button>: nesting a
                  // button inside an anchor is invalid markup and left the
                  // anchor unstyled, so only the inner box was clickable.
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "shrink-0 w-9 rounded-lg hover:bg-muted",
                      SETTINGS_BAND_CONTROL
                    )}
                  >
                    <Link href={backUrl} aria-label={tCommon("back")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Link>
                  </Button>
                )}

                {/* The icon tile is a mark, so it takes the accent tint recipe
                    the rest of the system uses — not a solid fill under a
                    coloured `shadow-{tone}` glow, which R3 rules out. */}
                <div
                  className={cn(
                    SETTINGS_MARK,
                    activeColors.bg,
                    activeColors.border
                  )}
                >
                  <Settings
                    className={cn(SETTINGS_MARK_ICON, activeColors.text)}
                  />
                </div>

                <div className="min-w-0">
                  <m.h1 layout className={SETTINGS_TITLE}>
                    {title}
                  </m.h1>
                  <p className={SETTINGS_DESCRIPTION}>{description}</p>
                </div>
              </div>

              {/* Search and View Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 lg:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`${tCommon("search_settings")}…`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-9 bg-background/50 border-muted-foreground/20 rounded-lg",
                      SETTINGS_BAND_CONTROL
                    )}
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div
                  className={cn(
                    "flex items-center bg-muted/50 rounded-lg p-0.5",
                    SETTINGS_BAND_CONTROL
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "tabs" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => handleViewModeChange("tabs")}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("category_view")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === "all" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => handleViewModeChange("all")}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("all_settings")}</TooltipContent>
                  </Tooltip>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "w-9 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive",
                        SETTINGS_BAND_CONTROL
                      )}
                      onClick={handleClearCache}
                      loading={isClearingCache}
                    >
                      {!isClearingCache && <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("clear_settings_cache")}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Tab Navigation - Mobile only */}
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 -mx-4 px-4 lg:hidden"
            >
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                <LayoutGroup>
                  {tabs.map((tab, index) => {
                    const Icon = tabIcons[tab.id] || tab.icon || Settings;
                    const colors = mergedTabColors[tab.id] || DEFAULT_TAB_COLORS.general;
                    const isActive = activeTab === tab.id && viewMode === "tabs";
                    const hasChanged = changedCounts[tab.id] > 0;

                    return (
                      <m.button
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
                                "bg-card text-foreground",
                                colors.border,
                                "border-2"
                              )
                            : "bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            isActive ? colors.iconBg : "bg-muted"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4 h-4",
                              isActive ? "text-primary-foreground" : "text-muted-foreground"
                            )}
                          />
                        </div>

                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span>{tab.label}</span>
                            {hasChanged && (
                              <m.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 rounded-full bg-warning"
                              />
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <m.div
                            layoutId="activeTabIndicator"
                            className="absolute inset-0 rounded-xl border-2 border-primary/30"
                            transition={{ type: "spring", damping: 30, stiffness: 400 }}
                          />
                        )}
                      </m.button>
                    );
                  })}
                </LayoutGroup>
              </div>
            </m.div>
          </div>
        </m.div>

        {/* Main Content */}
        <div className={SETTINGS_CONTAINER}>
          {/* empty:hidden so a slot that renders nothing leaves no stray gap */}
          {alertContent && (
            <div className="mb-6 space-y-2 empty:hidden">{alertContent}</div>
          )}
          <div className={SETTINGS_BODY}>
            {/* Sidebar - Desktop only */}
            <m.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={SETTINGS_SIDEBAR}
            >
              <div className={SETTINGS_SIDEBAR_STACK}>
                {/* Quick Stats Card */}
                {/* The 4px cap rule that used to sit here painted nothing: it
                    carried `from-`, `via-` and `to-` colour stops with no
                    `bg-linear-to-` utility to turn them into a
                    `background-image`, so it rendered as an empty 4px strip in
                    every settings page in the app. */}
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tCommon("total_settings")}</span>
                        <Badge variant="secondary">{fields.length}</Badge>
                      </div>

                      {hasChanges && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="flex items-center justify-between text-warning"
                        >
                          <span className="text-sm font-medium">{tCommon("unsaved_changes")}</span>
                          <Badge
                            variant="outline"
                            className="border-warning/30 bg-warning/10 text-warning-ink"
                          >
                            {
                              Object.keys(draftSettings).filter(
                                (k) => draftSettings[k] !== mergedSettings[k]
                              ).length
                            }
                          </Badge>
                        </m.div>
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
                          <m.button
                            key={tab.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.3 }}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group",
                              isActive
                                ? cn("bg-card", colors.border, "border")
                                : "hover:bg-muted"
                            )}
                          >
                            <div
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
                                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                                )}
                              />
                            </div>

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
                                  <m.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-2 h-2 rounded-full bg-warning"
                                  />
                                )}
                              </div>
                              {/* WRAPS. The rail is `w-72`, and after the icon
                                  tile, the gaps and the count badge the text
                                  column is about 170px — under half of what a
                                  tab description like "Where it answers, and
                                  when it hands over" needs on one line. With
                                  `truncate` every rail entry read as three
                                  words and an ellipsis, which is the one place
                                  the operator is choosing WHICH tab to open. */}
                              {desc && (
                                <p className="text-xs text-muted-foreground leading-snug">
                                  {desc}
                                </p>
                              )}
                            </div>

                            {/* A custom tab has no fields to count, and a "0"
                                beside its name reads as "nothing in here". */}
                            {!tab.customContent && (
                              <Badge
                                variant="secondary"
                                className={cn("text-xs", isActive && colors.text)}
                              >
                                {fieldCounts[tab.id]}
                              </Badge>
                            )}
                          </m.button>
                        );
                      })}
                    </nav>
                  </CardContent>
                </Card>

                {/* Pro Tip Card */}
                <m.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {/* The accent survives in the border and the icon tile, which
                      is where R2 wants it — not as a wash across the card. */}
                  <Card className="overflow-hidden border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t("quick_tip")}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("use_the_search_bar_to_quickly")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </m.div>
              </div>
            </m.div>

            {/* Content Area */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-1 min-w-0 pb-24"
            >
              <AnimatePresence mode="wait">
                <m.div
                  key={viewMode === "all" ? "all" : activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* A custom tab holds no fields, so a search that matches
                      none of them must not blank it out — leaving a search term
                      in the box and clicking Blockchains would have shown "No
                      settings found" over a tab that has plenty in it. */}
                  {searchQuery &&
                  displayFields.length === 0 &&
                  !(viewMode === "tabs" && activeTabData?.customContent) ? (
                    <Card className="p-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-muted">
                          <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">{t("no_settings_found")}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("try_searching_with_different_keywords")}
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => setSearchQuery("")}>
                          {tCommon("clear_search")}
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
                      unconfiguredKeys={unconfiguredKeys}
                    />
                  ) : activeTabData?.customContent ? (
                    // A custom tab owns its own container — `SettingsSectionCard`
                    // gives it the same Card, header band and padding a
                    // field-driven tab gets. Wrapping it here as well produced a
                    // card inside a card for any tab that rendered its own
                    // surface, and forced 24px of padding on ones that wanted to
                    // run edge to edge (a table, a list).
                    (() => {
                      const CustomTabContent = activeTabData.customContent;
                      return (
                        <CustomTabContent
                          formValues={draftSettings}
                          handleChange={handleChange}
                          settings={settings}
                        />
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
                      unconfiguredKeys={unconfiguredKeys}
                    />
                  )}
                </m.div>
              </AnimatePresence>
            </m.div>
          </div>
        </div>

        <AlertDialog
          open={pendingNavigation !== null}
          onOpenChange={(open) => {
            if (!open) setPendingNavigation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tCommon("discard_unsaved_changes")}</AlertDialogTitle>
              <AlertDialogDescription>
                {tCommon("you_have_unsaved_changes")}. Leaving this section will
                discard them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingNavigation(null)}>
                {tCommon("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmPendingNavigation}
                variant="destructive"
              >
                Discard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
