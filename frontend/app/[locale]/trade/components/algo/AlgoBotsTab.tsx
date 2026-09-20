"use client";

/**
 * Running-bots table for the bottom orders panel.
 *
 * Sits beside Open / History / Trades so a user watching the market can see
 * what their algos are doing without leaving the page. Every numeric field is
 * already coerced and derived by the store's `normalizeBot()` — the API returns
 * raw Sequelize rows where DECIMALs are strings and `profitPercent`/`winRate`
 * are not columns at all.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { useTradingBotStore, type TradingBot } from "@/store/trading-bot";
import { statusTone } from "@/lib/status-tone";
import type { BadgeTone } from "@/components/ui/badge";
import "./algo.css";
import { useTranslations } from "next-intl";

/** The engine ticks every 5s, so refreshing at 10s keeps the table live
 *  without hammering the API from a page that is already websocket-heavy. */
const REFRESH_MS = 10_000;

/**
 * The trade workspace paints from its own dense `--algo-*` palette rather than
 * the Tailwind tokens, so the canonical tone is mapped onto that palette here.
 * Which status carries which tone is decided once, in `lib/status-tone.ts`.
 */
const TONE_COLOR: Record<BadgeTone, string> = {
  primary: "var(--algo-blue)",
  secondary: "var(--algo-text-dim)",
  success: "var(--algo-green)",
  warning: "var(--algo-yellow)",
  destructive: "var(--algo-red)",
  info: "var(--algo-blue)",
  neutral: "var(--algo-text-muted)",
};

/**
 * THE UNIT A BOT'S MONEY FIGURES ARE IN.
 *
 * Allocation and P&L are both quote-denominated — see the summary strip below
 * for the modules that establish it. Shared by the strip and the rows so the
 * two can never name a different unit for the same bot.
 */
const quoteAssetOf = (symbol?: string): string =>
  (symbol?.split("/")[1] || "USDT").toUpperCase();

export interface AlgoBotsTabProps {
  /** When set, the table filters to bots trading this symbol by default. */
  symbol?: string;
  className?: string;
}

export const AlgoBotsTab = memo(function AlgoBotsTab({
  symbol,
  className,
}: AlgoBotsTabProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const user = useUserStore((s) => s.user);
  const bots = useTradingBotStore((s) => s.bots);
  const isLoading = useTradingBotStore((s) => s.isLoading);
  const fetchBots = useTradingBotStore((s) => s.fetchBots);
  const startBot = useTradingBotStore((s) => s.startBot);
  const pauseBot = useTradingBotStore((s) => s.pauseBot);
  const resumeBot = useTradingBotStore((s) => s.resumeBot);
  const stopBot = useTradingBotStore((s) => s.stopBot);
  const deleteBot = useTradingBotStore((s) => s.deleteBot);

  const [onlyThisSymbol, setOnlyThisSymbol] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchBots();
    const id = setInterval(fetchBots, REFRESH_MS);
    return () => clearInterval(id);
  }, [user, fetchBots]);

  const visible = useMemo(() => {
    if (!onlyThisSymbol || !symbol) return bots;
    return bots.filter((b) => b.symbol === symbol);
  }, [bots, onlyThisSymbol, symbol]);

  /**
   * The summary strip — over the rows the panel is SHOWING, in the units those
   * rows are actually denominated in.
   *
   * Two separate defects lived in four lines here.
   *
   * It reduced over `bots`, the whole store list, while the table below renders
   * `visible`. Pressing "BTC/USDT only" filtered the rows and left the headline
   * counting every other bot, so the strip and the rows it sits on top of
   * disagreed by design — "3 running" above a single visible row.
   *
   * And it added `totalProfit` and `allocatedAmount` straight across bots. Both
   * are QUOTE-denominated: profit is `(exitPrice - entryPrice) * amount`, a
   * difference of two prices in the quote asset, computed by
   * `OrderExecutor.settleSellAgainstInventory` for a live fill and by
   * `BotInstance.closeTrade` for a paper one (both in
   * `backend/src/api/(ext)/trading-bot/utils/engine/`), and the allocation
   * routes debit the quote-asset wallet (deriving it with the same
   * `symbol.split("/")[1] || "USDT"` that `quoteAssetOf` uses). A bot up
   * 25 USDT beside a bot up 0.5 BTC printed "+25.50" — not USDT, not BTC, and
   * understating the second bot by roughly $50,000. There are no exchange rates
   * on this panel and it must not grow any, so the only honest reduction is one
   * figure per unit.
   *
   * PAPER bots get their own groups for the same reason: simulated money added
   * to real money is not an amount anyone holds.
   */
  const summary = useMemo(() => {
    const running = visible.filter((b) => b.status === "RUNNING").length;
    const groups = new Map<
      string,
      { key: string; label: string; pnl: number; allocated: number }
    >();
    for (const b of visible) {
      const quote = quoteAssetOf(b.symbol);
      const paper = b.mode === "PAPER";
      const key = `${paper ? "1" : "0"}|${quote}`;
      const group = groups.get(key) ?? {
        key,
        label: paper ? t("paper", { quote: String(quote) }) : quote,
        pnl: 0,
        allocated: 0,
      };
      group.pnl += Number(b.totalProfit) || 0;
      group.allocated += Number(b.allocatedAmount) || 0;
      groups.set(key, group);
    }
    return {
      running,
      groups: Array.from(groups.values()).sort((a, b) =>
        a.key.localeCompare(b.key)
      ),
    };
  }, [visible]);

  const act = useCallback(
    async (id: string, fn: (id: string) => Promise<void>, verb: string) => {
      setBusyId(id);
      try {
        await fn(id);
        toast.success(t("bot", { verb: String(verb) }));
      } catch (err: any) {
        toast.error(err?.message || t("could_not_bot", { verb: String(verb) }));
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (bot: TradingBot) => {
      if (
        typeof window !== "undefined" &&
        !window.confirm(
          t("delete_allocated_funds_are_returned_to_your_wallet", { name: String(bot.name) })
        )
      ) {
        return;
      }
      await act(bot.id, deleteBot, "deleted");
    },
    [act, deleteBot]
  );

  if (!user) {
    return (
      <EmptyState message={t("sign_in_to_see_your_trading_bots")} />
    );
  }

  if (isLoading && bots.length === 0) {
    return (
      <div className="algo-panel flex h-full items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--algo-text-muted)]" />
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <EmptyState message={t("no_bots_yet_create_one_from_the_algo_tab")} />
    );
  }

  return (
    <div className={cn("algo-panel flex h-full flex-col", className)}>
      {/* Summary strip. `flex-wrap` because there is now one Allocated/P&L
          pair per quote asset rather than one pair full stop: a user running
          USDT and BTC bots gets two, and a single line would push the
          "{symbol} only" toggle off the panel. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-[var(--algo-border-subtle)] px-2 py-1">
        <span className="flex items-center gap-1 text-[10px] text-[var(--algo-text-muted)]">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              summary.running > 0 && "algo-pulse"
            )}
            style={{
              backgroundColor:
                summary.running > 0
                  ? "var(--algo-green)"
                  : "var(--algo-text-muted)",
            }}
          />
          {summary.running} running
        </span>

        {/* The code is stated ONCE per group and both figures beside it are in
            that unit — repeating "USDT" on each number in a 10px strip costs
            more room than it buys. */}
        {summary.groups.map((group) => (
          <span
            key={group.key}
            className="flex items-center gap-1 text-[10px] text-[var(--algo-text-muted)]"
          >
            <span className="text-[var(--algo-text-dim)]">{group.label}</span>
            alloc
            <span className="algo-num text-[var(--algo-text)]">
              {fmt(group.allocated)}
            </span>
            P&amp;L
            <span className="algo-num" style={{ color: pnlColor(group.pnl) }}>
              {signed(group.pnl)}
            </span>
          </span>
        ))}

        {symbol && (
          <button
            type="button"
            onClick={() => setOnlyThisSymbol((v) => !v)}
            className={cn(
              "ml-auto rounded px-1.5 py-0.5 text-[9px] transition-colors",
              onlyThisSymbol
                ? "bg-[var(--algo-blue)] text-[var(--algo-blue-fg)]"
                : "text-[var(--algo-text-muted)] hover:text-[var(--algo-text)]"
            )}
          >
            {symbol} only
          </button>
        )}
      </div>

      {/* Table */}
      <div className="algo-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[var(--algo-bg)]">
            <tr className="text-[9px] uppercase tracking-wide text-[var(--algo-text-muted)]">
              <Th className="pl-2 text-left">Bot</Th>
              <Th className="text-left">Symbol</Th>
              <Th>Status</Th>
              <Th className="text-right">Allocated</Th>
              <Th className="text-right">P&amp;L</Th>
              <Th className="text-right">ROI</Th>
              <Th className="text-right">Trades</Th>
              <Th className="text-right">Win</Th>
              <Th className="pr-2 text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-6 text-center text-[10px] text-[var(--algo-text-muted)]"
                >
                  {t("no_bots_on")} {symbol}
                </td>
              </tr>
            ) : (
              visible.map((bot) => {
                const busy = busyId === bot.id;
                const running = bot.status === "RUNNING";
                const paused = bot.status === "PAUSED";
                const stoppable = running || paused;
                // Allocated and P&L below are in THIS bot's quote asset. The
                // strip above names a unit per group, so once a user runs a
                // USDT bot and a BTC bot the columns are two units deep and a
                // bare "1,200.00" beside a bare "0.05" is unreadable — the
                // first is not a thousand times the second.
                const quote = quoteAssetOf(bot.symbol);

                return (
                  <tr
                    key={bot.id}
                    className="border-t border-[var(--algo-border-subtle)] text-[10px] transition-colors hover:bg-[var(--algo-bg-raised)]"
                  >
                    <Td className="pl-2">
                      <Link
                        href={`/trading-bot/bot/${bot.id}`}
                        className="group flex items-center gap-1.5"
                      >
                        <Bot className="h-3 w-3 shrink-0 text-[var(--algo-text-muted)]" />
                        <span className="max-w-[120px] truncate font-medium text-[var(--algo-text)] group-hover:underline">
                          {bot.name}
                        </span>
                        <span className="shrink-0 rounded bg-[var(--algo-bg-elevated)] px-1 py-[1px] text-[8px] text-[var(--algo-text-dim)]">
                          {bot.type === "TRAILING_STOP" ? t("trail") : bot.type}
                        </span>
                        {bot.mode === "PAPER" && (
                          <span className="shrink-0 rounded border border-[var(--algo-border)] px-1 py-[1px] text-[8px] text-[var(--algo-text-muted)]">
                            PAPER
                          </span>
                        )}
                      </Link>
                    </Td>

                    <Td className="algo-num text-[var(--algo-text-dim)]">
                      {bot.symbol}
                    </Td>

                    <Td className="text-center">
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ color: TONE_COLOR[statusTone(bot.status)] }}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            running && "algo-pulse"
                          )}
                          style={{ backgroundColor: "currentColor" }}
                        />
                        {bot.status === "LIMIT_REACHED" ? tCommon("limit") : bot.status}
                      </span>
                    </Td>

                    <Td className="algo-num text-right text-[var(--algo-text)]">
                      {fmt(bot.allocatedAmount)}
                      <Unit code={quote} />
                    </Td>

                    <Td
                      className="algo-num text-right font-medium"
                      style={{ color: pnlColor(bot.totalProfit) }}
                    >
                      {signed(bot.totalProfit)}
                      <Unit code={quote} />
                    </Td>

                    <Td
                      className="algo-num text-right"
                      style={{ color: pnlColor(bot.profitPercent) }}
                    >
                      {signed(bot.profitPercent, 2)}%
                    </Td>

                    <Td className="algo-num text-right text-[var(--algo-text-dim)]">
                      {bot.totalTrades ?? 0}
                    </Td>

                    <Td className="algo-num text-right text-[var(--algo-text-dim)]">
                      {(bot.winRate ?? 0).toFixed(0)}%
                    </Td>

                    <Td className="pr-2">
                      <div className="flex items-center justify-end gap-0.5">
                        {busy ? (
                          <Loader2 className="h-3 w-3 animate-spin text-[var(--algo-text-muted)]" />
                        ) : (
                          <>
                            {running ? (
                              <IconButton
                                title="Pause"
                                onClick={() => act(bot.id, pauseBot, "paused")}
                              >
                                <Pause className="h-3 w-3" />
                              </IconButton>
                            ) : (
                              <IconButton
                                title={paused ? tCommon("resume") : tCommon("start")}
                                tone="var(--algo-green)"
                                onClick={() =>
                                  act(
                                    bot.id,
                                    paused ? resumeBot : startBot,
                                    paused ? "resumed" : "started"
                                  )
                                }
                              >
                                <Play className="h-3 w-3" />
                              </IconButton>
                            )}

                            <IconButton
                              title="Stop"
                              disabled={!stoppable}
                              onClick={() => act(bot.id, stopBot, "stopped")}
                            >
                              <Square className="h-3 w-3" />
                            </IconButton>

                            <IconButton
                              title="Delete"
                              tone="var(--algo-red)"
                              disabled={running}
                              onClick={() => handleDelete(bot)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </IconButton>

                            <Link
                              href={`/trading-bot/bot/${bot.id}`}
                              title="Details"
                              className="flex h-5 w-5 items-center justify-center rounded text-[var(--algo-text-muted)] transition-colors hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)]"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Bits                                                                */
/* ------------------------------------------------------------------ */

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--algo-border)] px-1.5 py-1 text-center font-medium",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className={cn("px-1.5 py-1", className)} style={style}>
      {children}
    </td>
  );
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      style={tone && !disabled ? { color: tone } : undefined}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded transition-colors",
        disabled
          ? "cursor-not-allowed text-[var(--algo-text-muted)] opacity-35"
          : "text-[var(--algo-text-muted)] hover:bg-[var(--algo-bg-elevated)] hover:text-[var(--algo-text)]"
      )}
    >
      {children}
    </button>
  );
}

/**
 * The currency code riding beside a figure in a cell.
 *
 * Dimmed and one step smaller so the column still scans as a column of
 * numbers — the code is the unit, not part of the amount.
 */
function Unit({ code }: { code: string }) {
  return (
    <span className="ml-0.5 text-[8px] text-[var(--algo-text-muted)]">
      {code}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="algo-panel flex h-full flex-col items-center justify-center gap-1.5">
      <Bot className="h-5 w-5 text-[var(--algo-text-muted)]" />
      <p className="text-[10px] text-[var(--algo-text-muted)]">{message}</p>
    </div>
  );
}

/**
 * A quote-asset amount — allocation or P&L, never a percentage.
 *
 * Two decimals at or above 1 and up to eight below it. The flat two-decimal
 * form was safe only while every figure on the panel was silently assumed to
 * be USDT; now that the strip names the unit, a BTC-quoted bot up 0.0032 BTC
 * would have printed "0.00" — a bot that made money reported as flat.
 */
const fmt = (value: number): string => {
  const v = Number(value) || 0;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(v) >= 1 ? 2 : 8,
  });
};

/** `decimals` is for percentages, which are always two places. Omit it for a
 *  money figure so it goes through `fmt` and keeps its precision. */
const signed = (value: number, decimals?: number): string => {
  const v = Number(value) || 0;
  const figure = decimals === undefined ? fmt(v) : v.toFixed(decimals);
  return `${v > 0 ? "+" : ""}${figure}`;
};

const pnlColor = (value: number): string => {
  const v = Number(value) || 0;
  if (v > 0) return "var(--algo-green)";
  if (v < 0) return "var(--algo-red)";
  return "var(--algo-text-dim)";
};

export default AlgoBotsTab;
