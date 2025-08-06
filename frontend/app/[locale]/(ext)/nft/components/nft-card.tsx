"use client";

import { useState, useCallback } from "react";
import { NFTCardImage } from "@/components/nft/optimized-image";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  Eye, 
  ShoppingCart, 
  Timer, 
  Verified,
  ExternalLink 
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import { CountdownTimer } from "@/components/ui/countdown-timer";
import type { NftToken } from "@/types/nft";

interface NFTCardProps {
  token: NftToken;
  showActions?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function NFTCard({ 
  token, 
  showActions = true, 
  size = "md" 
}: NFTCardProps) {
  const t = useTranslations("nft/components/nft-card");
  const { addToFavorites, removeFromFavorites } = useNftStore();
  const [isLiked, setIsLiked] = useState(token.isFavorited || false);
  const [likesCount, setLikesCount] = useState(token.likes || 0);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLiked) {
      await removeFromFavorites(token.id);
      setLikesCount(prev => prev - 1);
    } else {
      await addToFavorites(token.id);
      setLikesCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  }, [isLiked, token.id, addToFavorites, removeFromFavorites]);

  const getRarityColor = useCallback((rarity?: string) => {
    switch (rarity) {
      case "LEGENDARY": return "bg-yellow-500";
      case "EPIC": return "bg-purple-500";
      case "RARE": return "bg-blue-500";
      case "UNCOMMON": return "bg-green-500";
      default: return "bg-gray-500";
    }
  }, []);

  const cardSizes = {
    sm: "w-64",
    md: "w-80",
    lg: "w-96"
  };

  return (
    <Card className={`${cardSizes[size]} group hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className="relative overflow-hidden rounded-t-lg">
        {/* NFT Image */}
        <div className="aspect-square relative bg-muted">
          {token.image ? (
            <NFTCardImage
              src={token.image}
              alt={token.name}
              className="group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
              <span className="text-4xl">🖼️</span>
            </div>
          )}
        </div>

        {/* Overlay Actions */}
        <div className="absolute top-3 right-3 flex gap-2">
          {token.rarity && (
            <Badge 
              variant="secondary" 
              className={`${getRarityColor(token.rarity)} text-white border-0`}
            >
              {token.rarity}
            </Badge>
          )}
        </div>

        {/* Like Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-3 left-3 bg-black/20 hover:bg-black/40 text-white"
          onClick={handleLike}
        >
          <Heart 
            className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} 
          />
        </Button>

        {/* Quick Actions Overlay */}
        {showActions && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Link href={`/nft/token/${token.id}`}>
              <Button variant="secondary" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                {t("View")}
              </Button>
            </Link>
            {token.isListed && (
              <Button size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t("buy_now")}
              </Button>
            )}
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Collection Info */}
        {token.collection && (
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={token.collection.logoImage} />
              <AvatarFallback className="text-xs">
                {token.collection.symbol}
              </AvatarFallback>
            </Avatar>
            <Link 
              href={`/nft/collection/${token.collection.id}`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {token.collection.name}
              {token.collection.isVerified && (
                <Verified className="h-3 w-3 inline ml-1 text-blue-500" />
              )}
            </Link>
          </div>
        )}

        {/* Token Name */}
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">
          {token.name}
        </h3>

        {/* Creator */}
        {token.creator && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-5 w-5">
              <AvatarImage src={token.creator.avatar} />
              <AvatarFallback className="text-xs">
                {token.creator.firstName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {t("by")} {token.creator.firstName} {token.creator.lastName}
            </span>
          </div>
        )}

        {/* Price */}
        {token.currentListing && (
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">{t("current_price")}</p>
              <p className="font-bold text-lg">
                {token.currentListing.price} {token.currentListing.currency}
              </p>
            </div>
            {token.currentListing.type === "AUCTION" && token.currentListing.endTime && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("ends_in")}
                </p>
                <CountdownTimer 
                  endTime={token.currentListing.endTime}
                  size="sm"
                  showIcon={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {token.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {likesCount}
            </span>
          </div>
          {token.tokenId && (
            <span className="text-xs">#{token.tokenId}</span>
          )}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="p-4 pt-0">
          {token.isListed && token.currentListing ? (
            <div className="flex gap-2 w-full">
              <Link href={`/nft/token/${token.id}`} className="flex-1">
                <Button className="w-full">
                  {token.currentListing.type === "AUCTION" ? t("place_bid") : t("buy_now")}
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link href={`/nft/token/${token.id}`}>
              <Button variant="outline" className="w-full">
                {t("view_details")}
              </Button>
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
} 