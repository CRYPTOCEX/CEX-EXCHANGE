import type { Section, Element } from "@/types/builder";
import {
  el,
  row,
  col,
  section,
  singleColumnRow,
  theme,
  sectionPresets,
  rowPresets,
} from "../../utils";

const toolTile = (
  icon: string,
  title: string,
  description: string,
  accent: string
): Element =>
  el.card(
    {
      backgroundColor: theme.bgCard,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 28,
    },
    [
      el.icon(icon, { size: 32, color: accent, marginBottom: 18 }),
      el.heading(title, {
        level: "h3",
        fontSize: 18,
        fontWeight: "700",
        color: theme.text,
        marginBottom: 8,
      }),
      el.text(description, {
        fontSize: 14,
        color: theme.textMuted,
        lineHeight: "1.6",
        marginBottom: 0,
      }),
    ]
  );

export const tradingAdvancedToolsGrid: Section = section(
  [
    singleColumnRow([
      el.text("PRO TOOLBELT", {
        fontSize: 12,
        fontWeight: "700",
        textAlign: "center",
        color: theme.primary,
        letterSpacing: "0.18em",
        marginBottom: 14,
      }),
      // "Every tool a serious trader needs" over "No plugins, no paid add-ons"
      // was the sentence that made the tiles below unfixable: the three that
      // were real — backtesting, risk limits, paper trading — are all sold as
      // separate extensions, so an operator who does not own them cannot edit
      // this into truth and one who does still cannot honour "no add-ons". The
      // three tiles that remain are core: `/api/exchange` appears nowhere in
      // `EXTENSION_LICENSE_MAP` (`backend/src/handler/utils/license-routes.ts:36-96`),
      // so alerts, candle history and watchlists need no extension licence.
      el.heading("The tools that come with the desk", {
        textAlign: "center",
        fontSize: 46,
        fontWeight: "800",
        letterSpacing: "-0.025em",
        marginBottom: 16,
      }),
      el.text(
        "Alerts, candle history and watchlists are core exchange endpoints — not a separately licensed extension.",
        {
          textAlign: "center",
          color: theme.textMuted,
          maxWidth: "640px",
          marginBottom: 56,
        }
      ),
    ]),
    row(
      [
        col(33.33, [
          // This tile was "Backtesting engine — replay 5+ years of tick data to
          // validate your strategy before risking a dollar". Nothing on this
          // platform stores a tick. The only backtester in the repo lives in the
          // OPTIONAL chart-engine package, and it is not a strategy backtester
          // in this sense: `strategy-builder/core/run-backtest.ts:11-18` states
          // it models an all-or-nothing BINARY contract, and
          // `trading/strategy-backtest.ts:21-25` is the same shape, defaulting a
          // `betAmount` and a `payout`. Both run over the candles the chart
          // already holds, so there is no 5-year window either. When that addon
          // is absent the import resolves to
          // `frontend/lib/stubs/chart-engine-stub.ts:16`, which renders null
          // (aliased at `frontend/next.config.js:702,721`),
          // so a core install has no backtester at all. What core does ship is
          // the candle service this tile now describes
          // (`backend/src/api/exchange/chart/index.get.ts:30-57` — cache-first,
          // newest gaps first, a request+wall-clock budget rather than a
          // deadline, and never the bar that is still forming).
          toolTile(
            "lucide:history",
            "Gap-filled candle history",
            "Historical bars are served from cache, and a bounded amount of exchange traffic is spent filling the gaps — newest first — before the request answers. Closed bars only: the forming candle arrives on the market socket instead.",
            theme.sky
          ),
        ]),
        col(33.33, [
          toolTile(
            "lucide:bell-ring",
            "Smart alerts",
            // `cron/jobs/priceAlerts.ts` sends IN_APP plus PUSH when a push provider
            // is registered, and `filterChannelsByPreferencesAndType` is strictly
            // subtractive, so EMAIL/SMS can never be added; no Telegram or Slack
            // integration exists. The condition enum is CROSSES_ABOVE/BELOW/CROSSES
            // against a price, so nothing on-chain triggers one. Indicator and
            // drawing alerts stay in the browser by design — see the note in
            // `chart-engine/alerts/hooks/use-price-alerts.ts`.
            "Price alerts are evaluated server-side, so they keep running with the tab closed. Indicator and drawing alerts run live on the chart.",
            theme.amber
          ),
        ]),
        col(33.33, [
          // This tile was "Portfolio analytics — Sharpe, Sortino, drawdown, and
          // alpha, computed live against your benchmark". Sharpe and Sortino
          // exist exactly once in the repo, inside the copy-trading ADDON, and
          // they score a LEADER's closed trades rather than a user's portfolio
          // (`backend/src/api/(ext)/copy-trading/utils/calculations.ts:53,75,357`).
          // `calculateAlpha` at `:514` defaults `benchmarkReturn` to 0, and its
          // own comment at `:504-510` says it is not a real alpha because there
          // is no market-return series to correlate against — no benchmark is
          // stored anywhere. Replaced with the core watchlist
          // (`backend/src/api/exchange/watchlist/index.post.ts`): rows are keyed
          // (userId, symbol, type) and mirrored from
          // `frontend/services/wishlist-service.ts` — `pushToServer` on every
          // toggle, `syncFromServer` on the first subscriber (`:84`) — which is
          // what carries a signed-in user's stars to another device.
          //
          // NOT "a separate list per market family": the type column has three
          // values, but no caller ever writes ECO. `markets-panel.tsx:495`
          // rewrites it ("eco markets use spot wishlist"), and every other call
          // site passes `isFutures ? "futures" : "spot"`, so an ecosystem star
          // lands in the spot list.
          toolTile(
            "lucide:star",
            "Watchlist that follows you",
            "Star a symbol from the spot, ecosystem or futures list. A signed-in user's stars are stored server-side and merged back on load, so the same watchlist is there on the next device.",
            theme.violet
          ),
        ]),
      ],
      { ...rowPresets.wide, gutter: 24, verticalAlign: "top" }
    ),
    // A second row carried three more tiles. None survived verification, so the
    // section is one row now:
    //
    //  - "Webhooks — turn TradingView alerts into live orders with signed
    //    webhook routing". There is no such route: every webhook in
    //    `backend/src` is an inbound PSP callback or the gateway addon's
    //    outbound merchant notification, and `tradingview` appears only as a
    //    chart-provider setting value. Merchant webhooks are a different
    //    product and do not belong in a trader's toolbelt.
    //  - "Risk manager — position limits, VaR, correlation matrix, and
    //    auto-liquidation kill-switch". There is no VaR and no portfolio
    //    correlation matrix anywhere in the repo; the only correlation code is
    //    the binary AI engine's admin-only external-price monitor
    //    (`backend/src/api/(ext)/admin/ai/binary-engine/correlation/`). The real
    //    per-bot controls — max drawdown, position size, daily loss, concurrent
    //    trades — belong to the Algo Trading Bots addon
    //    (`backend/src/api/(ext)/trading-bot/utils/engine/RiskManager.ts:50-54,226-236`).
    //  - "Paper trading — full sandbox with 100K USDT demo balance. Same order
    //    engine, zero risk". Also addon-only (`trading_bot`, seeded as a
    //    separate product at `backend/seeders/20240403000503-extensions.js:201`),
    //    the starting balance is 10 000 in the bot's quote asset and the
    //    operator can change it (`(ext)/trading-bot/utils/settings.ts:157`,
    //    `utils/integrations.ts:510-522`), and it is NOT the same order engine:
    //    `OrderExecutor.executePaperTrade` (`utils/engine/OrderExecutor.ts:291`)
    //    simulates the fill and moves only `tradingBotPaperAccount`, while the
    //    live path places a real order on the ecosystem book.
  ],
  {
    name: "Advanced Tools Grid",
    description: "Three-tile grid of core trading tools with icons",
    category: "trading",
    slug: "trading-advanced-tools-grid",
    settings: {
      ...sectionPresets.standard,
      backgroundColor: theme.bgSubtle,
    },
  }
);
