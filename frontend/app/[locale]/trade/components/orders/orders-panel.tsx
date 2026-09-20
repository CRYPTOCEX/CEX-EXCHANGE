"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  History,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Archive,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import type { BadgeTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  MetaChip,
  StatusNotice,
  TabButton,
  Th,
  directionText,
} from "../ui/terminal";
import { Loadable } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/user";
import { useWalletStore } from "@/store/finance/wallet-store";
import {
  ordersWs,
  type OrderData,
  type MarketType as OrdersMarketType,
  ConnectionStatus,
} from "@/services/orders-ws";
import { resolveFillFee } from "./fill-fee";
import { readListResponse } from "./list-response";
import { useTranslations } from "next-intl";
interface ExchangeOrder {
  id: string;
  referenceId?: string;
  userId: string;
  status: "OPEN" | "CLOSED" | "CANCELED" | "EXPIRED" | "REJECTED";
  symbol: string;
  type: "MARKET" | "LIMIT";
  timeInForce: "GTC" | "IOC" | "FOK" | "PO";
  side: "BUY" | "SELL";
  price: number;
  average?: number;
  amount: number;
  filled: number;
  remaining: number;
  cost: number;
  trades?: string;
  fee: number;
  feeCurrency: string;
  createdAt?: Date | string;
  deletedAt?: Date | string;
  updatedAt?: Date | string;
  currency?: string;
  pair?: string;
  isEco?: boolean;
}
interface FuturesOrder {
  id: string;
  symbol: string;
  type: string;
  side: string;
  amount: number;
  price: number;
  cost: number;
  fee: number;
  filled: number;
  remaining: number;
  status: string;
  stop_loss_price?: number;
  take_profit_price?: number;
  leverage?: number;
  liquidation_price?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
interface FuturesPosition {
  id: string;
  userId: string;
  symbol: string;
  side: string;
  entryPrice: string;
  amount: string;
  leverage: string;
  unrealizedPnl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  liquidationPrice?: string;
}
interface OrdersPanelProps {
  symbol?: string;
  isEco?: boolean;
  pair?: string;
}

/**
 * How many pending position rows to paint while GET positions is out.
 *
 * A position list has no knowable length, so this reserves the table body and
 * accepts that the count settles. Four rows at the row's own ~29px (`p-2`
 * around a `text-xs` line) is ~116px, which is roughly the height of the panel's
 * positions pane on a terminal layout — enough to look like a table, few enough
 * that a trader with one position does not watch three rows evaporate.
 */
const PENDING_POSITION_ROWS = 4;

/**
 * What a position row reads from before the response lands.
 *
 * The `Spinner` this replaced was also the type guard for the whole tbody, so
 * one frozen constant stands in rather than `?.` down seven cells. Every figure
 * is the string "0" because the cells run `Number()`/`formatDecimal()` over
 * them; none of those zeroes is ever painted — each cell is skeletoned — but a
 * `NaN` leaking out of a malformed placeholder would be.
 */
const PENDING_POSITION: FuturesPosition = {
  id: "",
  userId: "",
  symbol: "",
  side: "",
  entryPrice: "0",
  amount: "0",
  leverage: "0",
  unrealizedPnl: "0",
  status: "",
  createdAt: "",
  updatedAt: "",
};

// Format date helper
const formatDate = (date: Date | string | undefined) => {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateObj.toLocaleDateString();
};

// Smart decimal formatter - shows appropriate precision based on value size
const formatDecimal = (value: number | string | undefined, type: 'price' | 'amount' | 'total' = 'price'): string => {
  if (value === undefined || value === null || value === '') return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';

  // For amounts, always use 8 decimals
  if (type === 'amount') {
    return num.toFixed(8);
  }

  // For prices and totals, use smart precision
  if (num === 0) return '0.00';
  if (num >= 1000) return num.toFixed(2);
  if (num >= 1) return num.toFixed(4);
  if (num >= 0.01) return num.toFixed(6);
  if (num >= 0.0001) return num.toFixed(8);
  // For very small numbers, use scientific notation or show up to 10 decimals
  return num < 0.00000001 ? num.toExponential(2) : num.toFixed(10);
};
/* ------------------------------------------------------------------ *
 * Row pieces
 *
 * Four tables (open / history / trades / positions) rendered the same cells by
 * hand, so the same decision was re-made per table — and re-made differently:
 * "Buy" was `emerald`, the fill bar was `emerald-500`, the ECO badge was another
 * `emerald`, and the leverage badge `blue`. They are one component each now.
 * ------------------------------------------------------------------ */

const isLongSide = (side: string) => side === "BUY" || side === "LONG";

/**
 * "ALREADY GONE" IS NOT A FAILURE — AND TREATING IT AS ONE IS WHAT PINNED THE ROW.
 *
 * Every cancel/close route answers 400 for a row that has since been cancelled,
 * filled or closed: "Order is not open", "Order is no longer open (filled or
 * already cancelled)", "Order is fully filled; nothing to cancel", "Position is
 * already closed". The user's intent — this should not be resting any more — is
 * satisfied, and the ONE thing the list needs is the refresh an `else` branch
 * skips. Pressing X again then re-took the same branch, which is why the row
 * could never be cleared however many times it was pressed.
 *
 * THE BODY IS CONSULTED AS WELL AS THE STATUS. These handlers use bare `fetch`,
 * not `$fetch`, so nothing normalises a refusal the backend carried in the body
 * rather than in the status line — `{ statusCode: 400, message: ... }` on a 200
 * is a shape this stack does produce. Reading only `response.status` misses it.
 */
const isAlreadyGone = (response: { ok: boolean; status: number }, data: any): boolean => {
  const status = Number(data?.statusCode ?? 0) || response.status;
  if (status !== 400) return false;
  return /no longer open|not open|already cancel|already closed|filled/i.test(
    String(data?.message ?? data?.error ?? "")
  );
};

/**
 * A 200 THAT CARRIES A REFUSAL IN ITS BODY IS STILL A REFUSAL.
 *
 * Same shape `isAlreadyGone` above already reads: this stack answers
 * `{ statusCode, message }` inside a 200 (the CORS layer pins the uWS status
 * line at 200 on most routes), and such a body carries a `message` like any
 * other. Every `isSuccess` here has a `!!data.message` fallback, so without
 * this gate a genuine failure — a 500 rewrapped as
 * `Failed to cancel order: …`, a 400 refusal that is NOT "already gone" —
 * read as success: no error banner, and the list refetched as though the row
 * had gone. One helper rather than three copies, because the three doors
 * (cancel, close position, cancel all) drifted apart the last time.
 */
const bodyCarriesFailure = (data: any): boolean =>
  Number(data?.statusCode ?? 0) >= 400;

/** Futures adds SL/TP between Total and the trailing columns, in two tables. */
const FUTURES_SLTP_COLUMNS: { label: React.ReactNode; align?: "left" | "right" | "center" }[] = [
  { label: "SL" },
  { label: "TP" },
];

function TableHead({
  columns,
}: {
  columns: { label: React.ReactNode; align?: "left" | "right" | "center" }[];
}) {
  return (
    <thead className="sticky top-0 bg-background">
      <tr className="border-b border-border">
        {columns.map((col, i) => (
          <Th key={i} align={col.align}>
            {col.label}
          </Th>
        ))}
      </tr>
    </thead>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-border/70 hover:bg-surface-3/60 transition-colors">
      {children}
    </tr>
  );
}

/**
 * Right-aligned monospaced figure — R4.
 *
 * `testid` exists so a browser spec can address ONE figure rather than matching
 * text against the whole page: `toMatch(/48\.9/)` also passes on `148.90`, and a
 * coincidental match anywhere else on the screen passes too. It is optional and
 * changes nothing when absent. See e2e/ui/values/cex-orders.pw.mjs.
 */
function NumCell({
  children,
  muted,
  testid,
}: {
  children: React.ReactNode;
  muted?: boolean;
  testid?: string;
}) {
  return (
    <td
      data-testid={testid}
      className={cn(
        "p-2 text-right font-mono tabular-nums",
        muted ? "text-muted-foreground" : "text-foreground"
      )}
    >
      {children}
    </td>
  );
}

/** BUY/LONG vs SELL/SHORT. The word carries the meaning; the token reinforces it. */
function SideLabel({
  side,
  label,
  pending = false,
}: {
  side: string;
  label?: string;
  /**
   * The row's side has not been fetched. `isLongSide("")` is FALSE, so an
   * unguarded pending row reads "Sell" in the down colour — a position stated
   * backwards, in a trading panel, with total confidence.
   *
   * The placeholder goes INSIDE the span carrying `font-medium` and the
   * direction colour, so the box is measured by the type that will draw the
   * word and the tone underneath it is never seen.
   */
  pending?: boolean;
}) {
  const tCommon = useTranslations("common");
  const long = isLongSide(side);
  return (
    <span className={cn("font-medium", directionText(long))}>
      <Loadable loading={pending} placeholder="LONG">
        {label ?? (long ? tCommon("buy") : tCommon("sell"))}
      </Loadable>
    </span>
  );
}

function SymbolCell({ order, isFutures }: { order: any; isFutures: boolean }) {
  const t = useTranslations("trade_components");

  /*
   * WHAT KIND OF ORDER THIS IS, WHERE IT DIFFERS FROM AN ORDINARY ONE.
   *
   * These three used to be invisible on a row. That was survivable while the
   * platform only had one behaviour — every order was good-till-cancelled and
   * every stop was fixed — and stopped being survivable the moment it did not:
   *
   *   - a time in force that is not GTC changes what happens to the unfilled
   *     part, so an IOC row that looks identical to a resting one is a trader
   *     wondering why their order vanished;
   *   - a TRAILING stop's price MOVES, so a row showing only a stop price
   *     shows a number that changes under them with nothing to say why;
   *   - an OCO row is half of one instruction, and cancelling it takes the
   *     other half with it. A trader who cannot see the pairing cannot know
   *     that.
   *
   * GTC is deliberately NOT chipped: it is the default and every order that
   * predates the enforcement carries it, so a chip on it would be noise on
   * every row on the page.
   */
  const timeInForce = String(order.timeInForce ?? "").toUpperCase();
  const showTimeInForce =
    timeInForce === "IOC" || timeInForce === "FOK" || timeInForce === "PO";

  return (
    <div className="flex items-center">
      <SideLabel side={order.side} />
      <span className="ml-1.5 text-foreground">{order.symbol}</span>
      {order.isEco && <MetaChip className="ml-1.5 h-4 text-[9px]">ECO</MetaChip>}
      {isFutures && order.leverage && (
        <MetaChip className="ml-1.5 h-4 text-[9px]">{order.leverage}x</MetaChip>
      )}
      {showTimeInForce && (
        <MetaChip className="ml-1.5 h-4 text-[9px]">{timeInForce}</MetaChip>
      )}
      {/* The explanation rides a wrapping span, not the chip: MetaChip is a
          shared primitive with a deliberately small prop surface, and widening
          it for two call sites would be the wrong direction. */}
      {order.isTrailing && (
        <span title={t("trailing_explainer")}>
          <MetaChip className="ml-1.5 h-4 text-[9px]">
            {order.trailingMode === "ABSOLUTE"
              ? `${t("trailing_stop_label")} ${order.trailingDistance}`
              : `${t("trailing_stop_label")} ${order.trailingDistance}%`}
          </MetaChip>
        </span>
      )}
      {order.ocoGroupId && (
        <span title={t("oco_explainer")}>
          <MetaChip className="ml-1.5 h-4 text-[9px]">{t("oco")}</MetaChip>
        </span>
      )}
    </div>
  );
}

/** filled / amount, with the fill bar in the side's direction colour. */
function FilledCell({ order, showProgress }: { order: any; showProgress: boolean }) {
  const pct = (order.filled / order.amount) * 100;
  return (
    <div className="inline-flex flex-col items-end gap-0.5 min-w-[120px]">
      <div className="text-[11px] font-mono tabular-nums whitespace-nowrap">
        <span className="text-foreground">
          {Number(order.filled) > 0
            ? formatDecimal(order.filled, "amount")
            : "0.00000000"}
        </span>
        <span className="text-muted-foreground mx-0.5">/</span>
        <span className="text-muted-foreground">
          {formatDecimal(order.amount, "amount")}
        </span>
      </div>
      {showProgress && (
        <div className="flex items-center gap-1 w-full">
          <div className="flex-1 h-1 bg-surface-3 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                isLongSide(order.side) ? "bg-up" : "bg-down"
              )}
              style={{ width: `${pct.toFixed(1)}%` }}
            />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground tabular-nums">
            {pct.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * How a tone paints inside this chip. Neither map decides anything —
 * `statusTone()` owns which tone a status gets, for the whole platform.
 */
const TONE_RING: Record<BadgeTone, string> = {
  primary: "border-primary/40 bg-primary/10",
  secondary: "border-border bg-surface-3",
  success: "border-success/40 bg-success/10",
  warning: "border-warning/40 bg-warning/10",
  destructive: "border-destructive/40 bg-destructive/10",
  info: "border-info/40 bg-info/10",
  neutral: "border-border bg-surface-3",
};

/**
 * Ink for the glyph, which sits on `TONE_RING`'s tint — so it has to be the
 * `--{tone}-ink` token, not the raw tone. `text-success` on `bg-success/10`
 * measures ~2.8:1; `-ink` is the darkened pairing the system defines for
 * exactly this ground, and it is what Badge's `soft` recipe uses.
 */
const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-muted-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-muted-foreground",
};

/**
 * Terminal status of an order.
 *
 * The hue rides the icon and the hairline; the word itself stays on
 * `--foreground`, which clears AA on the tint outright rather than leaning on
 * the tone at all. The glyph takes `--{tone}-ink` (see `TONE_INK`), the same
 * darkened pairing Badge's `soft` recipe uses on this ground.
 *
 * This stays a hand-built chip rather than a `<StatusBadge>` because of that
 * SHAPE — foreground word, toned glyph — not because of the tone, which now
 * comes from the one table.
 */
function OrderStatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-normal text-foreground",
        TONE_RING[tone]
      )}
    >
      {status === "CLOSED" ? (
        <CheckCircle className={cn("h-3 w-3", TONE_INK[tone])} />
      ) : (
        <AlertTriangle className={cn("h-3 w-3", TONE_INK[tone])} />
      )}
      {status}
    </span>
  );
}

export default function OrdersPanel({
  symbol = "BTCUSDT",
  isEco = false,
  pair,
}: OrdersPanelProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const tTrade = useTranslations("trade");
  const searchParams = useSearchParams();
  const marketType = searchParams.get("type") || "spot";
  const isFutures = marketType === "futures";

  /*
    ─────────────────────────────────────────────────────────────────────────
    THE CEX ORDER ROUTE NEEDS `currency`, `pair` AND `type` — AND GOT NONE OF
    THEM.

    `fetchOpenOrders` called `/api/exchange/order?status=OPEN` and
    `fetchOrderHistory` called it bare. `exchange/order/index.get.ts:71-73`
    requires `currency` and `pair` and throws `400 "Invalid currency"` without
    them; the type filter is spelled `type`, not `status`. So on every CEX spot
    market — `isEco` defaults to false, which is the ordinary case — the Open
    Orders and History tabs showed an error banner and ZERO rows while the
    trader had resting orders on the book.

    The symbol is already a prop. It arrives unseparated ("BTCUSDT"), and `pair`
    is passed alongside it precisely so the base can be recovered, which is what
    this does — falling back to a trailing-quote match only when the prop is
    absent.
    ─────────────────────────────────────────────────────────────────────────
  */
  const cexOrderQuery = (() => {
    const raw = String(symbol || "").replace("/", "").toUpperCase();
    const quote = String(pair || "").toUpperCase();
    if (quote && raw.endsWith(quote)) {
      return { currency: raw.slice(0, -quote.length), pair: quote };
    }
    // No `pair` prop: fall back to the quote assets this desk actually lists.
    for (const candidate of ["USDT", "USDC", "BUSD", "USD", "BTC", "ETH"]) {
      if (raw.length > candidate.length && raw.endsWith(candidate)) {
        return { currency: raw.slice(0, -candidate.length), pair: candidate };
      }
    }
    return null;
  })();

  /*
   * THE PAIR SCOPES THE LOAD, NOT JUST THE FRAME HANDLER.
   *
   * The socket subscription deliberately ignores the pair — re-registering it
   * loses frames, and the ref above is what keeps its handler current. The LOAD
   * effect has no such constraint: it touches no socket. Leaving the pair out of
   * ITS deps made the ref fix half a fix — history would be fetched for the pair
   * on screen while `openOrders` still held the rows of the pair we left, so the
   * Open tab showed one market's orders under another market's header.
   *
   * A STRING, not `cexOrderQuery` itself: that object is rebuilt on every render,
   * so depending on it would reload on every render. Empty for eco and futures
   * because neither of their list URLs carries a currency or pair — there is
   * nothing to re-scope.
   */
  const cexOrderScope =
    isFutures || isEco
      ? ""
      : `${cexOrderQuery?.currency ?? ""}/${cexOrderQuery?.pair ?? ""}`;

  const { user } = useUserStore();
  const { fetchWallets } = useWalletStore();

  const [openOrders, setOpenOrders] = useState<
    ExchangeOrder[] | FuturesOrder[]
  >([]);
  const [orderHistory, setOrderHistory] = useState<
    ExchangeOrder[] | FuturesOrder[]
  >([]);
  const [positions, setPositions] = useState<FuturesPosition[]>([]);
  /*
   * CLOSED AND LIQUIDATED POSITIONS, WHICH NOTHING HAS EVER ASKED FOR.
   *
   * `futures/position/index.get.ts` has implemented `type=POSITIONS_HISTORY`
   * since it was written — it fetches every position and filters to
   * `status !== "OPEN"`. No caller anywhere in the app ever passed it. Every
   * futures surface asks for `OPEN_POSITIONS`, so the moment a position closed
   * or was liquidated it left the interface completely: no row, no PnL, no
   * record that it existed.
   *
   * That is worse for a liquidation than for a close. A liquidation ZEROES
   * `amount` on the row (see the futures position data model), so the trader
   * sees margin gone from their wallet and has nothing on any screen that
   * accounts for it — the one event they most need to be able to read back is
   * the one the product hid.
   */
  const [closedPositions, setClosedPositions] = useState<FuturesPosition[]>([]);
  const [isLoadingClosedPositions, setIsLoadingClosedPositions] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "open" | "history" | "trades" | "positions" | "closed" | "ai"
  >(isFutures ? "positions" : "open");
  // Typed explicitly: an untyped `useState([])` infers `never[]`, which made
  // every assignment of real rows a type error the moment this list actually
  // started being populated.
  const [aiInvestments, setAiInvestments] = useState<any[]>([]);
  const [isLoadingAiInvestments, setIsLoadingAiInvestments] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * The CURRENT order-frame handler, for a subscription that outlives it.
   *
   * See the `ordersWs.subscribe` effect below: it re-registers only when the
   * user or the market TYPE changes, so on a pair switch the callback the socket
   * still holds is the one from the render before the switch — closing over the
   * previous pair's `cexOrderQuery`. Every frame then refetched, and rendered,
   * the wrong market's order history.
   */
  const handleOrderMessageRef = useRef<(data: OrderData[]) => void>(() => {});

  /**
   * The open list as it stands RIGHT NOW, for the post-cancel settle loop.
   *
   * That loop runs across awaits, so the `openOrders` it closed over is the one
   * from the render that started it — it would never observe the row leaving and
   * would always poll to its ceiling. A ref is read fresh each pass, so the loop
   * stops the moment the order is actually gone.
   */
  const openOrdersRef = useRef<any[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  /*
   * ONE HISTORY READ PER FRAME, NOT ONE PER ORDER IN IT.
   *
   * The loop below used to call `fetchOrderHistory()` from INSIDE the state
   * updater, once for every order that had gone terminal. A bot cancelling and
   * re-placing a ladder puts many of those in a single frame, so one websocket
   * message became one full `?type=CLOSED` request per order.
   *
   * And a state updater is not a place for a side effect at all: React is
   * entitled to run it more than once — StrictMode does — and it is entitled to
   * run it LATER, during the render it schedules. That last part is why the
   * decision is taken here, from the payload, rather than recorded on a variable
   * the updater sets: a flag written inside the updater is not reliably readable
   * on the line after `setState`, and gating the fetch on one would swap a storm
   * of requests for no request at all.
   *
   * The payload is enough on its own. "Did anything in this frame go terminal?"
   * is a question about the frame, not about what the list currently holds.
   */
  const handleOrderMessage = (data: OrderData[]) => {
    if (!isMountedRef.current || !Array.isArray(data)) return;

    // The SAME test the loop below applies, and the reason it is a positive one
    // is written out there.
    const stillOpenStatus = (status: string | undefined) =>
      status === "OPEN" || status === "ACTIVE" || status === "PARTIALLY_FILLED";

    const shouldRefreshHistory = data.some(
      (orderItem) => orderItem && !stillOpenStatus(orderItem.status)
    );

    let shouldRefreshWallet = false;
    setOpenOrders((prevOpenOrders) => {
      const newItems = [...prevOpenOrders];
      for (const orderItem of data) {
        const index = newItems.findIndex((i: any) => i.id === orderItem.id);
        // An order stays in the Open list ONLY while it is still live. Remove on
        // ANY other status rather than enumerating terminal ones: the orders
        // stream also carries stop-order lifecycle updates (TRIGGERED,
        // CANCELLED double-L, FAILED) and engine cleanup broadcasts (CANCELLED)
        // that the old CLOSED/CANCELED/EXPIRED/REJECTED allowlist missed —
        // those rows were merged in place and sat in the Open tab forever
        // (e.g. a triggered stop showing "open, filled 0" after it executed).
        const stillOpen = stillOpenStatus(orderItem.status);
        if (index > -1) {
          if (!stillOpen) {
            // If the order is no longer open, remove it from open orders
            newItems.splice(index, 1);
            shouldRefreshWallet = true;
          } else {
            // Update existing open order (including partial fills)
            newItems[index] = {
              ...newItems[index],
              ...orderItem,
            };
          }
        } else {
          // Add only if still open/active
          if (stillOpen) {
            newItems.push(orderItem);
            shouldRefreshWallet = true;
          }
        }
      }
      return newItems;
    });

    if (shouldRefreshHistory) {
      // Quiet: this is a SOCKET frame, not a user action. `isLoading` disables
      // Cancel All, every row's X and the futures close button, so a loud
      // refresh here let a busy market disable the trader's cancel buttons at
      // random — and cleared the flag out from under a cancel already in
      // flight. See `fetchOpenOrders` for what `quiet` means.
      fetchOrderHistory(true);
    }

    // Refresh wallet balances if orders changed
    if (shouldRefreshWallet) {
      fetchWallets();
    }
  };

  // Kept current on every render — no dependency array — so the socket always
  // calls the handler that closes over the pair on screen NOW. See the ref's
  // declaration for what the stale one did.
  useEffect(() => {
    handleOrderMessageRef.current = handleOrderMessage;
    openOrdersRef.current = openOrders as any[];
  });

  /**
   * A CANCEL IS NOT NECESSARILY DONE WHEN ITS REQUEST RETURNS.
   *
   * The ecosystem matcher runs in ONE process. A cancel that arrives at any
   * other process is RECORDED and served by the leaseholder a moment later, and
   * the route says so in its body rather than in its status:
   *
   *   { cancelled: false, deferred: true, message: "Cancelling your order — the
   *     matching process is completing it now. It disappears from your open
   *     orders within a few seconds." }
   *
   * That is a 200. The bulk route does the same, counting deferred orders into
   * `cancelledCount` ("`deferred` is the expected outcome here and is NOT a
   * failure", order/all/index.del.ts). Both routes carry an explicit warning
   * that a machine must read the BOOLEANS, not the prose — the Hummingbot
   * bridge lost orders by reading the 200 alone.
   *
   * This panel was that machine. It tested `response.ok && data.message`, so a
   * DEFERRED cancel counted as done and the list was refetched immediately —
   * before the leaseholder had written the status. The row came back, and
   * nothing looked again:
   *
   *   - "Cancel All" appeared to need pressing twice. The first refetch was
   *     simply too early; by the second press the first cancel had landed.
   *   - The per-order "X" never cleared its row at all. The second press hits an
   *     order that is already CANCELED, the route answers 400 "Order is not
   *     open", the `else` branch reports failure AND SKIPS THE REFETCH — so the
   *     stale row is pinned there for good, however many times it is pressed.
   *
   * The websocket would normally clear the row on its own (`handleOrderMessage`
   * removes any non-live status), so this settle loop is the fallback for when
   * that frame does not arrive — which is precisely the cross-process case, the
   * same shape as the leaseholder's other cross-process gaps.
   */
  const CANCEL_SETTLE_ATTEMPTS = 6;
  const CANCEL_SETTLE_DELAY_MS = 1000;

  /**
   * WHAT THE SETTLE LOOP IS STILL WAITING TO SEE DISAPPEAR.
   *
   * Held in a ref rather than in the loop's own arguments because the loop no
   * longer blocks the buttons (see `settleAfterCancel`): a second cancel can now
   * be pressed while the first is still settling, and it must EXTEND the one
   * loop rather than stack another 1/second fetcher on top of it. `all` is the
   * bulk case — "settled" then means the open list is empty.
   */
  const settlePendingRef = useRef<{ ids: Set<string>; all: boolean }>({
    ids: new Set<string>(),
    all: false,
  });
  /** A loop is already running; a new cancel feeds it instead of starting one. */
  const settleLoopRef = useRef(false);
  /** Wall-clock end of the settle window; a fresh cancel pushes it out again. */
  const settleDeadlineRef = useRef(0);

  const runSettleLoop = async () => {
    if (settleLoopRef.current) return;
    settleLoopRef.current = true;
    try {
      const stillListed = () => {
        const open = openOrdersRef.current ?? [];
        const pending = settlePendingRef.current;
        if (pending.all) return open.length > 0;
        if (pending.ids.size === 0) return false;
        return open.some((o: any) => pending.ids.has(String(o?.id)));
      };

      while (isMountedRef.current && Date.now() < settleDeadlineRef.current) {
        if (!stillListed()) return;
        await new Promise((resolve) => setTimeout(resolve, CANCEL_SETTLE_DELAY_MS));
        if (!isMountedRef.current) return;
        // Quiet: this is a backstop nobody asked for, and re-raising the shared
        // loading flag once a second would re-disable the very buttons this
        // rework exists to release. See `fetchOpenOrders`.
        await fetchOpenOrders(true);
      }
    } finally {
      settleLoopRef.current = false;
      settlePendingRef.current = { ids: new Set<string>(), all: false };
    }
  };

  /**
   * THE SETTLE LOOP IS NOT PART OF THE CANCEL'S LOADING WINDOW.
   *
   * Only the first reconcile is awaited. The loop after it is a fallback for a
   * websocket frame that may never come, and it can run for six seconds — while
   * every caller holds `isLoading` true inside a `finally`, and `isLoading` is
   * what disables Cancel All, each row's X and the futures close button. Awaiting
   * it here left the whole panel's buttons dead for six seconds AFTER the cancel
   * had already been accepted. It is started unawaited instead; it guards
   * unmount itself and only ever issues quiet fetches.
   */
  const settleAfterCancel = async (opts: {
    deferred: boolean;
    /** Ids the user asked to cancel; empty means "all of them". */
    ids?: string[];
  }) => {
    // Quiet: both callers already hold `isLoading` for the whole cancel, so a
    // loud pass here would only ever CLEAR it — in its `finally`, underneath a
    // second cancel the user started in the meantime, re-enabling the buttons
    // mid-flight. Ownership of the flag stays with the user action that raised
    // it. See `fetchOpenOrders`.
    await Promise.all([fetchOpenOrders(true), fetchOrderHistory(true), fetchWallets()]);
    // Other components (the trading form's balances) refresh off this.
    window.dispatchEvent(new CustomEvent("walletUpdated"));

    if (!opts.deferred) return;

    const pending = settlePendingRef.current;
    if (!opts.ids || opts.ids.length === 0) {
      pending.all = true;
    } else {
      for (const id of opts.ids) pending.ids.add(String(id));
    }
    settleDeadlineRef.current =
      Date.now() + CANCEL_SETTLE_ATTEMPTS * CANCEL_SETTLE_DELAY_MS;

    // Deliberately NOT awaited — see the note above. A rejection here must not
    // surface as an unhandled rejection now that nothing is holding the promise.
    void runSettleLoop().catch((err) => {
      console.error("Settle-after-cancel loop failed:", err);
    });
  };

  // Debounced fetch functions
  const debouncedFetchOrders = (() => {
    let timeoutId: NodeJS.Timeout;
    return (callback: () => void) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, 100);
    };
  })();

  // Fetch open orders
  /**
   * `quiet` — refresh WITHOUT touching the shared `isLoading` flag.
   *
   * NOT a skeleton suppressor: nothing in this panel renders a skeleton off
   * `isLoading`. Its only consumers are `disabled` on the Cancel All button, on
   * each row's X and on the futures close button. The settle loop calls this
   * once a second for up to six seconds after a deferred cancel, so a loud pass
   * would flip those buttons back to disabled — and, worse, its `finally` would
   * clear `isLoading` underneath a cancel the user had started in the meantime,
   * re-enabling the buttons mid-flight. Quiet leaves the flag to whoever raised
   * it: the user action.
   */
  const fetchOpenOrders = async (quiet = false) => {
    try {
      if (!quiet) setIsLoading(true);
      setError(null);

      // Use the appropriate URL based on market type
      const url = isFutures
        ? `/api/futures/order?type=OPEN`
        : isEco
          ? `/api/ecosystem/order?type=OPEN`
          : cexOrderQuery
            ? `/api/exchange/order?currency=${cexOrderQuery.currency}&pair=${cexOrderQuery.pair}&type=OPEN`
            : null;
      if (!url) {
        // No symbol to ask about. An unfiltered call is a guaranteed 400, and an
        // error banner reads to the trader as "your orders are gone".
        setOpenOrders([]);
        if (!quiet) setIsLoading(false);
        return;
      }
      const response = await fetch(url);
      const data = await response.json();

      // Handle both wrapped response {success: true, data: [...]} and direct array response [...]
      if (Array.isArray(data)) {
        // Direct array response from ecosystem endpoint
        setOpenOrders(data);
      } else if (data.success) {
        // Wrapped response from other endpoints
        setOpenOrders(data.data || []);
      } else {
        // Only set error if the API call actually failed, not if it just returned empty data
        if (data.message && !data.message.includes("No orders found")) {
          setError(t("failed_to_fetch_open_orders"));
          console.error("Failed to fetch open orders:", data);
        } else {
          // Set empty array if no orders found
          setOpenOrders([]);
        }
      }
    } catch (err) {
      setError(t("error_fetching_open_orders"));
      console.error("Error fetching open orders:", err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  };

  // Fetch order history (non-open orders)
  // A HOISTED DECLARATION, not a `const` arrow like its neighbours.
  // `handleOrderMessage` above calls this, and it is declared first — with an
  // arrow that is a reference before initialisation, which the React lint rules
  // reject outright. Hoisting is the smaller change of the two: the alternative
  // is moving seventy lines of handler below every fetcher it happens to use.
  //
  // `quiet` means the same thing it does on `fetchOpenOrders`: refresh without
  // touching the shared `isLoading` flag, so a refresh that follows somebody's
  // cancel cannot clear the flag that cancel (or the next one) is holding.
  async function fetchOrderHistory(quiet = false) {
    try {
      if (!quiet) setIsLoading(true);
      setError(null);

      // Use the appropriate URL based on market type
      // For eco, use type=CLOSED to get non-open orders (backend rejects "HISTORY")
      const url = isFutures
        ? `/api/futures/order`
        : isEco
          ? `/api/ecosystem/order?type=CLOSED`
          : cexOrderQuery
            ? `/api/exchange/order?currency=${cexOrderQuery.currency}&pair=${cexOrderQuery.pair}&type=CLOSED`
            : null;
      if (!url) {
        setOrderHistory([]);
        if (!quiet) setIsLoading(false);
        return;
      }
      const response = await fetch(url);
      const data = await response.json();

      // Handle both wrapped response {success: true, data: [...]} and direct array response [...]
      if (Array.isArray(data)) {
        // Direct array response from ecosystem endpoint
        if (isEco) {
          // For eco, the API already returns history orders
          setOrderHistory(data);
        } else {
          // For other types, filter out OPEN orders
          const history = data.filter((order: any) => order.status !== "OPEN");
          setOrderHistory(history);
        }
      } else if (data.success) {
        // Wrapped response - existing logic
        if (isEco) {
          // For eco, the API already returns history orders
          setOrderHistory(data.data || []);
        } else if (isFutures) {
          // For futures, filter out OPEN orders as they're handled separately
          const history = (data.data || []).filter(
            (order: FuturesOrder) => order.status !== "OPEN"
          );
          setOrderHistory(history);
        } else {
          // For regular exchange, filter out OPEN orders as they're handled separately
          const history = (data.data || []).filter(
            (order: ExchangeOrder) => order.status !== "OPEN"
          );
          setOrderHistory(history);
        }
      } else {
        // Only set error if the API call actually failed, not if it just returned empty data
        if (data.message && !data.message.includes("No orders found")) {
          setError(t("failed_to_fetch_order_history"));
          console.error("Failed to fetch order history:", data);
        } else {
          // Set empty array if no orders found
          setOrderHistory([]);
        }
      }
    } catch (err) {
      setError(t("error_fetching_order_history"));
      console.error("Error fetching order history:", err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }

  // Fetch futures positions
  const fetchPositions = async () => {
    if (!isFutures) return;
    try {
      setIsLoadingPositions(true);
      setError(null);
      const response = await fetch(`/api/futures/position?type=OPEN_POSITIONS`);
      // This endpoint answers with a BARE ARRAY. The old `if (data.success)`
      // never fired, and `[].message` is undefined so the error guard did not
      // fire either — the tab silently painted "no open positions" over live
      // ones. See `readListResponse`.
      const { rows, failure } = readListResponse<FuturesPosition>(
        await response.json(),
        "No positions found"
      );
      if (failure) {
        setError(t("failed_to_fetch_positions"));
        console.error("Failed to fetch positions:", failure);
      } else {
        setPositions(rows);
      }
    } catch (err) {
      setError(t("error_fetching_positions"));
      console.error("Error fetching positions:", err);
    } finally {
      setIsLoadingPositions(false);
    }
  };
  /*
   * Closed and liquidated positions.
   *
   * Fetched on tab entry rather than with the initial burst: a trader who never
   * opens this tab should not pay for the query, and unlike open positions there
   * is no live stream to keep it warm. The endpoint pins errors to HTTP 200 with
   * the real code in the body (the platform-wide uWS/CORS constraint), so a
   * failure has to be read out of the payload, exactly as `fetchPositions` does.
   */
  const fetchClosedPositions = async () => {
    if (!isFutures) return;
    try {
      setIsLoadingClosedPositions(true);
      setError(null);
      const response = await fetch(
        `/api/futures/position?type=POSITIONS_HISTORY`
      );
      // Same bare array as the open-positions call, so the same reader. The
      // backend has already dropped status === "OPEN" for POSITIONS_HISTORY —
      // filtering again here would be a second copy of that rule.
      const { rows, failure } = readListResponse<FuturesPosition>(
        await response.json(),
        "No positions found"
      );
      if (failure) {
        setError(t("failed_to_fetch_position_history"));
        console.error("Failed to fetch position history:", failure);
      } else {
        setClosedPositions(rows);
      }
    } catch (err) {
      setError(t("error_fetching_position_history"));
      console.error("Error fetching position history:", err);
    } finally {
      setIsLoadingClosedPositions(false);
    }
  };

  const fetchAiInvestments = async () => {
    try {
      setIsLoadingAiInvestments(true);
      const response = await fetch("/api/ai/investment/log");
      const data = await response.json();
      // The handler returns `{ items, pagination }`. There is no `success` and
      // no `data` key, so this branch never ran and the AI Investments tab was
      // permanently empty regardless of how many investments the user held.
      // The backend also pins errors to HTTP 200 with the code in the body, so
      // a real failure has to be detected from `statusCode`/`message`.
      if (data && Array.isArray(data.items)) {
        setAiInvestments(data.items);
      } else if (Array.isArray(data)) {
        setAiInvestments(data);
      } else {
        console.error("Failed to fetch AI investments:", data);
        setAiInvestments([]);
      }
    } catch (err) {
      console.error("Error fetching AI investments:", err);
    } finally {
      setIsLoadingAiInvestments(false);
    }
  };

  // Subscribe to order updates (connection is managed by trading-layout)
  useEffect(() => {
    if (!user?.id) return;
    isMountedRef.current = true;

    // Determine the market type
    const ordersMarketType: OrdersMarketType = isFutures
      ? "futures"
      : isEco
        ? "eco"
        : "spot";

    // Subscribe to connection status
    const unsubscribeStatus = ordersWs.subscribeToConnectionStatus(
      (status) => {
        if (isMountedRef.current) {
          setConnectionStatus(status);
        }
      },
      ordersMarketType
    );

    /*
     * Subscribe to order updates - adds callback to existing connection.
     *
     * A STABLE WRAPPER, NOT THE HANDLER ITSELF. This effect deliberately does
     * not depend on the pair — re-registering costs real frames: `unsubscribe`
     * empties the callback set immediately and only schedules the server-side
     * UNSUBSCRIBE 200ms later, so any frame arriving in the gap is delivered to
     * nobody, and the re-subscribe replays `lastDataCache` through a
     * `setTimeout(…, 0)`. Doing that on every render (which is what adding
     * `cexOrderQuery` to the deps would mean — it is a fresh object each time)
     * would trade a stale closure for lost order updates.
     *
     * So the subscription stays put and the ref keeps the handler fresh.
     */
    const unsubscribeOrders = ordersWs.subscribe<OrderData[]>(
      {
        userId: user.id,
        marketType: ordersMarketType,
      },
      (data: OrderData[]) => handleOrderMessageRef.current(data)
    );

    // Store unsubscribe function
    unsubscribeRef.current = () => {
      unsubscribeStatus();
      unsubscribeOrders();
    };

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id, isFutures, isEco]);

  // Load data on component mount and when market type changes
  useEffect(() => {
    debouncedFetchOrders(() => {
      fetchOpenOrders();
      fetchOrderHistory();
      if (isFutures) {
        fetchPositions();
      }
    });
  }, [isFutures, isEco, cexOrderScope]);
  useEffect(() => {
    if (activeTab === "ai") {
      fetchAiInvestments();
    } else if (activeTab === "positions" && isFutures) {
      fetchPositions();
    } else if (activeTab === "closed" && isFutures) {
      fetchClosedPositions();
    }
  }, [activeTab, isFutures]);

  // Listen for AI investment creation events to auto-refresh
  useEffect(() => {
    const handleAiInvestmentCreated = () => {
      fetchAiInvestments();
    };

    window.addEventListener("tp-ai-investment-created", handleAiInvestmentCreated);
    return () => {
      window.removeEventListener("tp-ai-investment-created", handleAiInvestmentCreated);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Filter and sort history
  const filteredHistory = orderHistory
    .filter((order: any) => {
      // Apply search filter
      if (
        searchTerm &&
        !order.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Apply status filter
      if (
        statusFilter !== "all" &&
        order.status.toLowerCase() !== statusFilter.toLowerCase()
      ) {
        return false;
      }

      // Apply time filter
      if (timeFilter !== "all" && order.createdAt) {
        const now = new Date();
        const orderDate = new Date(order.createdAt);
        const diffHours =
          (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        if (timeFilter === "24h" && diffHours > 24) return false;
        if (timeFilter === "7d" && diffHours > 24 * 7) return false;
        if (timeFilter === "30d" && diffHours > 24 * 30) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      // Apply sorting
      if (sortBy === "date") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
      }
      if (sortBy === "price") {
        return sortDirection === "desc" ? b.price - a.price : a.price - b.price;
      }
      if (sortBy === "amount") {
        return sortDirection === "desc"
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
      return 0;
    });

  // Build the Trades tab from individual fills (executions), not order status.
  // Every match appends a fill to the order's `trades` JSON for BOTH sides, so a
  // partial fill is recorded the moment it happens — even while the order is
  // still OPEN. Sourcing from per-fill records (across open + history orders)
  // means partial fills appear immediately instead of only when the whole order
  // closes. Orders without per-fill detail (e.g. non-eco markets) fall back to a
  // single aggregate row so existing behavior is preserved.
  const parseOrderTrades = (raw: any): any[] => {
    if (!raw) return [];
    try {
      let parsed = raw;
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
        // Some rows are double-encoded (a JSON string inside a JSON string)
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const tradeRows = [...(openOrders as any[]), ...(orderHistory as any[])]
    .flatMap((order: any) => {
      const fills = parseOrderTrades(order.trades);
      if (fills.length > 0) {
        return fills.map((fill: any, i: number) => {
          const amt = Number(fill.amount || 0);
          const price = Number(fill.price ?? order.average ?? order.price ?? 0);
          // Shared with the Pro panel — see fill-fee.ts for why this must NOT be
          // split across "filled so far".
          const feeShare = resolveFillFee(fill, order);
          const ts = fill.timestamp
            ? new Date(Number(fill.timestamp)).toISOString()
            : order.updatedAt || order.createdAt;
          return {
            id: `${order.id}:${i}`,
            symbol: order.symbol,
            side: fill.side || order.side,
            price,
            average: price,
            amount: amt,
            filled: amt,
            cost: Number(fill.cost ?? amt * price),
            fee: feeShare,
            feeCurrency: order.feeCurrency,
            isEco: order.isEco,
            createdAt: order.createdAt,
            updatedAt: ts,
          };
        });
      }
      // Fallback for orders without per-fill detail (e.g. non-eco markets):
      // preserve prior behavior — show completed orders as a single aggregate
      // row. Eco orders always carry per-fill detail and are handled above.
      if (order.status === "CLOSED" || order.status === "FILLED") return [order];
      return [];
    });

  const filteredTrades = tradeRows
    .filter((row: any) => {
      // Apply search filter
      if (
        searchTerm &&
        !row.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Apply time filter
      const when = row.updatedAt || row.createdAt;
      if (timeFilter !== "all" && when) {
        const now = new Date();
        const tradeDate = new Date(when);
        const diffHours =
          (now.getTime() - tradeDate.getTime()) / (1000 * 60 * 60);
        if (timeFilter === "24h" && diffHours > 24) return false;
        if (timeFilter === "7d" && diffHours > 24 * 7) return false;
        if (timeFilter === "30d" && diffHours > 24 * 30) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return dateB - dateA;
    });

  /**
   * ONE positions table for both states. A `null` row is a position that has
   * not arrived; see PENDING_POSITION for what its cells read from.
   */
  const positionRows: Array<FuturesPosition | null> = isLoadingPositions
    ? Array.from({ length: PENDING_POSITION_ROWS }, () => null)
    : positions;

  /**
   * "No open positions" is a RESULT, and a result needs a finished request.
   * `positions` starts `[]`, so the `!isLoadingPositions` half is what stops
   * this panel telling a futures trader they have no exposure while the
   * request that would prove otherwise is still out — the single most
   * expensive thing a trading UI can say wrongly.
   */
  const showNoPositions = !isLoadingPositions && positions.length === 0;

  /**
   * The aggregate size chip beside "Open positions (n)".
   *
   * `reduce` over an empty array is a real, confident `0.00`, and this chip is
   * the one place on the panel a trader reads as their total exposure — so it
   * is suppressed until the request has finished rather than shown as zero.
   * That is a legitimate suppression, not withheld layout: the chip is a 20px
   * inline element beside a `text-xs` label in an `items-center` row, so it
   * cannot change the bar's height, only settle sideways within it.
   */
  const showPositionsTotal = !isLoadingPositions && positions.length > 0;

  // Calculate pagination
  useEffect(() => {
    const activeList = activeTab === "trades" ? filteredTrades : filteredHistory;
    setTotalPages(Math.ceil(activeList.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    filteredHistory.length,
    filteredTrades.length,
    itemsPerPage,
    searchTerm,
    timeFilter,
    statusFilter,
    activeTab,
  ]);

  // Get current page items
  const getCurrentPageItems = (list?: any[]) => {
    const source = list || filteredHistory;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return source.slice(startIndex, endIndex);
  };

  // Handle cancel order
  const handleCancelOrder = async (orderId: string, createdAt?: Date | string) => {
    try {
      setIsLoading(true);
      setError(null);

      // For ecosystem orders, use the order's createdAt timestamp
      // Convert Date to milliseconds if it's a Date object
      const timestamp = createdAt
        ? (createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime())
        : Date.now();

      // Use the appropriate URL based on market type
      const url = isFutures
        ? `/api/futures/order/${orderId}`
        : isEco
          ? `/api/ecosystem/order/${orderId}?timestamp=${timestamp}`
          : `/api/exchange/order/${orderId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();

      /*
       * ALREADY GONE IS NOT A FAILURE — AND TREATING IT AS ONE IS WHAT PINNED
       * THE ROW.
       *
       * The route answers 400 "Order is not open" / "Order is no longer open
       * (filled or already cancelled)" for an order that has since been
       * cancelled or filled. The user's intent — this order should not be
       * resting any more — is satisfied, and the ONE thing the list needs is
       * the refresh the old `else` branch skipped. Checked before `response.ok`
       * so it is reached at all.
       */
      const alreadyGone = isAlreadyGone(response, data);

      /*
       * BOOLEANS, NOT PROSE — AND ONE EXPRESSION FOR ALL THREE MARKETS.
       *
       * See settleAfterCancel: `deferred: true` is a 200 carrying a sentence
       * that reads like success and means "queued".
       *
       * The futures branch used to be `!!data.success`, and NO futures route
       * returns a `success` field: `futures/order/[id]/index.del.ts` answers
       * `{ message: "Order cancelled and balance refunded successfully" }`, and
       * nothing wraps it in an envelope that adds one. So every SUCCESSFUL
       * futures cancel read as a failure, set the "failed to cancel order"
       * banner and skipped the refetch — the reported bug verbatim, on a market
       * the owner had not tried yet. Futures also answers 400 "Order is not
       * open" for an order that has since filled, which `alreadyGone` already
       * recognises, so this makes the already-gone refresh work there too.
       *
       * THE BODY-CARRIED STATUS IS READ FIRST, AND FOR EVERY MARKET. This stack
       * does answer `{ statusCode, message }` inside a 200 — `isAlreadyGone`
       * above exists precisely because it does — and a refusal shaped that way
       * carries a `message` like any other. Without this gate the `!!data.message`
       * fallback turned a genuine failure into a success: the "failed to cancel"
       * banner never appeared and the row was refetched as if the order had gone.
       */
      const bodyFailed = bodyCarriesFailure(data);
      const isSuccess =
        alreadyGone ||
        (response.ok &&
          !bodyFailed &&
          (data.cancelled === true ||
            data.deferred === true ||
            !!data.message ||
            !!data.success));

      if (isSuccess) {
        await settleAfterCancel({
          deferred: data?.deferred === true && !alreadyGone,
          ids: [String(orderId)],
        });
      } else {
        setError(tCommon("failed_to_cancel_order"));
        console.error("Failed to cancel order:", data);
      }
    } catch (err) {
      setError(t("error_canceling_order"));
      console.error("Error canceling order:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close position
  const handleClosePosition = async (position: FuturesPosition) => {
    try {
      setIsLoading(true);
      setError(null);

      // Symbol is always "currency/pair" from the API (e.g. "BTC/USDT", "TRX/SOL")
      const [currency, pair] = position.symbol.split("/");

      const response = await fetch(`/api/futures/position/${position.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currency,
          pair,
          side: position.side,
        }),
      });
      const data = await response.json();
      /*
       * A POSITION THAT IS ALREADY CLOSED IS A SUCCESSFUL CLOSE.
       *
       * `futures/position/[id]/index.del.ts` raises 400 for a position that has
       * been liquidated, stopped out or closed in another tab. Reporting that as
       * a failure AND skipping `fetchPositions()` left the stale row on screen
       * with no way to clear it — the same defect the cancel path above had.
       */
      const alreadyGone = isAlreadyGone(response, data);
      // Body-carried status first, for the same reason as the cancel path:
      // `{ statusCode: 500, message: "…" }` on a 200 has a `message`, and the
      // `data.message` fallback below would otherwise read it as a clean close.
      const isSuccess =
        alreadyGone ||
        (response.ok && !bodyCarriesFailure(data) && (data.success || data.message));
      if (isSuccess) {
        // Refresh positions
        fetchPositions();
      } else {
        setError(t("failed_to_close_position"));
        console.error("Failed to close position:", data);
      }
    } catch (err) {
      setError(t("error_closing_position"));
      console.error("Error closing position:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel all orders
  const handleCancelAllOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const timestamp = Date.now();

      let isSuccess = false;
      let bulkDeferred = false;
      let bulkFailedCount = 0;

      if (isFutures || isEco) {
        // Use the bulk-cancel URL for futures and eco
        const url = isFutures
          ? `/api/futures/order/all`
          : `/api/ecosystem/order/all?timestamp=${timestamp}`;
        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();

        // BOTH bulk routes return { message, cancelledCount } and NO success
        // field — `futures/order/all/index.del.ts` answers exactly the shape
        // `ecosystem/order/all` does. Reading `data.success` there made every
        // successful futures Cancel All report failure and skip its refetch, so
        // the rows stayed on screen; it is the same defect as the futures branch
        // of handleCancelOrder above.
        //
        // `cancelledCount` INCLUDES orders that were merely queued for the
        // leaseholder, so it does not mean "already gone" — see
        // settleAfterCancel. Nothing left open is also a success: the user asked
        // for an empty book and that is what they have.
        //
        // The body-carried status is read first here too: a bulk route that
        // refuses inside a 200 still returns a `message`, and the `!!message`
        // arm would report a sweep that never happened.
        isSuccess =
          response.ok &&
          !bodyCarriesFailure(data) &&
          (Number(data?.cancelledCount ?? 0) > 0 || !!data?.message);

        // The eco bulk route reports orders it could NOT cancel; those are
        // still open and funded, so say so rather than reporting a clean sweep.
        bulkFailedCount = Number(data?.failedCount ?? 0) || 0;
        // A bulk cancel is deferred whenever anything was queued, which the
        // route cannot distinguish from cancelled in its counts — so settle
        // against the list rather than trusting the number.
        bulkDeferred = isEco && isSuccess;

        if (!isSuccess) {
          console.error("Failed to cancel all orders:", data);
        }
      } else {
        // Spot: no bulk-cancel handler exists; iterate DELETE over currently-open orders
        const spotOrders = (openOrders as any[]).filter(
          (o: any) => o && o.id && o.status !== "CANCELED" && o.status !== "CLOSED" && o.status !== "FILLED"
        );
        if (spotOrders.length === 0) {
          isSuccess = true;
        } else {
          const results = await Promise.allSettled(
            spotOrders.map((order: any) =>
              fetch(`/api/exchange/order/${order.id}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                },
              }).then(async (res) => {
                const json = await res.json().catch(() => ({}));
                // Backend DELETE returns { message } on success
                if (!res.ok || !(json.message || json.success)) {
                  throw new Error(json?.error?.message || json?.message || "Cancel failed");
                }
                return json;
              })
            )
          );
          const fulfilled = results.filter((r) => r.status === "fulfilled").length;
          isSuccess = fulfilled > 0;
          if (fulfilled !== spotOrders.length) {
            console.error("Some spot orders failed to cancel:", results);
          }
        }
      }

      if (isSuccess) {
        // No ids: a bulk cancel settles when the open list empties.
        await settleAfterCancel({ deferred: bulkDeferred });
        if (bulkFailedCount > 0) {
          // NOT an error toast — most of the sweep worked. But these orders are
          // still open and still holding funds, so the panel must not imply a
          // clean sweep the way a silent refresh would.
          setError(
            `${bulkFailedCount} order(s) could not be cancelled and are still open.`
          );
        }
      } else {
        setError(t("failed_to_cancel_all_orders"));
      }
    } catch (err) {
      setError(t("error_canceling_all_orders"));
      console.error("Error canceling all orders:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleCancelAiInvestment = async (investmentId: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/ai/investment/log/${investmentId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        // Refresh AI investments and wallet balances
        fetchAiInvestments();
        fetchWallets();
        window.dispatchEvent(new CustomEvent("walletUpdated"));
      } else {
        setError(t("failed_to_cancel_ai_investment"));
        console.error("Failed to cancel AI investment:", data);
      }
    } catch (err) {
      setError(t("error_canceling_ai_investment"));
      console.error("Error canceling AI investment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /*
    ───────────────────────────────────────────────────────────────────────────
    ONE QUOTE ASSET, OR NO TOTAL.

    `order.cost` is denominated in each order's OWN quote asset, and the eco
    route returns every symbol when `currency`/`pair` are absent
    (`ecosystem/order/index.get.ts:74-107`) — so this chip summed BTC-quoted
    costs into USDT-quoted ones and printed the result unlabelled.

    It also counted every PENDING stop order as ZERO, because
    `formatStopForClient` hardcodes `cost: 0`
    (`ecosystem/utils/stopOrders.ts:109`) — so an exposure chip understated
    exposure by exactly the resting stops.

    Now: the total renders only when every open order shares a quote asset, and
    it carries that asset. Otherwise the chip shows the order COUNT, which is
    true regardless of denomination. Stop orders are excluded from the sum and
    named, rather than silently contributing nothing.
    ───────────────────────────────────────────────────────────────────────────
  */
  const openQuoteAssets = new Set(
    openOrders
      .map((o: any) => String(o.pair ?? o.symbol?.split("/")?.[1] ?? "").toUpperCase())
      .filter(Boolean)
  );
  const costedOrders = openOrders.filter((o: any) => Number(o.cost) > 0);
  const uncosted = openOrders.length - costedOrders.length;
  const totalOpenOrdersValue =
    openQuoteAssets.size === 1 && costedOrders.length > 0
      ? `${formatDecimal(
          costedOrders.reduce((acc, order: any) => acc + (Number(order.cost) || 0), 0),
          "total"
        )} ${[...openQuoteAssets][0]}${uncosted > 0 ? ` +${uncosted}` : ""}`
      : `${openOrders.length}`;
  const priceLabel = `Price${pair ? ` (${pair})` : ""}`;

  /** Search + time-range filter. Was written twice, identically. */
  const filterBar = (
    <div className="flex items-center gap-1">
      <Input
        placeholder={tCommon("search")}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="h-6 text-xs w-24"
      />
      <Select value={timeFilter} onValueChange={setTimeFilter}>
        <SelectTrigger className="h-6 text-xs w-20">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tCommon("all_time")}</SelectItem>
          <SelectItem value="24h">{t("last_24h")}</SelectItem>
          <SelectItem value="7d">{t("last_7d")}</SelectItem>
          <SelectItem value="30d">{t("last_30d")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  /** Page controls. Was written twice; only the total and page-size differed. */
  const renderPagination = (total: number, withPageSize: boolean) =>
    totalPages > 1 ? (
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <div className="text-xs text-muted-foreground">
          Showing {(currentPage - 1) * itemsPerPage + 1}-
          {Math.min(currentPage * itemsPerPage, total)} of {total}
        </div>
        <div className="flex items-center gap-1">
          {/* `size="icon-xs"` IS `h-6 w-6`, tokenised — writing those two classes
              by hand made twMerge delete the primitive's own
              `--control-height-scale` height, so these two chevrons were the
              only controls on the page that ignored the operator's control-size
              setting. No visual change. */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs mx-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          {withPageSize && (
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(Number.parseInt(value))}
            >
              <SelectTrigger className="h-6 text-xs w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    ) : null;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Sticky tabs header */}
      <div className="flex-shrink-0 flex border-b border-border sticky top-0 bg-background z-10">
        {isFutures && (
          <TabButton
            active={activeTab === "positions"}
            onClick={() => setActiveTab("positions")}
            icon={<Briefcase className="h-3.5 w-3.5 mr-1.5" />}
          >
            Positions
          </TabButton>
        )}
        {/* Closed and liquidated positions. Sits next to Positions rather than
            inside it: the open list carries an exposure total and a Close
            button, and neither means anything for a position that is already
            finished. See `closedPositions`. */}
        {isFutures && (
          <TabButton
            active={activeTab === "closed"}
            onClick={() => setActiveTab("closed")}
            icon={<Archive className="h-3.5 w-3.5 mr-1.5" />}
          >
            {tCommon("closed_positions")}
          </TabButton>
        )}
        <TabButton
          active={activeTab === "open"}
          onClick={() => setActiveTab("open")}
          icon={<Clock className="h-3.5 w-3.5 mr-1.5" />}
        >
          {tCommon("open_orders")}
        </TabButton>
        <TabButton
          active={activeTab === "history"}
          onClick={() => setActiveTab("history")}
          icon={<History className="h-3.5 w-3.5 mr-1.5" />}
        >
          History
        </TabButton>
        <TabButton
          active={activeTab === "trades"}
          onClick={() => setActiveTab("trades")}
          icon={<ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />}
        >
          Trades
        </TabButton>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {error && (
          /* The wrapper carries the testid because StatusNotice is a shared
             primitive. This banner WAS the entire visible symptom of the CEX
             open-orders defect — the tab showed it and zero rows while the
             trader held resting orders — so a spec asserting its absence is the
             most direct regression pin there is. */
          <div data-testid="orders-error">
            <StatusNotice
              tone="destructive"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              className="mx-2 mt-2 flex-shrink-0"
            >
              {error}
            </StatusNotice>
          </div>
        )}

        {activeTab === "open" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                {openOrders.length > 0 && (
                  <span data-testid="open-orders-total">
                    <MetaChip className="h-5 text-[10px]">
                      {totalOpenOrdersValue}
                    </MetaChip>
                  </span>
                )}
              </div>

              {openOrders.length > 0 && (
                <Button
                  variant="ghost"
                  size="3xs"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleCancelAllOrders}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {tTrade("cancel_all")}
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {openOrders.length > 0 ? (
                <table className="w-full text-xs">
                  <TableHead
                    columns={[
                      { label: tCommon("symbol"), align: "left" },
                      { label: tCommon("type"), align: "left" },
                      { label: priceLabel },
                      { label: t("filled_amount") },
                      { label: tCommon("total") },
                      ...(isFutures ? FUTURES_SLTP_COLUMNS : []),
                      { label: tCommon("time") },
                      { label: tCommon("action"), align: "center" },
                    ]}
                  />
                  <tbody data-testid="open-orders-body">
                    {openOrders.map((order: any) => (
                      <Row key={order.id}>
                        <td className="p-2" data-testid="open-order-symbol">
                          <SymbolCell order={order} isFutures={isFutures} />
                        </td>
                        <td className="p-2">
                          <MetaChip className="h-5 text-[10px] font-normal">
                            {order.type}
                          </MetaChip>
                        </td>
                        <NumCell testid="open-order-price">
                          {formatDecimal(order.price, "price")}
                        </NumCell>
                        <td className="p-2 text-right">
                          <FilledCell
                            order={order}
                            showProgress={Number(order.filled) > 0}
                          />
                        </td>
                        <NumCell testid="open-order-total">
                          {formatDecimal(
                            order.cost || order.amount * order.price,
                            "total"
                          )}
                        </NumCell>
                        {isFutures && (
                          <>
                            <NumCell>
                              {order.stop_loss_price
                                ? formatDecimal(order.stop_loss_price, "price")
                                : "-"}
                            </NumCell>
                            <NumCell>
                              {order.take_profit_price
                                ? formatDecimal(order.take_profit_price, "price")
                                : "-"}
                            </NumCell>
                          </>
                        )}
                        <td className="p-2 text-right text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              handleCancelOrder(order.id, order.createdAt)
                            }
                            disabled={isLoading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </Row>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* THE VACUOUS-PASS TRAP, and why this needs a testid of its own.
                   This paints both when the fetch legitimately returns [] AND
                   when no request was ever issued (`cexOrderQuery` null, the
                   `if (!url)` early return) — with no error banner either way.
                   So "the error banner is absent" alone is satisfied by a page
                   that never asked for anything. A spec has to assert THIS is
                   gone as well, alongside a row count. */
                <div data-testid="no-open-orders">
                  <EmptyState
                    icon={<Clock className="h-10 w-10" />}
                    title={tTrade("no_open_orders")}
                    hint={t("your_active_orders_will_appear_here")}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{t("order_history")}</span>
                <span data-testid="history-count">
                  <MetaChip className="h-5 text-[10px]">
                    {filteredHistory.length} orders
                  </MetaChip>
                </span>
              </div>
              {filterBar}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {filteredHistory.length > 0 ? (
                <>
                  <table className="w-full text-xs">
                    <TableHead
                      columns={[
                        { label: tCommon("symbol"), align: "left" },
                        { label: tCommon("type"), align: "left" },
                        { label: priceLabel },
                        { label: t("filled_amount") },
                        { label: tCommon("total") },
                        ...(isFutures ? FUTURES_SLTP_COLUMNS : []),
                        { label: tCommon("status"), align: "center" },
                        { label: tCommon("time") },
                      ]}
                    />
                    <tbody>
                      {getCurrentPageItems().map((order: any) => (
                        <Row key={order.id}>
                          <td className="p-2">
                            <SymbolCell order={order} isFutures={isFutures} />
                          </td>
                          <td className="p-2">
                            <MetaChip className="h-5 text-[10px] font-normal">
                              {order.type}
                            </MetaChip>
                          </td>
                          <NumCell>{formatDecimal(order.price, "price")}</NumCell>
                          <td className="p-2 text-right">
                            <FilledCell
                              order={order}
                              showProgress={
                                Number(order.filled) > 0 &&
                                order.status === "CANCELED"
                              }
                            />
                          </td>
                          <NumCell>
                            {formatDecimal(
                              order.cost || order.amount * order.price,
                              "total"
                            )}
                          </NumCell>
                          {isFutures && (
                            <>
                              <NumCell>
                                {order.stop_loss_price
                                  ? formatDecimal(order.stop_loss_price, "price")
                                  : "-"}
                              </NumCell>
                              <NumCell>
                                {order.take_profit_price
                                  ? formatDecimal(order.take_profit_price, "price")
                                  : "-"}
                              </NumCell>
                            </>
                          )}
                          <td className="p-2 text-center">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </td>
                        </Row>
                      ))}
                    </tbody>
                  </table>

                  {renderPagination(filteredHistory.length, true)}
                </>
              ) : (
                <EmptyState
                  icon={<History className="h-10 w-10" />}
                  title={tTrade("no_order_history")}
                  hint={t("your_completed_orders_will_appear_here")}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "trades" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {tCommon("recent_trades")}
                </span>
                <MetaChip className="h-5 text-[10px]">
                  {filteredTrades.length} trades
                </MetaChip>
              </div>
              {filterBar}
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {filteredTrades.length > 0 ? (
                <>
                  <table className="w-full text-xs">
                    <TableHead
                      columns={[
                        { label: tCommon("symbol"), align: "left" },
                        { label: tCommon("side"), align: "left" },
                        { label: priceLabel },
                        { label: tCommon("amount") },
                        { label: tCommon("total") },
                        { label: tCommon("fee") },
                        { label: tCommon("time") },
                      ]}
                    />
                    <tbody>
                      {getCurrentPageItems(filteredTrades).map((order: any) => {
                        const filledAmount =
                          Number(order.filled) > 0 ? order.filled : order.amount;
                        return (
                          <Row key={order.id}>
                            <td className="p-2">
                              <div className="flex items-center">
                                <span className="text-foreground">
                                  {order.symbol}
                                </span>
                                {order.isEco && (
                                  <MetaChip className="ml-1.5 h-4 text-[9px]">
                                    ECO
                                  </MetaChip>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              <SideLabel side={order.side} />
                            </td>
                            <NumCell>
                              {formatDecimal(order.average || order.price, "price")}
                            </NumCell>
                            <NumCell>
                              {formatDecimal(filledAmount, "amount")}
                            </NumCell>
                            <NumCell>
                              {formatDecimal(
                                order.cost ||
                                  filledAmount * (order.average || order.price),
                                "total"
                              )}
                            </NumCell>
                            <NumCell muted>
                              {formatDecimal(order.fee, "price")}{" "}
                              {order.feeCurrency || ""}
                            </NumCell>
                            <td className="p-2 text-right text-muted-foreground">
                              {formatDate(order.updatedAt || order.createdAt)}
                            </td>
                          </Row>
                        );
                      })}
                    </tbody>
                  </table>

                  {renderPagination(filteredTrades.length, false)}
                </>
              ) : (
                <EmptyState
                  icon={<ArrowLeftRight className="h-10 w-10" />}
                  title={t("no_trade_history") || t("no_trade_history")}
                  hint={
                    t("your_completed_trades_will_appear_here") ||
                    t("your_completed_trades_will_appear_here")
                  }
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "positions" && isFutures && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* The label is chrome and never moves; the COUNT would
                    otherwise read a confident "(0)" over a pane about to list
                    four positions. */}
                <span className="text-xs font-medium">
                  {tCommon("open_positions")} (
                  <Loadable
                    loading={isLoadingPositions}
                    placeholder="0"
                    chars={1}
                  >
                    {positions.length}
                  </Loadable>
                  )
                </span>
                {/* See `showPositionsTotal`. A named predicate rather than an
                    inline `!isLoadingPositions &&`: the guard is a legitimate
                    empty-state suppression, not withheld content, and the name
                    is what says so to the next reader — and to the debt
                    scanner, whose `hidden-while-loading` rule cannot tell the
                    two apart. */}
                {showPositionsTotal && (
                  <MetaChip className="h-5 text-[10px]">
                    {formatDecimal(
                      positions.reduce((acc, pos) => acc + Number(pos.amount), 0),
                      "amount"
                    )}
                  </MetaChip>
                )}
              </div>
              {/* Hedge mode is not a detail: a long and a short on the same
                  symbol are two positions with two margins, and nothing here
                  ever said so. */}
              <span className="text-[10px] text-muted-foreground">
                {t("hedge_mode_positions_caption")}
              </span>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {/* ONE table, two states. The Spinner this replaced was a 20px
                  glyph centred in the whole pane — the seven COLUMN HEADINGS
                  went with it, and those are knowable before any request. Now
                  the head renders immediately and only the cells wait.

                  `showNoPositions` is the empty guard re-stated: `positions` is
                  `[]` before the response, so without `!isLoadingPositions` a
                  futures trader would be told "No open positions" on every tab
                  switch, a quarter-second before their positions appear. */}
              {showNoPositions ? (
                <EmptyState
                  icon={<Briefcase className="h-10 w-10" />}
                  title={tCommon("book_is_empty")}
                  hint={t("your_active_positions_will_appear_here")}
                />
              ) : (
                <table
                  className="w-full text-xs"
                  aria-busy={isLoadingPositions || undefined}
                >
                  <TableHead
                    columns={[
                      { label: tCommon("symbol"), align: "left" },
                      { label: tCommon("size") },
                      {
                        label: `${tCommon("entry_price")}${pair ? ` (${pair})` : ""}`,
                      },
                      { label: `${tTrade("liq_price")}${pair ? ` (${pair})` : ""}` },
                      { label: "PnL" },
                      { label: tCommon("time") },
                      { label: tCommon("action"), align: "center" },
                    ]}
                  />
                  <tbody>
                    {positionRows.map((row, index) => {
                      const pending = row === null;
                      const position = row ?? PENDING_POSITION;
                      const pnl = Number(position.unrealizedPnl);
                      return (
                        <Row key={pending ? `pending-${index}` : position.id}>
                          <td className="p-2">
                            {/* All three parts render in both states and each
                                one withholds only its own VALUE — the side
                                would otherwise read "Sell" (see SideLabel), the
                                leverage "0x". Keeping the elements means the
                                row's left cell is the same width the moment it
                                paints, so the symbol does not slide sideways
                                under the reader when the response lands. */}
                            <div className="flex items-center">
                              <SideLabel
                                side={position.side}
                                label={position.side}
                                pending={pending}
                              />
                              <span className="ml-1.5 text-foreground">
                                <Loadable
                                  loading={pending}
                                  placeholder="BTC/USDT"
                                >
                                  {position.symbol}
                                </Loadable>
                              </span>
                              <MetaChip className="ml-1.5 h-4 text-[9px]">
                                <Loadable loading={pending} placeholder="20x">
                                  {position.leverage}x
                                </Loadable>
                              </MetaChip>
                            </div>
                          </td>
                          <NumCell>
                            <Loadable loading={pending} placeholder="0.00000000">
                              {Number(position.amount).toFixed(8)}
                            </Loadable>
                          </NumCell>
                          <NumCell>
                            <Loadable loading={pending} placeholder="12,345.67">
                              {formatDecimal(position.entryPrice, "price")}
                            </Loadable>
                          </NumCell>
                          <NumCell>
                            <Loadable loading={pending} placeholder="12,345.67">
                              {position.liquidationPrice
                                ? formatDecimal(position.liquidationPrice, "price")
                                : "-"}
                            </Loadable>
                          </NumCell>
                          <td className="p-2 text-right font-mono">
                            {/* `pnl` is 0 while pending, which lands on the
                                neutral `text-foreground` arm rather than a
                                green or red one — so the tone makes no claim
                                even before the Loadable hides the figure. */}
                            <span
                              className={
                                pnl > 0
                                  ? "text-up"
                                  : pnl < 0
                                    ? "text-down"
                                    : "text-foreground"
                              }
                            >
                              <Loadable loading={pending} placeholder="+123.45">
                                {pnl > 0 ? "+" : ""}
                                {formatDecimal(position.unrealizedPnl, "total")}
                              </Loadable>
                            </span>
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            <Loadable loading={pending} placeholder="12m ago">
                              {formatDate(position.createdAt)}
                            </Loadable>
                          </td>
                          <td className="p-2 text-center">
                            {/* The button renders in BOTH states — it is the
                                cell's whole height — but a pending row has no
                                id to close, so it is inert until one arrives. */}
                            <Button
                              variant="ghost"
                              size="3xs"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleClosePosition(position)}
                              disabled={isLoading || pending}
                            >
                              Close
                            </Button>
                          </td>
                        </Row>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ---- closed and liquidated positions -------------------------
            The same seven columns minus Action (there is nothing left to
            close) and minus the liquidation price (it was a forecast about a
            position that has already resolved — printing it beside a realised
            outcome invites the reader to compare a prediction with a fact).
            "Result" replaces "PnL" because `unrealizedPnl` on a finished row is
            the realised number, whatever the column is called. */}
        {activeTab === "closed" && isFutures && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
              <span className="text-xs font-medium">
                {tCommon("closed_positions")} (
                <Loadable
                  loading={isLoadingClosedPositions}
                  placeholder="0"
                  chars={1}
                >
                  {closedPositions.length}
                </Loadable>
                )
              </span>
              <span className="text-[10px] text-muted-foreground">
                {t("closed_positions_caption")}
              </span>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              {!isLoadingClosedPositions && closedPositions.length === 0 ? (
                <EmptyState
                  icon={<Archive className="h-10 w-10" />}
                  title={tCommon("book_is_empty")}
                  hint={t("your_closed_positions_will_appear_here")}
                />
              ) : (
                <table
                  className="w-full text-xs"
                  aria-busy={isLoadingClosedPositions || undefined}
                >
                  <TableHead
                    columns={[
                      { label: tCommon("symbol"), align: "left" },
                      { label: tCommon("size") },
                      {
                        label: `${tCommon("entry_price")}${pair ? ` (${pair})` : ""}`,
                      },
                      { label: tCommon("result") },
                      { label: tCommon("status") },
                      { label: tCommon("time") },
                    ]}
                  />
                  <tbody>
                    {closedPositions.map((position) => {
                      const pnl = Number(position.unrealizedPnl);
                      /*
                       * A LIQUIDATION ZEROES `amount`.
                       *
                       * So a liquidated row prints a size of 0, which reads as
                       * "nothing happened" next to a large negative result. The
                       * status cell is what carries the meaning, and it is
                       * toned destructive so the row cannot be skimmed as an
                       * ordinary close.
                       */
                      const liquidated =
                        String(position.status).toUpperCase() === "LIQUIDATED";
                      return (
                        <Row key={position.id}>
                          <td className="p-2">
                            <div className="flex items-center">
                              <SideLabel
                                side={position.side}
                                label={position.side}
                              />
                              <span className="ml-1.5 text-foreground">
                                {position.symbol}
                              </span>
                              <MetaChip className="ml-1.5 h-4 text-[9px]">
                                {position.leverage}x
                              </MetaChip>
                            </div>
                          </td>
                          <NumCell>
                            {Number(position.amount).toFixed(8)}
                          </NumCell>
                          <NumCell>
                            {formatDecimal(position.entryPrice, "price")}
                          </NumCell>
                          <td className="p-2 text-right font-mono">
                            <span
                              className={
                                pnl > 0
                                  ? "text-up"
                                  : pnl < 0
                                    ? "text-down"
                                    : "text-foreground"
                              }
                            >
                              {pnl > 0 ? "+" : ""}
                              {formatDecimal(position.unrealizedPnl, "total")}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <span
                              className={
                                liquidated
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              }
                            >
                              {position.status}
                            </span>
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {formatDate(position.updatedAt || position.createdAt)}
                          </td>
                        </Row>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
