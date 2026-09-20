"use client";

/**
 * NFT hero — Obsidian.
 *
 * The previous version stacked two animated blur orbs, a `bg-clip-text`
 * "gradient" that ran `from-primary via-primary to-primary` (three stops of one
 * colour — a gradient that cannot gradate), and a grid drawn in literal
 * `rgba(255,255,255,0.05)`, which is invisible on a white ground in light mode.
 * The ground now comes from `LandingShell` on the page, and the illustration
 * carries the visual weight the orbs were standing in for.
 */

import { useState, useEffect } from "react";
import { Search, Sparkles } from "lucide-react";
import { useNftStore } from "@/store/nft/nft-store";
import { useTranslations } from "next-intl";
import { LandingHero } from "@/components/landing";
import { NftArt } from "@/components/landing/art";

export default function HeroSection() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const { fetchMarketplaceStats } = useNftStore();
  const [heroSearchQuery, setHeroSearchQuery] = useState("");

  useEffect(() => {
    fetchMarketplaceStats("all");
  }, [fetchMarketplaceStats]);

  const handleHeroSearch = () => {
    if (!heroSearchQuery.trim()) return;
    // The navbar owns the search UI; the hero field just hands it the query.
    window.dispatchEvent(new CustomEvent("nft-hero-search", { detail: { query: heroSearchQuery } }));
  };

  return (
    <LandingHero
      eyebrow={t("discover_the_future_of_digital_art")}
      eyebrowIcon={Sparkles}
      title={t("discover_collect")}
      highlight="& Sell Extraordinary NFTs"
      subtitle={`${t("the_worlds_first_and_largest_digital")} ${t("buy_sell_and_discover_exclusive_digital_items")}`}
      actions={[
        { label: t("explore_marketplace"), href: "/nft/marketplace" },
        { label: t("create_nft"), href: "/nft/create", variant: "secondary" },
      ]}
      visual={<NftArt />}
      footnote={
        <div className="flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-card p-2">
          <Search className="ml-2 h-4 w-4 shrink-0 text-subtle-foreground" />
          <input
            type="text"
            placeholder={tCommon("search_nfts_collections_or_creators")}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
            value={heroSearchQuery}
            onChange={(e) => setHeroSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleHeroSearch()}
          />
          <button
            type="button"
            onClick={handleHeroSearch}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tCommon("search")}
          </button>
        </div>
      }
    />
  );
}
