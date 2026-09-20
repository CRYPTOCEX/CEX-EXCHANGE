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
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { formatNumber, formatCrypto, formatRelativeTime } from "@/utils/format";
import { useUserStore } from "@/store/user";
import { MoneyFigure } from "@/components/ui/money-figure";
import { CurrencyIcon } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { CollectionAvatar } from "@/app/[locale]/(ext)/nft/components/shared/collection-avatar";
import { publicName } from "@/utils/display-name";

interface PublicCreatorClientProps {
  creatorId: string;
}

export default function PublicCreatorClient({ creatorId }: PublicCreatorClientProps) {
  const t = useTranslations("ext_nft");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
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
          /* `firstName: ''` and `lastName: ''` were seeded here for one
             reader: the hand-built `${firstName} ${lastName}` heading below.
             The surname has no reader left on a public profile, and defaulting
             the key put it back onto a payload the server had just deleted it
             from. */
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
          <Badge className="bg-warning text-warning-foreground">
            <Crown className="h-3 w-3 mr-1" />
            {tExt("gold_creator")}
          </Badge>
        );
      case "SILVER":
        return (
          <Badge className="bg-muted text-foreground">
            <Star className="h-3 w-3 mr-1" />
            {tExt("silver_creator")}
          </Badge>
        );
      case "BRONZE":
        return (
          <Badge className="bg-warning text-warning-foreground">
            <Award className="h-3 w-3 mr-1" />
            {tExt("bronze_creator")}
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge className="bg-primary text-primary-foreground">
            <Verified className="h-3 w-3 mr-1" />
            {tExt("verified_creator")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  /*
    THE SPINNER THAT USED TO BE HERE
    ================================
    `if (loading) return <div className="container py-12"><LoadingSpinner/></div>`
    replaced a public creator profile — a 256px banner, a 128px avatar that
    overlaps it by 64px, a four-up stat row, a two-tab bar and a grid of
    collection cards — with a spinner in a 96px-tall container. This is a
    shareable link, so it is frequently the first page of a session and the
    document went from ~200px to several thousand in one frame.

    Everything except the figures and the names is knowable: the banner box, the
    avatar frame, the stat labels, the tab bar and both grid definitions are all
    literal markup here.

    `!loading && !creator` below: "not fetched" and "no such creator" were the
    same test, so the 404 copy was one render away from being what every visitor
    saw first.
  */
  /** The fetch RESOLVED and there is no such creator. Not a pending state. */
  const creatorNotFound = !loading && !creator;

  if (creatorNotFound) {
    return (
      /* `py-12` is 48px against a 64px fixed header, so this replaced the whole
         page — banner and all — with a heading sitting behind the navbar. */
      <div className="container mx-auto pt-header-clear pb-12 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("creator_profile_not_found")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("the_creator_profile_youre_looking_for")}
        </p>
        <Link href="/nft">
          <Button>{t("browse_nfts_1")}</Button>
        </Link>
      </div>
    );
  }

  /**
   * The creator as the RENDER sees it — never null, possibly empty.
   *
   * The markup below used to sit behind `if (!creator) return`, so it reads
   * `creator.banner`, `creator.stats?.…` and so on unguarded in about twenty
   * places. One `??` here makes all twenty safe rather than twenty separate
   * `?.`s that the next edit would have to remember.
   */
  const profile = creator ?? {};

  /*
    The creator's public name, resolved once for the heading and the avatar.

    The heading assembled `${firstName} ${lastName}` from the nested user —
    that pair is the name on the identity document uploaded for KYC, and this
    page answers anonymous callers. `publicName` prefers the handle the server
    already resolved and reduces a surname that reaches the browser to an
    initial, so a response that skipped redaction can no longer put a legal
    surname in the `h1`.
  */
  const displayName =
    String(profile.displayName ?? "").trim() ||
    publicName(profile.user, t("anonymous_creator"));

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative h-64 bg-linear-to-r from-primary/20 to-primary/5">
        {profile.banner && (
          <Image
            src={profile.banner}
            alt={tExt("creator_banner")}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-overlay/20" />
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={profile.user?.avatar} />
                <AvatarFallback className="text-2xl">
                  {/* `firstName[0]` + `lastName[0]`, i.e. an initial of the
                      surname a stranger is not shown — and "AC" whenever the
                      row had neither, which read as somebody's initials rather
                      than as a missing name. One initial, off the same public
                      name as the heading. */}
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">
                    {/* Inside the `h1`, so the reserved box is measured at
                        `text-3xl font-bold`. Without it the heading printed
                        "Anonymous Creator" — the no-data fallback — for the
                        length of the fetch, on a page whose whole purpose is to
                        say whose profile this is. */}
                    <Loadable loading={loading} chars={16}>
                      {displayName}
                    </Loadable>
                  </h1>
                  {profile.verificationTier && getVerificationBadge(profile.verificationTier)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <Loadable loading={loading} placeholder="1,234">
                      {formatNumber(profile.followerCount || 0)}
                    </Loadable>{" "}
                    {tExt("followers")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {tCommon("joined")}{" "}
                    <Loadable loading={loading} placeholder="2 years ago">
                      {formatRelativeTime(profile.createdAt || profile.user?.createdAt)}
                    </Loadable>
                  </span>
                </div>

                {profile.bio ? (
                  <p className="max-w-2xl text-muted-foreground">
                    {profile.bio}
                  </p>
                ) : user?.id === profile.userId ? (
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
              {user?.id === profile.userId ? (
                <Link href="/nft/creator/profile">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {tCommon("edit_profile")}
                  </Button>
                </Link>
              ) : (
                <Button>
                  <Heart className="h-4 w-4 mr-2" />
                  {t("follow")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={copyProfileUrl}>
                <Copy className="h-4 w-4 mr-2" />
                {tExt("copy_link")}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                {tExt("share")}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats. Four cards, four static labels, four unknown figures — so the
            cards, the grid and the labels render immediately and only the
            numbers carry a placeholder. Printing `0` four times would have been
            a claim about the creator, not a neutral default. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                <Loadable loading={loading} placeholder="1,234">{formatNumber(profile.stats?.totalSales || profile.totalSales || 0)}</Loadable>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{tCommon("total_sales")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                <Loadable loading={loading} placeholder="12.34">
                  <MoneyFigure value={formatCrypto(profile.stats?.totalVolume || profile.totalVolume || 0)} />
                </Loadable>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{tCommon("total_volume")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                <Loadable loading={loading} placeholder="12">{formatNumber(profile.stats?.collectionsCount || collections.length)}</Loadable>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{t("collections")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                <Loadable loading={loading} placeholder="12">{formatNumber(profile.stats?.tokensCount || tokens.length)}</Loadable>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{tExt("nfts_created")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            {/* The words are known now; only the counts are not. */}
            <TabsTrigger value="collections">
              {t("collections")} (<Loadable loading={loading} placeholder="0" radius="rounded-xs">{collections.length}</Loadable>)
            </TabsTrigger>
            <TabsTrigger value="created">
              {tCommon("created")} (<Loadable loading={loading} placeholder="0" radius="rounded-xs">{tokens.length}</Loadable>)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="space-y-6">
            {/* Loading is not emptiness: `collections` is `[]` throughout the
                fetch, so this tab used to show the 208px "No collections
                created yet" panel and then replace it with rows of ~330px
                cards. The pending branch is the REAL
                `md:grid-cols-2 lg:grid-cols-3` grid with a fixed three
                children, so only the child count settles. */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <SkeletonBlock className="aspect-video rounded-t-lg rounded-b-none" />
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2"><SkeletonText chars={18} /></h3>
                      <p className="text-sm text-muted-foreground mb-4"><SkeletonText chars={54} /></p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">{tExt("items")}</p>
                          <p className="font-mono font-medium tabular-nums"><SkeletonText placeholder="123" /></p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{tExt("floor")}</p>
                          <p className="font-mono font-medium tabular-nums"><SkeletonText placeholder="1.23" /></p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{tCommon("volume")}</p>
                          <p className="font-medium"><SkeletonText placeholder="12.34" /></p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection) => (
                  <Card key={collection.id} interactive>
                    <Link href={`/nft/collection/${collection.slug}`}>
                      <div className="aspect-video bg-muted rounded-t-lg overflow-hidden flex items-center justify-center">
                        <CollectionAvatar
                          src={collection.logoImage}
                          name={collection.name}
                          size={96}
                          className="hover:scale-105 transition-transform"
                        />
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{collection.name}</h3>
                        {collection.isVerified && (
                          <Verified className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {collection.description}
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">{tExt("items")}</p>
                          <p className="font-mono font-medium tabular-nums">{formatNumber(collection.totalItems || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{tExt("floor")}</p>
                          <p className="font-mono font-medium tabular-nums">{collection.floorPrice || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{tCommon("volume")}</p>
                          <p className="font-medium"><MoneyFigure value={formatCrypto(collection.volumeTraded || 0)} /></p>
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
            {/* Same three-state split as the collections tab; the token card
                leads with a square image rather than a 16:9 banner. */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <SkeletonBlock className="aspect-square rounded-t-lg rounded-b-none" />
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-1"><SkeletonText chars={16} /></h3>
                      <p className="text-sm text-muted-foreground mb-2"><SkeletonText chars={12} /></p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <SkeletonText placeholder="1,234" />
                        <SkeletonText placeholder="123" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : tokens.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tokens.map((token) => (
                  <Card key={token.id} interactive>
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
                              {token.currentListing.type === "AUCTION" ? tCommon("current_bid") : tCommon("price")}
                            </p>
                            <p className="font-bold text-sm flex items-center gap-1.5">
                              <CurrencyIcon currency={token.currentListing.currency} size={14} />
                              {token.currentListing.price} {token.currentListing.currency}
                            </p>
                          </div>
                          <Badge variant={token.currentListing.type === "AUCTION" ? "secondary" : "default"} className="text-xs">
                            {token.currentListing.type === "AUCTION" ? tCommon("auction") : tCommon("fixed")}
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