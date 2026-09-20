"use client";

import React from "react";
import { ChevronLeft, LayoutGrid, List, Search, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SkeletonBlock } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
import { DEFAULT_TAB_COLORS, type SettingsPageConfig } from "./types";
import { useTranslations } from "next-intl";

/**
 * The pending state for every route that renders `SettingsPage`.
 * ============================================================================
 *
 * WHY ONE COMPONENT AND NOT ONE PER ROUTE
 * ---------------------------------------
 * There are sixteen of these routes and each had written its own. They
 * disagreed with the real page on the frame — see the note in `./layout.ts` —
 * and, more expensively, they disagreed with each other: two of them
 * (binary-engine and market-maker) were byte-identical and both drew a "System
 * Status Banner" and a four-column tab strip that neither page has.
 *
 * Fixing them individually would have produced sixteen correct copies, which
 * is sixteen things to re-fix the next time the frame moves. This is the one
 * copy, and it takes the SAME `SettingsPageConfig` the real page takes.
 *
 * WHAT IS PENDING HERE IS ALMOST NOTHING, AND THAT IS THE POINT
 * ------------------------------------------------------------
 * A settings page is the best case for the minimal-skeleton rule, because
 * nearly everything on it is CONFIG rather than data: the title, the
 * description, every tab's label and icon, every field's label and
 * description, and the field counts are all known synchronously from the
 * config object. Only the VALUES have to be fetched.
 *
 * So this renders the real title, the real tab rail with real labels and real
 * per-tab counts, and the real field labels — and reserves a box only where a
 * control's value goes. The previous files greyed out all of it, including
 * strings that were sitting in a constant three imports away.
 */

/**
 * Height of the pending control, by field type.
 *
 * This is the ONE approximate axis in this file, and it is deliberately
 * conservative. Everything else here is either a real string or a real class
 * from `./layout`; these are boxes standing in for a control whose own height
 * is fixed by its type, so they are stable — but they are restated here rather
 * than imported, which means a change to `SettingsField`'s control heights
 * needs a change here too. If that becomes a problem, the fix is for
 * `SettingsField` to export them, not for this map to grow more entries.
 */
const CONTROL_HEIGHT: Record<string, string> = {
  switch: "h-6 w-11 rounded-full",
  textarea: "h-24 w-full rounded-md",
  socialLinks: "h-24 w-full rounded-md",
  file: "h-32 w-full rounded-md",
  mlm: "h-32 w-full rounded-md",
  custom: "h-24 w-full rounded-md",
  range: "h-2 w-full rounded-full",
};
const CONTROL_DEFAULT = "h-10 w-full rounded-md";

export interface SettingsPageSkeletonProps {
  /** The same object the route passes to `SettingsPage`. */
  config: SettingsPageConfig;
  /** The same per-tab icon overrides the route passes to `SettingsPage`. */
  tabIcons?: Record<string, React.ElementType>;
  /** The same per-tab descriptions the route passes to `SettingsPage`. */
  tabDescriptions?: Record<string, string>;
}

export function SettingsPageSkeleton({
  config,
  tabIcons = {},
  tabDescriptions = {},
}: SettingsPageSkeletonProps) {
  const tCommon = useTranslations("common");
  const { title, description, backUrl, tabs, fields, tabColors } = config;

  const mergedTabColors = { ...DEFAULT_TAB_COLORS, ...(tabColors ?? {}) };
  /* The page opens on the first tab, so that is the one whose fields are laid
     out. Rendering all of them would reserve several screens of boxes that
     never appear. */
  const activeTab = tabs[0];
  const activeColors =
    mergedTabColors[activeTab?.id] ?? DEFAULT_TAB_COLORS.general;
  const activeFields = activeTab
    ? fields.filter((f) => f.category === activeTab.id)
    : [];

  return (
    <div className={SETTINGS_ROOT}>
      {/* Hero band — every string in it is known before the fetch. */}
      <div className={SETTINGS_BAND}>
        <div className={SETTINGS_BAND_INNER}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
            <div className="flex items-center gap-3">
              {backUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  className={cn("shrink-0 w-9 rounded-lg", SETTINGS_BAND_CONTROL)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}

              <div
                className={cn(SETTINGS_MARK, activeColors.bg, activeColors.border)}
              >
                <Settings className={cn(SETTINGS_MARK_ICON, activeColors.text)} />
              </div>

              <div className="min-w-0">
                <h1 className={SETTINGS_TITLE}>{title}</h1>
                <p className={SETTINGS_DESCRIPTION}>{description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* The real control, disabled. A search box that is present but
                  inert reserves its exact box and tells the truth about why it
                  cannot be used yet; a grey rectangle does neither. */}
              <div className="relative flex-1 lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`${tCommon("search_settings")}…`}
                  disabled
                  className={cn(
                    "pl-9 bg-background/50 border-muted-foreground/20 rounded-lg",
                    SETTINGS_BAND_CONTROL
                  )}
                />
              </div>
              <div
                className={cn(
                  "flex items-center bg-muted/50 rounded-lg p-0.5",
                  SETTINGS_BAND_CONTROL
                )}
              >
                <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled className="h-8 w-8">
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={SETTINGS_CONTAINER}>
        <div className={SETTINGS_BODY}>
          <div className={SETTINGS_SIDEBAR}>
            <div className={SETTINGS_SIDEBAR_STACK}>
              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{tCommon("total_settings")}</span>
                    {/* A real count. `fields` is config — it does not need the
                        network, and the settled page shows this same number. */}
                    <Badge variant="secondary">{fields.length}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <nav className="space-y-1">
                    {tabs.map((tab, index) => {
                      const Icon = tabIcons[tab.id] || tab.icon || Settings;
                      const colors =
                        mergedTabColors[tab.id] ?? DEFAULT_TAB_COLORS.general;
                      const isActive = index === 0;
                      const desc = tabDescriptions[tab.id] || tab.description;
                      return (
                        <div
                          key={tab.id}
                          className={cn(
                            /* `items-center`, as the settled rail is. It only
                               became visible once the description wraps: the
                               icon sat at the top here and in the middle there,
                               so it jumped a line's height on first paint. */
                            "w-full flex items-center gap-3 rounded-xl p-3 text-left",
                            isActive && colors.bg
                          )}
                        >
                          <span className={cn("shrink-0", colors.text)}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {tab.label}
                            </span>
                            {/* Wraps, exactly as the settled rail does. */}
                            {desc && (
                              <span className="block text-xs text-muted-foreground leading-snug">
                                {desc}
                              </span>
                            )}
                          </span>
                          {/* The count is CONFIG — `fields.filter(...)`, the
                              same expression the settled page memoises — so it
                              is a real number here, not a placeholder. Without
                              it the skeleton's text column was ~40px wider than
                              the settled one, which is enough to wrap a
                              description onto a different number of lines and
                              shift the whole rail on first paint. Custom tabs
                              have no fields to count, matching the page. */}
                          {!tab.customContent && (
                            <Badge variant="secondary" className="text-xs">
                              {fields.filter((f) => f.category === tab.id).length}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Field list for the opening tab. Labels and descriptions are
              config; only each control's value is waiting. */}
          <div className="min-w-0 flex-1 space-y-4">
            {activeFields.map((field) => (
              <Card key={field.key}>
                <CardContent className="p-4">
                  <div
                    className={cn(
                      "flex gap-4",
                      field.type === "switch"
                        ? "flex-row items-center justify-between"
                        : "flex-col"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{field.label}</p>
                      {field.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {field.description}
                        </p>
                      )}
                    </div>
                    <SkeletonBlock
                      className={cn(
                        "shrink-0",
                        CONTROL_HEIGHT[field.type] ?? CONTROL_DEFAULT
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
