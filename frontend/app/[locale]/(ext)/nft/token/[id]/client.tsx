"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Gavel,
  ShoppingCart,
  HandHeart,
  Settings,
  MoreHorizontal,
  Copy,
  Timer,
  TrendingUp,
  Activity,
  Users,
  Verified 
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
import LoadingSpinner from "@/components/ui/loading-spinner";
import { AuthModal } from "@/components/auth/auth-modal";
import { toast } from "sonner";
import ListNFTModal from "../../components/modals/list-nft-modal";
import MakeOfferModal from "../../components/modals/make-offer-modal";

interface NFTTokenClientProps {
  tokenId: string;
}

export default function NFTTokenClient({ tokenId }: NFTTokenClientProps) {
  const t = useTranslations("nft/token");
  const router = useRouter();
  const { user } = useUserStore();
  const { 
    selectedToken, 
    loading, 
    fetchTokenById, 
    addToFavorites, 
    removeFromFavorites,
    buyToken,
  } = useNftStore();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [showListModal, setShowListModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
            setTimeLeft(`${days}d ${hours}h ${minutes}m`);
          } else if (hours > 0) {
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
          } else {
            setTimeLeft(`${minutes}m ${seconds}s`);
          }
        } else {
          setTimeLeft(t("auction_ended"));
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [selectedToken?.currentListing]);

  const handleLike = async () => {
    if (!user) {
      toast.error(t("please_sign_in_to_add_to_favorites"));
      setIsAuthModalOpen(true);
      return;
    }

    if (isLiked) {
      await removeFromFavorites(tokenId);
      setLikesCount(prev => prev - 1);
    } else {
      await addToFavorites(tokenId);
      setLikesCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error(t("please_sign_in_to_purchase_nfts"));
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedToken?.currentListing) {
      // In real implementation, this would trigger wallet connection and transaction
      const mockTransactionHash = "0x" + Math.random().toString(16).substr(2, 64);
      await buyToken(selectedToken.currentListing.id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedToken) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("nft_not_found")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("the_nft_youre_looking")}
        </p>
        <Link href="/nft">
          <Button>{t("browse_nfts")}</Button>
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === selectedToken.ownerId;
  const isListed = selectedToken.isListed && selectedToken.currentListing;
  const isAuction = selectedToken.currentListing?.type === "AUCTION";
  const hasEnded = isAuction && selectedToken.currentListing?.endTime && 
    new Date() > new Date(selectedToken.currentListing.endTime);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Image */}
        <div className="space-y-4">
          <div className="aspect-square relative bg-muted rounded-xl overflow-hidden">
            {selectedToken.image ? (
              <Image
                src={selectedToken.image}
                alt={selectedToken.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🖼️</span>
              </div>
            )}
          </div>

          {/* Token Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("token_details")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("token_id")}</span>
                <span className="font-mono">#{selectedToken.tokenId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Blockchain")}</span>
                <span>{selectedToken.collection?.chain || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Standard")}</span>
                <span>{selectedToken.collection?.standard}</span>
              </div>
              {selectedToken.rarity && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Rarity")}</span>
                  <Badge variant="secondary">{selectedToken.rarity}</Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Views")}</span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {selectedToken.views || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Info & Actions */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            {selectedToken.collection && (
              <Link 
                href={`/nft/collection/${selectedToken.collection.id}`}
                className="text-primary hover:underline flex items-center gap-2 mb-2"
              >
                {selectedToken.collection.name}
                {selectedToken.collection.isVerified && (
                  <Verified className="h-4 w-4 text-blue-500" />
                )}
              </Link>
            )}
            
            <div className="flex items-start justify-between">
              <h1 className="text-3xl font-bold">{selectedToken.name}</h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLike}
                  className={isLiked ? "text-red-500" : ""}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {likesCount}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => copyToClipboard(window.location.href)}>
                      <Copy className="h-4 w-4 mr-2" />
                      {t("copy_link")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4 mr-2" />
                      {t("Share")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t("view_on_explorer")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {selectedToken.description && (
              <p className="text-muted-foreground mt-3">
                {selectedToken.description}
              </p>
            )}
          </div>

          {/* Owner & Creator */}
          <div className="grid grid-cols-2 gap-4">
            {selectedToken.creator && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("Creator")}</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedToken.creator.avatar} />
                    <AvatarFallback>
                      {selectedToken.creator.firstName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {selectedToken.creator.firstName} {selectedToken.creator.lastName}
                  </span>
                </div>
              </div>
            )}

            {selectedToken.owner && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("Owner")}</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedToken.owner.avatar} />
                    <AvatarFallback>
                      {selectedToken.owner.firstName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {isOwner ? t("You") : `${selectedToken.owner.firstName} ${selectedToken.owner.lastName}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Actions */}
          {isListed && selectedToken.currentListing && (
            <Card className="border-2">
              <CardContent className="p-6">
                {isAuction ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("current_bid")}</p>
                        <p className="text-2xl font-bold">
                          {selectedToken.currentListing.price} {selectedToken.currentListing.currency}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {hasEnded ? t("auction_ended") : t("time_left")}
                        </p>
                        <p className="font-medium">{timeLeft}</p>
                      </div>
                    </div>

                    {!hasEnded && (
                      <div className="flex gap-2">
                        {!isOwner && (
                          <Button className="flex-1">
                            <Gavel className="h-4 w-4 mr-2" />
                            {t("place_bid")}
                          </Button>
                        )}
                        {selectedToken.currentListing.buyNowPrice && !isOwner && (
                          <Button variant="outline" onClick={handleBuyNow}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {t("buy_now")} ({selectedToken.currentListing.buyNowPrice} {selectedToken.currentListing.currency})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("Price")}</p>
                      <p className="text-2xl font-bold">
                        {selectedToken.currentListing.price} {selectedToken.currentListing.currency}
                      </p>
                    </div>

                    {!isOwner && (
                      <Button className="w-full" onClick={handleBuyNow}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {t("buy_now")}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isOwner && !isListed && (
              <Button onClick={() => setShowListModal(true)}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {t("list_for_sale")}
              </Button>
            )}

            {!isOwner && (
              <Button 
                variant="outline" 
                onClick={() => {
                  if (!user) {
                    toast.error(t("please_sign_in_to_make_offers"));
                    setIsAuthModalOpen(true);
                    return;
                  }
                  setShowOfferModal(true);
                }}
              >
                <HandHeart className="h-4 w-4 mr-2" />
                {t("make_offer")}
              </Button>
            )}

            {isOwner && isListed && (
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                {t("manage_listing")}
              </Button>
            )}
          </div>

          {/* Attributes */}
          {selectedToken.attributes && (
            <Card>
              <CardHeader>
                <CardTitle>{t("Attributes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {selectedToken.attributes?.map((attr: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3 text-center">
                      <p className="text-sm text-muted-foreground">{attr.trait_type}</p>
                      <p className="font-medium">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity, Offers, etc. */}
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">{t("Activity")}</TabsTrigger>
              <TabsTrigger value="offers">{t("Offers")}</TabsTrigger>
              <TabsTrigger value="details">{t("Details")}</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4">
              <p className="text-center text-muted-foreground py-8">
                {t("no_activity_yet")}
              </p>
            </TabsContent>

            <TabsContent value="offers" className="space-y-4">
              <p className="text-center text-muted-foreground py-8">
                {t("no_offers_yet")}
              </p>
            </TabsContent>

            <TabsContent value="details">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("contract_address")}</span>
                  <span className="font-mono text-sm">
                    {selectedToken.collection?.contractAddress || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("token_standard")}</span>
                  <span>{selectedToken.collection?.standard}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Blockchain")}</span>
                  <span>{selectedToken.collection?.chain || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Metadata")}</span>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {t("View")}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Similar NFTs - Placeholder for future implementation */}

      {/* Modals */}
      {showListModal && (
        <ListNFTModal
          isOpen={showListModal}
          onClose={() => setShowListModal(false)}
          token={selectedToken}
        />
      )}

      {showOfferModal && (
        <MakeOfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          token={selectedToken}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView="login"
      />
    </div>
  );
} 