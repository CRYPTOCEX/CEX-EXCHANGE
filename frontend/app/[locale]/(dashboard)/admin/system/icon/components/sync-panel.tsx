"use client";

import { useTranslations } from "next-intl";
import { Download, Loader2, Terminal, WifiOff, ToggleLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * The write side of the page: two options and one button.
 *
 * The options are toggle TILES rather than a stack of checkboxes because both
 * of them materially change what the button is about to do to the filesystem,
 * and a 13px checkbox label is not the weight that decision deserves. Each tile
 * states the consequence, not the flag.
 */
export function SyncPanel({
  enabledOnly,
  onEnabledOnly,
  offline,
  onOffline,
  syncing,
  disabled,
  onRun,
  lastRun,
}: {
  enabledOnly: boolean;
  onEnabledOnly: (v: boolean) => void;
  offline: boolean;
  onOffline: (v: boolean) => void;
  syncing: boolean;
  disabled: boolean;
  onRun: () => void;
  lastRun: string | null;
}) {
  const t = useTranslations("dashboard_admin");

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>{t("fetch_missing_icons")}</CardTitle>
        <CardDescription>
          {t("writes_64x64_webp_matching_the_existing_convention")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionTile
            icon={<ToggleLeft className="size-4" />}
            title={t("enabled_currencies_only")}
            description={t("most_imported_currencies_are_created_disabled")}
            checked={enabledOnly}
            onChange={onEnabledOnly}
            disabled={syncing}
          />
          <OptionTile
            icon={<WifiOff className="size-4" />}
            title={t("offline_sources_only")}
            description={t("reuses_logos_already_in_the_repo")}
            checked={offline}
            onChange={onOffline}
            disabled={syncing}
          />
        </div>

        <div className="mt-auto space-y-3">
          <Button onClick={onRun} disabled={syncing || disabled} className="w-full sm:w-auto">
            {syncing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("fetching")}…
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                {t("fetch_up_to_200_icons")}
              </>
            )}
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Terminal className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {t("a_full_backfill_is_faster_from_the_cli")}{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">{t("npm_run_icons_sync")}</code>
            </span>
          </p>

          {/* Held separately from the report: `load()` replaces the whole
              report object, which used to throw this away one tick after it
              arrived, so the outcome of a run never appeared. */}
          {lastRun && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              {lastRun}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OptionTile({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
    </label>
  );
}
