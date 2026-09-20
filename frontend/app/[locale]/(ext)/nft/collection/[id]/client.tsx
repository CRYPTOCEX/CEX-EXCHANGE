"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/utils/format";
import { MoneyFigure } from "@/components/ui/money-figure";
import { CurrencyIcon } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import {
  Shield,
  ExternalLink,
  Search,
  Filter,
  Grid,
  List,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Tag,
  Activity,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Copy,
  Rocket,
  Edit,
  Share2,
  Globe,
  MessageCircle,
  Sparkles,
  Zap,
  Send,
  ShoppingCart,
  FileText,
  Trash2,
  DollarSign,
  Package,
} from "lucide-react";
import { Twitter } from "@/components/ui/brand-icons";
import { publicShortName } from "@/utils/display-name";

interface CollectionDetailClientProps {
  initialCollection: any;
}

/*
 * `metadata` arrives as a STRUCTURE, and used to arrive as TEXT.
 *
 * `nftActivity.metadata` is a `DataTypes.JSON` column whose setter used to
 * stringify before handing the value to Sequelize, so the row held the text of
 * the object and the single-parse getter handed that text straight back. A bare
 * `JSON.parse` here was therefore correct — right up until the setter was fixed.
 *
 * Now the getter returns an object, `/api/nft/activity` puts no attribute
 * restriction on the root model, and `getFiltered` materialises every row with
 * `get({ plain: true })` — which runs the getter. So an object reaches this
 * line, `JSON.parse` coerces it to the string "[object Object]", and throws.
 *
 * That throw is not contained: this runs inside the Activity tab's render map,
 * so it takes the whole collection page to its error boundary — on ANY activity
 * row carrying metadata, not only the two cases below that read a field from it.
 * Repairing the old rows makes it worse rather than better, because it converts
 * the survivors too.
 *
 * Accept both shapes. Old installs and repaired installs both work, and so does
 * a row that somehow holds neither.
 */
const readMetadata = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value) ?? {};
  } catch {
    return {};
  }
};

// Helper function to get activity details
const getActivityDetails = (activity: any) => {
  const metadata = readMetadata(activity.metadata);

  switch (activity.type) {
    case "MINT":
      return {
        icon: Sparkles,
        color: "bg-success",
        title: "Minted",
        /* This description and the transfer one below read `firstName` straight
           off the activity row. A collection page answers anonymous callers, and
           after redaction `firstName` IS the public short form -- but only for
           as long as the activity query keeps selecting `username`. Read raw,
           the first query that forgets prints the KYC given name in the feed
           and nothing here would have said so. */
        description: `${publicShortName(activity.toUser, "Someone")} minted a token`,
      };
    case "TRANSFER":
      return {
        icon: Send,
        color: "bg-primary",
        title: "Transferred",
        description: `From ${publicShortName(activity.fromUser, "Unknown")} to ${publicShortName(activity.toUser, "Unknown")}`,
      };
    case "SALE":
      return {
        icon: ShoppingCart,
        color: `bg-primary`,
        title: "Sold",
        description: `Sold for ${activity.price} ${activity.currency}`,
      };
    case "LIST":
      return {
        icon: Tag,
        color: "bg-warning",
        title: "Listed",
        description: `Listed for ${activity.price} ${activity.currency}`,
      };
    case "DELIST":
      return {
        icon: FileText,
        color: "bg-muted",
        title: "Delisted",
        description: "Listing cancelled",
      };
    case "BID":
      return {
        icon: DollarSign,
        color: `bg-primary`,
        title: "Bid Placed",
        description: `Bid of ${activity.price} ${activity.currency}`,
      };
    case "OFFER":
      return {
        icon: Package,
        color: "from-success to-primary",
        title: "Offer Made",
        description: `Offer of ${activity.price} ${activity.currency}`,
      };
    case "BURN":
      return {
        icon: Trash2,
        color: "from-destructive to-primary",
        title: "Burned",
        description: "Token burned",
      };
    case "COLLECTION_CREATED":
      return {
        icon: Sparkles,
        color: `bg-primary`,
        title: "Collection Created",
        description: `${metadata.collectionName || "Collection"} was created`,
      };
    case "COLLECTION_DEPLOYED":
      return {
        icon: Rocket,
        color: `bg-primary`,
        title: "Contract Deployed",
        description: `Smart contract deployed to ${metadata.chain || "blockchain"}`,
        extraInfo: metadata.contractAddress ? `Contract: ${metadata.contractAddress.slice(0, 6)}...${metadata.contractAddress.slice(-4)}` : null,
      };
    default:
      return {
        icon: Activity,
        color: "bg-muted",
        title: activity.type,
        description: "Activity recorded",
      };
  }
};

export default function CollectionDetailClient({ initialCollection }: CollectionDetailClientProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("ext");

  const [collection, setCollection] = useState(initialCollection);
  const [tokens, setTokens] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  /*
    STARTS TRUE. `fetchTokens` runs from an effect on mount, so a request is
    always in flight at first paint; with `false` the first render had
    `isLoading === false` and `tokens === []`, which put the items tab straight
    into "No items yet — this collection doesn't have any items" for one frame,
    on a page whose whole purpose is showing those items. The spinner covered
    the second render and nothing covered the first.
  */
  const [isLoading, setIsLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recently_created");
  const [filterBy, setFilterBy] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState("items");

  /*
    "No items yet" / "No items found" is a claim about the collection or the
    search, and it becomes true for the whole of every request now that the grid
    renders during load. Named so the `!isLoading` half is visibly part of the
    guard rather than something to tidy away.
  */
  const showEmptyTokens = !isLoading && tokens.length === 0;

  /*
    The stand-in cards. Eight because the grid runs 1/2/3/4-up from base to
    `xl`, and eight is a whole number of rows at each — six would leave a
    two-card orphan at `xl` that re-rags when the real page arrives. `null` IS
    the pending card, so this stays one grid with one card shape.
  */
  const tokenCards: (any | null)[] = isLoading && tokens.length === 0
    ? [null, null, null, null, null, null, null, null]
    : tokens;

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

  const fetchTokens = useCallback(async (loadMore = false) => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        collectionId: collection.id,
        search: searchQuery,
        sortBy,
        page: loadMore ? page + 1 : 1,
        limit: 20,
      };

      if (filterBy !== "all") {
        params.filterBy = filterBy;
      }

      const { data, error } = await $fetch({
        url: `/api/nft/token`,
        params,
        silentSuccess: true,
      });

      if (!error && data) {
        if (loadMore) {
          setTokens(prev => [...prev, ...(data.items || [])]);
          setPage(prev => prev + 1);
        } else {
          setTokens(data.items || []);
          setPage(1);
        }
        // Backend pagination shape: { totalItems, currentPage, perPage, totalPages }
        setHasMore(
          (data.pagination?.currentPage ?? 0) < (data.pagination?.totalPages ?? 0)
        );
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setIsLoading(false);
    }
  }, [collection.id, searchQuery, sortBy, filterBy, page]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/activity`,
        params: {
          collectionId: collection.id,
          limit: 10,
        },
        silentSuccess: true,
      });

      if (!error && data) {
        setActivities(data.items || data.data || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [collection.id]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/collection/${collection.id}/stats`,
        silentSuccess: true,
      });

      if (!error && data) {
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [collection.id]);

  useEffect(() => {
    fetchTokens();
    fetchActivities();
    fetchStats();
  }, [fetchTokens, fetchActivities, fetchStats]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchTokens(true);
    }
  }, [isLoading, hasMore, fetchTokens]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleDeployCollection = async () => {
    if (!collection.id) {
      toast.error(t("collection_id_is_missing"));
      return;
    }

    setIsDeploying(true);
    try {
      toast.info(`${t("initiating_contract_deployment")}…`);

      const { data, error } = await $fetch({
        url: `/api/nft/contract/deploy`,
        method: "POST",
        body: {
          collectionId: collection.id,
          chain: collection.chain || "ETH",
          standard: collection.standard || "ERC721",
          name: collection.name,
          symbol: collection.symbol,
          baseURI: collection.baseURI || "",
          maxSupply: collection.maxSupply || 0,
          royaltyPercentage: collection.royaltyPercentage || 0,
          mintPrice: collection.mintPrice || 0,
          isPublicMint: collection.isPublicMint || false,
        },
      });

      if (error) {
        toast.error((error as any)?.message || t("failed_to_deploy_contract"));
        return;
      }

      if (data) {
        toast.success(t("contract_deployed_successfully"));
        setCollection((prev: any) => ({
          ...prev,
          contractAddress: data.data.contractAddress,
          status: "ACTIVE",
        }));
      }
    } catch (error: any) {
      console.error("Error deploying contract:", error);
      toast.error(t("failed_to_deploy_contract"));
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard"));
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = t("nft_collection", { name: String(collection.name) });
    const text = collection.description || "Check out this NFT collection!";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        toast.success(t("shared_successfully"));
      } catch (error: any) {
        if (error.name !== "AbortError") {
          // Fallback to copy URL
          copyToClipboard(url);
        }
      }
    } else {
      // Fallback to copy URL
      copyToClipboard(url);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      {/* R3: the banner ground is a step on the surface ramp, not a gradient. */}
      <div className="relative h-80 overflow-hidden bg-surface-2">
        {/* Banner Image */}
        {collection.bannerImage ? (
          <>
            <img
              src={collection.bannerImage}
              alt={collection.name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-linear-to-t from-overlay/90 via-overlay/50 to-overlay/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-surface-3" />
        )}

        {/* Collection Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Logo */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-border shadow-xl">
                  <AvatarImage src={collection.logoImage} />
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {collection.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {collection.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 shadow-lg ring-2 ring-card">
                    <Shield className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Collection Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                    {collection.name}
                  </h1>
                  {collection.isVerified && (
                    <Badge className="bg-primary text-primary-foreground border-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {collection.contractAddress ? (
                    <Badge className="bg-success text-success-foreground border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Deployed
                    </Badge>
                  ) : (
                    <Badge className="bg-warning text-warning-foreground border-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {t("not_deployed")}
                    </Badge>
                  )}
                </div>
                <p className="text-primary-foreground/80 text-sm max-w-2xl mb-3">
                  {collection.description || t("an_exclusive_nft_collection")}
                </p>
                {collection.contractAddress && (
                  <div className="flex items-center gap-2 bg-overlay/30 backdrop-blur-sm rounded-lg px-3 py-2 w-fit">
                    <span className="text-xs text-primary-foreground/70">{tCommon("contract")}:</span>
                    <code className="text-xs text-success font-mono">
                      {collection.contractAddress.slice(0, 10)}...{collection.contractAddress.slice(-8)}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-card/10"
                      onClick={() => copyToClipboard(collection.contractAddress)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-card/10"
                      onClick={() => window.open(`https://etherscan.io/address/${collection.contractAddress}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!collection.contractAddress && (
                  <Button
                    onClick={handleDeployCollection}
                    loading={isDeploying}
                    className="bg-primary hover:bg-primary text-primary-foreground"
                  >
                    {isDeploying ? (
                      `${t("deploying")}…`
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Deploy
                      </>
                    )}
                  </Button>
                )}
                <Link href={`/nft/collection/${collection.id}/edit`}>
                  <Button variant="outline" size="sm" className="bg-card/10 border-border/30 text-primary-foreground hover:bg-card/20">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card/10 border-border/30 text-primary-foreground hover:bg-card/20"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Tag, label: t("items"), value: formatNumber(stats.totalMinted || 0) },
            { icon: Users, label: t("owners"), value: formatNumber(stats.uniqueOwners || 0) },
            { icon: TrendingUp, label: t("floor_price"), value: <span className="inline-flex items-center gap-1.5"><CurrencyIcon currency={collection.currency} size={16} /><MoneyFigure value={formatCurrency(stats.floorPrice || 0, collection.currency)} /></span> },
            { icon: BarChart3, label: tCommon("total_volume"), value: <span className="inline-flex items-center gap-1.5"><CurrencyIcon currency={collection.currency} size={16} /><MoneyFigure value={formatCurrency(stats.totalVolume || 0, collection.currency)} /></span> },
            { icon: Activity, label: tCommon("sales"), value: formatNumber(stats.totalSales || 0) },
            { icon: Sparkles, label: t("listed"), value: formatNumber(stats.totalListed || 0) },
          ].map((stat, index) => (
            <StatsCard
              key={index}
              index={index}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              {...statsCardColors.neutral}
            />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList className="bg-card border border-border p-1">
              <TabsTrigger value="items" className={`data-[state=active]:bg-linear-to-r data-[state=active]:from-primary data-[state=active]:to-primary data-[state=active]:text-primary-foreground`}>
                <Grid className="h-4 w-4 mr-2" />
                Items
              </TabsTrigger>
              <TabsTrigger value="activity" className={`data-[state=active]:bg-linear-to-r data-[state=active]:from-primary data-[state=active]:to-primary data-[state=active]:text-primary-foreground`}>
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            {activeTab === "items" && (
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`${t("search_items")}…`}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 border-border"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] border-border">
                      <SelectValue placeholder={tCommon("sort_by")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recently_created">{t("recently_created")}</SelectItem>
                      <SelectItem value="recently_listed">{t("recently_listed")}</SelectItem>
                      <SelectItem value="price_low_to_high">{t("price_low_to_high")}</SelectItem>
                      <SelectItem value="price_high_to_low">{t("price_high_to_low")}</SelectItem>
                      <SelectItem value="most_liked">{t("most_liked")}</SelectItem>
                      <SelectItem value="most_viewed">{t("most_viewed")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-[130px] border-border">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("all_items")}</SelectItem>
                      <SelectItem value="buy_now">{tCommon("buy_now")}</SelectItem>
                      <SelectItem value="on_auction">{t("on_auction")}</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="has_offers">{t("has_offers")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-lg border-border">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className="rounded-r-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/*
            FULL-VIEWPORT SWAP. A centred spinner in a `py-20` box — about
            200px — stood in for a four-column grid of ~420px cards, so the
            collection page went from one short band to several thousand pixels
            the instant the tokens landed, taking the Load More control and the
            page footer with it.

            `tokenCards` reserves the grid instead. Nothing about a card's box
            is actually unknown: the image well is `aspect-square` (height from
            the column), and the title, price panel and stats row are fixed
            type in a `p-4 space-y-3` body.
          */}
          <TabsContent value="items" className="space-y-6">
            {showEmptyTokens ? (
              <Card className="border-border">
                <CardContent className="p-20 text-center">
                  <div className={`inline-flex p-6 rounded-lg bg-primary/15 mb-6`}>
                    <Tag className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {searchQuery ? t("no_items_found") : t("no_items_yet")}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? tCommon("try_adjusting_your_search_or_filters")
                      : t("this_collection_doesnt_have_any_items_yet")}
                  </p>
                  {!searchQuery && collection.contractAddress && (
                    <Link href="/nft/create">
                      <Button className={`bg-primary hover:bg-primary text-primary-foreground`}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t("create_first_nft")}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className={`grid gap-6 ${
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "grid-cols-1"
                }`}>
                  {tokenCards.map((token: any, i: number) => {
                    const pending = !token;
                    /*
                      Named predicates rather than `!pending &&` inline. This is
                      the resolution `scan-skeleton-debt.js` prescribes for
                      `hidden-while-loading`: the rule cannot tell a withheld
                      row from a value with nothing to say yet and will not
                      guess from markup, so the NAME is where that is stated.
                    */
                    // The artwork has no text metrics; its stand-in fills the
                    // same `aspect-square` well, sized by the column.
                    const artworkReady = !pending;
                    // All three of these are `absolute` over the image well, so
                    // none of them occupies layout in either state.
                    const showRarityBadge = !pending && token.rarity;
                    const showLikeBadge = !pending && token.likes > 0;
                    const showQuickView = !pending;
                    // Inline glyph beside the figure, on a line whose height
                    // comes from the figure's own type.
                    const showPriceMark = !pending;
                    const card = (
                      <Card className={`group overflow-hidden transition-colors duration-200 border-border ${pending ? "" : "hover:border-border-strong cursor-pointer"}`}>
                        <CardContent className="p-0">
                          {/* NFT Image */}
                          <div className={`${viewMode === "grid" ? "aspect-square" : "aspect-video md:aspect-square lg:aspect-video"} relative overflow-hidden bg-muted`}>
                            {artworkReady ? (
                              <img
                                src={token.image || "/img/placeholder.svg"}
                                alt={token.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <SkeletonBlock className="w-full h-full rounded-none" />
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-overlay/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                            {/* Badges. Rarity, the like count and Quick View
                                are all `absolute` over the image well, so none
                                of them occupies layout — there is nothing to
                                reserve and nothing moves when they appear. */}
                            <div className="absolute top-3 left-3 flex gap-2">
                              {showRarityBadge && (
                                <Badge className="bg-warning text-warning-foreground border-0 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {token.rarity}
                                </Badge>
                              )}
                            </div>

                            {/* Like Button */}
                            {showLikeBadge && (
                              <div className="absolute top-3 right-3">
                                <Badge variant="secondary" className="bg-overlay/50 text-primary-foreground backdrop-blur-sm border-0 text-xs">
                                  <Heart className="h-3 w-3 mr-1 fill-current" />
                                  {formatNumber(token.likes)}
                                </Badge>
                              </div>
                            )}

                            {/* Quick View on Hover */}
                            {showQuickView && (
                              <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button size="sm" className="w-full bg-card/90 hover:bg-card text-foreground">
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t("quick_view")}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* NFT Info */}
                          <div className="p-4 space-y-3">
                            <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground truncate">
                              <Loadable loading={pending} placeholder="Untitled Artwork #1">
                                {token?.name}
                              </Loadable>
                            </h3>

                            {/* The price panel is data-conditional (an unlisted
                                token has none) but it is a ~66px bordered block
                                — by far the largest variable part of the card —
                                so it is reserved for the common case. On a
                                collection page most tokens on offer are listed;
                                withholding it would move the stats row on the
                                majority of cards instead of the minority. */}
                            {(pending || token.currentListing) && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-3 border border-border">
                                <div className="text-xs font-medium text-muted-foreground">
                                  <Loadable loading={pending} placeholder="Price">
                                    {pending
                                      ? null
                                      : token.currentListing.type === "AUCTION"
                                      ? tCommon("current_bid")
                                      : tCommon("price")}
                                  </Loadable>
                                </div>
                                <div className="text-lg font-semibold text-foreground flex items-center gap-1.5">
                                  {showPriceMark && (
                                    <CurrencyIcon currency={token.currentListing.currency} size={16} />
                                  )}
                                  <Loadable loading={pending} placeholder="0.00 ETH">
                                    {showPriceMark ? (
                                      <MoneyFigure value={formatCurrency(token.currentListing.price, token.currentListing.currency)} />
                                    ) : null}
                                  </Loadable>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />#
                                <Loadable loading={pending} placeholder="1234">
                                  {token?.tokenId}
                                </Loadable>
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <Loadable loading={pending} placeholder="1,234">
                                  {pending ? null : formatNumber(token.views || 0)}
                                </Loadable>
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );

                    // No id to point at yet. Grid items are blockified whatever
                    // the tag, so `<a>` and `<div>` are the same box here.
                    return artworkReady ? (
                      <Link key={token.id} href={`/nft/token/${token.id}`}>
                        {card}
                      </Link>
                    ) : (
                      <div key={`pending-${i}`}>{card}</div>
                    );
                  })}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center pt-8">
                    <Button
                      onClick={handleLoadMore}
                      loading={isLoading}
                      variant="outline"
                      size="lg"
                      className="border-border"
                    >
                      {t("load_more_items")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 pb-8">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                  </span>
                  {tCommon("recent_activity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>{t("no_activity_yet")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity: any) => {
                      const details = getActivityDetails(activity);
                      const IconComponent = details.icon;

                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted dark:hover:bg-muted/50 transition-colors border border-border"
                        >
                          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${details.color} text-primary-foreground`}>
                            <IconComponent className="h-3.5 w-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{details.title}</div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {details.description}
                            </div>
                            {details.extraInfo && (
                              <div className="text-xs text-muted-foreground mt-1 font-mono">
                                {details.extraInfo}
                              </div>
                            )}
                            {activity.transactionHash && (
                              <a
                                href={`https://bscscan.com/tx/${activity.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                {t("view_transaction")} <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(activity.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Social Links */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-50">
        {collection.website && (
          <Button
            size="sm"
            className={`rounded-full w-12 h-12 bg-primary hover:bg-primary shadow-lg hover:shadow-xl transition-all duration-300`}
            onClick={() => window.open(collection.website, "_blank")}
          >
            <Globe className="h-5 w-5" />
          </Button>
        )}
        {collection.twitter && (
          <Button
            size="sm"
            className="rounded-full w-12 h-12 bg-primary shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => window.open(collection.twitter, "_blank")}
          >
            <Twitter className="h-5 w-5" />
          </Button>
        )}
        {collection.discord && (
          <Button
            size="sm"
            className={`rounded-full w-12 h-12 bg-primary hover:bg-primary shadow-lg hover:shadow-xl transition-all duration-300`}
            onClick={() => window.open(collection.discord, "_blank")}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
