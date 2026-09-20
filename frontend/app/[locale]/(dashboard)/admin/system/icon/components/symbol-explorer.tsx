"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Download, ImageOff, Loader2, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { BUCKETS, BUCKET_SLOT, OUTCOMES, OUTCOME_TONE, count, type IconReport } from "./types";
import { useBucketLabel, useOutcomeLabel } from "./use-labels";

export type ExplorerQuery = {
  search: string;
  bucket: string;
  outcome: string;
  sort: string;
  perPage: number;
  page: number;
};

const PER_PAGE_OPTIONS = [25, 50, 100, 200];

/**
 * The work queue.
 *
 * EVERYTHING HERE IS SERVER-SIDE. The catalog runs to thousands of symbols and
 * the page used to receive a fixed slice of the first 250 sorted worst-first,
 * with no way to reach row 251 — so most of the queue was not merely unpaged,
 * it was unreachable, and the "showing the first N of M" line was the only
 * acknowledgement of it. Search, filter, sort and page are all query params on
 * the report route now; the browser holds one page at a time.
 *
 * The scan behind it is a process spawn, so the route serves paging from a
 * cached report — see its comments. That is what makes typing in this search
 * box cheap.
 */
export function SymbolExplorer({
  report,
  loading,
  fetching,
  query,
  searchInput,
  onSearchInput,
  onQuery,
  onResetFilters,
  onFetchSymbol,
  fetchingSymbol,
  canFetch,
}: {
  report: IconReport | null;
  /** First load: nothing to show yet. */
  loading: boolean;
  /** A page/filter change: the previous page stays put, dimmed. */
  fetching: boolean;
  query: ExplorerQuery;
  searchInput: string;
  onSearchInput: (v: string) => void;
  onQuery: (patch: Partial<ExplorerQuery>) => void;
  onResetFilters: () => void;
  onFetchSymbol: (symbol: string) => void;
  fetchingSymbol: string | null;
  canFetch: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const bucketLabel = useBucketLabel();
  const outcomeLabel = useOutcomeLabel();

  const total = report?.filteredCount ?? 0;
  const page = report?.page ?? query.page;
  const pageCount = report?.pageCount ?? 1;
  const from = total === 0 ? 0 : (page - 1) * (report?.perPage ?? query.perPage) + 1;
  const to = Math.min(from + (report?.items?.length ?? 0) - 1, total);

  const filtered =
    query.search.trim() !== "" || query.bucket !== "all" || query.outcome !== "all";

  const pages = useMemo(() => pageWindow(page, pageCount), [page, pageCount]);

  /**
   * Put the top of the list back on screen after a page change.
   *
   * The pager lives at the BOTTOM, and at 100 or 200 rows a page is several
   * screens tall — so clicking Next left the operator looking at rows 90-100 of
   * the new page, which reads as "nothing happened". DOM only, no state, so
   * this is not the cascading render the set-state-in-effect rule is about.
   */
  const cardRef = useRef<HTMLDivElement>(null);
  const lastPage = useRef(page);
  useEffect(() => {
    if (lastPage.current === page) return;
    lastPage.current = page;
    // `behavior: "smooth"` is a JS argument, so the CSS reduced-motion rule
    // cannot reach it — ask the media query directly.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    cardRef.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }, [page]);

  return (
    <Card ref={cardRef} className="scroll-mt-header-clear overflow-hidden">
      {/* ---- header ------------------------------------------------------ */}
      <div className="flex flex-col gap-1 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-none">{t("symbols_needing_an_icon")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {/* An empty QUEUE and an empty FILTER are different sentences. The
                filtered case used to claim every currency had an icon, which is
                the opposite of what a search returning nothing means. */}
            {report && report.itemCount === 0
              ? t("every_currency_has_an_icon")
              : total === 0
                ? t("no_symbols_match_these_filters")
                : t("showing_range_of_total", {
                    from: count(from),
                    to: count(to),
                    total: count(total),
                  })}
          </p>
        </div>
        {filtered && (
          <Button size="xs" variant="ghost" onClick={onResetFilters} className="self-start">
            <X className="mr-1 size-3" />
            {tCommon("clear_filters")}
          </Button>
        )}
      </div>

      {/* ---- toolbar ----------------------------------------------------- */}
      <div className="space-y-3 border-b border-border bg-muted/20 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => onSearchInput(e.target.value)}
              placeholder={`${t("search_symbols_sources_details")}…`}
              className="pl-8 pr-8 text-sm"
            />
            {searchInput && (
              <Button
                size="icon-xs"
                variant="ghost"
                className="absolute right-1 top-1"
                aria-label={tCommon("clear")}
                onClick={() => onSearchInput("")}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>

          <Select value={query.bucket} onValueChange={(v) => onQuery({ bucket: v, page: 1 })}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_asset_classes")}</SelectItem>
              {BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {bucketLabel(b)}
                  {report?.byBucket?.[b] ? ` (${count(report.byBucket[b])})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={query.sort} onValueChange={(v) => onQuery({ sort: v, page: 1 })}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-44">
              <SlidersHorizontal className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outcome">{t("sort_worst_first")}</SelectItem>
              <SelectItem value="symbol">{tCommon("symbol")}</SelectItem>
              <SelectItem value="bucket">{tCommon("asset_class")}</SelectItem>
              <SelectItem value="source">{tCommon("source")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Outcome facets. The counts are over the WHOLE report, not the
            current filter, so a chip does not change its own number the moment
            you press it. */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <FacetChip
            active={query.outcome === "all"}
            label={tCommon("all")}
            value={count(report?.itemCount ?? 0)}
            onClick={() => onQuery({ outcome: "all", page: 1 })}
          />
          {OUTCOMES.filter((o) => (report?.byOutcome?.[o] ?? 0) > 0).map((o) => (
            <FacetChip
              key={o}
              active={query.outcome === o}
              label={outcomeLabel(o)}
              value={count(report?.byOutcome?.[o] ?? 0)}
              tone={OUTCOME_TONE[o]}
              onClick={() => onQuery({ outcome: o, page: 1 })}
            />
          ))}
        </div>
      </div>

      {/* ---- rows -------------------------------------------------------- */}
      {loading ? (
        <RowSkeletons rows={Math.min(query.perPage, 10)} />
      ) : !report?.items?.length ? (
        <EmptyState
          size="lg"
          icon={filtered ? <Search /> : <ImageOff />}
          title={filtered ? t("no_symbols_match_these_filters") : t("every_currency_has_an_icon")}
          description={
            filtered ? t("try_a_different_search_or_widen_the_filters") : undefined
          }
          action={
            filtered ? (
              <Button size="sm" variant="outline" onClick={onResetFilters}>
                {tCommon("clear_filters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className={cn(
            "overflow-x-auto transition-opacity",
            fetching && "pointer-events-none opacity-50"
          )}
          aria-busy={fetching}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="w-12 py-2.5 pl-4 pr-2 text-xs font-medium">
                  <span className="sr-only">{tCommon("icon")}</span>
                </th>
                <th className="py-2.5 pr-4 text-xs font-medium">{tCommon("symbol")}</th>
                <th className="hidden py-2.5 pr-4 text-xs font-medium sm:table-cell">
                  {t("class")}
                </th>
                <th className="py-2.5 pr-4 text-xs font-medium">{tCommon("outcome")}</th>
                <th className="hidden py-2.5 pr-4 text-xs font-medium md:table-cell">
                  {tCommon("source")}
                </th>
                <th className="hidden py-2.5 pr-4 text-xs font-medium lg:table-cell">
                  {t("detail")}
                </th>
                <th className="w-24 py-2.5 pr-4 text-right text-xs font-medium">
                  <span className="sr-only">{tCommon("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => (
                <tr
                  key={item.symbol}
                  className="group border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="py-2 pl-4 pr-2">
                    <SymbolIcon
                      symbol={item.symbol}
                      reason={item.reason}
                      outcome={item.outcome}
                      stamp={report.generatedAt}
                      alt={t("no_icon_file_on_disk")}
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <div className="font-mono font-medium">{item.symbol}</div>
                    {item.raw && item.raw.toLowerCase() !== item.symbol.toLowerCase() && (
                      <div className="text-xs text-muted-foreground">{item.raw}</div>
                    )}
                  </td>
                  <td className="hidden py-2 pr-4 sm:table-cell">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          BUCKET_SLOT[item.bucket] ?? "bg-muted-foreground/40"
                        )}
                        aria-hidden
                      />
                      {bucketLabel(item.bucket)}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge
                      tone={OUTCOME_TONE[item.outcome] ?? "neutral"}
                      appearance="soft"
                      size="xs"
                      className="whitespace-nowrap"
                    >
                      {outcomeLabel(item.outcome)}
                    </Badge>
                  </td>
                  <td className="hidden py-2 pr-4 font-mono text-xs text-muted-foreground md:table-cell">
                    {item.source || "—"}
                  </td>
                  <td
                    className="hidden max-w-[18rem] truncate py-2 pr-4 text-xs text-muted-foreground lg:table-cell"
                    title={item.detail || ""}
                  >
                    {item.detail || "—"}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {item.outcome !== "written" && canFetch && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={Boolean(fetchingSymbol)}
                            onClick={() => onFetchSymbol(item.symbol)}
                            aria-label={t("fetch_this_icon")}
                            /* Revealed on hover/focus: a column of 25 identical
                               download glyphs is noise, and the row it belongs
                               to is the only context that makes it mean
                               anything. Pointer-coarse devices have no hover,
                               so they keep it visible; focus-within keeps it
                               reachable by keyboard, and the row that is
                               actively fetching stays visible on its own. */
                            className={cn(
                              "transition-opacity",
                              "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
                              fetchingSymbol === item.symbol && "sm:opacity-100"
                            )}
                          >
                            {fetchingSymbol === item.symbol ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("fetch_this_icon")}</TooltipContent>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- footer ------------------------------------------------------
          Shown whenever there are rows, not only when there is more than one
          page: narrowing a search down to nine results must not take the
          rows-per-page control away with it, or there is no way back to a
          bigger page without first clearing the search. Only the pager itself
          is conditional. */}
      {report?.items?.length ? (
        <div className="flex flex-col gap-3 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tCommon("rows_per_page")}</span>
            <Select
              value={String(query.perPage)}
              onValueChange={(v) => onQuery({ perPage: Number(v), page: 1 })}
            >
              <SelectTrigger className="h-8 w-[4.5rem] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {t("page_of_pages", { page: count(page), pages: count(pageCount) })}
            </span>
          </div>

          <Pagination
            className={cn("mx-0 w-auto justify-end", pageCount <= 1 && "hidden")}
          >
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                  onClick={() => onQuery({ page: page - 1 })}
                />
              </PaginationItem>
              {pages.map((p, i) =>
                p === "…" ? (
                  <PaginationItem key={`gap-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p} className="hidden sm:block">
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => onQuery({ page: p })}
                      className="tabular-nums"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  aria-disabled={page >= pageCount}
                  className={cn(page >= pageCount && "pointer-events-none opacity-50")}
                  onClick={() => onQuery({ page: page + 1 })}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function FacetChip({
  active,
  label,
  value,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  value: string;
  tone?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted/60"
      )}
    >
      {tone && (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            tone === "success" && "bg-success",
            tone === "primary" && "bg-primary",
            tone === "warning" && "bg-warning",
            tone === "destructive" && "bg-destructive",
            tone === "neutral" && "bg-muted-foreground"
          )}
          aria-hidden
        />
      )}
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-mono tabular-nums opacity-70">{value}</span>
    </button>
  );
}

/**
 * Only request a file the report says is actually there.
 *
 * Every row in this table is a symbol with no usable icon, so an `<img>` per
 * row fired one request per row that was 404 BY CONSTRUCTION — and a missing
 * `.webp` is not a cheap static miss: it falls through to the App Router and
 * renders a whole HTML not-found document (50-80ms each in dev, vs 2.6ms for a
 * file that exists). That flood is what made the page crawl.
 *
 * `reason` comes straight from the scan: "absent" means nothing is on disk,
 * while "placeholder"/"overwrite" mean a file IS there. `outcome === "written"`
 * covers the tick between a sync writing the file and the re-read that
 * recomputes `reason`.
 *
 * Plain img, not next/image: these files change on disk and the optimizer
 * caches for 60 days. `key` carries the report timestamp so a sync that just
 * wrote this icon remounts the node — hiding it imperatively on error left it
 * hidden forever, so a successful fetch still showed a blank cell. `?v=`
 * defeats the browser's own negative cache.
 */
function SymbolIcon({
  symbol,
  reason,
  outcome,
  stamp,
  alt,
}: {
  symbol: string;
  reason: string;
  outcome: string;
  stamp: string;
  alt: string;
}) {
  if (reason === "absent" && outcome !== "written") {
    return (
      /* This file reached for lucide directly back when the rest of the app
         painted glyphs with @iconify/react, which fetched its set from a CDN at
         runtime. That is now true everywhere — see components/ui/icon — so this
         is just an ordinary local icon. */
      <span
        className="flex size-7 items-center justify-center rounded-full border border-dashed border-border-strong bg-muted/40 text-muted-foreground"
        title={alt}
      >
        <ImageOff className="size-3.5" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the note above.
    <img
      key={`${symbol}-${stamp}`}
      src={`/img/crypto/${symbol}.webp?v=${encodeURIComponent(stamp)}`}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      decoding="async"
      className="size-7 rounded-full bg-muted"
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
      onLoad={(e) => {
        e.currentTarget.style.visibility = "visible";
      }}
    />
  );
}

function RowSkeletons({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="hidden h-4 w-28 sm:block" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="ml-auto hidden h-4 w-40 lg:block" />
        </div>
      ))}
    </div>
  );
}

/**
 * 1 … 7 8 [9] 10 … 42. Always shows the first and last page so the ends of the
 * range are one click away rather than a hold on Next.
 *
 * The middle band is a FIXED three slots, widened at the ends rather than
 * truncated. The naive "current ± 1, clamped" version collapses to `1 2 … 10`
 * on page 1 — the one page every visitor lands on, and the one place a pager
 * has to look like it can take you somewhere.
 */
function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  let start = Math.max(2, page - 1);
  let end = Math.min(pageCount - 1, page + 1);
  if (page <= 3) {
    start = 2;
    end = 4;
  } else if (page >= pageCount - 2) {
    start = pageCount - 3;
    end = pageCount - 1;
  }

  const out: (number | "…")[] = [1];
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 1) out.push("…");
  out.push(pageCount);
  return out;
}
