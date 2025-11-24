"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
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
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col h-full">
      <div
        ref={headerRef}
        className="py-3 px-4 border-b border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/50 dark:via-indigo-950/50 dark:to-blue-950/50 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-1.5 rounded-md shadow-sm">
            <GalleryVerticalEnd className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white">
              Level Presets
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Start with a pre-built template
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLeftSidebarOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="w-full h-[calc(100vh_-_8rem)]">
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 mb-5">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-md">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-800 dark:text-white mb-1">
                  Quick Start
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-200">
                  Choose a preset to quickly create a verification level with
                  pre-configured fields. You can customize it further after
                  applying.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {LEVEL_PRESETS.map((preset) => {
              return (
                <motion.div
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
                  className={`bg-white dark:bg-zinc-800/90 border ${hoveredPreset === preset.id ? "border-primary shadow-md" : "border-gray-200 dark:border-zinc-700"} rounded-lg overflow-hidden cursor-pointer hover:border-primary dark:hover:border-primary hover:shadow-md transition-all relative group`}
                  onClick={() => applyLevelPreset(preset.id)}
                  onMouseEnter={() => setHoveredPreset(preset.id)}
                  onMouseLeave={() => setHoveredPreset(null)}
                >
                  <div className="h-1.5 w-full bg-blue-500" />
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 dark:text-white">
                          {preset.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          {preset.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-700"
                          >
                            {preset.fields.length} fields
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40"
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
                </motion.div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
