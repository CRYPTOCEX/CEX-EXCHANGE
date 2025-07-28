"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Heart, 
  Eye, 
  TrendingUp,
  Users,
  Package,
  Verified,
  ExternalLink 
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import type { NftCollection } from "@/types/nft";

interface CollectionCardProps {
  collection: NftCollection;
  showActions?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function CollectionCard({ 
  collection, 
  showActions = true, 
  size = "md" 
}: CollectionCardProps) {
  const t = useTranslations("nft/components/collection-card");
  const { addToFavorites, removeFromFavorites } = useNftStore();
  const [isLiked, setIsLiked] = useState((collection as any).isFavorited || false);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLiked) {
      await removeFromFavorites(undefined, collection.id);
    } else {
      await addToFavorites(undefined, collection.id);
    }
    setIsLiked(!isLiked);
  }, [isLiked, collection.id, addToFavorites, removeFromFavorites]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-500";
      case "PENDING": return "bg-yellow-500";
      case "INACTIVE": return "bg-gray-500";
      case "SUSPENDED": return "bg-red-500";
      default: return "bg-gray-500";
    }
  }, []);

  const cardSizes = {
    sm: "w-80",
    md: "w-96",
    lg: "w-full max-w-md"
  };

  return (
    <Card className={`${cardSizes[size]} group hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className="relative">
        {/* Banner Image */}
        <div className="h-32 relative bg-muted overflow-hidden rounded-t-lg">
          {collection.bannerImage ? (
            <Image
              src={collection.bannerImage}
              alt={`${collection.name} banner`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-secondary/20" />
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <Badge 
              variant="secondary" 
              className={`${getStatusColor(collection.status)} text-white border-0`}
            >
              {collection.status}
            </Badge>
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
        </div>

        {/* Logo Image - Overlapping */}
        <div className="absolute -bottom-8 left-4">
          <Avatar className="h-16 w-16 border-4 border-background">
            <AvatarImage src={collection.logoImage} />
            <AvatarFallback className="text-lg font-bold">
              {collection.symbol || collection.name[0]}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <CardContent className="pt-12 p-6">
        {/* Collection Name & Verification */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-xl line-clamp-1">
            {collection.name}
          </h3>
          {collection.isVerified && (
            <Verified className="h-5 w-5 text-blue-500 flex-shrink-0" />
          )}
        </div>

        {/* Symbol */}
        <p className="text-sm text-muted-foreground mb-2">
          {collection.symbol} • {collection.standard}
        </p>

        {/* Description */}
        {collection.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {collection.description}
          </p>
        )}

        {/* Creator */}
        {collection.creator && (
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="h-6 w-6">
              <AvatarImage src={collection.creator.avatar} />
              <AvatarFallback className="text-xs">
                {collection.creator.firstName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {t("by")} {collection.creator.firstName} {collection.creator.lastName}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Package className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium">{collection.totalSupply || 0}</p>
            <p className="text-xs text-muted-foreground">{t("Items")}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium">{(collection as any).owners || 0}</p>
            <p className="text-xs text-muted-foreground">{t("Owners")}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium">
              {(collection as any).floorPrice ? `${(collection as any).floorPrice} ETH` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{t("Floor")}</p>
          </div>
        </div>

        {/* Blockchain & Network */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>{collection.chain}</span>
          <span>{collection.network}</span>
        </div>

        {/* Price Info */}
        {collection.mintPrice && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("mint_price")}</span>
              <span className="font-medium">
                {collection.mintPrice} {collection.currency}
              </span>
            </div>
            {collection.maxSupply && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">{t("max_supply")}</span>
                <span className="text-sm">{collection.maxSupply}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="p-6 pt-0">
          <div className="flex gap-2 w-full">
            <Link href={`/nft/collection/${collection.id}`} className="flex-1">
              <Button className="w-full">
                {t("view_collection")}
              </Button>
            </Link>
            
            <Link href={`/nft/collection/${collection.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardFooter>
      )}
    </Card>
  );
} 