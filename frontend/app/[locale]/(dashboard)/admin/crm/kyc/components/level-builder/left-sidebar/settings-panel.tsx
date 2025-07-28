"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  PanelLeftClose,
  Settings,
  Wand2,
  Flame,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface SettingsPanelProps {
  levelNumber: number;
  setLevelNumber?: (level: number) => void;
  levelDescription: string;
  setLevelDescription?: (description: string) => void;
  levelName: string;
  setLevelName?: (name: string) => void;
  setLeftSidebarOpen: (open: boolean) => void;
  onChangesUnsaved?: () => void;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  setStatus?: (status: "DRAFT" | "ACTIVE" | "INACTIVE") => void;
  currentLevel: KycLevel | null;
  onOpenVerificationServices?: () => void;
}

export function SettingsPanel({
  levelNumber,
  setLevelNumber,
  levelDescription,
  setLevelDescription,
  levelName,
  setLevelName,
  setLeftSidebarOpen,
  onChangesUnsaved,
  status,
  setStatus,
  currentLevel,
  onOpenVerificationServices,
}: SettingsPanelProps) {
  const t = useTranslations("dashboard");
  const headerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      <div
        ref={headerRef}
        className="py-3 px-4 border-b border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-gray-50 via-gray-50 to-gray-50 dark:from-zinc-900/80 dark:via-zinc-900/80 dark:to-zinc-900/80 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-gray-500 to-slate-600 p-1.5 rounded-md shadow-sm">
            <Settings className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white">
              {t("level_settings")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {t("configure_verification_level")}
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
        <div className="space-y-6">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200 mb-3">
              {t("level_information")}
            </h3>
            <div className="space-y-2">
              <Label
                htmlFor="level-name"
                className="text-gray-700 dark:text-zinc-300"
              >
                {t("level_name")}
              </Label>
              <Input
                id="level-name"
                value={levelName}
                onChange={(e) => {
                  setLevelName?.(e.target.value);
                  onChangesUnsaved?.();
                }}
                placeholder="Enter level name"
                className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label
                htmlFor="level-number"
                className="text-gray-700 dark:text-zinc-300"
              >
                {t("level_number")}
              </Label>
              <Input
                id="level-number"
                type="number"
                value={levelNumber}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value);
                  if (!isNaN(value) && value > 0 && setLevelNumber) {
                    setLevelNumber(value);
                    if (onChangesUnsaved) onChangesUnsaved();
                  }
                }}
                min="1"
                placeholder="Enter level number"
                className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
              />
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {t("level_number_determines_advanced_verification)")}
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Label
                htmlFor="level-description"
                className="text-gray-700 dark:text-zinc-300"
              >
                {t("level_description")}
              </Label>
              <Textarea
                id="level-description"
                value={levelDescription}
                onChange={(e) => {
                  setLevelDescription?.(e.target.value);
                  onChangesUnsaved?.();
                }}
                placeholder="Enter level description"
                className="h-24 resize-none bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                rows={5}
              />
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {t("describe_the_purpose_it_collects")}
              </p>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200 mb-3">
              {t("Status")}
            </h3>
            <div className="space-y-2">
              <div
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                  status === "DRAFT"
                    ? "bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                    : "hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                }`}
                onClick={() => {
                  setStatus?.("DRAFT");
                  onChangesUnsaved?.();
                }}
              >
                <Wand2 className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                    {t("Draft")}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {t("not_visible_to_users")}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                  status === "ACTIVE"
                    ? "bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                    : "hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                }`}
                onClick={() => {
                  setStatus?.("ACTIVE");
                  onChangesUnsaved?.();
                }}
              >
                <Flame className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                    {t("Active")}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {t("visible_and_available_to_users")}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                  status === "INACTIVE"
                    ? "bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                    : "hover:bg-gray-50 dark:hover:bg-zinc-900/50"
                }`}
                onClick={() => {
                  setStatus?.("INACTIVE");
                  onChangesUnsaved?.();
                }}
              >
                <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                    {t("Inactive")}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {t("temporarily_disabled")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-200 mb-3">
              {t("verification_services")}
            </h3>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
              {currentLevel?.verificationService ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {currentLevel.verificationService.name}
                      </h3>
                      {/* //TODO:Check Tempalate name */}
                      {/* <p className="text-sm text-gray-500 dark:text-zinc-400">
                        Template:{" "}
                        {currentLevel.verificationService.templateName}
                      </p> */}
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                      {t("Connected")}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onOpenVerificationServices}
                  >
                    {t("manage_connection")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    {t("connect_to_a_form_fields")}.
                  </p>

                  <Button
                    className="w-full flex items-center justify-between"
                    onClick={onOpenVerificationServices}
                  >
                    <div className="flex items-center">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      {t("connect_verification_service")}
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
