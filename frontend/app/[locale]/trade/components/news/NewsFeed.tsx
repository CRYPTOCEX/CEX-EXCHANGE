"use client";

/**
 * NewsFeed — market-news stories for a trading terminal.
 *
 * Shared, and shared in fact rather than in principle: trade/pro's NewsOverlay
 * and the forex terminal's FxOverlayHost both mount it, the second pointed at
 * /api/forex-trading/news. It lives under trade/components/ rather than inside
 * either workspace, the same way AlgoBotsTab does — Pro imports that from
 * `../../../components/algo/AlgoBotsTab` — because trade/pro is an OPTIONAL
 * install and an (ext) route must not import out of one.
 *
 * It imports NOTHING from trade/pro (an optional install) and nothing from an
 * (ext) route. Palette comes from news.css, which resolves --tp-* first and
 * falls back to the Obsidian tokens, so the component looks native in either
 * shell without a fork.
 *
 * TWO LAYOUTS, one data contract:
 *
 *   `list`  (default) — the compact scroller: rows in a single column, sized
 *           for a ~200px dock. Nothing passes it today (both hosts are full
 *           views and ask for `split`), so read this as the DEFAULT rather than
 *           as a live consumer — it is the shape that survives any host box,
 *           which is what a default owes a caller that did not choose. A
 *           `split` default would put a 360px master column inside a dock.
 *   `split` — master/detail. A headline list on the left, the selected story
 *           as a reading pane on the right. This is what a full-screen view
 *           should be: the old shape put a 900px centred column of two-line
 *           clamped rows on a 3775px monitor, so the space was wasted AND the
 *           story was unreadable in the same breath.
 *
 * SIZING LIVES HERE. It used to be applied by the host through arbitrary
 * variants (`[&_.news-feed-row_p]:text-sm`), which coupled the overlay to this
 * file's markup — restructuring a row silently dropped the host's typography.
 * `layout` says what the host needs and this component decides how to draw it.
 *
 * WHY THERE IS NO ARTICLE BODY: the upstream news endpoints (Finnhub's
 * /news and the forex equivalent) return headline, summary, url and artwork —
 * there is no full-text field to store, and republishing scraped article bodies
 * would not be ours to do anyway. `summary` is the whole of the prose we have,
 * so the pane lets it breathe and the outbound link is labelled "Read full
 * story at source" rather than pretending to be the article.
 *
 * $fetch NEVER throws — it always resolves `{ data, error }`. A try/catch here
 * would be dead code and, worse, an outage would render as a legitimate-looking
 * "No market news" instead of an error. The fetch checks `error` explicitly and
 * the panel distinguishes empty-from-failed in the UI.
 *
 * Loading is lazy and it does not poll: both hosts unmount this while their
 * view is closed, the feed refreshes on a 15-minute server cron, and a story is
 * immutable once published — so a client poll would burn requests for data that
 * cannot have changed. It DOES refetch when the request identity changes, which
 * is how the feed follows the host's selected market.
 *
 * AND THE PENDING STATE IS THE SAME TREE. There is no `if (loading) return
 * <FeedSkeleton/>` here any more; `pending` selects PENDING_STORIES and every
 * unknown value takes a `Loadable` inside the element that will carry it. Two
 * consequences are worth stating because the old shape got both wrong: the
 * split reading pane exists while the request is in flight (it used to appear
 * out of nothing above `lg`), and every "story has no X" fallback below —
 * summary, category, publisher, tags — is now reachable during load, so each is
 * either absent-by-construction in PENDING_STORIES or explicitly guarded on
 * `pending`. See SKELETONS.md, "the dangerous part".
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Newspaper,
  RefreshCw,
} from "lucide-react";
import $fetch from "@/lib/api";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "./news.css";
import { useTranslations } from "next-intl";

export interface MarketNewsItem {
  id: string;
  publishedAt: number;
  headline: string;
  summary: string | null;
  url: string | null;
  imageUrl: string | null;
  category: string | null;
  relatedSymbols: string[];
  source: "PROVIDER" | "MANUAL";
}

export type NewsFeedLayout = "list" | "split";

export interface NewsFeedProps {
  /**
   * Gate on the FETCH, not on the mount: a host can render this behind a closed
   * tab and pay nothing. While it is false and nothing has loaded yet the
   * component renders nothing at all — a shimmering skeleton would be claiming
   * a request is in flight when none was ever made.
   */
  active?: boolean;
  /** Defaults to the core exchange feed. */
  url?: string;
  /**
   * Query params — `limit`, and optionally `symbol` / `category`. Note that
   * `category` is an EXACT match server-side and desk items are routinely
   * stored with none, so a host that pins one drops them.
   */
  params?: Record<string, string | number | boolean>;
  /** Copy for the genuinely-empty case; the failure case has its own. */
  emptyText?: string;
  /**
   * Way out of an empty result. A scoped feed can now legitimately return
   * nothing, and a dead end with no action reads as breakage — so the host
   * supplies the escape hatch it owns (usually "drop the filter").
   */
  emptyAction?: { label: string; onClick: () => void };
  /** See the layout note above. `list` is the default that fits any host box. */
  layout?: NewsFeedLayout;
  className?: string;
}

const DEFAULT_EMPTY =
  "No market news yet. The feed fills from the configured news provider; an admin can also post desk commentary under Admin → Market News.";

/**
 * Geometry of the split layout's master column, shared with the skeleton so
 * that opening the view does not reflow a full-width list into a 360px one.
 *
 * Fixed width from `lg` up: a headline list that grows with the monitor only
 * makes longer lines of the same six words. Below `lg` it is the whole screen
 * and the reading pane replaces it.
 */
const MASTER_COL =
  "news-feed-master min-h-0 lg:w-[360px] lg:shrink-0 lg:border-r xl:w-[400px]";

/**
 * How many pending stories to paint while the request is in flight.
 *
 * A feed has no knowable length, so this reserves the SCROLLER rather than the
 * child count (SKELETONS.md, "Lists and grids"). Six split rows at ~90px each
 * (an 11px-tall `py-3` box around a three-line `text-[13px]` clamp plus the meta
 * line) is ~540px — past the fold of any terminal dock, so the master column is
 * already scrolling in both states and no scrollbar appears at resolve to
 * squeeze the headlines sideways.
 */
const PENDING_STORY_COUNT = 6;

/**
 * The six stories the component reads from before the fetch lands.
 *
 * Deleting the `status === "loading"` early return also deletes the narrowing
 * that guaranteed every render below it had real stories — `selected` in
 * particular was non-null only because that return ran first. One frozen
 * constant is the fix SKELETONS.md prescribes; the alternative is `?.` seeded
 * through forty lines of reading pane, which type-checks and still lets a
 * pending render make claims.
 *
 * Every optional field is deliberately `null`/empty so each renders as ABSENT
 * rather than as a guess: no category chip, no publisher chip, no tags, no
 * outbound CTA. A pending render must not promise a "Read full story" link it
 * has no url for.
 */
const PENDING_STORIES: MarketNewsItem[] = Array.from(
  { length: PENDING_STORY_COUNT },
  (_, index) => ({
    id: `pending-${index}`,
    publishedAt: 0,
    headline: "",
    summary: null,
    url: null,
    imageUrl: null,
    category: null,
    relatedSymbols: [],
    source: "PROVIDER",
  })
);

/**
 * Ruler strings for the two headline slots.
 *
 * Both are set in a column whose width the HOST decides — `list` targets a
 * ~200px dock, `split` a 360-400px master — so a character count is an average
 * here, not an identity, exactly as SkeletonText documents for prose. They are
 * sized to fill the clamp they sit in (`line-clamp-2` in the dock,
 * `line-clamp-3` in the master), because a one-line ruler under a two-line
 * headline is the same jump as no skeleton at all, just quieter.
 */
const HEADLINE_RULER_DOCK = 84;
const HEADLINE_RULER_MASTER = 96;

function newsAge(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ms).toLocaleDateString();
}

/** Absolute stamp for the reading pane, where "3h ago" alone is too vague. */
function newsStamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Publisher host, used as the source chip.
 *
 * `new URL()` genuinely throws on a malformed string — unlike $fetch — and the
 * url column is third-party data, so this guard is real rather than habit.
 */
function newsHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Assets the story touches, deduped BEFORE the cap.
 *
 * The tag is the React key and nothing upstream guarantees it is unique:
 * Finnhub's `related` is a raw comma list that repeats tickers, and the admin
 * form only trims and uppercases what was typed. Duplicates would also spend
 * two of the few visible slots on one asset.
 */
function storyTags(item: MarketNewsItem, cap: number): string[] {
  return Array.from(new Set(item.relatedSymbols ?? [])).slice(0, cap);
}

/**
 * Story artwork.
 *
 * A plain <img>, deliberately NOT next/image: next/image refuses any host that
 * is not listed in `images.remotePatterns`, and the hosts here are whichever
 * CDNs the wire's publishers happen to use — an open-ended, changing list that
 * cannot be maintained in next.config for a third-party feed. Every unlisted
 * host would render as a hard error instead of a picture.
 *
 * The caller passes an `aspect-*` class so the box is reserved before the bytes
 * land and the pane does not jump. On error the element removes itself rather
 * than leaving the browser's broken-image glyph — a wire story with a dead CDN
 * link is common enough that this is the normal path, not the edge case.
 *
 * Mount it with `key={src}`: the failure flag is local state, so reusing the
 * instance for the next story would hide artwork that is perfectly fine.
 */
function StoryImage({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the note above
    <img
      src={src}
      // Decorative: the headline it belongs to is always rendered beside it, so
      // an alt repeating that headline would be announced twice.
      alt=""
      loading="lazy"
      // The publisher must not learn which terminal page the reader is on.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function FeedState({
  icon: Icon,
  text,
  tone = "muted",
  action,
}: {
  icon: typeof Newspaper;
  text: string;
  tone?: "muted" | "error";
  action?: { label: string; icon?: typeof Newspaper; onClick: () => void };
}) {
  const ActionIcon = action?.icon;
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
      <Icon
        strokeWidth={1.5}
        className="h-12 w-12"
        style={{
          color: tone === "error" ? "var(--news-red)" : "var(--news-text-muted)",
          opacity: tone === "error" ? 0.7 : 0.5,
        }}
      />
      <p
        className="mt-3 max-w-md text-sm"
        style={{
          color: tone === "error" ? "var(--news-red)" : "var(--news-text-muted)",
        }}
      >
        {text}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="news-feed-button mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium"
        >
          {ActionIcon && <ActionIcon className="h-3 w-3" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

/*
 * There is no FeedSkeleton any more, and its absence is the point.
 *
 * It used to be a second tree — six `h-16` bars inside a `space-y-2 p-3` box —
 * returned INSTEAD of the feed. Two things were wrong with it and only one was
 * visible. The visible one: `h-16` is 64px and a split row is ~90px, so every
 * row moved on resolve and the six of them compounded down the column. The
 * invisible one: in `split` it painted the master column ALONE, so above `lg` a
 * whole reading pane — half the surface — materialised out of nothing the
 * moment the fetch landed.
 *
 * Both are properties of a duplicate having no mechanism to stay in sync with
 * the original. The pending state is now the SAME markup driven by
 * PENDING_STORIES, so a change to a row is a change to its skeleton.
 */

/** Age, category, publisher — the same vocabulary in both layouts. */
function StoryMeta({
  item,
  tagCap = 3,
  pending = false,
}: {
  item: MarketNewsItem;
  tagCap?: number;
  /** Renders the age as a placeholder; every other slot is already absent. */
  pending?: boolean;
}) {
  const host = newsHost(item.url);
  return (
    <div
      className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]"
      style={{ color: "var(--news-text-muted)" }}
    >
      {/* Only the age is a figure, so only the age is mono.

          A pending item's `publishedAt` is 0, which `newsAge` would render as a
          confident and enormous "20881d ago". The placeholder is the real
          shape of the value, and it sits INSIDE the `font-mono` span so the
          box it reserves is the box mono digits will occupy.

          The chips beside it stay absent while pending on purpose: category,
          publisher and tags are all genuinely optional on a real story, so
          reserving them would claim a shape half the wire does not have. The
          row is one 10px line tall either way, so nothing below it moves —
          only the chips settle sideways within their own line. */}
      <span className="font-mono">
        <Loadable loading={pending} placeholder="3h ago">
          {newsAge(item.publishedAt)}
        </Loadable>
      </span>
      {item.category && (
        <span className="news-feed-chip rounded px-1 py-0.5 uppercase">
          {item.category}
        </span>
      )}
      {/* Desk items are ours and have no publisher; wire items are the reverse,
          so one slot carries whichever of the two exists. */}
      {item.source === "MANUAL" ? (
        <span className="news-feed-chip-desk rounded px-1 py-0.5 uppercase">
          Desk
        </span>
      ) : (
        host && <span className="news-feed-chip rounded px-1 py-0.5">{host}</span>
      )}
      {storyTags(item, tagCap).map((tag) => (
        <span key={tag} className="news-feed-chip rounded px-1 py-0.5 font-mono">
          {tag}
        </span>
      ))}
    </div>
  );
}

export function NewsFeed({
  active = true,
  url = "/api/exchange/news",
  params,
  emptyText = DEFAULT_EMPTY,
  emptyAction,
  layout = "list",
  className,
}: NewsFeedProps) {
  const t = useTranslations("trade_components");
  const tCommon = useTranslations("common");
  const [feed, setFeed] = useState<{
    status: "loading" | "ready" | "failed";
    items: MarketNewsItem[];
  }>({ status: "loading", items: [] });
  // Bumped by Retry. A nonce rather than a callback so the fetch lives in
  // exactly one place — the effect — instead of two that can disagree.
  const [attempt, setAttempt] = useState(0);

  // Roving tabindex needs the DOM node to move focus with the arrow keys.
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listRef = useRef<HTMLUListElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);

  /**
   * Where focus goes after the single-column layout swaps panes, or null for
   * "leave it where it is".
   *
   * Below `lg` the pane that was on screen becomes `display:none`, and the
   * browser's answer to "the focused element just vanished" is to drop focus on
   * <body> — the reader's next Tab restarts at the top of the document, outside
   * the view they are still looking at. So each swap hands focus to the pane
   * that replaced it.
   *
   * Only the two USER actions set this. `open` also flips when the request
   * identity changes (the host switched market), and moving focus for THAT
   * would be a jump nobody asked for. Above `lg` neither swap can happen: the
   * back button is `lg:hidden`, so the tap that sets "list" is unreachable and
   * focusing that same button for "detail" is a no-op on a display:none node —
   * which is right, because up there nothing was hidden and nothing lost focus.
   */
  const focusAfterSwap = useRef<"detail" | "list" | null>(null);

  // The request identity, by VALUE. `params` is a fresh object literal on
  // every render of the host panel, so depending on it directly would refetch
  // forever; serialising it gives a string the dependency array compares
  // correctly. It also fixes what a ref would quietly break: when the panel
  // switches market the symbol changes, and the feed has to follow it. A ref
  // would keep the first symbol's stories on screen indefinitely.
  const paramsKey = JSON.stringify(params ?? { limit: 50 });
  const requestKey = `${url}|${paramsKey}`;

  // Reading state, STAMPED with the request it belongs to.
  //
  //  - `id`, never an index: a refetch replaces the array, so a remembered
  //    index would point at a different story or past the end.
  //  - `open` is which of the two panes the single-column layout shows. Above
  //    `lg` both are on screen and the classes ignore it.
  //
  // The stamp is what resets both when the scope changes. Doing it in the fetch
  // effect instead would be a setState in an effect body — a cascading render,
  // and one React now flags — whereas comparing the stamp below is a pure
  // derivation that happens in the same render as the change.
  const [reading, setReading] = useState<{
    key: string;
    id: string | null;
    open: boolean;
  }>({ key: requestKey, id: null, open: false });
  const current =
    reading.key === requestKey
      ? reading
      : { key: requestKey, id: null, open: false };
  const detailOpen = current.open;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    void (async () => {
      // $fetch NEVER throws — it resolves { data, error } — so there is no
      // catch here by design. `silent` keeps a dead feed from toasting over
      // the trading UI.
      const { data, error } = await $fetch({
        url,
        params: JSON.parse(paramsKey),
        silent: true,
      });
      if (cancelled) return;
      setFeed(
        error || !Array.isArray(data)
          ? { status: "failed", items: [] }
          : { status: "ready", items: data as MarketNewsItem[] }
      );
    })();

    // Guards the out-of-order response: switch market twice quickly and the
    // first request can land last.
    return () => {
      cancelled = true;
    };
  }, [active, url, paramsKey, attempt]);

  // No dependency array on purpose: this has to run after the render that did
  // the swap, and the thing it reacts to is a ref, which a dependency array
  // cannot see. It returns on the first line unless a swap actually asked for
  // focus, so "after every render" costs one null check.
  useEffect(() => {
    const want = focusAfterSwap.current;
    if (!want) return;
    focusAfterSwap.current = null;
    if (want === "detail") {
      backRef.current?.focus();
      return;
    }
    // The SELECTED row, not the first one: coming back out of a story has to
    // land on the story you were reading, which is also what scrolls the list
    // back down to it.
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.focus();
  });

  const load = () => setAttempt((n) => n + 1);
  const { status } = feed;
  const isSplit = layout === "split";

  // Nothing has been asked for, so there is nothing to claim. Both hosts today
  // unmount this while their view is closed, which makes the branch moot —
  // but the alternative is a skeleton that shimmers for a request that will
  // never be made, and that is a lie the next host would inherit.
  if (!active && status === "loading") return null;

  /*
   * ONE tree from here down. `pending` is the only thing that changes, and what
   * it changes is which VALUES are placeholders — never which elements exist.
   * See the FeedSkeleton headstone above for what this replaced.
   */
  const pending = status === "loading";
  const items = pending ? PENDING_STORIES : feed.items;

  if (status === "failed") {
    return (
      <div className={cn("news-feed h-full", className)}>
        <FeedState
          icon={AlertCircle}
          tone="error"
          text="Could not load market news. This is a connection or server problem — it does not mean there are no stories."
          action={{ label: tCommon("retry"), icon: RefreshCw, onClick: load }}
        />
      </div>
    );
  }

  // Empty is a RESULT, not a fault: a symbol-scoped feed truthfully has no
  // stories for most assets. `emptyAction` is how the host offers the way
  // back rather than leaving the reader at a dead end.
  //
  // `!pending` is load-bearing and it is NOT redundant with the six synthetic
  // stories above it. The early return that used to sit here made this branch
  // unreachable during load; now that it is reachable, the guard is what stops
  // a future edit to PENDING_STORIES — dropping the count to 0 to "save a
  // render", say — from turning every open of the panel into a flash of
  // "No market news yet" at a reader whose stories are one tick away.
  if (!pending && items.length === 0) {
    return (
      <div className={cn("news-feed h-full", className)}>
        <FeedState icon={Newspaper} text={emptyText} action={emptyAction} />
      </div>
    );
  }

  if (!isSplit) {
    return (
      <ul
        className={cn("news-feed h-full overflow-y-auto", className)}
        aria-busy={pending || undefined}
      >
        {items.map((item) => {
          const body = (
            <div className="flex items-start gap-2.5">
              {/* Optional by design — a good half of the wire carries no
                  artwork, and a placeholder tile for those would add a column
                  of empty boxes to a dock that has no room for one.

                  Pending is the one case where the tile IS reserved, because
                  the alternative is claiming the row has no artwork before
                  anyone has looked. It costs nothing vertically: the tile is
                  40px and the text column beside it is ~85px (two clamped
                  headline lines, two summary lines, the meta line), so the row
                  height is set by the text in both states and the thumb only
                  ever settles the copy sideways inside its own row. */}
              {pending ? (
                /* `news-feed-skeleton` rather than SkeletonBlock's own
                   `bg-muted`: news.css is imported UNLAYERED, so its rule wins
                   the cascade over the Tailwind utility and the placeholder is
                   drawn from `--news-bg-raised`/`--news-bg-elevated` — i.e. the
                   host terminal's palette via `--tp-*`, not the core one. That
                   rule also kills its own animation under
                   `prefers-reduced-motion`. Same sizing classes as the real
                   thumb, per SkeletonBlock's contract. */
                <SkeletonBlock className="news-feed-skeleton h-10 w-14 shrink-0 rounded" />
              ) : (
                item.imageUrl && (
                  <StoryImage
                    key={item.imageUrl}
                    src={item.imageUrl}
                    className="news-feed-thumb h-10 w-14 shrink-0 rounded object-cover"
                  />
                )
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  {/* Inside the real <p>, so the ruler is laid out by the same
                      `text-xs leading-snug` and clamped by the same
                      `line-clamp-2` that will hold the headline. */}
                  <p className="line-clamp-2 text-xs font-medium leading-snug">
                    <Loadable loading={pending} chars={HEADLINE_RULER_DOCK}>
                      {item.headline}
                    </Loadable>
                  </p>
                  {item.url && (
                    <ExternalLink
                      className="mt-0.5 h-3 w-3 shrink-0"
                      style={{ color: "var(--news-text-muted)" }}
                    />
                  )}
                </div>
                {/* Plain text only. The provider summary is third-party copy,
                    so rendering it as HTML would be a stored-XSS surface fed by
                    an upstream we do not control — the backend stores it
                    stripped.

                    Pending renders the same <p> with a ruler in it. Two clamped
                    lines is ~30px, and withholding them would be the
                    `hidden-while-loading` shape the scanner names: a perfect
                    skeleton everywhere else and the container still grows. */}
                {pending ? (
                  <p
                    className="mt-1 line-clamp-2 text-[11px] leading-snug"
                    style={{ color: "var(--news-text-dim)" }}
                  >
                    <SkeletonText chars={110} />
                  </p>
                ) : (
                  item.summary && (
                    <p
                      className="mt-1 line-clamp-2 text-[11px] leading-snug"
                      style={{ color: "var(--news-text-dim)" }}
                    >
                      {item.summary}
                    </p>
                  )
                )}
                <StoryMeta item={item} pending={pending} />
              </div>
            </div>
          );

          return (
            <li key={item.id} className="news-feed-row">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  // noreferrer alongside noopener: third-party story links must
                  // not leak the terminal URL as a referrer.
                  rel="noopener noreferrer"
                  className="news-feed-link block px-3 py-2"
                >
                  {body}
                </a>
              ) : (
                <div className="px-3 py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  // `findIndex` returning -1 is how "nothing chosen yet" — and "the chosen
  // story is not in this result" — both resolve to the first story, so the
  // reading pane is never empty on open and never strands on a stale id.
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === current.id)
  );
  const selected = items[selectedIndex];
  const selectedHost = newsHost(selected.url);
  const selectedTags = storyTags(selected, 8);

  // `open` only ever goes true here — arrowing through the list must not throw
  // a narrow viewport into the pane on every keystroke.
  const selectAt = (index: number, open = false) => {
    const next = items[index];
    if (!next) return;
    if (open && !current.open) focusAfterSwap.current = "detail";
    setReading({ key: requestKey, id: next.id, open: open || current.open });
  };

  // Up/down move the selection the way a mail client does. `preventDefault` is
  // what stops the arrow from ALSO scrolling the list out from under the row it
  // just focused. Enter opens the pane, which only means anything below `lg` —
  // above it the pane is already on screen and following the selection.
  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = items.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = Math.min(selectedIndex + 1, last);
        break;
      case "ArrowUp":
        next = Math.max(selectedIndex - 1, 0);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!current.open) focusAfterSwap.current = "detail";
        setReading({ ...current, open: true });
        return;
      default:
        return;
    }
    event.preventDefault();
    selectAt(next);
    // Focus, not scrollIntoView: it keeps the roving tabindex and the browser's
    // own "scroll the focused element into view" honest with one call.
    optionRefs.current[next]?.focus();
  };

  return (
    <div className={cn("news-feed flex h-full min-h-0", className)}>
      <div
        className={cn(
          MASTER_COL,
          "flex-col lg:flex",
          detailOpen ? "hidden" : "flex w-full"
        )}
      >
        <ul
          ref={listRef}
          role="listbox"
          aria-label={t("market_news_stories")}
          aria-busy={pending || undefined}
          onKeyDown={onListKeyDown}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {items.map((item, index) => {
            /* A pending row is selectable in neither sense: it is not the
               reader's choice and there is nothing to open. Suppressing it also
               keeps the roving tabindex from parking on a placeholder — with
               `aria-selected` on it a screen reader would announce an empty
               option as the current one. */
            const isSelected = !pending && index === selectedIndex;
            return (
              <li
                key={item.id}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={isSelected}
                // Roving tabindex: one stop for the whole list, then the arrow
                // keys. Making every row tabbable would put 60 stops between
                // the list and anything after it.
                tabIndex={isSelected ? 0 : -1}
                onClick={pending ? undefined : () => selectAt(index, true)}
                className={cn(
                  "news-feed-row news-feed-option px-3 py-3",
                  // `cursor-pointer` promises a click does something.
                  !pending && "cursor-pointer",
                  isSelected && "news-feed-option-selected"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Reserved while pending for the same reason as the dock
                      thumb: the row is ~90px of clamped headline plus meta, so
                      the 44px tile never drives the height and its absence
                      would only be a claim about artwork nobody has seen. */}
                  {pending ? (
                    <SkeletonBlock className="news-feed-skeleton h-11 w-16 shrink-0 rounded" />
                  ) : (
                    item.imageUrl && (
                      <StoryImage
                        key={item.imageUrl}
                        src={item.imageUrl}
                        className="news-feed-thumb h-11 w-16 shrink-0 rounded object-cover"
                      />
                    )
                  )}
                  <div className="min-w-0 flex-1">
                    {/* No summary here on purpose: the snippet is what the pane
                        beside it is for, and three lines of headline identifies
                        a story better than two plus a truncated lede. */}
                    <p className="line-clamp-3 text-[13px] font-medium leading-snug">
                      <Loadable loading={pending} chars={HEADLINE_RULER_MASTER}>
                        {item.headline}
                      </Loadable>
                    </p>
                    <StoryMeta item={item} tagCap={2} pending={pending} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail. */}
      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col",
          detailOpen ? "flex" : "hidden lg:flex"
        )}
      >
        {/* Back affordance. Only reachable below `lg`, where it is the single
            way out of the pane — above it the list never left the screen. */}
        <div className="news-feed-bar flex items-center px-3 py-2 lg:hidden">
          <button
            ref={backRef}
            type="button"
            onClick={() => {
              focusAfterSwap.current = "list";
              setReading({ ...current, open: false });
            }}
            className="news-feed-button inline-flex cursor-pointer items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("all_stories")}
          </button>
        </div>

        {/* Keyed by story so each selection gets a FRESH scroll container. One
            reused <article> keeps its scrollTop across a selection change, so
            picking a story after scrolling through a long one drops the reader
            partway down — usually past the end of the shorter story, i.e. onto
            blank space that reads as a pane that failed to load. A key is the
            whole fix; a scroll-reset effect would be the same thing with more
            moving parts. */}
        <article
          key={selected.id}
          aria-busy={pending || undefined}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {/* Wide enough for the artwork and the headline to feel like a page,
              with the prose itself held to a measure below — a summary set
              across a 3000px pane is one long line nobody can track back. */}
          <div className="mx-auto w-full max-w-4xl px-5 py-6 lg:px-10 lg:py-8">
            {/* The hero is the ONE box deliberately left unreserved while
                pending, and it is the opposite call from the two row thumbs.
                At `max-w-4xl` a 16/9 hero is 504px tall. Roughly half the wire
                carries no artwork, so reserving it would collapse 504px on
                every second story — an order of magnitude worse than the 504px
                it would save on the other half, and it would be asserting "this
                story has a picture" before anyone has seen one. The rest of the
                pane is skeletoned in place, so the reader still gets the shape
                of an article rather than an empty column. */}
            {selected.imageUrl && (
              <StoryImage
                key={selected.imageUrl}
                src={selected.imageUrl}
                className="news-feed-hero mb-6 aspect-[16/9] w-full rounded-lg object-cover"
              />
            )}

            <h3 className="text-xl font-semibold leading-tight lg:text-2xl">
              <Loadable loading={pending} chars={48}>
                {selected.headline}
              </Loadable>
            </h3>

            <div
              className="mt-3 flex flex-wrap items-center gap-2 text-[11px]"
              style={{ color: "var(--news-text-muted)" }}
            >
              {/* PENDING_STORIES carry `publishedAt: 0`, which these two would
                  render as "1 Jan 1970, 00:00 · 20881d ago" — the epoch stated
                  with total confidence. Each placeholder is the real shape of
                  its own value and sits inside its own `font-mono` span, so
                  both reserve exactly the mono box the stamp will take. */}
              <span className="font-mono">
                <Loadable loading={pending} placeholder="1 Jan 2026, 09:30">
                  {newsStamp(selected.publishedAt)}
                </Loadable>
              </span>
              <span aria-hidden>·</span>
              <span className="font-mono">
                <Loadable loading={pending} placeholder="3h ago">
                  {newsAge(selected.publishedAt)}
                </Loadable>
              </span>
              {selected.category && (
                <span className="news-feed-chip rounded px-1.5 py-0.5 uppercase">
                  {selected.category}
                </span>
              )}
              {selected.source === "MANUAL" ? (
                <span className="news-feed-chip-desk rounded px-1.5 py-0.5 uppercase">
                  Desk
                </span>
              ) : (
                selectedHost && (
                  <span className="news-feed-chip rounded px-1.5 py-0.5">
                    {selectedHost}
                  </span>
                )
              )}
            </div>

            {/* Plain text only — third-party copy rendered as HTML would be a
                stored-XSS surface fed by an upstream we do not control; the
                backend stores it stripped. `whitespace-pre-line` keeps the
                paragraph breaks the stripper left behind.

                `pending` is checked FIRST and that ordering is the whole point:
                a pending story has `summary: null`, so without this branch the
                pane would print "This story arrived without a summary — the
                headline is all the provider sent" about a story that has not
                been fetched. That is the same class of defect as the epoch
                stamp above, only in prose, and it is the one a reader would
                actually believe. */}
            {pending ? (
              <p
                className="mt-6 max-w-[70ch] text-sm leading-relaxed"
                style={{ color: "var(--news-text-dim)" }}
              >
                {/* Three lines of the 70ch measure — a wire summary is
                    typically two to four sentences, and the ruler is set in the
                    same `text-sm leading-relaxed` the real copy uses, so its
                    height is computed rather than guessed. */}
                <SkeletonText chars={200} />
              </p>
            ) : selected.summary ? (
              <p
                // `text-sm`, not an arbitrary 15px: this component mounts in
                // BOTH terminals, and each scopes the user's Text Size setting
                // to its own allow-list of font utilities (trading-pro.css and
                // fx-terminal.css). Neither lists 15px, so a size off the list
                // is the one piece of copy on the page that ignores the
                // setting — and this is the longest piece of copy on it.
                className="mt-6 max-w-[70ch] whitespace-pre-line text-sm leading-relaxed"
                style={{ color: "var(--news-text-dim)" }}
              >
                {selected.summary}
              </p>
            ) : (
              <p
                className="mt-6 text-sm"
                style={{ color: "var(--news-text-muted)" }}
              >
                {t("this_story_arrived_without_a_summary")}
              </p>
            )}

            {selectedTags.length > 0 && (
              <div
                className="mt-6 flex flex-wrap items-center gap-1.5 text-[11px]"
                style={{ color: "var(--news-text-muted)" }}
              >
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="news-feed-chip rounded px-1.5 py-0.5 font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {selected.url && (
              <div className="mt-8">
                <a
                  href={selected.url}
                  target="_blank"
                  // noreferrer alongside noopener: third-party story links must
                  // not leak the terminal URL as a referrer.
                  rel="noopener noreferrer"
                  className="news-feed-cta inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  {t("read_full_story_at_source")}
                  <ExternalLink className="h-4 w-4" />
                </a>
                {/* Says out loud what the header comment explains: the feed
                    carries a summary, so the reader knows the link is where the
                    rest is rather than assuming the page failed to load it. */}
                <p
                  className="mt-2 text-[11px]"
                  style={{ color: "var(--news-text-muted)" }}
                >
                  {t("the_provider_sends_a_summary_not_the_article_body")}
                  {selectedHost ? t("has_the_rest", { selectedHost: String(selectedHost) }) : "."}
                </p>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}

export default NewsFeed;
