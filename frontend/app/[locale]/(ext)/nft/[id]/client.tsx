"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useNftStore } from "@/store/nft/nft-store";
import { useWalletStore } from "@/store/nft/wallet-store";
import { purchaseNFT } from "@/utils/nft-purchase";
import Image from "next/image";
import { getNftImageUrl } from "@/lib/nft-utils";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/utils/format";
import { publicShortName } from "@/utils/display-name";
import { MoneyFigure } from "@/components/ui/money-figure";
import { nftWebSocketService } from "@/services/nft-ws";
import { CurrencyIcon } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { toast } from "sonner";
import { Link } from "@/i18n/routing";
import {
  Heart,
  Share2,
  ShoppingCart,
  Gavel,
  Tag,
  Eye,
  ExternalLink,
  Clock,
  TrendingUp,
  Users,
  Activity,
  Shield,
  Award,
  Copy,
  RefreshCw,
  Wifi,
  WifiOff,
  Send,
} from "lucide-react";

interface NFTDetailClientProps {
  initialToken: any;
}

interface Bid {
  id: string;
  amount: number;
  currency: string;
  bidderId: string;
  createdAt: string;
}

interface Offer {
  id: string;
  amount: number;
  currency: string;
  offererId: string;
  userId: string;
  sellerId?: string | null;
  status: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  acceptedAt?: string | null;
  expiresAt?: string | null;
  message?: string | null;
  /* `username` and `name` were missing from this shape, so the only names the
     type admitted were the two off the identity document — and the byline
     below rendered exactly those. */
  user?: {
    id: string;
    username?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  tokenId: string;
  createdAt: string;
}

export default function NFTDetailClient({ initialToken }: NFTDetailClientProps) {
  const t = useTranslations("ext_nft");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const { user } = useUserStore();
  // Two features live on this page: buying (buy now / bid / offer) and moving
  // an owned token out (transfer). They are separately grantable, so each
  // action carries its own gate — browsing the token stays public.
  const buyGate = useKycGate("buy_nft");
  const transferGate = useKycGate("transfer_nft");
  const { toggleFavorite } = useNftStore();
  const { isConnected: isWalletConnected } = useWalletStore();

  const [token, setToken] = useState(initialToken);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Trading state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [transferAddress, setTransferAddress] = useState("");

  // Real-time data
  const [currentListing, setCurrentListing] = useState(token.currentListing);
  const [bids, setBids] = useState<Bid[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  // The operator-configured window an accepted offer has to be confirmed in
  // before the sale is unwound. Comes from the offers endpoint so the deadline
  // shown here is the one the sweep actually enforces.
  const [confirmGraceHours, setConfirmGraceHours] = useState(24);
  const [confirmHashes, setConfirmHashes] = useState<Record<string, string>>({});
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  // Fetch additional data
  const fetchTokenDetails = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/token/${token.id}`,
      });

      if (!error && data) {
        setToken(data);
        setCurrentListing(data.currentListing);
      }
    } catch (error) {
      console.error("Error fetching token details:", error);
    }
  }, [token.id]);

  const fetchBids = useCallback(async () => {
    if (!currentListing?.id) return;

    try {
      const { data, error } = await $fetch({
        url: `/api/nft/bid`,
        params: { listingId: currentListing.id },
      });

      if (!error && data) {
        setBids(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching bids:", error);
    }
  }, [currentListing?.id]);

  const fetchOffers = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/offer`,
        params: { tokenId: token.id },
      });

      if (!error && data) {
        setOffers(data.data || []);
        if (typeof data.confirmGraceHours === "number") {
          setConfirmGraceHours(data.confirmGraceHours);
        }
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    }
  }, [token.id]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/activity`,
        params: { tokenId: token.id },
      });

      if (!error && data) {
        // `/api/nft/activity` answers with getFiltered's `{ items, pagination }`
        // shape — reading `data.data` left this list permanently empty.
        setActivities(data.items || data.data || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [token.id]);

  const checkFavoriteStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await $fetch({
        url: `/api/nft/favorite`,
        params: { tokenId: token.id },
      });

      if (!error && data) {
        setIsFavorited(data.isFavorited);
      }
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  }, [user?.id, token.id]);

  useEffect(() => {
    fetchTokenDetails();
    fetchBids();
    fetchOffers();
    fetchActivities();
    checkFavoriteStatus();
  }, [fetchTokenDetails, fetchBids, fetchOffers, fetchActivities, checkFavoriteStatus]);

  // Timer for auctions
  useEffect(() => {
    if (currentListing?.type === "AUCTION" && currentListing?.endTime) {
      const timer = setInterval(() => {
        const remaining = new Date(currentListing.endTime).getTime() - Date.now();
        setTimeLeft(Math.max(0, remaining));
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentListing]);

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const unsubscribeCallbacks: (() => void)[] = [];

    // Subscribe to token updates
    const tokenUnsubscribe = nftWebSocketService.subscribeToToken(token.id, (update) => {
      setLastUpdate(new Date());
      
      if (update.type === "token_update") {
        setToken(prev => ({ ...prev, ...update.data }));
        if (update.data.currentListing) {
          setCurrentListing(update.data.currentListing);
        }
      }
    });
    unsubscribeCallbacks.push(tokenUnsubscribe);

    // Subscribe to auction updates if it's an auction
    if (currentListing?.type === "AUCTION") {
      const auctionUnsubscribe = nftWebSocketService.subscribeToAuction(currentListing.id, (update) => {
        setLastUpdate(new Date());
        
        if (update.type === "auction_update") {
          setCurrentListing(prev => ({ ...prev, ...update.data }));
          if (update.data.highestBid) {
            setBids(prev => [update.data.highestBid, ...prev.slice(1)]);
          }
        } else if (update.type === "auction_ended") {
          setCurrentListing(prev => ({ ...prev, status: "ENDED" }));
          setTimeLeft(0);
          toast.info(t("auction_has_ended"));
        }
      });
      unsubscribeCallbacks.push(auctionUnsubscribe);

      // Subscribe to bid updates
      const bidsUnsubscribe = nftWebSocketService.subscribeToBids(token.id, (update) => {
        setLastUpdate(new Date());
        
        if (update.type === "bids_update") {
          setBids(update.data);
          
          // Show notification for new bid (if not from current user)
          const latestBid = update.data[0];
          if (latestBid && latestBid.bidderId !== user?.id) {
            toast.info(`${t("new_bid_placed")}: ${formatCurrency(latestBid.amount, latestBid.currency)} ${latestBid.currency}`);
          }
        }
      });
      unsubscribeCallbacks.push(bidsUnsubscribe);
    }

    // Subscribe to activity updates
    const activityUnsubscribe = nftWebSocketService.subscribeToActivity((update) => {
      setLastUpdate(new Date());
      
      if (update.type === "activity_update") {
        // Filter activities for this token
        const tokenActivities = update.data.filter((activity: any) => activity.tokenId === token.id);
        if (tokenActivities.length > 0) {
          setActivities(prev => {
            const newActivities = [...tokenActivities, ...prev];
            // Remove duplicates and limit to recent activities
            const uniqueActivities = newActivities.filter((activity, index, self) =>
              index === self.findIndex(a => a.id === activity.id)
            );
            return uniqueActivities.slice(0, 20);
          });
        }
      }
    });
    unsubscribeCallbacks.push(activityUnsubscribe);

    // Check connection status
    const checkConnection = () => {
      const status = nftWebSocketService.getConnectionStatus();
      setIsConnected((status as any).connected || false);
    };

    checkConnection();
    const connectionCheckInterval = setInterval(checkConnection, 5000);

    // Cleanup
    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
      clearInterval(connectionCheckInterval);
    };
  }, [token.id, currentListing?.id, user?.id, t]);

  const handleBuyNow = useCallback(async () => {
    if (!currentListing || !user?.id) return;

    // Require a connected wallet to execute the on-chain purchase
    if (!isWalletConnected) {
      toast.error(t("please_connect_your_wallet_first"));
      return;
    }

    const contractAddress = token.collection?.contractAddress;
    if (!contractAddress) {
      toast.error(t("collection_contract_not_deployed"));
      return;
    }

    setIsLoading(true);
    try {
      // Execute the on-chain purchase using the same utility as nft/token/[id]
      const result = await purchaseNFT({
        marketplaceAddress: contractAddress,
        nftContractAddress: contractAddress,
        tokenId: token.tokenId || token.id,
        price: String(currentListing.price || "0"),
        royaltyPercentage: token.collection?.royaltyPercentage,
      });

      if (!result.transactionHash) {
        toast.error(t("failed_to_execute_transaction"));
        return;
      }

      // Post the transaction proof to the backend so the sale is recorded
      const { error } = await $fetch({
        url: `/api/nft/listing/${currentListing.id}/buy`,
        method: "POST",
        body: {
          transactionHash: result.transactionHash,
          gasUsed: Number(result.gasUsed),
          gasPrice: result.gasPrice,
        },
        successMessage: t("nft_purchased_successfully"),
      });

      if (!error) {
        setShowBuyModal(false);
        await fetchTokenDetails();
        await fetchActivities();
      }
    } catch (error: any) {
      if (error?.message?.includes("User denied")) {
        toast.error(t("transaction_was_cancelled"));
      } else {
        toast.error(error?.message || t("failed_to_purchase_nft"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentListing, user?.id, isWalletConnected, token, t, fetchTokenDetails, fetchActivities]);

  const handlePlaceBid = useCallback(async () => {
    if (!currentListing || !bidAmount || !user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/bid`,
        method: "POST",
        body: {
          listingId: currentListing.id,
          amount: parseFloat(bidAmount),
          currency: currentListing.currency,
        },
        successMessage: t("bid_placed_successfully"),
      });

      if (!error) {
        setShowBidModal(false);
        setBidAmount("");
        await fetchBids();
        await fetchActivities();
      }
    } catch (error) {
      console.error("Error placing bid:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentListing, bidAmount, user?.id, t, fetchBids, fetchActivities]);

  const handleMakeOffer = useCallback(async () => {
    if (!offerAmount || !user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/offer`,
        method: "POST",
        body: {
          tokenId: token.id,
          amount: parseFloat(offerAmount),
          currency: "USDT",
        },
        successMessage: t("offer_submitted_successfully"),
      });

      if (!error) {
        setShowOfferModal(false);
        setOfferAmount("");
        await fetchOffers();
        await fetchActivities();
      }
    } catch (error) {
      console.error("Error making offer:", error);
    } finally {
      setIsLoading(false);
    }
  }, [offerAmount, user?.id, token.id, t, fetchOffers, fetchActivities]);

  // --- Offer lifecycle -------------------------------------------------------
  // None of this existed: there was no accept button anywhere in the product,
  // so an offer could only ever be accepted by calling the API by hand.

  const handleAcceptOffer = useCallback(async (offerId: string) => {
    setPendingOfferId(offerId);
    const { error } = await $fetch({
      url: `/api/nft/offer/${offerId}/accept`,
      method: "POST",
      successMessage: t("offer_accepted_awaiting_transfer"),
    });
    setPendingOfferId(null);
    if (!error) {
      await fetchOffers();
      await fetchActivities();
      await fetchTokenDetails();
    }
  }, [t, fetchOffers, fetchActivities, fetchTokenDetails]);

  const handleRejectOffer = useCallback(async (offerId: string) => {
    setPendingOfferId(offerId);
    const { error } = await $fetch({
      url: `/api/nft/offer/${offerId}/reject`,
      method: "POST",
      successMessage: tExt("offer_rejected"),
    });
    setPendingOfferId(null);
    if (!error) {
      await fetchOffers();
      await fetchActivities();
    }
  }, [t, fetchOffers, fetchActivities]);

  const handleConfirmTransfer = useCallback(async (offerId: string) => {
    const transactionHash = (confirmHashes[offerId] || "").trim();
    if (!transactionHash) return;

    setPendingOfferId(offerId);
    const { error } = await $fetch({
      url: `/api/nft/offer/${offerId}/confirm`,
      method: "POST",
      body: { transactionHash },
      successMessage: t("transfer_confirmed"),
    });
    setPendingOfferId(null);
    if (!error) {
      setConfirmHashes((prev) => ({ ...prev, [offerId]: "" }));
      await fetchOffers();
      await fetchActivities();
      await fetchTokenDetails();
    }
  }, [confirmHashes, t, fetchOffers, fetchActivities, fetchTokenDetails]);

  const handleTransfer = useCallback(async () => {
    if (!transferAddress || !user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/token/${token.id}/transfer`,
        method: "POST",
        body: {
          transferToUser: transferAddress,
        },
        successMessage: t("nft_transferred_successfully"),
      });

      if (!error) {
        setShowTransferModal(false);
        setTransferAddress("");
        await fetchTokenDetails();
        await fetchActivities();
      }
    } catch (error) {
      console.error("Error transferring NFT:", error);
    } finally {
      setIsLoading(false);
    }
  }, [transferAddress, user?.id, token.id, t, fetchTokenDetails, fetchActivities]);

  const handleToggleFavorite = useCallback(async () => {
    if (!user?.id) {
      toast.error(t("please_login_to_add_favorites"));
      return;
    }

    try {
      await toggleFavorite(token.id, "token");
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [user?.id, token.id, toggleFavorite, isFavorited, t]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: token.name,
          text: token.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast.success(tExt("link_copied"));
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(tExt("link_copied"));
    }
  }, [token.name, token.description, t]);

  const formatTimeLeft = useCallback((milliseconds: number) => {
    if (milliseconds <= 0) return tCommon("auction_ended");
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, [t]);

  // Only a signed-in user who fails the KYC check gets the notice: "loading"
  // and "anonymous" are not KYC problems, and this page has no login prompt of
  // its own, so those states leave the existing UI alone.
  const buyBlocked =
    buyGate.state === "needs_kyc" || buyGate.state === "needs_level";
  const transferBlocked =
    transferGate.state === "needs_kyc" || transferGate.state === "needs_level";

  const isOwner = user?.id === token.ownerId;
  const canBuy = currentListing && !isOwner && currentListing.type === "FIXED_PRICE";
  const canBid = currentListing && !isOwner && currentListing.type === "AUCTION" && timeLeft > 0;
  const canOffer = !isOwner && (!currentListing || currentListing.type !== "AUCTION");
  const canTransfer = isOwner && token.status === "MINTED" && !currentListing;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <Image
                  src={getNftImageUrl(token.id)}
                  alt={token.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover rounded-lg"
                  priority
                />
                {token.rarity && (
                  <Badge
                    className="absolute top-4 left-4"
                    variant={token.rarity === "LEGENDARY" ? "default" : "secondary"}
                  >
                    {token.rarity}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Collection Info */}
          {token.collection && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={token.collection.logoImage} />
                    <AvatarFallback>{token.collection.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{token.collection.name}</span>
                      {token.collection.isVerified && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      {tExt("floor")}:
                      <CurrencyIcon currency={token.collection.currency} size={14} />
                      {formatCurrency(token.collection.floorPrice || 0, token.collection.currency)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{token.name}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {formatNumber(token.views || 0)} {tCommon("views")}
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {formatNumber(token.likes || 0)} {tExtAdmin("likes")}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFavorite}
              className={isFavorited ? "text-destructive" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? t("favorited") : t("favorite")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {tExt("share")}
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {tCommon("refresh")}
            </Button>
            
            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-success" />
                  {tCommon("live")}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-destructive" />
                  {tExt("offline")}
                </>
              )}
              {lastUpdate && (
                <span className="ml-1">
                  {tCommon("updated")} {formatTimeAgo(lastUpdate.toISOString())}
                </span>
              )}
            </div>
          </div>

          {/* Current Listing */}
          {currentListing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentListing.type === "AUCTION" ? (
                    <>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                        <Gavel className="h-3.5 w-3.5" />
                      </span>
                      {t("current_auction")}
                    </>
                  ) : (
                    <>
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                        <Tag className="h-3.5 w-3.5" />
                      </span>
                      {tExt("fixed_price")}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-semibold leading-tight tracking-tight text-foreground flex items-center gap-2">
                  <CurrencyIcon currency={currentListing.currency} size={24} />
                  <MoneyFigure value={formatCurrency(currentListing.price, currentListing.currency)} />
                </div>

                {currentListing.type === "AUCTION" && (
                  <div className="space-y-2">
                    {timeLeft > 0 ? (
                      <div className="flex items-center gap-2 text-warning">
                        <Clock className="h-4 w-4" />
                        {formatTimeLeft(timeLeft)} {tCommon("remaining")}:
                      </div>
                    ) : (
                      <div className="text-destructive">{tCommon("auction_ended")}</div>
                    )}

                    {bids.length > 0 && (
                      <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                        {t("highest_bid")}:
                        <CurrencyIcon currency={bids[0]?.currency || currentListing.currency} size={14} />
                        {formatCurrency(bids[0]?.amount || 0, bids[0]?.currency || currentListing.currency)}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {canBuy && (
                    <Dialog open={showBuyModal} onOpenChange={setShowBuyModal}>
                      <DialogTrigger asChild>
                        <Button className="flex-1">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {tCommon("buy_now")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("confirm_purchase")}</DialogTitle>
                        </DialogHeader>
                        {buyBlocked ? (
                          <KycRequiredNotice
                            feature="buy_nft"
                            requirement={buyGate.requirement ?? "verification"}
                          />
                        ) : (
                          <div className="space-y-4">
                            <p>{t("are_you_sure_you_want_to_buy")} {token.name}?</p>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setShowBuyModal(false)}>
                                {tCommon("cancel")}
                              </Button>
                              <Button onClick={handleBuyNow} loading={isLoading}>
                                {t("confirm_purchase")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}

                  {canBid && (
                    <Dialog open={showBidModal} onOpenChange={setShowBidModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Gavel className="h-4 w-4 mr-2" />
                          {tCommon("place_bid")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{tCommon("place_bid")}</DialogTitle>
                        </DialogHeader>
                        {buyBlocked ? (
                          <KycRequiredNotice
                            feature="buy_nft"
                            requirement={buyGate.requirement ?? "verification"}
                          />
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="bidAmount">{t("bid_amount")}</Label>
                              <Input
                                id="bidAmount"
                                type="number"
                                step="0.01"
                                min={bids[0]?.amount ? bids[0].amount + 0.01 : currentListing.price + 0.01}
                                value={bidAmount}
                                onChange={(e) => setBidAmount(e.target.value)}
                                placeholder="0.00"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {t("minimum_bid")}: {formatCurrency((bids[0]?.amount || currentListing.price) + 0.01, currentListing.currency)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setShowBidModal(false)}>
                                {tCommon("cancel")}
                              </Button>
                              <Button onClick={handlePlaceBid} loading={isLoading} disabled={!bidAmount}>
                                {tCommon("place_bid")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}

                  {canOffer && (
                    <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Tag className="h-4 w-4 mr-2" />
                          {tCommon("make_offer")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{tCommon("make_offer")}</DialogTitle>
                        </DialogHeader>
                        {buyBlocked ? (
                          <KycRequiredNotice
                            feature="buy_nft"
                            requirement={buyGate.requirement ?? "verification"}
                          />
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="offerAmount">{tCommon("offer_amount")}</Label>
                              <Input
                                id="offerAmount"
                                type="number"
                                step="0.01"
                                value={offerAmount}
                                onChange={(e) => setOfferAmount(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setShowOfferModal(false)}>
                                {tCommon("cancel")}
                              </Button>
                              <Button onClick={handleMakeOffer} loading={isLoading} disabled={!offerAmount}>
                                {tCommon("make_offer")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}

                  {canTransfer && (
                    <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Send className="h-4 w-4 mr-2" />
                          {tCommon("transfer")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("transfer_nft")}</DialogTitle>
                        </DialogHeader>
                        {transferBlocked ? (
                          <KycRequiredNotice
                            feature="transfer_nft"
                            requirement={transferGate.requirement ?? "verification"}
                          />
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="transferAddress">{t("recipient_address")}</Label>
                              <Input
                                id="transferAddress"
                                type="text"
                                value={transferAddress}
                                onChange={(e) => setTransferAddress(e.target.value)}
                                placeholder="0x..."
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {t("enter_wallet_address_to_transfer_nft")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                                {tCommon("cancel")}
                              </Button>
                              <Button onClick={handleTransfer} loading={isLoading} disabled={!transferAddress}>
                                {tCommon("transfer")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">{tCommon("overview")}</TabsTrigger>
              <TabsTrigger value="bids">{tExtAdmin("bids")}</TabsTrigger>
              <TabsTrigger value="offers">{tCommon("offers")}</TabsTrigger>
              <TabsTrigger value="activity">{tCommon("activity")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Description */}
              {token.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>{tCommon("description")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{token.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Attributes */}
              {token.attributes && token.attributes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{tCommon("attributes")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {token.attributes.map((attr: any, index: number) => (
                        <div key={index} className="bg-muted rounded-lg p-3 text-center">
                          <div className="text-xs font-medium text-muted-foreground">
                            {attr.trait_type}
                          </div>
                          <div className="font-semibold text-foreground">{attr.value}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bids" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("bid_history")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {bids.length > 0 ? (
                    <div className="space-y-3">
                      {bids.map((bid) => (
                        <div key={bid.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                <CurrencyIcon currency={bid.currency} size={14} />
                                <MoneyFigure value={formatCurrency(bid.amount, bid.currency)} />
                              </div>
                              <div className="text-[11px] text-subtle-foreground">
                                {formatTimeAgo(bid.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      {t("no_bids_yet")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="offers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("offers")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {offers.length > 0 ? (
                    <div className="space-y-3">
                          {offers.map((offer) => {
                        /* This joined the offerer's first and last name, which
                           put a stranger's legal name beside their bid — and on
                           the avatar monogram beneath it. The empty branch is
                           kept for "no user on the offer at all": it is what
                           drops the "· " separator, and is not the same fact as
                           a person who simply has no name. */
                        const offerBy = offer.user
                          ? publicShortName(offer.user, tCommon("anonymous"))
                          : "";
                        const isSeller = user?.id === token.ownerId || user?.id === offer.sellerId;
                        const isBuyer = user?.id === offer.userId;
                        const deadline = offer.acceptedAt
                          ? new Date(new Date(offer.acceptedAt).getTime() + confirmGraceHours * 3600 * 1000)
                          : null;

                        return (
                          <div key={offer.id} className="p-3 border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{(offerBy[0] ?? "U").toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <CurrencyIcon currency={offer.currency} size={14} />
                                    <MoneyFigure value={formatCurrency(offer.amount, offer.currency)} />
                                  </div>
                                  <div className="text-[11px] text-subtle-foreground">
                                    {offerBy ? `${offerBy} · ` : ""}{formatTimeAgo(offer.createdAt)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant={offer.status === "ACCEPTED" ? "default" : "outline"}>
                                  {offer.status}
                                </Badge>
                                {offer.status === "ACTIVE" && isSeller && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleAcceptOffer(offer.id)}
                                      loading={pendingOfferId === offer.id}
                                      disabled={pendingOfferId !== null}
                                    >
                                      {tCommon("accept")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRejectOffer(offer.id)}
                                      loading={pendingOfferId === offer.id}
                                      disabled={pendingOfferId !== null}
                                    >
                                      {tCommon("reject")}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Accepted offers settle only when the on-chain
                                transfer is confirmed. Either party can supply
                                the hash — the seller is the one who executes
                                transferFrom, so they usually hold it. */}
                            {offer.status === "ACCEPTED" && (isSeller || isBuyer) && (
                              <div className="rounded-md bg-muted/40 p-3 space-y-2">
                                <div className="text-sm font-medium">
                                  {t("confirm_on_chain_transfer")}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t("confirm_transfer_hint")}
                                  {deadline
                                    ? ` ${t("reverses_at")} ${deadline.toLocaleString()}`
                                    : ""}
                                </p>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Input
                                    value={confirmHashes[offer.id] ?? ""}
                                    onChange={(e) =>
                                      setConfirmHashes((prev) => ({
                                        ...prev,
                                        [offer.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="0x..."
                                  />
                                  <Button
                                    onClick={() => handleConfirmTransfer(offer.id)}
                                    loading={pendingOfferId === offer.id}
                                    disabled={
                                      pendingOfferId !== null ||
                                      !(confirmHashes[offer.id] || "").trim()
                                    }
                                  >
                                    {tCommon("confirm")}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      {t("no_offers_yet")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{tCommon("activity")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{activity.type}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      {tExt("no_activity_yet")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Similar NFTs Section */}
      <SimilarNFTs 
        collectionId={token.collectionId}
        currentTokenId={token.id}
        category={token.collection?.category?.slug}
      />
    </div>
  );
}

// Similar NFTs Component
interface SimilarNFTsProps {
  collectionId: string;
  currentTokenId: string;
  category?: string;
}

function SimilarNFTs({ collectionId, currentTokenId, category }: SimilarNFTsProps) {
  const t = useTranslations("ext_nft")
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");;
  const [similarTokens, setSimilarTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarNFTs = async () => {
      try {
        const { data, error } = await $fetch({
          url: '/api/nft/token',
          method: 'GET',
          params: {
            collectionId,
            limit: 8,
            excludeId: currentTokenId,
            isListed: 'true',
          },
          silentSuccess: true,
        });

        if (!error && data) {
          setSimilarTokens(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch similar NFTs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarNFTs();
  }, [collectionId, currentTokenId]);

  /*
    THE SECOND CARD THAT USED TO BE HERE
    ====================================
    `if (loading) return <Card>…4 <Skeleton/> cells…</Card>` was very nearly
    right — it kept the card, the title and the real grid — and it still moved
    the page, for one reason that is easy to miss: it dropped the
    "From the same collection" description under the title. That is a 20px line,
    so the header was 20px shorter while loading and the whole card, plus
    anything the page renders after it, stepped down when the fetch landed.

    That is the argument for not having a second tree at all. The header is now
    written once, so it cannot be 20px wrong.

    `!loading &&` on the empty check below: `similarTokens.length === 0` is true
    for the whole pending window, so on the version where the card renders its
    own chrome this test would hide it and then pop it into existence.
  */
  if (!loading && similarTokens.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>{t("similar_nfts")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("from_the_same_collection")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`pending-${i}`} className="space-y-3">
                {/* `aspect-square` and `rounded-lg` copied from the real cell,
                    not invented: the cell's height is the column width, so the
                    row is the right height before any image loads. */}
                <SkeletonBlock className="aspect-square rounded-lg" />
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">
                    <SkeletonText chars={14} />
                  </h4>
                  <div className="text-xs text-muted-foreground">
                    <SkeletonText placeholder="1,234 views" />
                  </div>
                </div>
              </div>
            ))}
          {similarTokens.slice(0, 8).map((token: any) => (
            <Link key={token.id} href={`/nft/token/${token.id}`}>
              <div className="group cursor-pointer space-y-3">
                <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={getNftImageUrl(token.id)}
                    alt={token.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {token.rarity && (
                    <Badge 
                      className="absolute top-2 right-2 text-xs"
                      variant={token.rarity === 'LEGENDARY' ? 'default' : 'secondary'}
                    >
                      {token.rarity}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {token.name}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatNumber(token.views || 0)} {tCommon("views")}</span>
                    {token.currentListing && (
                      <span className="font-medium text-primary flex items-center gap-1">
                        <CurrencyIcon currency={token.currentListing.currency} size={12} />
                        <MoneyFigure value={formatCurrency(token.currentListing.price, token.currentListing.currency)} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {similarTokens.length > 8 && (
          <div className="mt-6 text-center">
            <Link href={`/nft/collection/${collectionId}`}>
              <Button variant="outline">
                {tCommon("view_all")} ({similarTokens.length})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 