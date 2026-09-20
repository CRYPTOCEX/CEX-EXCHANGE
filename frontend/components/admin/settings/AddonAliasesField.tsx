"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CustomComponentProps } from "./types";
import { cn } from "@/lib/utils";
import { RotateCcw, Tag, Info, Navigation, Wallet } from "lucide-react";
import { m } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-settings";
import {
  ADDON_DISPLAY_DEFAULTS,
  getAddonNameContexts,
  type AddonNameContext,
} from "@/hooks/use-addon-display-name";
import { useTranslations } from "next-intl";

// Alias structure: { "ecosystem": { "menu": "...", "wallet": "..." }, ... }
type AddonAliasMap = Record<string, Record<string, string>>;

/**
 * How each renameable surface is presented. `ADDON_DISPLAY_DEFAULTS` decides
 * WHICH of these an addon gets — an addon with no wallet type never renders the
 * wallet row, because a name nothing reads is worse than no field at all.
 */
const CONTEXT_UI: Record<
  AddonNameContext,
  { label: string; icon: typeof Navigation }
> = {
  menu: { label: "Menu Name", icon: Navigation },
  wallet: { label: "Wallet Name", icon: Wallet },
};

export const AddonAliasesField: React.FC<CustomComponentProps> = ({
  formValues,
  handleChange,
  meta,
}) => {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const { extensions, settingsFetched } = useSettings();

  // Parse current aliases from form values
  const currentAliases: AddonAliasMap = useMemo(() => {
    const raw = formValues.addon_aliases;
    if (!raw) return {};
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        // Migrate old flat format { "ecosystem": "Name" } to new format
        const result: AddonAliasMap = {};
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === "string") {
            // Old format - migrate: put old value as menu name
            result[key] = { menu: value };
          } else if (typeof value === "object" && value !== null) {
            result[key] = value as Record<string, string>;
          }
        }
        return result;
      } catch {
        return {};
      }
    }
    if (typeof raw === "object") return raw as AddonAliasMap;
    return {};
  }, [formValues.addon_aliases]);

  /**
   * Split the active extensions into the ones with a surface to rename and the
   * ones without. An addon that owns neither a menu item nor a wallet type gets
   * no card: it is listed once in a footnote instead, so an admin who goes
   * looking for it learns why it is absent rather than assuming it broke.
   */
  const { renameable, inert } = useMemo(() => {
    const renameable: { name: string; contexts: AddonNameContext[] }[] = [];
    const inert: string[] = [];
    for (const name of extensions ?? []) {
      const contexts = getAddonNameContexts(name);
      if (contexts.length === 0) inert.push(name);
      else renameable.push({ name, contexts });
    }
    return { renameable, inert };
  }, [extensions]);

  const handleAliasChange = (
    addonName: string,
    context: AddonNameContext,
    displayName: string
  ) => {
    const updated = { ...currentAliases };
    const defaultValue = ADDON_DISPLAY_DEFAULTS[addonName]?.[context] || "";

    if (displayName.trim() === "" || displayName.trim() === defaultValue) {
      // Remove this context
      if (updated[addonName]) {
        const addonEntry = { ...updated[addonName] };
        delete addonEntry[context];
        if (Object.keys(addonEntry).length === 0) {
          delete updated[addonName];
        } else {
          updated[addonName] = addonEntry;
        }
      }
    } else {
      if (!updated[addonName]) updated[addonName] = {};
      updated[addonName] = {
        ...updated[addonName],
        [context]: displayName.trim(),
      };
    }
    handleChange("addon_aliases", JSON.stringify(updated));
  };

  const handleResetAddon = (addonName: string) => {
    const updated = { ...currentAliases };
    delete updated[addonName];
    handleChange("addon_aliases", JSON.stringify(updated));
  };

  const handleResetAll = () => {
    handleChange("addon_aliases", JSON.stringify({}));
  };

  const hasAnyCustomization = Object.keys(currentAliases).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Tag className="w-3.5 h-3.5 text-primary" />
          </div>
          <Label className="text-sm font-medium">{t("addon_display_names")}</Label>
          {meta}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {t("customize_the_display_names_of_addons")}
              </TooltipContent>
            </Tooltip>
        </div>
        {hasAnyCustomization && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3" />
            {t("reset_all")}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("override_the_default_display_names_for_each_addon")}{" "}
        <strong>{t("menu_name")}</strong> appears in the sidebar and navigation.{" "}
        <strong>{t("wallet_name")}</strong> appears in wallet type selectors, deposits
        and withdrawals — only the three addons that add a wallet type of their
        own show it. Leave a field empty to use the default.
      </p>

      <div className="space-y-3">
        {renameable.map(({ name: addonName, contexts }, index) => {
          const defaults = ADDON_DISPLAY_DEFAULTS[addonName] || {};
          const addonAliases = currentAliases[addonName] || {};
          // Only the surfaces this card renders count. A settings row saved
          // before the wallet field was scoped can still hold e.g.
          // `mailwizard.wallet`; keying the badge off every stored context
          // would light up "customized" on a card whose inputs are all empty.
          const isCustomized = contexts.some((ctx) => !!addonAliases[ctx]);

          return (
            <m.div
              key={addonName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                isCustomized
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground font-mono">
                    {addonName}
                  </span>
                  {isCustomized && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary-ink font-medium">
                      customized
                    </span>
                  )}
                </div>
                {isCustomized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetAddon(addonName)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div
                className={cn(
                  "grid grid-cols-1 gap-2",
                  contexts.length > 1 && "sm:grid-cols-2"
                )}
              >
                {contexts.map((context) => {
                  const { label, icon: Icon } = CONTEXT_UI[context];
                  return (
                    <div key={context} className="space-y-1">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Icon className="w-3 h-3" />
                        <span>{label}</span>
                      </div>
                      <Input
                        value={addonAliases[context] || ""}
                        onChange={(e) =>
                          handleAliasChange(addonName, context, e.target.value)
                        }
                        placeholder={defaults[context] || addonName}
                        className="h-8 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </m.div>
          );
        })}
      </div>

      {inert.length > 0 && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {tCommon("not_listed")}:{" "}
          <span className="font-mono">{inert.join(", ")}</span> — these addons
          have no menu entry and no wallet type, so there is no name to override.
        </p>
      )}

      {settingsFetched && renameable.length === 0 && inert.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t("no_addons_are_currently_active_activate")}
        </div>
      )}
    </div>
  );
};
