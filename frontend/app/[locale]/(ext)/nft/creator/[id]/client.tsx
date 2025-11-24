"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Crown, 
  Star, 
  Award, 
  Verified,
  Users,
  Package,
  TrendingUp,
  Eye,
  Heart,
  ExternalLink,
  Share2,
  Copy,
  Calendar
} from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatNumber, formatCrypto, formatRelativeTime } from "@/utils/format";
import { useUserStore } from "@/store/user";

interface PublicCreatorClientProps {
  creatorId: string;
}

export default function PublicCreatorClient({ creatorId }: PublicCreatorClientProps) {
  const t = useTranslations("nft/creator/profile");
  const { user } = useUserStore();
  
  const [creator, setCreator] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("collections");

  useEffect(() => {
    fetchCreatorData();
  }, [creatorId]);

  const fetchCreatorData = async () => {
    setLoading(true);
    
    // Fetch creator profile
    const { data: creatorData, error: creatorError } = await $fetch({
      url: `/api/nft/creator/${creatorId}`,
      method: "GET",
    });

    if (!creatorError && creatorData) {
      
      // Ensure we have minimum required data structure
      const processedCreator = {
        ...creatorData,
        user: {
          id: creatorData.user?.id || 'unknown',
          firstName: creatorData.user?.firstName || '',
          lastName: creatorData.user?.lastName || '',
          avatar: creatorData.user?.avatar || null,
          ...creatorData.user
        },
        stats: {
          totalSales: creatorData.stats?.totalSales || creatorData.totalSales || 0,
          totalVolume: creatorData.stats?.totalVolume || creatorData.totalVolume || 0,
          collectionsCount: creatorData.stats?.collectionsCount || 0,
          tokensCount: creatorData.stats?.tokensCount || 0,
          recentActivityCount: creatorData.stats?.recentActivityCount || 0,
          ...creatorData.stats
        },
        followerCount: creatorData.followerCount || 0,
        displayName: creatorData.displayName || null,
        bio: creatorData.bio || null,
        banner: creatorData.banner || null,
        verificationTier: creatorData.verificationTier || null,
        createdAt: creatorData.createdAt || new Date().toISOString(),
        profilePublic: creatorData.profilePublic !== false, // default to true
      };
      
      setCreator(processedCreator);
    }

    // Fetch creator's collections
    const { data: collectionsData, error: collectionsError } = await $fetch({
      url: "/api/nft/collection",
      method: "GET",
      params: { creatorId },
    });

    if (!collectionsError && collectionsData) {
      setCollections(Array.isArray(collectionsData) ? collectionsData : collectionsData.data || []);
    }

    // Fetch creator's tokens
    const { data: tokensData, error: tokensError } = await $fetch({
      url: "/api/nft/token",
      method: "GET",
      params: { creatorId, limit: 12 },
    });

    if (!tokensError && tokensData) {
      setTokens(Array.isArray(tokensData) ? tokensData : tokensData.data || []);
    }
    
    setLoading(false);
  };

  const getVerificationBadge = (tier: string) => {
    switch (tier) {
      case "GOLD":
        return (
          <Badge className="bg-yellow-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            {t("gold_creator")}
          </Badge>
        );
      case "SILVER":
        return (
          <Badge className="bg-gray-400 text-white">
            <Star className="h-3 w-3 mr-1" />
            {t("silver_creator")}
          </Badge>
        );
      case "BRONZE":
        return (
          <Badge className="bg-orange-600 text-white">
            <Award className="h-3 w-3 mr-1" />
            {t("bronze_creator")}
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge className="bg-blue-500 text-white">
            <Verified className="h-3 w-3 mr-1" />
            {t("verified_creator")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Creator Profile Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The creator profile you're looking for doesn't exist or is private.
        </p>
        <Link href="/nft">
          <Button>Browse NFTs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-64 bg-gradient-to-r from-primary/20 to-primary/5">
        {creator.banner && (
          <Image
            src={creator.banner}
            alt="Creator Banner"
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={creator.user?.avatar} />
                <AvatarFallback className="text-2xl">
                  {creator.user?.firstName?.[0] || 'A'}{creator.user?.lastName?.[0] || 'C'}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">
                    {creator.displayName || 
                     (creator.user?.firstName || creator.user?.lastName 
                       ? `${creator.user.firstName || ''} ${creator.user.lastName || ''}`.trim()
                       : 'Anonymous Creator')}
                  </h1>
                  {creator.verificationTier && getVerificationBadge(creator.verificationTier)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {formatNumber(creator.followerCount || 0)} {t("followers")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {t("Joined")} {formatRelativeTime(creator.createdAt || creator.user?.createdAt)}
                  </span>
                </div>

                {creator.bio ? (
                  <p className="max-w-2xl text-muted-foreground">
                    {creator.bio}
                  </p>
                ) : user?.id === creator.userId ? (
                  <p className="max-w-2xl text-muted-foreground italic">
                    {t("no_bio_own_profile")} 
                    <Link href="/nft/creator/profile" className="text-primary hover:underline ml-1">
                      {t("add_bio_now")}
                    </Link>
                  </p>
                ) : null}


              </div>
            </div>

            <div className="flex items-center gap-2">
              {user?.id === creator.userId ? (
                <Link href="/nft/creator/profile">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("edit_profile")}
                  </Button>
                </Link>
              ) : (
                <Button>
                  <Heart className="h-4 w-4 mr-2" />
                  {t("Follow")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={copyProfileUrl}>
                <Copy className="h-4 w-4 mr-2" />
                {t("copy_link")}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                {t("Share")}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{formatNumber(creator.stats?.totalSales || creator.totalSales || 0)}</p>
              <p className="text-sm text-muted-foreground">{t("total_sales")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{formatCrypto(creator.stats?.totalVolume || creator.totalVolume || 0)}</p>
              <p className="text-sm text-muted-foreground">{t("total_volume")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{formatNumber(creator.stats?.collectionsCount || collections.length)}</p>
              <p className="text-sm text-muted-foreground">{t("Collections")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{formatNumber(creator.stats?.tokensCount || tokens.length)}</p>
              <p className="text-sm text-muted-foreground">{t("nfts_created")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collections">{t("Collections")} ({collections.length})</TabsTrigger>
            <TabsTrigger value="created">{t("Created")} ({tokens.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="space-y-6">
            {collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <Card key={collection.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/nft/collections/${collection.slug}`}>
                      <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                        {collection.logoImage && (
                          <Image
                            src={collection.logoImage}
                            alt={collection.name}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{collection.name}</h3>
                        {collection.isVerified && (
                          <Verified className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">{t("Items")}</p>
                          <p className="font-medium">{formatNumber(collection.totalItems || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("Floor")}</p>
                          <p className="font-medium">{collection.floorPrice || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("Volume")}</p>
                          <p className="font-medium">{formatCrypto(collection.volumeTraded || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("no_collections_created_yet")}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="created" className="space-y-6">
            {tokens.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tokens.map((token) => (
                  <Card key={token.id} className="hover:shadow-lg transition-shadow">
                    <Link href={`/nft/token/${token.id}`}>
                      <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                        {token.image && (
                          <Image
                            src={token.image}
                            alt={token.name}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        )}
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1 line-clamp-1">{token.name}</h3>
                      {token.collection && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {token.collection.name}
                        </p>
                      )}
                      {token.currentListing && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {token.currentListing.type === "AUCTION" ? t("current_bid") : t("Price")}
                            </p>
                            <p className="font-bold text-sm">
                              {token.currentListing.price} {token.currentListing.currency}
                            </p>
                          </div>
                          <Badge variant={token.currentListing.type === "AUCTION" ? "secondary" : "default"} className="text-xs">
                            {token.currentListing.type === "AUCTION" ? t("Auction") : t("Fixed")}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(token.views || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {formatNumber(token.likes || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("no_nfts_created_yet")}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 