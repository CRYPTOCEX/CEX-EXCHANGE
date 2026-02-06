"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatCurrency, formatNumber } from "@/utils/format";
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
  Loader2,
  Edit,
  Share2,
  Globe,
  Twitter,
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

interface CollectionDetailClientProps {
  initialCollection: any;
}

// Helper function to get activity details
const getActivityDetails = (activity: any) => {
  const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};

  switch (activity.type) {
    case "MINT":
      return {
        icon: Sparkles,
        color: "from-green-500 to-emerald-600",
        title: "Minted",
        description: `${activity.toUser?.firstName || "Someone"} minted a token`,
      };
    case "TRANSFER":
      return {
        icon: Send,
        color: "from-blue-500 to-cyan-600",
        title: "Transferred",
        description: `From ${activity.fromUser?.firstName || "Unknown"} to ${activity.toUser?.firstName || "Unknown"}`,
      };
    case "SALE":
      return {
        icon: ShoppingCart,
        color: `from-purple-500 to-pink-600`,
        title: "Sold",
        description: `Sold for ${activity.price} ${activity.currency}`,
      };
    case "LIST":
      return {
        icon: Tag,
        color: "from-yellow-500 to-orange-600",
        title: "Listed",
        description: `Listed for ${activity.price} ${activity.currency}`,
      };
    case "DELIST":
      return {
        icon: FileText,
        color: "from-gray-500 to-slate-600",
        title: "Delisted",
        description: "Listing cancelled",
      };
    case "BID":
      return {
        icon: DollarSign,
        color: `from-indigo-500 to-purple-600`,
        title: "Bid Placed",
        description: `Bid of ${activity.price} ${activity.currency}`,
      };
    case "OFFER":
      return {
        icon: Package,
        color: "from-teal-500 to-cyan-600",
        title: "Offer Made",
        description: `Offer of ${activity.price} ${activity.currency}`,
      };
    case "BURN":
      return {
        icon: Trash2,
        color: "from-red-500 to-rose-600",
        title: "Burned",
        description: "Token burned",
      };
    case "COLLECTION_CREATED":
      return {
        icon: Sparkles,
        color: `from-violet-500 to-purple-600`,
        title: "Collection Created",
        description: `${metadata.collectionName || "Collection"} was created`,
      };
    case "COLLECTION_DEPLOYED":
      return {
        icon: Rocket,
        color: `from-blue-600 to-purple-600`,
        title: "Contract Deployed",
        description: `Smart contract deployed to ${metadata.chain || "blockchain"}`,
        extraInfo: metadata.contractAddress ? `Contract: ${metadata.contractAddress.slice(0, 6)}...${metadata.contractAddress.slice(-4)}` : null,
      };
    default:
      return {
        icon: Activity,
        color: "from-gray-500 to-slate-600",
        title: activity.type,
        description: "Activity recorded",
      };
  }
};

export default function CollectionDetailClient({ initialCollection }: CollectionDetailClientProps) {
  const t = useTranslations("ext");

  const [collection, setCollection] = useState(initialCollection);
  const [tokens, setTokens] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recently_created");
  const [filterBy, setFilterBy] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState("items");

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
          setTokens(prev => [...prev, ...(data.data || [])]);
          setPage(prev => prev + 1);
        } else {
          setTokens(data.data || []);
          setPage(1);
        }
        setHasMore(data.pagination?.page < data.pagination?.totalPages);
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
      toast.error("Collection ID is missing");
      return;
    }

    setIsDeploying(true);
    try {
      toast.info("Initiating contract deployment...");

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
        toast.error((error as any)?.message || "Failed to deploy contract");
        return;
      }

      if (data) {
        toast.success("Contract deployed successfully!");
        setCollection((prev: any) => ({
          ...prev,
          contractAddress: data.data.contractAddress,
          status: "ACTIVE",
        }));
      }
    } catch (error: any) {
      console.error("Error deploying contract:", error);
      toast.error("Failed to deploy contract");
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${collection.name} - NFT Collection`;
    const text = collection.description || "Check out this NFT collection!";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        toast.success("Shared successfully!");
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
      <div className="relative h-80 overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900">
        {/* Banner Image */}
        {collection.bannerImage ? (
          <>
            <img
              src={collection.bannerImage}
              alt={collection.name}
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        )}

        {/* Collection Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
              {/* Logo */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-800 shadow-xl">
                  <AvatarImage src={collection.logoImage} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                    {collection.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                {collection.isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1.5 shadow-lg ring-2 ring-white dark:ring-zinc-800">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Collection Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {collection.name}
                  </h1>
                  {collection.isVerified && (
                    <Badge className="bg-blue-600 text-white border-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {collection.contractAddress ? (
                    <Badge className="bg-green-600 text-white border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Deployed
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-600 text-white border-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Deployed
                    </Badge>
                  )}
                </div>
                <p className="text-white/80 text-sm max-w-2xl mb-3">
                  {collection.description || "An exclusive NFT collection"}
                </p>
                {collection.contractAddress && (
                  <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 w-fit">
                    <span className="text-xs text-white/70">Contract:</span>
                    <code className="text-xs text-green-400 font-mono">
                      {collection.contractAddress.slice(0, 10)}...{collection.contractAddress.slice(-8)}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                      onClick={() => copyToClipboard(collection.contractAddress)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
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
                    disabled={isDeploying}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Deploy
                      </>
                    )}
                  </Button>
                )}
                <Link href={`/nft/collection/${collection.id}/edit`}>
                  <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
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
            { icon: Tag, label: "Items", value: formatNumber(stats.totalMinted || 0) },
            { icon: Users, label: "Owners", value: formatNumber(stats.uniqueOwners || 0) },
            { icon: TrendingUp, label: "Floor Price", value: formatCurrency(stats.floorPrice || 0, collection.currency) },
            { icon: BarChart3, label: "Total Volume", value: formatCurrency(stats.totalVolume || 0, collection.currency) },
            { icon: Activity, label: "Sales", value: formatNumber(stats.totalSales || 0) },
            { icon: Sparkles, label: "Listed", value: formatNumber(stats.totalListed || 0) },
          ].map((stat, index) => (
            <Card
              key={index}
              className="border-zinc-200 dark:border-zinc-800"
            >
              <CardContent className="p-4 text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <TabsList className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1">
              <TabsTrigger value="items" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white`}>
                <Grid className="h-4 w-4 mr-2" />
                Items
              </TabsTrigger>
              <TabsTrigger value="activity" className={`data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white`}>
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            {activeTab === "items" && (
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 border-zinc-200 dark:border-zinc-800"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px] border-zinc-200 dark:border-zinc-800">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recently_created">Recently Created</SelectItem>
                      <SelectItem value="recently_listed">Recently Listed</SelectItem>
                      <SelectItem value="price_low_to_high">Price: Low to High</SelectItem>
                      <SelectItem value="price_high_to_low">Price: High to Low</SelectItem>
                      <SelectItem value="most_liked">Most Liked</SelectItem>
                      <SelectItem value="most_viewed">Most Viewed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterBy} onValueChange={setFilterBy}>
                    <SelectTrigger className="w-[130px] border-zinc-200 dark:border-zinc-800">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="buy_now">Buy Now</SelectItem>
                      <SelectItem value="on_auction">On Auction</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="has_offers">Has Offers</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-lg border-zinc-200 dark:border-zinc-800">
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

          <TabsContent value="items" className="space-y-6">
            {isLoading && tokens.length === 0 ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner />
              </div>
            ) : tokens.length === 0 ? (
              <Card className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="p-20 text-center">
                  <div className={`inline-flex p-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-6`}>
                    <Tag className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    {searchQuery ? "No items found" : "No items yet"}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? "Try adjusting your search or filters"
                      : "This collection doesn't have any items yet"}
                  </p>
                  {!searchQuery && collection.contractAddress && (
                    <Link href="/nft/create">
                      <Button className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white`}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create First NFT
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
                  {tokens.map((token: any) => (
                    <Link key={token.id} href={`/nft/token/${token.id}`}>
                      <Card className="group overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer border-zinc-200 dark:border-zinc-800">
                        <CardContent className="p-0">
                          {/* NFT Image */}
                          <div className={`${viewMode === "grid" ? "aspect-square" : "aspect-video md:aspect-square lg:aspect-video"} relative overflow-hidden bg-zinc-100 dark:bg-zinc-800`}>
                            <img
                              src={token.image || "/img/placeholder.svg"}
                              alt={token.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                            {/* Badges */}
                            <div className="absolute top-3 left-3 flex gap-2">
                              {token.rarity && (
                                <Badge className="bg-yellow-600 text-white border-0 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {token.rarity}
                                </Badge>
                              )}
                            </div>

                            {/* Like Button */}
                            {token.likes > 0 && (
                              <div className="absolute top-3 right-3">
                                <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm border-0 text-xs">
                                  <Heart className="h-3 w-3 mr-1 fill-current" />
                                  {formatNumber(token.likes)}
                                </Badge>
                              </div>
                            )}

                            {/* Quick View on Hover */}
                            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <Button size="sm" className="w-full bg-white/90 hover:bg-white text-black">
                                <Eye className="h-4 w-4 mr-2" />
                                Quick View
                              </Button>
                            </div>
                          </div>

                          {/* NFT Info */}
                          <div className="p-4 space-y-3">
                            <h3 className="font-bold text-lg truncate">
                              {token.name}
                            </h3>

                            {token.currentListing && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                <div className="text-sm text-muted-foreground">
                                  {token.currentListing.type === "AUCTION" ? "Current Bid" : "Price"}
                                </div>
                                <div className="font-bold text-lg">
                                  {formatCurrency(token.currentListing.price, token.currentListing.currency)}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                #{token.tokenId}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {formatNumber(token.views || 0)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="text-center pt-8">
                    <Button
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      variant="outline"
                      size="lg"
                      className="border-zinc-200 dark:border-zinc-800"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Load More Items
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 pb-8">
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity: any) => {
                      const details = getActivityDetails(activity);
                      const IconComponent = details.icon;

                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-4 p-4 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border border-zinc-100 dark:border-zinc-800"
                        >
                          <div className={`p-2 rounded-full bg-gradient-to-br ${details.color} flex-shrink-0`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
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
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-flex items-center gap-1"
                              >
                                View Transaction <ExternalLink className="h-3 w-3" />
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
            className={`rounded-full w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300`}
            onClick={() => window.open(collection.website, "_blank")}
          >
            <Globe className="h-5 w-5" />
          </Button>
        )}
        {collection.twitter && (
          <Button
            size="sm"
            className="rounded-full w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => window.open(collection.twitter, "_blank")}
          >
            <Twitter className="h-5 w-5" />
          </Button>
        )}
        {collection.discord && (
          <Button
            size="sm"
            className={`rounded-full w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300`}
            onClick={() => window.open(collection.discord, "_blank")}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
