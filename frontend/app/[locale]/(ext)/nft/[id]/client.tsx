"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import { NFTHeroImage, NFTCardImage } from "@/components/nft/optimized-image";
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
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/utils/format";
import { nftWebSocketService } from "@/services/nft-ws";
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
  createdAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  tokenId: string;
  createdAt: string;
}

export default function NFTDetailClient({ initialToken }: NFTDetailClientProps) {
  const t = useTranslations("nft/details");
  const { user } = useUserStore();
  const { toggleFavorite } = useNftStore();

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
        setActivities(data.data || []);
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
            toast.info(t("New bid placed: {amount} {currency}", {
              amount: formatCurrency(latestBid.amount),
              currency: latestBid.currency
            }));
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

    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/listing/${currentListing.id}/buy`,
        method: "POST",
        successMessage: t("nft_purchased_successfully"),
      });

      if (!error) {
        setShowBuyModal(false);
        await fetchTokenDetails();
        await fetchActivities();
      }
    } catch (error) {
      console.error("Error buying NFT:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentListing, user?.id, t, fetchTokenDetails, fetchActivities]);

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
        toast.success(t("link_copied_to_clipboard"));
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("link_copied_to_clipboard"));
    }
  }, [token.name, token.description, t]);

  const formatTimeLeft = useCallback((milliseconds: number) => {
    if (milliseconds <= 0) return t("auction_ended");
    
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, [t]);

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
              <div className="relative">
                <NFTHeroImage
                  src={token.image || "/img/nft/placeholder.svg"}
                  alt={token.name}
                  fallbackSrc="/img/nft/placeholder.svg"
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
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("Floor")}: {formatCurrency(token.collection.floorPrice || 0)}
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
                {formatNumber(token.views || 0)} {t("views")}
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {formatNumber(token.likes || 0)} {t("likes")}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleFavorite}
              className={isFavorited ? "text-red-500" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? t("Favorited") : t("Favorite")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              {t("Share")}
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("Refresh")}
            </Button>
            
            {/* WebSocket Connection Status */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  {t("Live")}
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  {t("Offline")}
                </>
              )}
              {lastUpdate && (
                <span className="ml-1">
                  {t("Updated")} {formatTimeAgo(lastUpdate.toISOString())}
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
                      <Gavel className="h-5 w-5" />
                      {t("current_auction")}
                    </>
                  ) : (
                    <>
                      <Tag className="h-5 w-5" />
                      {t("fixed_price")}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  {formatCurrency(currentListing.price)} {currentListing.currency}
                </div>

                {currentListing.type === "AUCTION" && (
                  <div className="space-y-2">
                    {timeLeft > 0 ? (
                      <div className="flex items-center gap-2 text-orange-600">
                        <Clock className="h-4 w-4" />
                        {formatTimeLeft(timeLeft)} {t("remaining")}
                      </div>
                    ) : (
                      <div className="text-red-600">{t("auction_ended")}</div>
                    )}

                    {bids.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {t("highest_bid")}: {formatCurrency(bids[0]?.amount || 0)} {bids[0]?.currency}
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
                          {t("buy_now")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("confirm_purchase")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>{t("are_you_sure_you_want_to_buy")} {token.name}?</p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowBuyModal(false)}>
                              {t("Cancel")}
                            </Button>
                            <Button onClick={handleBuyNow} disabled={isLoading}>
                              {isLoading ? <LoadingSpinner /> : t("confirm_purchase")}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canBid && (
                    <Dialog open={showBidModal} onOpenChange={setShowBidModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Gavel className="h-4 w-4 mr-2" />
                          {t("place_bid")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("place_bid")}</DialogTitle>
                        </DialogHeader>
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
                              {t("minimum_bid")}: {formatCurrency((bids[0]?.amount || currentListing.price) + 0.01)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowBidModal(false)}>
                              {t("Cancel")}
                            </Button>
                            <Button onClick={handlePlaceBid} disabled={isLoading || !bidAmount}>
                              {isLoading ? <LoadingSpinner /> : t("place_bid")}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canOffer && (
                    <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Tag className="h-4 w-4 mr-2" />
                          {t("make_offer")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("make_offer")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="offerAmount">{t("offer_amount")}</Label>
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
                              {t("Cancel")}
                            </Button>
                            <Button onClick={handleMakeOffer} disabled={isLoading || !offerAmount}>
                              {isLoading ? <LoadingSpinner /> : t("make_offer")}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {canTransfer && (
                    <Dialog open={showTransferModal} onOpenChange={setShowTransferModal}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Send className="h-4 w-4 mr-2" />
                          {t("transfer")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("transfer_nft")}</DialogTitle>
                        </DialogHeader>
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
                              {t("Cancel")}
                            </Button>
                            <Button onClick={handleTransfer} disabled={isLoading || !transferAddress}>
                              {isLoading ? <LoadingSpinner /> : t("transfer")}
                            </Button>
                          </div>
                        </div>
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
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="bids">{t("Bids")}</TabsTrigger>
              <TabsTrigger value="offers">{t("Offers")}</TabsTrigger>
              <TabsTrigger value="activity">{t("Activity")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Description */}
              {token.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t("Description")}</CardTitle>
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
                    <CardTitle>{t("Attributes")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {token.attributes.map((attr: any, index: number) => (
                        <div key={index} className="bg-muted rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground uppercase">
                            {attr.trait_type}
                          </div>
                          <div className="font-medium">{attr.value}</div>
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
                  <CardTitle>{t("bid_history")}</CardTitle>
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
                              <div className="font-medium">
                                {formatCurrency(bid.amount)} {bid.currency}
                              </div>
                              <div className="text-xs text-muted-foreground">
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
                  <CardTitle>{t("Offers")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {offers.length > 0 ? (
                    <div className="space-y-3">
                      {offers.map((offer) => (
                        <div key={offer.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {formatCurrency(offer.amount)} {offer.currency}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatTimeAgo(offer.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
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
                  <CardTitle>{t("Activity")}</CardTitle>
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
                      {t("no_activity_yet")}
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
  const t = useTranslations();
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

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t("similar_nfts")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-muted animate-pulse rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (similarTokens.length === 0) {
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
          {similarTokens.slice(0, 8).map((token: any) => (
            <Link key={token.id} href={`/nft/token/${token.id}`}>
              <div className="group cursor-pointer space-y-3">
                <div className="aspect-square relative overflow-hidden rounded-lg bg-muted">
                  <NFTCardImage
                    src={token.image}
                    alt={token.name}
                    className="group-hover:scale-105 transition-transform duration-300"
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
                    <span>{formatNumber(token.views || 0)} {t("views")}</span>
                    {token.currentListing && (
                      <span className="font-medium text-primary">
                        {formatCurrency(token.currentListing.price)} {token.currentListing.currency}
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
                {t("view_all")} ({similarTokens.length})
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 