"use client";

import { useState, useRef } from "react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  PanelLeftClose,
  GalleryVerticalEnd,
  Lightbulb,
  FileText,
} from "lucide-react";
import { LEVEL_PRESETS } from "../left-sidebar";
import { useTranslations } from "next-intl";
interface LevelPresetsPanelProps {
  applyLevelPreset: (presetId: string) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  sidebarHeight: number;
}
export function LevelPresetsPanel({
  applyLevelPreset,
  setLeftSidebarOpen,
  sidebarHeight,
}: LevelPresetsPanelProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col h-full">
      <div
        ref={headerRef}
        className="py-3 px-4 border-b border-border bg-surface-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary-ink p-1.5 rounded-md">
            <GalleryVerticalEnd className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">
              {t("level_presets")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("start_with_a_pre_built_template")}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLeftSidebarOpen(false)}
          className="text-muted-foreground hover:text-foreground hover:bg-surface-3"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="w-full h-[calc(100vh_-_8rem)]">
        <div className="p-4 space-y-3">
          <div className="bg-primary/10 p-3 rounded-lg border border-primary/30 mb-5">
            <div className="flex items-start gap-3">
              <div className="bg-primary/15 dark:bg-primary/40 p-1.5 rounded-md">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">
                  {tCommon("quick_start")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t("choose_a_preset_to_quickly_create")} {t("you_can_customize_it_further_after_applying_1")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {LEVEL_PRESETS.map((preset) => {
              return (
                <m.div
                  key={preset.id}
                  whileHover={{
                    scale: 1.01,
                  }}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className={`bg-card dark:bg-muted/90 border ${hoveredPreset === preset.id ? "border-primary shadow-md" : "border-border-strong"} rounded-lg overflow-hidden cursor-pointer hover:border-primary dark:hover:border-primary hover:shadow-md transition-all relative group`}
                  onClick={() => applyLevelPreset(preset.id)}
                  onMouseEnter={() => setHoveredPreset(preset.id)}
                  onMouseLeave={() => setHoveredPreset(null)}
                >
                  <div className="h-1.5 w-full bg-primary" />
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-md bg-primary/15 dark:bg-primary/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {preset.name}
                        </h4>
                        <p className="text-xs text-subtle-foreground">
                          {preset.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="bg-muted text-muted-foreground border-border-strong"
                          >
                            {preset.fields.length} fields
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-primary/10 dark:bg-primary/30 text-primary-ink border-primary/30"
                          >
                            Level{" "}
                            {preset.id.includes("basic")
                              ? "1"
                              : preset.id.includes("identity")
                                ? "2"
                                : "3"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hover effect overlay */}
                  <div
                    className={`absolute inset-0 bg-primary/5 dark:bg-primary/15 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${hoveredPreset === preset.id ? "opacity-100" : ""}`}
                  ></div>
                </m.div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
