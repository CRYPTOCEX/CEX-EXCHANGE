"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Import our components
import { LoadingState } from "./components/loading-state";
import { ErrorState } from "./components/error-state";
import { OfferHero } from "./components/offer-hero";
import { OfferDetailsTabs } from "./components/offer-details-tabs";
import { SellerInformation } from "./components/seller-information";
import { TradeForm } from "./components/trade-form";
import { Link, useRouter } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { useConfigStore } from "@/store/config";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { PlatformDisabledBanner } from "../../components/platform-disabled-banner";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export default function OfferDetailsClient() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const params = useParams();
  const offerId = params.id as string;

  const router = useRouter();
  const { toast } = useToast();
  const { settings } = useConfigStore();
  const { isLoadingOfferById, offerByIdError, fetchOfferById } = useP2PStore();

  const [offer, setOffer] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(true);

  const { user } = useUserStore();
  const isOwner = user?.id === offer?.userId;

  // Fetch offer details
  useEffect(() => {
    async function loadOfferDetails() {
      if (!offerId) return;

      setLocalLoading(true);
      try {
        const offerData = await fetchOfferById(offerId);

        if (!offerData) {
          router.push("/p2p/offer?error=offer-not-found");
          return;
        }

        // Set the raw offer data from API
        setOffer(offerData);
      } catch (err) {
        console.error("Error loading offer details:", err);
        toast({
          title: "Error",
          description: "Failed to load offer details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLocalLoading(false);
      }
    }

    loadOfferDetails();
  }, [offerId, fetchOfferById]);

  // Loading state
  if (localLoading || isLoadingOfferById) {
    return <LoadingState />;
  }

  // Error state - no offer found
  if (!offer) {
    return <ErrorState />;
  }

  // Error state from store
  if (offerByIdError) {
    return (
      <ErrorState title={t("error_loading_offer")} description={offerByIdError} />
    );
  }

  // Parse trade settings to get time limit
  const tradeSettings =
    typeof offer.tradeSettings === "string"
      ? JSON.parse(offer.tradeSettings)
      : offer.tradeSettings || {};

  // If owner is viewing their own offer, show what THEY are doing
  // Otherwise show what the OTHER person would do
  const actionText = isOwner
    ? offer.type === "BUY" ? "Buy" : "Sell"  // Owner sees their own action
    : offer.type === "BUY" ? "Sell" : "Buy"; // Others see opposite action
  const timeLimit =
    tradeSettings.autoCancel || settings.p2pDefaultPaymentWindow || 15;

  // Check if trading is disabled
  if (!settings.p2pEnabled) {
    return (
      <div className="container max-w-3xl mx-auto py-12">
        <PlatformDisabledBanner />

        <Link href="/p2p/offer" className="mt-6">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon('back_to_offerings')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <OfferHero
        offer={offer}
        actionText={actionText}
        timeLimit={timeLimit}
        isOwner={isOwner}
      />

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Offer details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Offer Details Card */}
              <OfferDetailsTabs offer={offer} timeLimit={timeLimit} />

              {/* Seller Information Card */}
              <SellerInformation seller={offer.user} currency={offer.currency} />
            </div>

            {/* Right column - Trade form and help */}
            <div className="space-y-6">
              {/* Trade Form */}
              <TradeForm
                offer={offer}
                actionText={actionText}
                timeLimit={timeLimit}
                settings={settings}
                isOwner={isOwner}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
