"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Share2,
  ExternalLink,
  Eye,
  Clock,
  ShoppingCart,
  MoreHorizontal,
  Copy,
  TrendingUp,
  Activity,
  Verified,
  Sparkles,
  Award,
  Flame,
  Zap,
  ChevronRight,
  Maximize2,
  Flag,
  BarChart3,
  MessageCircle,
  RefreshCw,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useNftStore } from "@/store/nft/nft-store";
import { useConfigStore } from "@/store/config";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { AuthModal } from "@/components/auth/auth-modal";
import { toast } from "sonner";
import MakeOfferModal from "../../components/modals/make-offer-modal";
import { useWalletStore } from "@/store/nft/wallet-store";
import { purchaseNFT } from "@/utils/nft-purchase";
import { cn } from "@/lib/utils";

interface NFTTokenClientProps {
  tokenId: string;
}

export default function NFTTokenClient({ tokenId }: NFTTokenClientProps) {
  const t = useTranslations("ext_nft");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  const { settings } = useConfigStore();
  const { isConnected, address } = useWalletStore();
  const {
    selectedToken,
    loading,
    fetchTokenById,
    addToFavorites,
    removeFromFavorites,
    cancelListing,
  } = useNftStore();

  // Check if offers are enabled
  const offersEnabled = settings?.nftEnableOffers ?? true;

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (tokenId) {
      fetchTokenById(tokenId);
    }
  }, [tokenId, fetchTokenById]);

  useEffect(() => {
    if (selectedToken) {
      setIsLiked(selectedToken.isFavorited || false);
      setLikesCount(selectedToken.likes || 0);
    }
  }, [selectedToken]);

  // Countdown timer for auctions
  useEffect(() => {
    if (selectedToken?.currentListing?.type === "AUCTION" && selectedToken.currentListing?.endTime) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const endTime = new Date(selectedToken.currentListing!.endTime!).getTime();
        const distance = endTime - now;

        if (distance > 0) {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          if (days > 0) {
            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
          } else if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          } else if (minutes > 0) {
            setTimeLeft(`${minutes}m ${seconds}s`);
          } else {
            setTimeLeft(`${seconds}s`);
          }
        } else {
          setTimeLeft("Ended");
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [selectedToken]);

  const handleLike = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!selectedToken) return;

    try {
      if (isLiked) {
        await removeFromFavorites(selectedToken.id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
        toast.success("Removed from favorites");
      } else {
        await addToFavorites(selectedToken.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        toast.success("Added to favorites");
      }
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: selectedToken?.name,
        text: selectedToken?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!selectedToken?.currentListing) {
      toast.error("This NFT is not listed for sale");
      return;
    }

    setIsPurchasing(true);
    try {
      const result = await purchaseNFT({
        marketplaceAddress: selectedToken.collection?.contractAddress || "",
        nftContractAddress: selectedToken.collection?.contractAddress || "",
        tokenId: selectedToken.tokenId || selectedToken.id,
        price: String(selectedToken.currentListing.price || "0"),
        royaltyPercentage: selectedToken.collection?.royaltyPercentage,
      });

      if (result.transactionHash) {
        toast.success("NFT purchased successfully!");
        router.push("/nft/portfolio");
      } else {
        toast.error("Failed to purchase NFT");
      }
    } catch (error: any) {
      if (error.message?.includes("User denied")) {
        toast.error("Transaction was cancelled");
      } else {
        toast.error(error.message || "Failed to purchase NFT");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleDelist = async () => {
    if (!selectedToken?.currentListing) {
      toast.error("No active listing found");
      return;
    }

    try {
      await cancelListing(selectedToken.currentListing.id);
      toast.success("Listing cancelled successfully!");
      // Refresh the token data
      await fetchTokenById(tokenId);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel listing");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className={`w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-full flex items-center justify-center`}>
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{t("nft_not_found")}</h1>
          <p className="text-muted-foreground text-lg">{t("the_nft_youre_looking")}</p>
          <Link href="/nft/marketplace">
            <Button size="lg" className={`bg-gradient-to-r from-primary to-purple-600`}>
              {t("browse_marketplace")}
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const isOwner = user?.id === selectedToken.ownerId;
  const isForSale = selectedToken.currentListing?.type === "FIXED_PRICE";
  const isAuction = selectedToken.currentListing?.type === "AUCTION";
  // Get chain-specific native currency
  const chain = selectedToken.collection?.chain?.toUpperCase() || "ETH";
  const chainCurrency = chain === "BSC" || chain === "BINANCE" ? "BNB" : chain === "POLYGON" || chain === "MATIC" ? "MATIC" : "ETH";
  const displayCurrency = chainCurrency;

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header with Breadcrumb */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 pt-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/nft" className="hover:text-primary transition-colors">NFT</Link>
              <ChevronRight className="w-4 h-4" />
              {selectedToken.collection && (
                <>
                  <Link
                    href={`/nft/collection/${selectedToken.collection.id}`}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {selectedToken.collection.name}
                    {selectedToken.collection.isVerified && (
                      <Verified className="w-3 h-3 text-primary fill-primary" />
                    )}
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
              <span className="text-foreground font-medium">{selectedToken.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleLike}>
                <Heart className={cn("w-4 h-4", isLiked && "fill-red-500 text-red-500")} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.open(`https://bscscan.com/token/${selectedToken.collection?.contractAddress}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t("view_on_explorer")}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t("refresh_metadata")}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Compact 2-Column Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Image */}
          <div className="space-y-4">
            <div className={`relative aspect-square bg-gradient-to-br from-primary/5 via-purple-600/5 to-pink-600/5 rounded-xl overflow-hidden border-2 border-border group`}>
              {selectedToken.imageUrl ? (
                <Image
                  src={selectedToken.imageUrl}
                  alt={selectedToken.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-24 h-24 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                {isForSale && (
                  <Badge className="bg-green-500/90 backdrop-blur-sm border-0">
                    <Tag className="w-3 h-3 mr-1" />
                    {t("for_sale")}
                  </Badge>
                )}
                {isAuction && (
                  <Badge className="bg-orange-500/90 backdrop-blur-sm border-0">
                    <Flame className="w-3 h-3 mr-1" />
                    {t("live_auction")}
                  </Badge>
                )}
              </div>
              <div className="absolute top-4 right-4">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full backdrop-blur-sm bg-black/50 hover:bg-black/70"
                  onClick={() => window.open(selectedToken.imageUrl, '_blank')}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border-2 border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Eye className="w-3 h-3" />
                  Views
                </div>
                <div className="text-lg font-bold">{selectedToken.views || 0}</div>
              </div>
              <div className="bg-card border-2 border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Heart className="w-3 h-3" />
                  Favorites
                </div>
                <div className="text-lg font-bold">{likesCount}</div>
              </div>
              <div className="bg-card border-2 border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-3 h-3" />
                  Rank
                </div>
                <div className="text-lg font-bold">#{selectedToken.rank || "N/A"}</div>
              </div>
            </div>
          </div>

          {/* Right Column - Info & Actions */}
          <div className="space-y-4">
            {/* Collection Badge */}
            {selectedToken.collection && (
              <Link
                href={`/nft/collection/${selectedToken.collection.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full hover:border-primary/50 transition-colors"
              >
                {selectedToken.collection.logoImage && (
                  <Image
                    src={selectedToken.collection.logoImage}
                    alt={selectedToken.collection.name}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span className="text-sm font-medium">{selectedToken.collection.name}</span>
                {selectedToken.collection.isVerified && (
                  <Verified className="w-4 h-4 text-primary fill-primary" />
                )}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold">{selectedToken.name}</h1>

            {/* Owner & Creator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("owned_by")}</span>
                <Link href={`/nft/user/${selectedToken.ownerId}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={selectedToken.owner?.avatar} />
                    <AvatarFallback>
                      {selectedToken.owner?.firstName?.[0]}{selectedToken.owner?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-primary">
                    {selectedToken.owner?.firstName && selectedToken.owner?.lastName
                      ? `${selectedToken.owner.firstName} ${selectedToken.owner.lastName}`
                      : selectedToken.owner?.firstName || "Unknown"}
                  </span>
                </Link>
              </div>
              {selectedToken.creator && selectedToken.creatorId !== selectedToken.ownerId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{tExt("created_by")}</span>
                  <Link href={`/nft/creator/${selectedToken.creatorId}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={selectedToken.creator?.user?.avatar || selectedToken.creator?.avatar} />
                      <AvatarFallback>
                        {selectedToken.creator?.user?.firstName?.[0]}{selectedToken.creator?.user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-primary">
                      {selectedToken.creator?.displayName ||
                       (selectedToken.creator?.user?.firstName && selectedToken.creator?.user?.lastName
                         ? `${selectedToken.creator.user.firstName} ${selectedToken.creator.user.lastName}`
                         : selectedToken.creator?.user?.firstName || "Unknown")}
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Price Card - Compact */}
            {(isForSale || isAuction) && selectedToken.currentListing && (
              <div className={`bg-gradient-to-br from-primary/10 to-purple-600/10 border-2 border-primary/20 rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {isAuction ? "Current Bid" : "Current Price"}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{Number(selectedToken.currentListing.price).toFixed(6)}</span>
                      <span className="text-lg text-muted-foreground">{displayCurrency}</span>
                    </div>
                  </div>
                  {isAuction && timeLeft && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">{t("ends_in")}</div>
                      <div className="flex items-center gap-1 text-orange-500 font-bold">
                        <Clock className="w-4 h-4" />
                        {timeLeft}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isOwner ? (
                    <>
                      <Button
                        onClick={handleDelist}
                        variant="destructive"
                        className="flex-1"
                      >
                        <Tag className="w-4 h-4 mr-2" />
                        {t("delist_nft")}
                      </Button>
                    </>
                  ) : (
                    <>
                      {isForSale && (
                        <Button
                          onClick={handlePurchase}
                          disabled={isPurchasing}
                          className={`flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90`}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {isPurchasing ? "Processing..." : "Buy Now"}
                        </Button>
                      )}
                      {user && !isOwner && selectedToken.currentListing && offersEnabled && (
                        <Button
                          onClick={() => setShowOfferModal(true)}
                          variant="outline"
                          className="flex-1 border-2 hover:border-primary/50"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          {t("make_offer")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {!selectedToken.currentListing && isOwner && (
              <Button
                onClick={() => router.push(`/nft/token/${tokenId}/list`)}
                className={`w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90`}
              >
                <Tag className="w-4 h-4 mr-2" />
                {t("list_for_sale")}
              </Button>
            )}

            {/* Tabs - Compact */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3 h-auto p-1 bg-muted/50">
                <TabsTrigger value="details" className="text-xs py-2">Details</TabsTrigger>
                <TabsTrigger value="offers" className="text-xs py-2">Offers</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs py-2">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-3 mt-4">
                {/* Description */}
                {selectedToken.description && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Description
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedToken.description}
                    </p>
                  </div>
                )}

                {/* Properties */}
                {selectedToken.attributes && Array.isArray(selectedToken.attributes) && selectedToken.attributes.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Properties
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedToken.attributes.map((attr: any, idx: number) => (
                        <div key={idx} className="bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="text-xs text-primary font-medium">{attr.trait_type}</div>
                          <div className="text-sm font-bold mt-1">{attr.value}</div>
                          {attr.rarity && (
                            <div className="text-xs text-muted-foreground mt-1">{attr.rarity}% rarity</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Token Details */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {t("token_details")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tExt("contract_address")}</span>
                      <button
                        onClick={() => copyToClipboard(selectedToken.collection?.contractAddress || "")}
                        className="flex items-center gap-1 text-primary hover:opacity-80"
                      >
                        <span className="font-mono text-xs">
                          {selectedToken.collection?.contractAddress?.slice(0, 6)}...{selectedToken.collection?.contractAddress?.slice(-4)}
                        </span>
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tExt("token_id")}</span>
                      <span className="font-mono text-xs">{selectedToken.tokenId || selectedToken.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("token_standard")}</span>
                      <span className="font-semibold">ERC-721</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blockchain</span>
                      <span className="font-semibold">BNB Smart Chain</span>
                    </div>
                    {selectedToken.collectionId && selectedToken.tokenId && (
                      <>
                        <Separator className="my-3" />
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">{t("metadata_url")}</span>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => {
                                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000";
                                const metadataUrl = `${siteUrl}/api/nft/metadata/${selectedToken.collectionId}/${selectedToken.tokenId}`;
                                window.open(metadataUrl, '_blank');
                              }}
                              className="flex items-center gap-1 text-primary hover:opacity-80 text-xs"
                            >
                              <span>{t("view_json")}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000";
                                const metadataUrl = `${siteUrl}/api/nft/metadata/${selectedToken.collectionId}/${selectedToken.tokenId}`;
                                copyToClipboard(metadataUrl);
                              }}
                              className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs"
                            >
                              <span className="font-mono">
                                .../metadata/{selectedToken.tokenId}
                              </span>
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                          <p className="flex items-start gap-1">
                            <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{t("this_is_the_metadata_url_that")}</span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="offers" className="mt-4">
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <Tag className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">{t("no_offers_yet")}</p>
                  {user && !isOwner && selectedToken.currentListing && (
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOfferModal(true)}
                    className="mt-3"
                  >
                    {t("make_an_offer")}
                  </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="space-y-3">
                    {selectedToken.priceHistory?.slice(0, 5).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{item.event}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{item.price} {item.currency || displayCurrency}</div>
                        </div>
                      </div>
                    ))}
                    {(!selectedToken.priceHistory || selectedToken.priceHistory.length === 0) && (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                        <p className="text-sm text-muted-foreground">{tExt("no_activity_yet")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialView="login" />
      {showOfferModal && (
        <MakeOfferModal
          token={selectedToken}
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </div>
  );
}
