"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "framer-motion";
import { TabColors, DEFAULT_TAB_COLORS } from "./types";

interface SettingsSectionCardProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  colors?: TabColors;
  /** Right-aligned controls on the header band (e.g. an "Add" button). */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The container a `customContent` tab renders into.
 *
 * A field-driven tab gets its Card, header band and 24px content padding from
 * `SettingsTab`. A custom tab renders whatever it likes, so without a shared
 * shell it sits on the page at a different width, with a different heading
 * size and no icon tile — visibly a different page from the tab beside it.
 * This is that shell, kept deliberately identical to SettingsTab's header.
 */
export function SettingsSectionCard({
  title,
  description,
  icon: Icon = Settings,
  colors = DEFAULT_TAB_COLORS.general,
  actions,
  children,
}: SettingsSectionCardProps) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <div className="border-b border-border">
          <div className="px-6 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                    colors.bg || "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn("w-5 h-5", colors.text || "text-primary")}
                  />
                </div>
                <div className="min-w-0">
                  <m.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl sm:text-2xl font-semibold tracking-tight"
                  >
                    {title}
                  </m.h2>
                  {description && (
                    <m.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-sm text-muted-foreground mt-0.5"
                    >
                      {description}
                    </m.p>
                  )}
                </div>
              </div>

              {actions && (
                <div className="flex items-center gap-2 shrink-0">{actions}</div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </m.div>
  );
}
