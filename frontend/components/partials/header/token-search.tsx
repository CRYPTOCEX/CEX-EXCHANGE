"use client";

/**
 * The header's token search — one glyph in the bar, one panel over the page.
 * ============================================================================
 *
 * WHY A BUTTON AND NOT A LIVE FIELD IN THE BAR
 *
 * The first cut put a real input in the navbar. It worked and it cost too much:
 * a field wide enough to read is ~11rem of a row that already carries a brand,
 * five nav sections and six controls, and it squeezed the auth cluster hard
 * enough to wrap "Log In" onto two lines. A 40px glyph costs the nav nothing
 * and buys a panel with room to be good — the field moves INSIDE, where it can
 * be `text-base` with a real hit area instead of a squint.
 *
 * WHY IT IS THE COMMAND PALETTE'S CHROME, DOWN TO THE TOKENS
 *
 * `command-palette.tsx` is this platform's overlay idiom: portal, `bg-overlay`
 * scrim, `max-w-2xl` popover, the 2px accent rule along the top edge, rows that
 * select with `bg-primary/10 ring-1 ring-primary/30`, and a keyboard-hint
 * footer on `surface-2`. Inventing a second overlay language for the control
 * next to it would read as a different product's component. So this reuses that
 * language exactly and differs only where the CONTENT differs.
 *
 * WHY THIS IS NOT THE COMMAND PALETTE
 *
 * That one searches the MENU — "where is the staking page" — by flattening
 * `getMenu()` in memory, and ⌘K still opens it on admin screens. It cannot
 * answer "what can I do with MASH", because a token is not a menu entry: the
 * pages are the same handful whatever you type, and the answer lives in twelve
 * database tables. So this one asks the server (`GET /api/search`).
 *
 * WHY THE DESIGN IS FLAT
 *
 * R3 — elevation is a surface ramp, not a gradient. Everything that reads as
 * depth here is a hairline plus one step of ground (`popover` over the scrim,
 * `surface-2` under the footer, `muted` under an icon tile). No glow, no
 * gradient, no tinted border faking a shadow. R4 — every figure is
 * `font-mono tabular-nums`, so the price column lines up down the list instead
 * of shimmering as the digits change.
 *
 * THE ERROR BRANCH IS LOAD-BEARING, NOT DEFENSIVE
 *
 * `handler/Request.ts` screens EVERY query parameter against injection patterns
 * before any handler runs, and one pattern is "a SQL verb plus a SQL keyword" —
 * ordinary English. `delete my order from history` is refused, and the declared
 * 400 reaches the browser as a 500. Without the `refused` state below, `$fetch`
 * (which never throws — it resolves `{data, error}`) would leave the PREVIOUS
 * query's rows on screen under the new text, which reads as a wrong answer
 * rather than a rejected one.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "framer-motion";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Bot,
  CandlestickChart,
  Coins,
  CornerDownLeft,
  Copy,
  Flame,
  Landmark,
  Layers,
  LineChart,
  Loader2,
  PiggyBank,
  Rocket,
  Search,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

/* ==========================================================================
   THE SHAPE THE SERVER SENDS
   ========================================================================== */

interface SearchItem {
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  href: string;
  price?: number | null;
  change?: number | null;
}

interface SearchGroup {
  id: string;
  label: string;
  href: string;
  count: number;
  items: SearchItem[];
}

interface TrendingRow {
  symbol: string;
  currency: string;
  pair: string;
  hot: boolean;
  href: string;
  price: number | null;
  change: number | null;
}

interface SearchPayload {
  query: string;
  base: string | null;
  quote: string | null;
  token: { symbol: string; name: string; price: number | null } | null;
  groups: SearchGroup[];
  functions: { id: string; label: string; href: string }[];
  trending: { spot: TrendingRow[]; futures: TrendingRow[] };
}

/* ==========================================================================
   ICONS ARE OWNED HERE, NOT SENT
   ========================================================================== */

/**
 * The server sends a group `id`; this file decides what it looks like.
 *
 * Sending an icon NAME instead would put the platform's icon registry on the
 * far side of an HTTP boundary, and an unknown name there renders NOTHING at
 * all — silently. A missing key here falls back to a real glyph, so the worst a
 * new server-side group can do is look generic.
 */
const GROUP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  spot: LineChart,
  futures: CandlestickChart,
  ecosystem: Layers,
  binary: Target,
  forexTrading: Landmark,
  staking: PiggyBank,
  ico: Rocket,
  p2p: Users,
  copyTrading: Copy,
  tradingBot: Bot,
  investment: TrendingUp,
  dex: ArrowRightLeft,
  wallet: Wallet,
};

/* ==========================================================================
   FORMATTING
   ========================================================================== */

/**
 * A price is only useful at the precision the market quotes it in.
 *
 * `0.002778` rendered to two decimals is `0.00`, which is not a smaller number
 * — it is a wrong one, and it is exactly what a fixed-precision formatter does
 * to the long tail of any token list.
 */
function formatPrice(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 5 : 8;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

function formatChange(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/* ==========================================================================
   RECENT SEARCHES
   ========================================================================== */

const RECENT_KEY = "token-search-recent";
const RECENT_MAX = 8;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(next: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_MAX)));
  } catch {
    /* Private mode, blocked site data, a full quota — none of those is a reason
       for the search itself to stop working. */
  }
}

/* ==========================================================================
   SMALL PARTS
   ========================================================================== */

function SectionLabel({
  icon: SectionIcon,
  children,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-subtle-foreground">
        {SectionIcon ? <SectionIcon className="w-3 h-3" /> : null}
        {children}
      </span>
      {action}
    </div>
  );
}

/** The figure column. `font-mono tabular-nums` per R4, so the digits do not dance. */
function Figure({ price, change }: { price: number | null; change: number | null }) {
  const p = formatPrice(price);
  const c = formatChange(change);
  if (!p && !c) return null;
  return (
    <span className="shrink-0 text-right">
      {p ? (
        <span className="block text-sm font-medium font-mono tabular-nums text-foreground">
          {p}
        </span>
      ) : null}
      {c ? (
        <span
          className={cn(
            "block text-xs font-mono tabular-nums",
            (change ?? 0) >= 0 ? "text-success-ink" : "text-destructive-ink"
          )}
        >
          {c}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Nothing to show, said in the panel's own voice.
 *
 * Module scope, not an inner function: a component re-created on every render
 * is a NEW type each time, so React unmounts and remounts its subtree instead
 * of updating it — losing focus and restarting transitions on every keystroke.
 */
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Search className="h-5 w-5 text-subtle-foreground" />
      </div>
      <p className="px-8 text-sm text-subtle-foreground">{children}</p>
    </div>
  );
}

function KeyCap({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <kbd
      className={cn(
        "flex items-center justify-center h-6 rounded text-xs font-medium bg-muted text-muted-foreground",
        wide ? "px-2" : "w-6"
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * One result row — a market, a pool, an offer, a wallet action.
 *
 * Module scope, like `EmptyState`: an inner component is a new type on every
 * render, and React answers a new type by unmounting the old subtree. In a
 * panel that re-renders on every keystroke that means the whole list is thrown
 * away and rebuilt per character.
 *
 * Hover MOVES the selection rather than painting a second highlight. Two lit
 * rows at once means Enter fires the one the pointer is NOT on, which is the
 * worst possible way for a search box to be wrong.
 */
function SearchRow({
  item,
  index,
  icon: RowIcon,
  rank,
  active,
  onPick,
  onHover,
}: {
  item: SearchItem;
  index: number;
  icon?: React.ComponentType<{ className?: string }>;
  rank?: number;
  active: boolean;
  onPick: (href: string) => void;
  onHover: (index: number) => void;
}) {
  return (
    <button
      type="button"
      data-row={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick(item.href)}
      onMouseMove={() => onHover(index)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left",
        "transition-[color,background-color,box-shadow] duration-150",
        active ? "bg-primary/10 ring-1 ring-primary/30" : "ring-1 ring-transparent"
      )}
    >
      {rank != null ? (
        <span
          className={cn(
            "w-4 shrink-0 font-mono text-xs tabular-nums",
            active ? "text-primary-ink" : "text-subtle-foreground"
          )}
        >
          {rank}
        </span>
      ) : null}

      {RowIcon ? (
        <span
          className={cn(
            "shrink-0 rounded-lg p-2 transition-colors",
            active ? "bg-primary/20 text-primary-ink" : "bg-muted text-muted-foreground"
          )}
        >
          <RowIcon className="h-4 w-4" />
        </span>
      ) : null}

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium",
            active ? "text-primary-ink" : "text-foreground"
          )}
        >
          {item.title}
        </span>
        {item.subtitle ? (
          <span className="block truncate text-xs text-subtle-foreground">{item.subtitle}</span>
        ) : null}
      </span>

      {item.badge ? (
        <span className="shrink-0 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary-ink">
          {item.badge}
        </span>
      ) : null}

      <Figure price={item.price ?? null} change={item.change ?? null} />

      <CornerDownLeft
        className={cn(
          "h-4 w-4 shrink-0 text-subtle-foreground transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
    </button>
  );
}

/* ==========================================================================
   THE COMPONENT
   ========================================================================== */

export default function TokenSearch() {
  /* `common`, not `components`: the header renders on EVERY route, and the
     namespaces a route loads are decided per route — `components` is not among
     the ones `/` loads, so every label here rendered as its own raw key.
     `common` is always included, which is what makes it the only correct
     namespace for chrome that is always on screen. */
  const t = useTranslations("common");
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /**
   * Every fetch stamps this and checks it back.
   *
   * Debounce alone does not order responses: a two-character query can be
   * slower than the four-character one that replaced it, and the panel would
   * settle on the older answer. The stamp is what makes the LAST query typed
   * the one that wins, not the last one to arrive.
   */
  const requestRef = useRef(0);
  /**
   * Hover and the keyboard drive the SAME cursor, so the auto-scroll has to
   * know which one moved it. Scrolling on a pointer-driven change slides the
   * list under a stationary pointer, which fires another mousemove on a
   * different row — and the selection then walks by itself.
   */
  const pointerNavRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refused, setRefused] = useState(false);
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);

  /* ---- the flat, ordered list the keyboard walks ---------------------- */
  const flat = useMemo<SearchItem[]>(() => {
    if (!payload) return [];
    if (payload.base) return payload.groups.flatMap((g) => g.items);
    return [...payload.trending.futures, ...payload.trending.spot].map((r) => ({
      title: r.symbol,
      href: r.href,
      price: r.price,
      change: r.change,
    }));
  }, [payload]);

  /* ---- fetch, debounced ------------------------------------------------ */
  const load = useCallback(async (q: string) => {
    const stamp = ++requestRef.current;
    setLoading(true);
    const { data, error } = await $fetch<SearchPayload>({
      url: "/api/search",
      params: q ? { q } : {},
      silent: true,
    });
    if (stamp !== requestRef.current) return;
    setLoading(false);

    if (error || !data) {
      /* CLEAR, do not keep. Leaving the previous payload here is how a refused
         query comes to look like a confident wrong answer. */
      setPayload(null);
      setRefused(true);
      return;
    }
    setRefused(false);
    setPayload(data);
    setCursor(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    /* The empty-panel view is the same request with no `q`, so it is fetched
       once on open rather than debounced against an empty field. */
    const delay = q ? 220 : 0;
    const timer = setTimeout(() => void load(q), delay);
    return () => clearTimeout(timer);
  }, [open, query, load]);

  /* ---- open / close ---------------------------------------------------- */
  const openPanel = useCallback(() => {
    setRecent(readRecent());
    setQuery("");
    setCursor(0);
    setRefused(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  /* The page behind an overlay must not scroll. Without this the wheel falls
     through to the document once the list hits its end, and the panel appears
     to drift up the screen while the reader is still in it. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open]);

  /* Keyboard-driven selection scrolls itself into view; pointer-driven does
     not — see `pointerNavRef`. */
  useEffect(() => {
    if (pointerNavRef.current) {
      pointerNavRef.current = false;
      return;
    }
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const remember = useCallback((term: string) => {
    const clean = term.trim().toUpperCase();
    if (!clean) return;
    setRecent((prev) => {
      const next = [clean, ...prev.filter((r) => r !== clean)].slice(0, RECENT_MAX);
      writeRecent(next);
      return next;
    });
  }, []);

  const go = useCallback(
    (href: string) => {
      remember(query);
      setOpen(false);
      router.push(href);
    },
    [query, remember, router]
  );

  const hover = useCallback(
    (index: number) => {
      setCursor((c) => {
        if (c === index) return c;
        pointerNavRef.current = true;
        return index;
      });
    },
    []
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!flat.length) return;
      e.preventDefault();
      pointerNavRef.current = false;
      setCursor((c) => {
        const next = e.key === "ArrowDown" ? c + 1 : c - 1;
        if (next < 0) return flat.length - 1;
        if (next >= flat.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[cursor];
      if (target) go(target.href);
    }
  };

  /* ---- rows ------------------------------------------------------------ */

  /* The keyboard walks ONE list, so a group's rows have to know where they
     start in it. Derived from the same array the arrow keys index. */
  const groupOffsets = useMemo(() => {
    const offsets: number[] = [];
    let running = 0;
    for (const g of payload?.groups ?? []) {
      offsets.push(running);
      running += g.items.length;
    }
    return offsets;
  }, [payload]);

  const hasQuery = !!payload?.base;
  const nothingFound = hasQuery && payload!.groups.length === 0;
  const futuresCount = payload?.trending?.futures?.length ?? 0;

  const body = (() => {
    if (refused) return <EmptyState>{t("search_refused")}</EmptyState>;
    if (loading && !payload)
      return (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-subtle-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("searching")}
        </div>
      );
    if (nothingFound)
      return (
        <EmptyState>
          {t("no_match_for")} <span className="font-medium text-foreground">{payload!.base}</span>
        </EmptyState>
      );

    if (hasQuery) {
      return (
        <>
          {/* The token itself, when the exchange knows it. One surface step up
              from the panel, hairline, figure on the right — the same anatomy
              as a stat tile, because that is what it is. */}
          {payload!.token ? (
            <div className="mx-1 mb-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {payload!.token.symbol}
                </span>
                <span className="block truncate text-xs text-subtle-foreground">
                  {payload!.token.name}
                </span>
              </span>
              {formatPrice(payload!.token.price) ? (
                <span className="shrink-0 text-sm font-medium font-mono tabular-nums text-foreground">
                  {formatPrice(payload!.token.price)}
                </span>
              ) : null}
            </div>
          ) : null}

          {payload!.groups.map((group, gi) => {
            const GroupIcon = GROUP_ICON[group.id] ?? Coins;
            return (
              <section key={group.id}>
                <SectionLabel
                  icon={GroupIcon}
                  action={
                    <Link
                      href={group.href}
                      onClick={close}
                      className="text-xs text-subtle-foreground transition-colors hover:text-foreground"
                    >
                      {group.count > group.items.length
                        ? t("see_all_count", { count: group.count })
                        : t("see_all")}
                    </Link>
                  }
                >
                  {group.label}
                </SectionLabel>
                {group.items.map((item, ii) => {
                  const index = groupOffsets[gi] + ii;
                  return (
                    <SearchRow
                      key={`${group.id}-${ii}`}
                      item={item}
                      index={index}
                      icon={GroupIcon}
                      active={index === cursor}
                      onPick={go}
                      onHover={hover}
                    />
                  );
                })}
              </section>
            );
          })}
        </>
      );
    }

    /* ---- the empty panel: what to do, and what is moving ---- */
    return (
      <>
        {payload?.functions?.length ? (
          <section>
            <SectionLabel icon={Layers}>{t("common_functions")}</SectionLabel>
            <div className="grid grid-cols-3 gap-1 px-1 sm:grid-cols-5">
              {payload.functions.map((fn) => {
                const FnIcon = GROUP_ICON[fn.id] ?? Coins;
                return (
                  <Link
                    key={fn.id}
                    href={fn.href}
                    onClick={close}
                    className={cn(
                      "group flex flex-col items-center gap-2 rounded-xl px-2 py-3",
                      "ring-1 ring-transparent transition-[color,background-color,box-shadow] duration-150",
                      "hover:bg-primary/10 hover:ring-primary/30"
                    )}
                  >
                    <span className="rounded-lg bg-muted p-2.5 text-muted-foreground transition-colors group-hover:bg-primary/20 group-hover:text-primary-ink">
                      <FnIcon className="w-4 h-4" />
                    </span>
                    <span className="w-full truncate text-center text-xs text-muted-foreground transition-colors group-hover:text-primary-ink">
                      {fn.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {recent.length ? (
          <section>
            <SectionLabel>{t("recent")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5 px-3 pb-1">
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(r);
                    inputRef.current?.focus();
                  }}
                  className="cursor-pointer rounded-lg bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary-ink"
                >
                  {r}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Two columns from `sm`: these are two independent rankings, and
            stacking them buries the second one below the fold. */}
        <div className="grid gap-x-2 sm:grid-cols-2">
          {futuresCount ? (
            <section>
              <SectionLabel icon={Flame}>{t("trending_futures")}</SectionLabel>
              {payload!.trending.futures.map((row, i) => (
                <SearchRow
                  key={`f-${row.symbol}`}
                  index={i}
                  rank={i + 1}
                  active={i === cursor}
                  onPick={go}
                  onHover={hover}
                  item={{
                    title: row.symbol,
                    href: row.href,
                    price: row.price,
                    change: row.change,
                  }}
                />
              ))}
            </section>
          ) : null}
          {payload?.trending?.spot?.length ? (
            <section>
              <SectionLabel icon={TrendingUp}>{t("trending_spot")}</SectionLabel>
              {payload.trending.spot.map((row, i) => (
                <SearchRow
                  key={`s-${row.symbol}`}
                  index={futuresCount + i}
                  rank={i + 1}
                  active={futuresCount + i === cursor}
                  onPick={go}
                  onHover={hover}
                  item={{
                    title: row.symbol,
                    href: row.href,
                    price: row.price,
                    change: row.change,
                  }}
                />
              ))}
            </section>
          ) : null}
        </div>
      </>
    );
  })();

  return (
    <>
      {/* The trigger — one glyph, sized and bordered exactly like the wallet
          and theme controls beside it, so the cluster reads as one row of
          equals rather than a search bolted onto a header. */}
      <button
        type="button"
        aria-label={t("search_tokens")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPanel}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer",
          open
            ? "border-primary/40 bg-primary/10 text-primary-ink"
            : "border-border text-muted-foreground hover:border-border-strong hover:bg-muted hover:text-foreground"
        )}
      >
        <Search className="h-4 w-4" />
      </button>

      {/* No `mounted` flag: the portal opens on a CLICK, which cannot happen
          before hydration, so the server and the first client render agree by
          construction. The `document` guard is for a non-DOM renderer, not for
          SSR timing. */}
      {open && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[var(--z-overlay-scrim)] flex items-start justify-center pt-[12vh]"
                role="dialog"
                aria-modal="true"
                aria-label={t("search_tokens")}
                onKeyDown={onKeyDown}
              >
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-overlay/70 backdrop-blur-sm"
                  onClick={close}
                />

                <m.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  /* NO SHADOW, deliberately. R3 puts depth in the surface
                     ramp, and the ratchet counts a bordered box with a shadow
                     as off-Ledger elevation — the count went 373 -> 374 the
                     moment this carried one. It also bought nothing: over a
                     70% scrim that is already blurred, a drop shadow paints
                     into fog. The hairline and `popover` (one ground above the
                     page) are what lift this surface. */
                  className={cn(
                    "relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl",
                    "border border-border bg-popover"
                  )}
                >
                  {/* One accent rule along the top edge — the platform's mark
                      for "this surface is in front of everything else". */}
                  <div className="absolute left-0 right-0 top-0 h-[2px] bg-primary/60" />

                  {/* The field, where it has room to be a real field. */}
                  <div className="flex items-center gap-3 border-b border-border px-4 py-4">
                    <Search className="h-5 w-5 shrink-0 text-subtle-foreground" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t("search_tokens_placeholder")}
                      aria-label={t("search_tokens")}
                      className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-hidden placeholder:text-subtle-foreground"
                    />
                    {loading ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-subtle-foreground" />
                    ) : null}
                    {query ? (
                      <button
                        type="button"
                        aria-label={t("clear")}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuery("");
                          inputRef.current?.focus();
                        }}
                        className="cursor-pointer rounded-lg p-1 transition-colors hover:bg-muted"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ) : null}
                    <KeyCap wide>ESC</KeyCap>
                  </div>

                  <div ref={listRef} className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
                    {body}
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-2/50 px-4 py-3">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <KeyCap>
                          <ArrowUp className="h-3 w-3" />
                        </KeyCap>
                        <KeyCap>
                          <ArrowDown className="h-3 w-3" />
                        </KeyCap>
                        <span className="text-xs text-subtle-foreground">{t("to_navigate")}</span>
                      </span>
                      <span className="hidden items-center gap-1.5 sm:flex">
                        <KeyCap wide>
                          <CornerDownLeft className="h-3 w-3" />
                        </KeyCap>
                        <span className="text-xs text-subtle-foreground">{t("to_open")}</span>
                      </span>
                    </div>
                    <span className="hidden text-xs text-subtle-foreground sm:block">
                      {t("search_scope_hint")}
                    </span>
                  </div>
                </m.div>
              </m.div>
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
