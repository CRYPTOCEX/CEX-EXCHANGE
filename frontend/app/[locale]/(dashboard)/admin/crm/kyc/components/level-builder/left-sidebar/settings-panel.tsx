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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const headerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full">
      <div
        ref={headerRef}
        className="py-3 px-4 border-b border-border bg-surface-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary-ink p-1.5 rounded-md">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">
              {t("level_settings")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("configure_verification_level")}
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
        <div className="space-y-6">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t("level_information")}
            </h3>
            <div className="space-y-2">
              <Label
                htmlFor="level-name"
                className="text-muted-foreground"
              >
                {tDashboard("level_name")}
              </Label>
              <Input
                id="level-name"
                value={levelName}
                onChange={(e) => {
                  setLevelName?.(e.target.value);
                  onChangesUnsaved?.();
                }}
                placeholder={t("enter_level_name")}
                className="bg-card border-border-strong"
              />
            </div>

            <div className="space-y-2 mt-4">
              <Label
                htmlFor="level-number"
                className="text-muted-foreground"
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
                placeholder={t("enter_level_number")}
                className="bg-card border-border-strong"
              />
              <p className="text-xs text-subtle-foreground">
                {`${t("level_number_determines_advanced_verification")} (higher numbers = more advanced verification)`}
              </p>
            </div>

            <div className="space-y-2 mt-4">
              <Label
                htmlFor="level-description"
                className="text-muted-foreground"
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
                placeholder={t("enter_level_description")}
                className="h-24 resize-none bg-card border-border-strong"
                rows={5}
              />
              <p className="text-xs text-subtle-foreground">
                {t("describe_the_purpose_it_collects")}
              </p>
            </div>
          </div>

          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {tCommon("status")}
            </h3>
            <div className="space-y-2">
              <div
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                  status === "DRAFT"
                    ? "bg-muted border border-border-strong"
                    : "hover:bg-muted dark:hover:bg-surface-2/50"
                }`}
                onClick={() => {
                  setStatus?.("DRAFT");
                  onChangesUnsaved?.();
                }}
              >
                <Wand2 className="h-3.5 w-3.5 text-warning" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {tCommon("draft")}
                  </h4>
                  <p className="text-xs text-subtle-foreground">
                    {t("not_visible_to_users")}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                  status === "ACTIVE"
                    ? "bg-muted border border-border-strong"
                    : "hover:bg-muted dark:hover:bg-surface-2/50"
                }`}
                onClick={() => {
                  setStatus?.("ACTIVE");
                  onChangesUnsaved?.();
                }}
              >
                <Flame className="h-3.5 w-3.5 text-success" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {tCommon("active")}
                  </h4>
                  <p className="text-xs text-subtle-foreground">
                    {t("visible_and_available_to_users")}
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                  status === "INACTIVE"
                    ? "bg-muted border border-border-strong"
                    : "hover:bg-muted dark:hover:bg-surface-2/50"
                }`}
                onClick={() => {
                  setStatus?.("INACTIVE");
                  onChangesUnsaved?.();
                }}
              >
                <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {tCommon("inactive")}
                  </h4>
                  <p className="text-xs text-subtle-foreground">
                    {t("temporarily_disabled")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t("verification_services")}
            </h3>
            <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
              {currentLevel?.verificationService ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">
                        {currentLevel.verificationService.name}
                      </h3>
                      {/* Note: templateName field doesn't exist in kycVerificationService model */}
                      {/* Service details are stored in integrationDetails field instead */}
                    </div>
                    <div className="bg-success/10 text-foreground border border-success/30 text-xs px-2 py-1 rounded-full">
                      {tCommon("connected")}
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
                  <p className="text-sm text-subtle-foreground">
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
