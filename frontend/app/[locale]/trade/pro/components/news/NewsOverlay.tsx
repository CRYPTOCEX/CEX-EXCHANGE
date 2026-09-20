"use client";

/**
 * NewsOverlay — market news as a full view.
 *
 * News started as a tab inside the orders dock, which is the wrong home for it:
 * that dock is ~200px tall and holds tables of your own positions. A story is
 * prose, and two clamped lines in a 200px box shows about four headlines. Here
 * it gets the whole workspace, the same way the Pattern Library does.
 *
 * The feed itself is the shared `trade/components/news/NewsFeed` — the same
 * component the forex terminal's dock can use — so the layout choice lives
 * here and the data contract lives in one place.
 */

import { useState } from "react";
import { Newspaper, X } from "lucide-react";
import {
  FilterChip,
  OverlayHeader,
  OverlayIconButton,
} from "@/app/[locale]/binary/components/binary-ui";
import { NewsFeed } from "../../../components/news/NewsFeed";
import { TerminalOverlay } from "../overlays/TerminalOverlay";
import { useTranslations } from "next-intl";

export interface NewsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current market — scopes the feed to stories about its base asset. */
  symbol?: string;
}

type Scope = "symbol" | "all";

export default function NewsOverlay({ isOpen, onClose, symbol }: NewsOverlayProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  // Wire stories are filed against the majors, so a symbol scope is a genuine
  // NARROWING that can come back empty — hence an explicit "All crypto" escape
  // hatch rather than silently deciding for the reader.
  const [scope, setScope] = useState<Scope>("all");

  // A blank/absent symbol must never produce a chip with no label, nor a
  // `symbol=` query the endpoint would split into empty legs.
  const trimmedSymbol = symbol?.trim() ? symbol.trim() : undefined;
  const scoped = scope === "symbol" && trimmedSymbol !== undefined;

  // The base asset is what a story is about: nobody files copy against USDT, so
  // naming the quote in the empty state would read as a bug in the filter.
  const baseAsset = trimmedSymbol?.split("/")[0] ?? "";

  // Serialised by NewsFeed to key its fetch, so the two shapes differ by value
  // and switching scope genuinely refetches. `limit` is inside the endpoint's
  // MAX_LIMIT of 100.
  //
  // NO `category` FILTER, deliberately. This used to pin `category=crypto`,
  // which looked free because the sync only ever pulls the crypto wire. It is
  // not: the endpoint does a literal `where.category = 'crypto'`, and a desk
  // item's category is a free-text admin field that is NULL when left blank —
  // so that one param silently dropped exactly the rows the empty state tells
  // the operator to go and write, plus any provider row the vendor filed under
  // a different label. Everything in `marketNews` is already this terminal's
  // feed; there is nothing in it to filter OUT.
  const params: Record<string, string | number> =
    scoped && trimmedSymbol
      ? { limit: 60, symbol: trimmedSymbol }
      : { limit: 60 };

  return (
    <TerminalOverlay isOpen={isOpen} onClose={onClose}>
      <OverlayHeader
        icon={Newspaper}
        tone="primary"
        title={tCommon("market_news")}
        subtitle={t("latest_stories_from_the_market_data")}
        actions={
          <>
            {/* Active state follows what the feed is ACTUALLY showing, not the
                raw scope: with scope="symbol" and no symbol to scope by, the
                feed is unfiltered, so "All crypto" is the honest selection. */}
            {/* `shrink-0 whitespace-nowrap`: the chips are flex children of the
                header's action row, so without them "All crypto" breaks over
                two lines — and a long eco pair squeezes its neighbours — as
                soon as the workspace is narrow. The title wraps instead, which
                is the right thing to give up. */}
            <FilterChip
              active={!scoped}
              onClick={() => setScope("all")}
              className="shrink-0 whitespace-nowrap"
            >
              {t("all_crypto")}
            </FilterChip>
            {trimmedSymbol && (
              <FilterChip
                active={scoped}
                onClick={() => setScope("symbol")}
                className="shrink-0 whitespace-nowrap font-mono"
              >
                {trimmedSymbol}
              </FilterChip>
            )}
            <OverlayIconButton icon={X} onClick={onClose} label={tCommon("close_news")} />
          </>
        }
      />

      {/* `overflow-hidden`, not `overflow-y-auto`: NewsFeed owns its own
          scrolling — in `split` there are two independent scrollers — so a
          scrolling parent here would nest them inside a third, dead one.

          Nothing else is imposed on the feed any more. This used to be a
          centred `max-w-4xl` column with a stack of arbitrary-variant density
          overrides reaching into `.news-feed-row`; on a wide monitor that left
          most of the workspace blank while still clamping every story to two
          lines, and the overrides silently stopped applying whenever the feed's
          markup moved. `layout="split"` asks for the shape instead, and the
          component sizes itself. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <NewsFeed
          active={isOpen}
          layout="split"
          params={params}
          // A scoped feed returning nothing is a true answer, not a failure, so
          // it says which asset it found nothing for and offers the one action
          // that fixes it. Unscoped falls through to NewsFeed's own copy, which
          // is about the provider not being configured.
          emptyText={
            scoped
              ? t("no_recent_stories_mention_the_feed", { baseAsset: String(baseAsset) })
              : undefined
          }
          emptyAction={
            scoped
              ? {
                  label: t("show_all_crypto_stories"),
                  onClick: () => setScope("all"),
                }
              : undefined
          }
        />
      </div>
    </TerminalOverlay>
  );
}
