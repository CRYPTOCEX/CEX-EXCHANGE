"use client";

import React, { useMemo, useState } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
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
}

// Check if a field should be full width
const shouldBeFullWidth = (field: FieldDefinition): boolean => {
  if (field.fullWidth) return true;
  if (field.preview) return true;
  if (field.type === "socialLinks") return true;
  return false;
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
}: {
  field: FieldDefinition;
  value: any;
  onChange: (key: string, value: string | File | null) => void;
  index: number;
  isLogosCategory: boolean;
  showCategoryBadge?: boolean;
  tabs?: TabDefinition[];
  formValues?: Record<string, any>;
}) => {
  const categoryLabel = tabs?.find(t => t.id === field.category)?.label || field.category;
  const isFullWidth = shouldBeFullWidth(field) || field.type === "custom";

  // Handle custom field type
  if (field.type === "custom" && field.customRender) {
    const CustomComponent = field.customRender;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
        className={cn(
          "group relative p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-lg transition-all duration-300",
          "md:col-span-2"
        )}
      >
        {showCategoryBadge && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs capitalize">
              {categoryLabel}
            </Badge>
          </div>
        )}
        <div className="relative">
          <CustomComponent
            formValues={formValues || {}}
            handleChange={onChange}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileHover={{ scale: 1.005 }}
      className={cn(
        "group relative p-4 rounded-xl border bg-card/50 hover:bg-card hover:shadow-lg transition-all duration-300",
        isLogosCategory && "flex flex-col min-h-[200px]",
        isFullWidth && !isLogosCategory && "md:col-span-2"
      )}
    >
      {/* Hover gradient effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Category badge for "All Settings" view */}
      {showCategoryBadge && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs capitalize">
            {categoryLabel}
          </Badge>
        </div>
      )}

      <div className="relative">
        <SettingsField
          field={field}
          value={value}
          onChange={onChange}
        />
      </div>
    </motion.div>
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
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const displayedFields = fields.filter(
    (field) => !field.showIf || field.showIf(formValues)
  );

  const isLogosCategory = fields.some((field) => field.category === "logos");
  const mergedIcons = { ...SUBCATEGORY_ICONS, ...subcategoryIcons };
  const SubcategoryIcon = mergedIcons[subcategory] || Layers;

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="mb-4">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between gap-4 group py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors -mx-1">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    tabColors?.bg || "bg-primary/10"
                  )}
                >
                  <SubcategoryIcon
                    className={cn("w-4 h-4", tabColors?.text || "text-primary")}
                  />
                </motion.div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    {subcategory}
                    <Badge variant="secondary" className="text-xs font-normal">
                      {displayedFields.length}{" "}
                      {displayedFields.length === 1 ? "setting" : "settings"}
                    </Badge>
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Completion indicator */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercentage}%` }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        completionPercentage === 100
                          ? "bg-emerald-500"
                          : "bg-primary"
                      )}
                    />
                  </div>
                  <span className="w-8 text-right">{completionPercentage}%</span>
                </div>

                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground group-hover:text-foreground"
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </div>
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <AnimatePresence>
            <motion.div
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
                    showCategoryBadge={showCategoryBadges}
                    tabs={tabs}
                    formValues={formValues}
                  />
                ))}

                {/* Render custom component if exists */}
                {CustomComponent && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors col-span-full"
                  >
                    <CustomComponent
                      formValues={formValues}
                      handleChange={handleChange}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
};

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
}) => {
  const tCommon = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const formValues = draftSettings;

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

  // Calculate overall stats
  const totalFields = fields.length;
  const switchFields = fields.filter(f => f.type === "switch").length;
  const selectFields = fields.filter(f => f.type === "select").length;
  const otherFields = totalFields - switchFields - selectFields;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-sm">
        {/* Gradient top border */}
        <div
          className={cn(
            "h-1 w-full bg-gradient-to-r",
            tabColors.gradient || "from-primary/50 via-primary to-primary/50"
          )}
        />

        {/* Header */}
        <div className="relative overflow-hidden border-b">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-transparent to-transparent" />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute -right-20 -top-20 w-64 h-64 rounded-full"
            style={{
              background: `radial-gradient(circle, ${tabColors.bg} 0%, transparent 70%)`,
            }}
          />

          <div className="relative px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-3 rounded-2xl shadow-lg",
                    tabColors.iconBg || "bg-gradient-to-br from-primary to-primary/80"
                  )}
                >
                  <TabIcon className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl sm:text-2xl font-bold tracking-tight"
                  >
                    {tabLabel} {tCommon("settings")}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-sm text-muted-foreground mt-0.5"
                  >
                    {tCommon("manage")} {tabLabel.toLowerCase()}{" "}
                    {tDashboardAdmin("settings_for_your_application")}.
                  </motion.p>
                </div>
              </div>

              {/* Quick stats - only show badges for field types that exist */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 sm:gap-3"
              >
                {switchFields > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{switchFields}</span> toggles
                    </span>
                  </div>
                )}
                {selectFields > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Circle className="w-3 h-3 fill-blue-500 text-blue-500" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{selectFields}</span> selects
                    </span>
                  </div>
                )}
                {otherFields > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Circle className="w-3 h-3 fill-purple-500 text-purple-500" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{otherFields}</span> other
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          {fields.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                className={cn(
                  "w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg",
                  tabColors.iconBg || "bg-gradient-to-br from-primary to-primary/80"
                )}
              >
                <TabIcon className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No settings available
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                There are no settings configured for this category yet.
                Check back later or contact support.
              </p>
            </motion.div>
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
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
