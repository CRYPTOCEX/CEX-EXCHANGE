"use client";
import { useEffect } from "react";
import { useP2PStore } from "@/store/p2p/p2p-store";

import { OffersHero } from "./components/offers-hero";
import { OffersCTA } from "./components/offers-cta";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";

export function OffersPageClient() {
  // Get state and actions from the P2P store
  const { stats, isLoadingP2PStats, fetchP2PStats } = useP2PStore();
  const columns = useColumns();

  // Initial data fetch
  useEffect(() => {
    fetchP2PStats();
  }, []);

  return (
    <div className="flex w-full flex-col min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero section - Using HeroSection component */}
      <OffersHero
        totalOffers={stats?.totalOffers || 0}
        isLoadingP2PStats={isLoadingP2PStats}
      />

      <main className="container mx-auto py-12 space-y-12">
        <DataTable
          apiEndpoint="/api/p2p/offer"
          model="p2pOffer"
          pageSize={12}
          canView={true}
          viewLink="/p2p/offer/[id]"
          title="Offers"
          itemTitle="Offer"
          columns={columns}
          isParanoid={false}
        />

        {/* Call to Action Section */}
        <OffersCTA />
      </main>
    </div>
  );
}
