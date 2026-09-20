"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState, MetaChip, StatusNotice, TabButton } from "../ui/terminal";
import { Loadable } from "@/components/ui/skeleton";

/*
 * PRICE ALERTS, SERVER-SIDE.
 *
 * What was here until 25 Aug 2026: four hardcoded alerts with May 2023
 * timestamps, a fake one-second loading spinner and three untranslated English
 * strings. It was replaced with an honest empty state saying the feature did
 * not exist, because it did not: `PushTemplateEngine` defined a PRICE_ALERT
 * template and grep returned that definition and nothing else — no producer,
 * no evaluator, no storage. Alerts lived in the chart engine's localStorage
 * and died with the browser tab.
 *
 * They are real now. `exchange_price_alert` stores them, the
 * `evaluatePriceAlerts` cron tests them every 30 seconds against the same
 * rules the chart engine applies in the browser, and NotificationService
 * delivers them. So an alert set here fires with this tab closed, on a device
 * that is not this one.
 *
 * DO NOT put sample data back in this file. Every row below is a row the
 * server returned.
 */

type AlertCondition = "CROSSES_ABOVE" | "CROSSES_BELOW" | "CROSSES";
type AlertStatus = "ACTIVE" | "TRIGGERED" | "EXPIRED" | "DISABLED";

interface PriceAlert {
  id: string;
  symbol: string;
  type: "SPOT" | "ECO" | "FUTURES";
  condition: AlertCondition;
  targetPrice: number;
  status: AlertStatus;
  isRepeating: boolean;
  note: string | null;
  armedPrice: number | null;
  triggeredPrice: number | null;
  triggeredAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

interface AlertsResponse {
  items: PriceAlert[];
  maxAlerts: number;
  activeCount: number;
}

interface AlertsPanelProps {
  symbol?: string;
  marketType?: "spot" | "eco" | "futures";
}

/**
 * Enough decimal places to show the level on this pair.
 *
 * Mirrors the server's `formatAlertPrice`. Two decimals on a coin quoted at
 * 0.00002341 renders "0.00", so the panel would list an alert with no visible
 * level — and the row a user is asked to confirm has to show the number they
 * typed.
 */
function formatPrice(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 1) return value.toFixed(4);
  if (abs >= 0.01) return value.toFixed(6);
  return value.toFixed(10);
}

/** The API's market family from the layout's lowercase market type. */
function toApiType(marketType?: string): "SPOT" | "ECO" | "FUTURES" {
  if (marketType === "futures") return "FUTURES";
  if (marketType === "eco") return "ECO";
  return "SPOT";
}

export default function AlertsPanel({ symbol, marketType }: AlertsPanelProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [maxAlerts, setMaxAlerts] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [isComposing, setIsComposing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Draft state for the create form.
  const [draftCondition, setDraftCondition] = useState<AlertCondition>("CROSSES_ABOVE");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftRepeat, setDraftRepeat] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setIsLoading(true);

    const { data, error } = await $fetch<AlertsResponse>({
      url: "/api/exchange/alert",
      silent: true,
      silentSuccess: true,
    });

    /*
     * `$fetch` resolves an envelope and never throws, so a try/catch around it
     * is dead code — the failure arrives as `error`. Distinguishing it from an
     * empty list matters here: "no alerts" and "we could not read your alerts"
     * look identical in an empty state, and only one of them means a user
     * should stop relying on the alerts they set.
     */
    if (error || !data || !Array.isArray(data.items)) {
      setLoadFailed(true);
      setIsLoading(false);
      return;
    }

    setLoadFailed(false);
    setAlerts(data.items);
    if (typeof data.maxAlerts === "number") setMaxAlerts(data.maxAlerts);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
    /*
     * Poll rather than subscribe. An alert fires from a 30-second cron, so a
     * socket would buy at most a few seconds of latency on an event that is
     * already delivered by the notification system — this list is the record,
     * not the announcement.
     */
    const interval = setInterval(() => load({ quiet: true }), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const active = useMemo(
    () => alerts.filter((a) => a.status === "ACTIVE" || a.status === "DISABLED"),
    [alerts]
  );
  const history = useMemo(
    () => alerts.filter((a) => a.status === "TRIGGERED" || a.status === "EXPIRED"),
    [alerts]
  );

  const activeCount = useMemo(
    () => alerts.filter((a) => a.status === "ACTIVE").length,
    [alerts]
  );
  const atLimit = activeCount >= maxAlerts;

  const resetDraft = useCallback(() => {
    setDraftCondition("CROSSES_ABOVE");
    setDraftPrice("");
    setDraftRepeat(false);
    setDraftNote("");
    setDraftError(null);
  }, []);

  const createAlert = useCallback(async () => {
    const target = Number(draftPrice);
    // Checked here as well as on the server so the trader is told before the
    // round trip; the server check is the one that matters.
    if (!Number.isFinite(target) || target <= 0) {
      setDraftError(t("alert_price_invalid"));
      return;
    }
    if (!symbol) return;

    setIsSaving(true);
    setDraftError(null);

    const { error } = await $fetch({
      url: "/api/exchange/alert",
      method: "POST",
      body: {
        symbol,
        type: toApiType(marketType),
        condition: draftCondition,
        targetPrice: target,
        isRepeating: draftRepeat,
        note: draftNote.trim() || null,
      },
      silentSuccess: true,
    });

    setIsSaving(false);
    if (error) return;

    setIsComposing(false);
    resetDraft();
    // Re-read rather than appending locally, so the row shows the price the
    // server recorded at arming — which is what the alert will be measured
    // from.
    await load({ quiet: true });
  }, [
    draftPrice,
    draftCondition,
    draftRepeat,
    draftNote,
    symbol,
    marketType,
    t,
    load,
    resetDraft,
  ]);

  const setStatus = useCallback(
    async (alert: PriceAlert, status: "ACTIVE" | "DISABLED") => {
      setBusyId(alert.id);
      const { error } = await $fetch({
        url: `/api/exchange/alert/${alert.id}`,
        method: "PUT",
        body: { status },
        silentSuccess: true,
      });
      setBusyId(null);
      if (!error) await load({ quiet: true });
    },
    [load]
  );

  const removeAlert = useCallback(
    async (alert: PriceAlert) => {
      setBusyId(alert.id);
      const { error } = await $fetch({
        url: `/api/exchange/alert/${alert.id}`,
        method: "DELETE",
        silentSuccess: true,
      });
      setBusyId(null);
      if (!error) await load({ quiet: true });
    },
    [load]
  );

  const clearHistory = useCallback(async () => {
    const { error } = await $fetch({
      url: "/api/exchange/alert",
      method: "DELETE",
      silentSuccess: true,
    });
    if (!error) await load({ quiet: true });
  }, [load]);

  const conditionLabel = (condition: AlertCondition) =>
    condition === "CROSSES_ABOVE"
      ? tCommon("rises_above")
      : condition === "CROSSES_BELOW"
        ? tCommon("falls_below")
        : tCommon("crosses");

  const rows = tab === "active" ? active : history;

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{tCommon("price_alerts")}</h3>
          <Loadable loading={isLoading} placeholder="0/50">
            <MetaChip className="text-[10px] py-0.5">
              {activeCount}/{maxAlerts}
            </MetaChip>
          </Loadable>
        </div>
        {symbol && (
          <Button
            size="2xs"
            variant={isComposing ? "ghost" : "outline"}
            disabled={atLimit && !isComposing}
            onClick={() => {
              setIsComposing((v) => !v);
              setDraftError(null);
            }}
          >
            {isComposing ? (
              <X className="h-3 w-3" />
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                {tCommon("new")}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Create form */}
      {isComposing && symbol && (
        <div className="border-b border-border p-2 space-y-2 bg-surface-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{symbol}</span>
            <div className="flex-1" />
            {(["CROSSES_ABOVE", "CROSSES_BELOW", "CROSSES"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraftCondition(c)}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] rounded border transition-colors",
                  draftCondition === c
                    ? "border-primary text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {conditionLabel(c)}
              </button>
            ))}
          </div>

          <Input
            value={draftPrice}
            onChange={(e) => {
              setDraftPrice(e.target.value);
              setDraftError(null);
            }}
            inputMode="decimal"
            placeholder={tCommon("price")}
            className="text-xs"
          />

          <Input
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder={t("alert_note_optional")}
            maxLength={255}
            className="text-xs"
          />

          <div className="flex items-center justify-between">
            {/* The workspace Checkbox, not a bare <input accent-[var(--primary)]>.
                `--primary` is stored as bare HSL COMPONENTS (`216 83.6% 48.4%`)
                for `hsl(var(--primary))`, so an accent-color built from it is
                invalid CSS and the box silently paints in the browser default —
                a control that looks styled, is not, and nothing reports it. */}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                size="sm"
                checked={draftRepeat}
                onCheckedChange={(checked) => setDraftRepeat(checked === true)}
              />
              {tCommon("repeat")}
            </label>
            <Button
              size="2xs"
              disabled={isSaving}
              onClick={createAlert}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  {tCommon("create")}
                </>
              )}
            </Button>
          </div>

          {draftError && (
            <StatusNotice tone="destructive">{draftError}</StatusNotice>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        <TabButton
          active={tab === "active"}
          onClick={() => setTab("active")}
          icon={<Bell className="h-3 w-3 mr-1" />}
        >
          {t("alert_tab_armed")} ({active.length})
        </TabButton>
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          icon={<BellOff className="h-3 w-3 mr-1" />}
        >
          {tCommon("history")} ({history.length})
        </TabButton>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/*
          The failure notice comes BEFORE the empty state and is not an
          early return. "You have no alerts" and "we could not read your
          alerts" render identically otherwise, and only one of them means the
          levels a trader set are still being watched.
        */}
        {loadFailed && !isLoading && (
          <div className="p-2">
            <StatusNotice tone="warning">{t("alerts_load_failed")}</StatusNotice>
          </div>
        )}

        {isLoading ? (
          <div className="p-2 space-y-2">
            {[0, 1].map((i) => (
              <div
                key={`pending-alert-${i}`}
                className="h-12 rounded bg-surface-3 animate-pulse"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-6 w-6" />}
            title={
              tab === "active" ? t("no_armed_alerts") : t("no_alert_history")
            }
            hint={tab === "active" ? t("no_armed_alerts_hint") : undefined}
          />
        ) : (
          <div className="divide-y divide-border">
            {rows.map((alert) => {
              const isDown = alert.condition === "CROSSES_BELOW";
              const isBusy = busyId === alert.id;
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      "shrink-0",
                      isDown ? "text-destructive" : "text-success"
                    )}
                  >
                    {isDown ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium truncate">{alert.symbol}</span>
                      <span className="text-muted-foreground">
                        {conditionLabel(alert.condition)}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatPrice(alert.targetPrice)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      {alert.status === "TRIGGERED" && (
                        <MetaChip className="text-[10px] py-0 text-success">
                          {t("alert_fired_at")} {formatPrice(alert.triggeredPrice)}
                        </MetaChip>
                      )}
                      {alert.status === "EXPIRED" && (
                        <MetaChip className="text-[10px] py-0">
                          {tCommon("expired")}
                        </MetaChip>
                      )}
                      {alert.status === "DISABLED" && (
                        <MetaChip className="text-[10px] py-0">
                          {tCommon("paused")}
                        </MetaChip>
                      )}
                      {alert.isRepeating && (
                        <MetaChip className="text-[10px] py-0">
                          {tCommon("repeat")}
                        </MetaChip>
                      )}
                      {typeof alert.armedPrice === "number" && (
                        <span className="truncate">
                          {t("alert_armed_at")} {formatPrice(alert.armedPrice)}
                        </span>
                      )}
                      {alert.note && (
                        <span className="truncate italic">{alert.note}</span>
                      )}
                    </div>
                  </div>

                  {isBusy ? (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {alert.status === "ACTIVE" && (
                        <Button
                          size="2xs"
                          variant="ghost"
                          iconOnly
                          title={tCommon("pause")}
                          onClick={() => setStatus(alert, "DISABLED")}
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {alert.status === "DISABLED" && (
                        <Button
                          size="2xs"
                          variant="ghost"
                          iconOnly
                          title={tCommon("resume")}
                          onClick={() => setStatus(alert, "ACTIVE")}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="2xs"
                        variant="ghost"
                        iconOnly
                        className="text-muted-foreground hover:text-destructive"
                        title={tCommon("delete")}
                        onClick={() => removeAlert(alert)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: only offered when there is something to clear, and it never
          touches an armed alert — the server refuses anything but TRIGGERED
          and EXPIRED. */}
      {tab === "history" && history.length > 0 && (
        <div className="border-t border-border p-2">
          <Button
            size="2xs"
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={clearHistory}
          >
            {t("alert_clear_history")}
          </Button>
        </div>
      )}
    </div>
  );
}
