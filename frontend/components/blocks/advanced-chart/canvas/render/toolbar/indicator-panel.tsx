"use client";

import { useRef } from "react";
import { useState, useEffect } from "react";
import { Trash2, Plus, ChevronRight } from "lucide-react";
import { indicatorRegistry, indicatorCategories } from "./indicators/registry";
import type { Indicator } from "./indicators/registry";
import { useChart } from "../../../context/chart-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import type React from "react";
import { useTheme } from "next-themes";
import {
  getChartColors,
  getTextColors,
  getBorderColors,
  getUIColors,
  getPopoverColors,
} from "../../../theme/colors";
import { useTranslations } from "next-intl";

// Define an extended interface for setting fields that includes the unit property
interface SettingField {
  name: string;
  label: string;
  type: string;
  min?: number;
  max?: number;
  step?: number;
  default: any;
  options?: { value: string; label: string }[];
  unit?: string; // Add the unit property
}

// Indicator Item Component
interface IndicatorItemProps {
  indicator: Indicator;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  categoryId: string;
  setSelectedCategory: (category: string) => void;
  setExpandedIndicator: (id: string | null) => void;
  updateIndicator: (id: string, updates: Partial<Indicator>) => void;
  forceCalculateAll?: () => void;
}

// Update the IndicatorItem component to use theme colors
const IndicatorItem = ({
  indicator,
  isExpanded,
  onToggle,
  onExpand,
  categoryId,
  setSelectedCategory,
  setExpandedIndicator,
  updateIndicator,
  forceCalculateAll,
}: IndicatorItemProps) => {
  const t = useTranslations(
    "components/blocks/advanced-chart/canvas/render/toolbar/indicator-panel"
  );
  const isAdded = indicator.visible;
  const isInAddedCategory = categoryId === "added";
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";
  const colors = getChartColors(isDarkTheme);
  const textColors = getTextColors(isDarkTheme);
  const borderColors = getBorderColors(isDarkTheme);
  const uiColors = getUIColors(isDarkTheme);
  const backgroundColors = colors.background;

  // Local state for settings
  const [localSettings, setLocalSettings] = useState({
    ...indicator.params,
    color: indicator.color,
  });

  // Update local settings when indicator changes
  useEffect(() => {
    setLocalSettings({
      ...indicator.params,
      color: indicator.color,
    });
  }, [indicator]);

  // Handle adding an indicator
  const handleAddIndicator = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle the indicator visibility
    onToggle();

    // Force calculation of all indicators
    setTimeout(() => {
      if (typeof forceCalculateAll === "function") {
        forceCalculateAll();
      }
    }, 100);

    // Only switch to "added" category and open settings if explicitly requested
    // This prevents automatic switching when just adding an indicator
    if (categoryId !== "added") {
      setTimeout(() => {
        setSelectedCategory("added");
        setExpandedIndicator(indicator.id);
      }, 200);
    }
  };

  // Handle slider change
  const handleSliderChange = (value: number[], key: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value[0] }));
  };

  // Handle option change
  const handleOptionChange = (option: string, key: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: option }));
  };

  // Handle color change
  const handleColorChange = (color: string) => {
    setLocalSettings((prev) => ({ ...prev, color }));
  };

  // Apply settings
  const applySettings = () => {
    const updates: any = {
      color: localSettings.color,
      params: { ...indicator.params },
    };

    // Update params based on local settings
    Object.keys(localSettings).forEach((key) => {
      if (key !== "color") {
        updates.params[key] = localSettings[key];
      }
    });

    updateIndicator(indicator.id, updates);

    // Force calculation after updating settings
    setTimeout(() => {
      if (typeof forceCalculateAll === "function") {
        forceCalculateAll();
      }
    }, 100);

    onExpand(); // Close the expanded panel
  };

  // Get settings fields for this indicator
  const getSettingsFields = () => {
    try {
      // Get the indicator definition from the registry
      const indicatorDef =
        indicatorRegistry[indicator.type as keyof typeof indicatorRegistry];

      if (indicatorDef && indicatorDef.getSettings) {
        return indicatorDef.getSettings() as SettingField[];
      }

      return [] as SettingField[];
    } catch (err) {
      console.error(
        `Error loading settings for indicator: ${indicator.type}`,
        err
      );
      return [] as SettingField[];
    }
  };

  // Get the indicator icon from the registry
  const getIndicatorIcon = () => {
    const indicatorDef =
      indicatorRegistry[indicator.type as keyof typeof indicatorRegistry];
    const indicatorCategory =
      indicatorDef?.defaultSettings?.category || "trend";
    const categoryColor =
      indicatorCategories.find((cat) => cat.id === indicatorCategory)?.color ||
      "#3b82f6";

    if (indicatorDef && indicatorDef.icon) {
      const Icon = indicatorDef.icon;
      return <Icon size={14} style={{ color: categoryColor }} />;
    }
    return null;
  };

  return (
    <motion.div
      className={cn(
        "overflow-hidden rounded-md transition-all relative w-full",
        isExpanded ? "shadow-md" : "border hover:shadow-sm"
      )}
      style={{
        borderColor: isExpanded
          ? indicator.color || borderColors.active
          : borderColors.secondary,
        background: isExpanded
          ? backgroundColors.tertiary
          : backgroundColors.secondary,
      }}
      animate={{ height: isExpanded ? "auto" : "auto" }}
      transition={{ duration: 0.2 }}
      layout
    >
      <div
        className="flex items-center justify-between p-2 cursor-pointer relative"
        onClick={isInAddedCategory ? onExpand : handleAddIndicator}
        style={{ color: textColors.primary }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            {getIndicatorIcon()}
            <span className="text-xs">{indicator.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isInAddedCategory && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-6 h-6 flex items-center justify-center rounded-full text-white shadow-sm transition-colors"
              style={{ background: uiColors.button.success.background }}
              onClick={(e) => {
                e.stopPropagation();
                handleAddIndicator(e);
              }}
              title="Add indicator"
            >
              <Plus size={14} />
            </motion.button>
          )}
        </div>

        {/* Control buttons - always show in Added category without border */}
        {isInAddedCategory && !isExpanded && (
          <div className="flex items-center gap-2 mr-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-6 h-6 flex items-center justify-center transition-colors"
              style={{ color: textColors.secondary }}
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(); // Remove the indicator
              }}
            >
              <Trash2 size={14} />
            </motion.button>
          </div>
        )}
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {isExpanded && isInAddedCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 pt-1 border-t"
            style={{
              borderColor: borderColors.secondary,
              background: backgroundColors.tertiary,
            }}
          >
            <div className="space-y-3">
              {Object.entries(localSettings).map(([key, value]) => {
                if (key === "color") return null; // Handle color separately

                // Find the setting field definition
                const settingField = getSettingsFields().find(
                  (field) => field.name === key
                );
                if (!settingField) return null;

                // Convert string value to number if needed for the slider
                const numericValue =
                  typeof value === "string"
                    ? Number.parseFloat(value) || 0
                    : value;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        className="text-xs"
                        style={{ color: textColors.secondary }}
                      >
                        {settingField.label || key}
                      </label>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          background: backgroundColors.secondary,
                          color: textColors.primary,
                        }}
                      >
                        {value}
                        {settingField.unit || ""}
                      </span>
                    </div>
                    {settingField.type === "select" && settingField.options ? (
                      <div className="flex flex-wrap gap-1">
                        {settingField.options.map((option: any) => {
                          const optionValue =
                            typeof option === "object" ? option.value : option;
                          const optionLabel =
                            typeof option === "object" ? option.label : option;

                          return (
                            <motion.button
                              key={optionValue}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="px-2 py-1 text-xs rounded-md transition-all"
                              style={{
                                background:
                                  value === optionValue
                                    ? uiColors.button.primary.background
                                    : backgroundColors.secondary,
                                color:
                                  value === optionValue
                                    ? uiColors.button.primary.text
                                    : textColors.secondary,
                              }}
                              onClick={() =>
                                handleOptionChange(optionValue, key)
                              }
                            >
                              {optionLabel}
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      <Slider
                        value={[numericValue as number]}
                        min={settingField.min || 0}
                        max={settingField.max || 100}
                        step={settingField.step || 1}
                        className="w-full"
                        onValueChange={(value) =>
                          handleSliderChange(value, key)
                        }
                      />
                    )}
                  </div>
                );
              })}

              {/* Color picker */}
              <div className="space-y-1">
                <label
                  className="text-xs"
                  style={{ color: textColors.secondary }}
                >
                  {t("Color")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "#3b82f6",
                    "#f97316",
                    "#8b5cf6",
                    "#ec4899",
                    "#10b981",
                    "#ef4444",
                    "#f59e0b",
                    "#64748b",
                  ].map((color) => (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "w-6 h-6 rounded-full border transition-all",
                        localSettings.color === color
                          ? "ring-2 ring-offset-1"
                          : ""
                      )}
                      style={{
                        backgroundColor: color,
                        borderColor: borderColors.secondary,
                        // Remove ringColor from style
                        boxShadow:
                          localSettings.color === color
                            ? "0 1px 3px rgba(0,0,0,0.2)"
                            : "none",
                      }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors"
                  style={{
                    background: uiColors.button.danger.background,
                    color: uiColors.button.danger.text,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(); // Remove the indicator
                  }}
                >
                  <Trash2 size={12} />
                  <span>{t("Remove")}</span>
                </motion.button>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-2 py-1 rounded-md text-xs transition-colors"
                    style={{
                      background: backgroundColors.secondary,
                      color: textColors.secondary,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpand(); // Close the expanded panel
                    }}
                  >
                    {t("Cancel")}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-2 py-1 rounded-md text-xs font-medium shadow-sm transition-colors"
                    style={{
                      background: uiColors.button.success.background,
                      color: uiColors.button.success.text,
                    }}
                    onClick={applySettings}
                  >
                    {t("Apply")}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const IndicatorPanel: React.FC = () => {
  const t = useTranslations(
    "components/blocks/advanced-chart/canvas/render/toolbar/indicator-panel"
  );
  const {
    indicators,
    toggleIndicator,
    setShowIndicatorPanel,
    updateIndicator,
    forceCalculateAll,
    activeIndicatorId,
    setActiveIndicatorId,
  } = useChart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    "added"
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  // Get theme colors
  const colors = getChartColors(isDarkTheme);
  const textColors = getTextColors(isDarkTheme);
  const borderColors = getBorderColors(isDarkTheme);
  const uiColors = getUIColors(isDarkTheme);
  const backgroundColors = colors.background;
  const popoverColors = getPopoverColors(isDarkTheme);

  // Check if forceCalculateAll is a function
  const safeForceCalculateAll =
    typeof forceCalculateAll === "function"
      ? forceCalculateAll
      : () => {
          console.log("forceCalculateAll not available");
        };

  // Check if mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setShowIndicatorPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowIndicatorPanel]);

  // Get category icons from the registry
  const getCategoryIcon = (categoryId: string) => {
    if (categoryId === "added") {
      const category = indicatorCategories.find((cat) => cat.id === categoryId);
      const color = category?.color || "#f97316";
      return (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
          style={{
            background: `linear-gradient(to bottom right, ${color}, ${color}dd)`,
          }}
        >
          {(indicators || []).filter((ind) => ind?.visible).length}
        </div>
      );
    }

    const category = indicatorCategories.find((cat) => cat.id === categoryId);
    if (category && category.icon) {
      const Icon = category.icon;
      return <Icon className="w-4 h-4" style={{ color: category.color }} />;
    }

    return null;
  };

  // Create a map to track which indicators have been shown in each category
  // This prevents the same indicator from appearing in multiple categories
  const shownIndicators = new Set<string>();

  // Group indicators by category - ensuring each indicator only appears in one category
  const getIndicatorsForCategory = (categoryId: string) => {
    if (categoryId === "added") {
      // For "added" category, show all visible indicators
      return (indicators || []).filter((ind) => ind?.visible);
    }

    // For other categories, only show indicators that:
    // 1. Match the category
    // 2. Haven't been shown yet
    // 3. Aren't already visible (those go in "added")
    const result = (indicators || []).filter((ind) => {
      // Skip if already visible (those go in "added" category)
      if (ind.visible) return false;

      // Skip if already shown in another category
      if (shownIndicators.has(ind.id)) return false;

      // Check if indicator belongs in this category
      let belongs = false;

      // Get the indicator definition from the registry
      const indicatorDef =
        indicatorRegistry[ind.type as keyof typeof indicatorRegistry];

      if (indicatorDef) {
        if (categoryId === "popular") {
          // Popular indicators (hardcoded for now, could be configurable)
          belongs = ["sma", "rsi"].includes(ind.type);
        } else {
          // Check if indicator belongs to this category
          belongs = indicatorDef.defaultSettings.category === categoryId;
        }
      }

      // If it belongs, mark it as shown
      if (belongs) {
        shownIndicators.add(ind.id);
        return true;
      }

      return false;
    });

    return result;
  };

  // Create an object to store indicators by category
  const indicatorsByCategory: Record<string, Indicator[]> = {};

  // Initialize with empty arrays for all categories
  indicatorCategories.forEach((category) => {
    indicatorsByCategory[category.id] = [];
  });

  // Fill with actual indicators
  indicatorCategories.forEach((category) => {
    indicatorsByCategory[category.id] = getIndicatorsForCategory(category.id);
  });

  const toggleExpand = (id: string) => {
    setExpandedIndicator(expandedIndicator === id ? null : id);
  };

  useEffect(() => {
    // If we have an active indicator, expand it and select its category
    if (activeIndicatorId && indicators) {
      const activeIndicator = indicators.find(
        (ind) => ind?.id === activeIndicatorId
      );
      if (activeIndicator) {
        setExpandedIndicator(activeIndicatorId);

        // Find which category the indicator belongs to
        if (activeIndicator.visible) {
          setSelectedCategory("added");
        } else {
          // Find the category based on indicator type
          const indicatorDef =
            indicatorRegistry[
              activeIndicator.type as keyof typeof indicatorRegistry
            ];
          if (indicatorDef) {
            const category = indicatorDef.defaultSettings.category;
            // Fix: Ensure we don't pass undefined to setSelectedCategory
            if (category) {
              setSelectedCategory(category);
            }
          }
        }
      }
    }
  }, [activeIndicatorId, indicators]);

  // Add cleanup for activeIndicatorId when panel closes:
  useEffect(() => {
    return () => {
      // Clear active indicator when panel closes
      setActiveIndicatorId(null);
    };
  }, [setActiveIndicatorId]);

  return (
    <motion.div
      ref={panelRef}
      className={cn(
        "absolute backdrop-blur-md rounded-lg shadow-xl z-[100] overflow-hidden",
        isMobile
          ? "fixed inset-0 w-full h-full rounded-none border-0"
          : "left-16 top-8 w-[450px]"
      )}
      initial={{
        opacity: 0,
        scale: isMobile ? 1 : 0.95,
        y: isMobile ? 20 : 0,
        x: isMobile ? 0 : -20,
      }}
      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
      exit={{
        opacity: 0,
        scale: isMobile ? 1 : 0.95,
        y: isMobile ? 20 : 0,
        x: isMobile ? 0 : -20,
      }}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
      style={{
        background: backgroundColors.primary,
        border: `1px solid ${borderColors.primary}`,
        boxShadow: isDarkTheme
          ? "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)"
          : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        className={cn(
          "flex",
          isMobile ? "flex-col h-[calc(100vh-48px)]" : "h-auto"
        )}
      >
        <div
          className={cn(
            isMobile
              ? "w-full border-b overflow-x-auto flex flex-row"
              : "w-[130px] border-r"
          )}
          style={{
            borderColor: borderColors.primary,
            background: backgroundColors.secondary,
          }}
        >
          {indicatorCategories.map((category) => (
            <motion.div
              key={category.id}
              whileHover={{ x: isMobile ? 0 : 2 }}
              className={cn(
                "flex items-center gap-2 p-2 cursor-pointer transition-colors",
                isMobile ? "min-w-[100px] justify-center" : "",
                selectedCategory === category.id &&
                  (isMobile ? "border-b-2" : "border-l-2")
              )}
              style={{
                borderColor:
                  selectedCategory === category.id
                    ? category.color
                    : "transparent",
                background:
                  selectedCategory === category.id
                    ? backgroundColors.tertiary
                    : "transparent",
                color:
                  selectedCategory === category.id
                    ? textColors.primary
                    : textColors.secondary,
              }}
              onClick={() => {
                setSelectedCategory(category.id);
                setExpandedIndicator(null);
                setActiveIndicatorId(null);
              }}
            >
              {getCategoryIcon(category.id)}
              <span className="text-xs">{category.name}</span>
              {selectedCategory === category.id && !isMobile && (
                <ChevronRight
                  size={12}
                  className="ml-auto"
                  style={{ color: category.color }}
                />
              )}
            </motion.div>
          ))}
        </div>

        <div
          className={cn(
            "p-2 overflow-y-auto w-full",
            isMobile ? "flex-1" : "max-h-[350px]"
          )}
          style={{ background: backgroundColors.primary }}
        >
          {selectedCategory && indicatorsByCategory[selectedCategory] ? (
            indicatorsByCategory[selectedCategory].length > 0 ? (
              <div className="space-y-2 w-full">
                {indicatorsByCategory[selectedCategory].map((indicator) => (
                  <IndicatorItem
                    key={indicator.id}
                    indicator={indicator}
                    isExpanded={expandedIndicator === indicator.id}
                    onToggle={() => {
                      toggleIndicator(indicator.id);
                      // Force recalculation after toggling
                      setTimeout(() => {
                        if (typeof forceCalculateAll === "function") {
                          forceCalculateAll();
                        }
                      }, 100);
                    }}
                    onExpand={() => toggleExpand(indicator.id)}
                    categoryId={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    setExpandedIndicator={setExpandedIndicator}
                    updateIndicator={updateIndicator}
                    forceCalculateAll={safeForceCalculateAll}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-sm">
                <p style={{ color: textColors.secondary }}>
                  {t("no_indicators_in_this_category_yet")}.
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-sm">
              <p style={{ color: textColors.secondary }}>
                {t("select_a_category_to_view_indicators")}
              </p>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowIndicatorPanel(false)}
            className="px-6 py-2 rounded-full text-white font-medium shadow-lg"
            style={{ background: uiColors.button.primary.background }}
          >
            {t("Close")}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default IndicatorPanel;
