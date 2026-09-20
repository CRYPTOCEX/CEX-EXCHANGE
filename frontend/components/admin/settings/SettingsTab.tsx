"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsField } from "./SettingsField";
import { FieldDefinition, TabDefinition, TabColors, DEFAULT_TAB_COLORS, CustomComponentProps } from "./types";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Settings,
  ChevronDown,
  Layers,
  Zap,
  Wallet,
  Share2,
  Palette,
  Circle,
  DollarSign,
  Shield,
  BarChart3,
  TrendingUp,
  Building,
  Users,
  Percent,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Default category icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  general: Settings,
  features: Zap,
  wallet: Wallet,
  social: Share2,
  logos: Palette,
  platform: Building,
  trading: TrendingUp,
  fees: DollarSign,
  security: Shield,
  commission: Percent,
  earnings: BarChart3,
  affiliate: Users,
};

// Default subcategory icons
const SUBCATEGORY_ICONS: Record<string, React.ElementType> = {
  General: Settings,
  Appearance: Settings,
  "Landing Page": Layers,
  Content: Layers,
  Support: Layers,
  Trading: Zap,
  Investment: Zap,
  Verification: Zap,
  "Wallet Types": Wallet,
  Transactions: Wallet,
  Security: Shield,
  Fees: DollarSign,
  "Social Media": Share2,
  "Mobile Apps": Share2,
  "Site Logos": Palette,
  Favicons: Palette,
  "Apple Touch Icons": Palette,
  "Android Icons": Palette,
  "Microsoft Icons": Palette,
  Platform: Building,
  Commission: Percent,
  Earnings: BarChart3,
  Affiliate: Users,
};

interface SettingsTabProps {
  tabId: string;
  tabLabel: string;
  fields: FieldDefinition[];
  draftSettings: Record<string, any>;
  onFieldChange: (key: string, value: string | File | null) => void;
  tabIcon?: React.ElementType;
  tabColors?: TabColors;
  showCategoryBadges?: boolean;
  tabs?: TabDefinition[];
  customComponents?: Record<string, React.FC<{
    formValues: Record<string, any>;
    handleChange: (key: string, value: string | File | null) => void;
  }>>;
  subcategoryIcons?: Record<string, React.ElementType>;
  /* Field keys with NO row on the server, so the control below is drawing the
     config default rather than a value the platform agreed to. Display only —
     see the derivation in SettingsPage.tsx. */
  unconfiguredKeys?: Set<string>;
}

interface SettingsGroupProps {
  subcategory: string;
  fields: FieldDefinition[];
  formValues: Record<string, any>;
  handleChange: (key: string, value: string | File | null) => void;
  isFirst?: boolean;
  tabColors: TabColors;
  index: number;
  showCategoryBadges?: boolean;
  tabs?: TabDefinition[];
  customComponents?: Record<string, React.FC<{
    formValues: Record<string, any>;
    handleChange: (key: string, value: string | File | null) => void;
  }>>;
  subcategoryIcons?: Record<string, React.ElementType>;
  availableAddons: Record<string, boolean>;
  unconfiguredKeys?: Set<string>;
}

// Check if a field should be full width
const shouldBeFullWidth = (field: FieldDefinition): boolean => {
  if (field.fullWidth) return true;
  if (field.preview) return true;
  if (field.type === "socialLinks") return true;
  return false;
};

// Extract addon name from module path for display
const getAddonDisplayName = (modulePath: string): string => {
  // Extract the addon name from paths like "@/components/(ext)/chart-engine"
  const match = modulePath.match(/\(ext\)\/([^/]+)/);
  if (match) {
    // Convert kebab-case to Title Case
    return match[1]
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return modulePath;
};

// Individual setting card with animation
const SettingCard = ({
  field,
  value,
  onChange,
  index,
  isLogosCategory,
  showCategoryBadge,
  tabs,
  formValues,
  isAddonMissing,
  isUnconfigured,
}: {
  field: FieldDefinition;
  value: any;
  onChange: (key: string, value: string | File | null) => void;
  index: number;
  isLogosCategory: boolean;
  showCategoryBadge?: boolean;
  tabs?: TabDefinition[];
  formValues?: Record<string, any>;
  isAddonMissing?: boolean;
  isUnconfigured?: boolean;
}) => {
  const categoryLabel = tabs?.find(t => t.id === field.category)?.label || field.category;
  const isFullWidth = shouldBeFullWidth(field) || field.type === "custom";
  const showAddonBadge = Boolean(isAddonMissing && field.addonRequired);

  /* Meta chips are handed to the FIELD, which drops them in beside its own
     label. They used to be pinned at `top-2 right-2` — the corner every field
     type already uses for its own control (the Switch in a `justify-between`
     row, the info-tooltip button, the size badge on logos), so the chip landed
     on top of it; and two chips pinned to that one corner stacked on each other
     whenever a categorised field was ALSO addon-gated. Giving them their own
     row fixed the overlap but spent a whole line of card height on a one-word
     tag, so they ride the label line instead. */
  const metaBadges =
    showCategoryBadge || showAddonBadge || isUnconfigured ? (
      <>
        {/* THE CONTROL IS DRAWING A DEFAULT, NOT AN ANSWER FROM THE SERVER.
            There is no row for this key, and the two sides do not have to agree
            about what that means — this is the chip that stops the panel
            asserting its own baseline as fact. `title` carries the long form,
            because the short one has to fit on a label line. */}
        {isUnconfigured && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground border-dashed"
            title="No value is stored for this setting, so the control is showing this platform's default. Save it to write the value explicitly."
          >
            Not configured — using default
          </Badge>
        )}
        {showAddonBadge && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-warning/10 text-warning-ink border-warning/20">
            Requires {getAddonDisplayName(field.addonRequired!)} Addon
          </Badge>
        )}
        {showCategoryBadge && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 capitalize font-normal text-muted-foreground"
          >
            {categoryLabel}
          </Badge>
        )}
      </>
    ) : null;

  // Handle custom field type
  if (field.type === "custom" && field.customRender) {
    const CustomComponent = field.customRender;
    return (
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
        className={cn(
          "group relative p-4 rounded-lg border border-border bg-card hover:border-border-strong transition-colors duration-300",
          "md:col-span-2"
        )}
      >
        <div className="relative">
          <CustomComponent
            formValues={formValues || {}}
            handleChange={onChange}
            meta={metaBadges}
          />
        </div>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        "group relative p-4 rounded-lg border border-border transition-colors duration-300",
        isAddonMissing
          ? "bg-muted/30 border-dashed opacity-60"
          : "bg-card hover:border-border-strong",
        isLogosCategory && "flex flex-col min-h-[200px]",
        isFullWidth && !isLogosCategory && "md:col-span-2"
      )}
    >
      <div
        className={cn(
          "relative",
          isLogosCategory && "flex-1",
          isAddonMissing && "pointer-events-none select-none"
        )}
      >
        <SettingsField
          field={field}
          value={value}
          onChange={onChange}
          disabled={isAddonMissing}
          meta={metaBadges}
        />
      </div>
    </m.div>
  );
};

const SettingsGroup: React.FC<SettingsGroupProps> = ({
  subcategory,
  fields,
  formValues,
  handleChange,
  isFirst,
  tabColors,
  index,
  showCategoryBadges,
  tabs,
  customComponents,
  subcategoryIcons,
  availableAddons,
  unconfiguredKeys,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const displayedFields = fields.filter(
    (field) => !field.showIf || field.showIf(formValues)
  );

  // Check if a field's addon is missing
  const isAddonMissing = (field: FieldDefinition): boolean => {
    if (!field.addonRequired) return false;
    return availableAddons[field.addonRequired] !== true;
  };

  const isLogosCategory = fields.some((field) => field.category === "logos");
  const mergedIcons = { ...SUBCATEGORY_ICONS, ...subcategoryIcons };
  const SubcategoryIcon = mergedIcons[subcategory] || Layers;

  /* In the All-Settings view a subcategory almost always belongs to exactly one
     category, so tagging every card in the group repeated the SAME chip once
     per card — four identical "Branding" chips across one row of logo cards,
     each one stealing width from a label that then truncated. Hoist the chip to
     the group header when the group is uniform, and only fall back to per-card
     chips for a genuinely mixed group (possible: this component is generic and
     a consumer may reuse one subcategory name across tabs). */
  const groupCategories = new Set(displayedFields.map((field) => field.category));
  const sharedCategory =
    showCategoryBadges && groupCategories.size === 1
      ? [...groupCategories][0]
      : null;
  const sharedCategoryLabel = sharedCategory
    ? tabs?.find((t) => t.id === sharedCategory)?.label || sharedCategory
    : null;

  // Calculate completion status
  const completedCount = displayedFields.filter((field) => {
    const value = formValues[field.key];
    if (field.type === "switch") return true;
    if (field.type === "file") return !!value;
    return value !== undefined && value !== null && value !== "";
  }).length;

  const completionPercentage = displayedFields.length > 0
    ? Math.round((completedCount / displayedFields.length) * 100)
    : 0;

  if (displayedFields.length === 0) return null;

  // Check for custom component for this subcategory
  const CustomComponent = customComponents?.[subcategory];

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="mb-4">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between gap-4 group py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors -mx-1">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    tabColors?.bg || "bg-primary/10"
                  )}
                >
                  <SubcategoryIcon
                    className={cn("w-4 h-4", tabColors?.text || "text-primary")}
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-foreground flex flex-wrap items-center gap-2">
                    {subcategory}
                    <Badge variant="secondary" className="text-xs font-normal">
                      {displayedFields.length}{" "}
                      {displayedFields.length === 1 ? "setting" : "settings"}
                    </Badge>
                    {sharedCategoryLabel && (
                      <Badge
                        variant="outline"
                        className="text-xs font-normal capitalize text-muted-foreground"
                      >
                        {sharedCategoryLabel}
                      </Badge>
                    )}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Completion indicator */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercentage}%` }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        completionPercentage === 100
                          ? "bg-success"
                          : "bg-primary"
                      )}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums">{completionPercentage}%</span>
                </div>

                <m.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground group-hover:text-foreground"
                >
                  <ChevronDown className="w-5 h-5" />
                </m.div>
              </div>
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <AnimatePresence>
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className={
                  isLogosCategory
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    : "grid grid-cols-1 md:grid-cols-2 gap-4"
                }
              >
                {displayedFields.map((field, fieldIndex) => (
                  <SettingCard
                    key={field.key}
                    field={field}
                    value={formValues[field.key]}
                    onChange={handleChange}
                    index={fieldIndex}
                    isLogosCategory={isLogosCategory}
                    showCategoryBadge={showCategoryBadges && !sharedCategory}
                    tabs={tabs}
                    formValues={formValues}
                    isAddonMissing={isAddonMissing(field)}
                    isUnconfigured={unconfiguredKeys?.has(field.key)}
                  />
                ))}

                {/* Render custom component if exists */}
                {CustomComponent && (
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors col-span-full"
                  >
                    <CustomComponent
                      formValues={formValues}
                      handleChange={handleChange}
                    />
                  </m.div>
                )}
              </div>
            </m.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </m.div>
  );
};

// Cache for addon availability checks to avoid re-checking
// Cache is cleared on page reload and expires after 5 minutes
const addonAvailabilityCache: Record<string, { available: boolean; timestamp: number }> = {};
const ADDON_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Map addon paths to extension names for license checking
const ADDON_TO_EXTENSION_NAME: Record<string, string> = {
  "@/components/(ext)/chart-engine": "chart_engine",
  "@/components/(ext)/trading-pro": "trading_pro",
};

// Check if an addon module is available AND licensed
async function checkAddonAvailable(modulePath: string): Promise<boolean> {
  // Check cache with TTL
  const cached = addonAvailabilityCache[modulePath];
  if (cached && Date.now() - cached.timestamp < ADDON_CACHE_TTL) {
    return cached.available;
  }

  try {
    // First, check if the addon files are installed using dynamic import with webpackIgnore
    let addonInstalled = false;
    switch (modulePath) {
      case "@/components/(ext)/chart-engine":
        try {
          // @ts-ignore - Dynamic import with webpackIgnore to prevent build-time errors
          await import(/* webpackIgnore: true */ "@/components/(ext)/chart-engine");
          addonInstalled = true;
        } catch {
          addonInstalled = false;
        }
        break;
      default:
        // Unknown addon path - mark as unavailable
        addonAvailabilityCache[modulePath] = { available: false, timestamp: Date.now() };
        return false;
    }

    if (!addonInstalled) {
      addonAvailabilityCache[modulePath] = { available: false, timestamp: Date.now() };
      return false;
    }

    // Then, check if the addon is licensed via the extensions API
    const extensionName = ADDON_TO_EXTENSION_NAME[modulePath];
    if (extensionName) {
      try {
        const response = await fetch("/api/admin/system/extension");
        if (response.ok) {
          const data = await response.json();
          // Check both extensions and root level items
          const allItems = [...(data.extensions || []), ...(data.items || [])];
          const extension = allItems.find((ext: any) => ext.name === extensionName);
          if (!extension?.licenseVerified) {
            // Addon is installed but not licensed
            addonAvailabilityCache[modulePath] = { available: false, timestamp: Date.now() };
            return false;
          }
        }
      } catch {
        // If we can't check license, assume not available
        addonAvailabilityCache[modulePath] = { available: false, timestamp: Date.now() };
        return false;
      }
    }

    addonAvailabilityCache[modulePath] = { available: true, timestamp: Date.now() };
    return true;
  } catch {
    addonAvailabilityCache[modulePath] = { available: false, timestamp: Date.now() };
    return false;
  }
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tabId,
  tabLabel,
  fields,
  draftSettings,
  onFieldChange,
  tabIcon: TabIcon = Settings,
  tabColors = DEFAULT_TAB_COLORS.general,
  showCategoryBadges = false,
  tabs,
  customComponents,
  subcategoryIcons,
  unconfiguredKeys,
}) => {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const formValues = draftSettings;

  // Track which addons are available
  const [availableAddons, setAvailableAddons] = useState<Record<string, boolean>>({});
  const [addonsChecked, setAddonsChecked] = useState(false);

  // Check addon availability on mount
  useEffect(() => {
    const requiredAddons = new Set<string>();
    fields.forEach((field) => {
      if (field.addonRequired) {
        requiredAddons.add(field.addonRequired);
      }
    });

    if (requiredAddons.size === 0) {
      setAddonsChecked(true);
      return;
    }

    // Check all required addons
    Promise.all(
      Array.from(requiredAddons).map(async (addon) => {
        const available = await checkAddonAvailable(addon);
        return [addon, available] as const;
      })
    ).then((results) => {
      const availability: Record<string, boolean> = {};
      results.forEach(([addon, available]) => {
        availability[addon] = available;
      });
      setAvailableAddons(availability);
      setAddonsChecked(true);
    });
  }, [fields]);

  // Group all fields (don't filter - we show disabled fields with addon requirement message)
  const groupedFields = useMemo(() => {
    return fields.reduce<Record<string, FieldDefinition[]>>((acc, field) => {
      const subcategory = field.subcategory || "General";
      if (!acc[subcategory]) {
        acc[subcategory] = [];
      }
      acc[subcategory].push(field);
      return acc;
    }, {});
  }, [fields]);

  const handleChange = (key: string, value: string | File | null) => {
    onFieldChange(key, value);
  };

  const subcategories = Object.keys(groupedFields);

  /* The heading used to be a blind `${tabLabel} ${t("settings")}`, which read
     "All Settings Settings" / "Manage all settings settings for your
     application" for the All-Settings view. Compare against the TRANSLATED word
     so the de-duplication holds in every locale, and strip it for the
     description so that sentence stays grammatical too. */
  const settingsWord = tCommon("settings");
  const labelEndsWithSettings = tabLabel
    .trim()
    .toLowerCase()
    .endsWith(settingsWord.toLowerCase());
  const headingTitle = labelEndsWithSettings
    ? tabLabel
    : `${tabLabel} ${settingsWord}`;
  const descriptionLabel = labelEndsWithSettings
    ? tabLabel.trim().slice(0, tabLabel.trim().length - settingsWord.length).trim() ||
      tabLabel
    : tabLabel;

  // Calculate overall stats
  const totalFields = fields.length;
  const switchFields = fields.filter(f => f.type === "switch").length;
  const selectFields = fields.filter(f => f.type === "select").length;
  const otherFields = totalFields - switchFields - selectFields;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="border-b border-border">
          <div className="px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                    tabColors.bg || "bg-primary/10"
                  )}
                >
                  <TabIcon
                    className={cn("w-5 h-5", tabColors.text || "text-primary")}
                  />
                </div>
                <div>
                  <m.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl sm:text-2xl font-semibold tracking-tight"
                  >
                    {headingTitle}
                  </m.h2>
                  <m.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-sm text-muted-foreground mt-0.5"
                  >
                    {tCommon("manage")} {descriptionLabel.toLowerCase()}{" "}
                    {tDashboardAdmin("settings_for_your_application")}.
                  </m.p>
                </div>
              </div>

              {/* Quick stats - only show badges for field types that exist */}
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                {switchFields > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Circle className="w-3 h-3 fill-success text-success" />
                    <span className="text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">{switchFields}</span> toggles
                    </span>
                  </div>
                )}
                {selectFields > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Circle className="w-3 h-3 fill-primary text-primary" />
                    <span className="text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">{selectFields}</span> selects
                    </span>
                  </div>
                )}
                {otherFields > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Circle className="w-3 h-3 fill-primary text-primary" />
                    <span className="text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">{otherFields}</span> other
                    </span>
                  </div>
                )}
              </m.div>
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          {fields.length === 0 ? (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <m.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                className={cn(
                  "w-16 h-16 rounded-lg mx-auto mb-6 grid place-items-center",
                  tabColors.bg || "bg-primary/10"
                )}
              >
                <TabIcon
                  className={cn("w-8 h-8", tabColors.text || "text-primary")}
                />
              </m.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t("no_settings_available")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("there_are_no_settings_configured_for")}
              </p>
            </m.div>
          ) : (
            <div className="space-y-8">
              {subcategories.map((subcategory, index) => (
                <SettingsGroup
                  key={subcategory}
                  subcategory={subcategory}
                  fields={groupedFields[subcategory]}
                  formValues={formValues}
                  handleChange={handleChange}
                  isFirst={index === 0}
                  tabColors={tabColors}
                  index={index}
                  showCategoryBadges={showCategoryBadges}
                  tabs={tabs}
                  customComponents={customComponents}
                  subcategoryIcons={subcategoryIcons}
                  availableAddons={availableAddons}
                  unconfiguredKeys={unconfiguredKeys}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </m.div>
  );
};
