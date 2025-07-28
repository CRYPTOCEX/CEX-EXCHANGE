"use client";
import { useEffect } from "react";
import { useP2PStore } from "@/store/p2p/p2p-store";

import { OffersHero } from "./components/offers-hero";
import { OffersCTA } from "./components/offers-cta";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";

export function OffersPageClient() {
  // Get state and actions from the P2P store
  const { stats, isLoadingP2PStats, fetchP2PStats } = useP2PStore();

  // Initial data fetch
  useEffect(() => {
    fetchP2PStats();
  }, []);

  // Format trader count with commas
  const formatOfferCount = (count: number) => {
    return count ? count.toLocaleString() : "0";
  };

  return (
    <div className="flex w-full flex-col" style={{ minHeight: 'calc(100vh - 232px)' }}>
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {/* Hero Section */}
        <OffersHero
          totalOffers={stats?.totalOffers || 0}
          isLoadingP2PStats={isLoadingP2PStats}
          formatOfferCount={formatOfferCount}
        />

        <DataTable
          apiEndpoint="/api/p2p/offer"
          model="p2pOffer"
          pageSize={10}
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
