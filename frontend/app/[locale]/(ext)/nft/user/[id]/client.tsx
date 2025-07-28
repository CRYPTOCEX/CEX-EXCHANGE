"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { formatCurrency, formatNumber } from "@/utils/format";
import { toast } from "sonner";
import {
  Shield,
  ExternalLink,
  UserPlus,
  UserMinus,
  Share2,
  Copy,
  Grid,
  List,
  Eye,
  Heart,
  Activity,
  TrendingUp,
  Award,
  Palette,
  Package,
} from "lucide-react";

interface UserPortfolioClientProps {
  initialUser: any;
}

export default function UserPortfolioClient({ initialUser }: UserPortfolioClientProps) {
  const t = useTranslations("nft/user/profile");
  const { user: currentUser } = useUserStore();

  // Helper function for time formatting
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return date.toLocaleDateString();
  };

  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("owned");
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Data states
  const [ownedNFTs, setOwnedNFTs] = useState<any[]>([]);
  const [createdNFTs, setCreatedNFTs] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  // Filter states
  const [sortBy, setSortBy] = useState("recently_acquired");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchUserData();
    checkFollowStatus();
  }, [user.userId]);

  useEffect(() => {
    switch (activeTab) {
      case "owned":
        fetchOwnedNFTs();
        break;
      case "created":
        fetchCreatedNFTs();
        break;
      case "collections":
        fetchCollections();
        break;
      case "activity":
        fetchActivities();
        break;
      case "favorites":
        fetchFavorites();
        break;
    }
  }, [activeTab, sortBy]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/creator/${user.userId}`,
      });

      if (!error && data) {
        setUser(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser?.id || currentUser.id === user.userId) return;

    try {
      const { data, error } = await $fetch({
        url: `/api/nft/social/follow/status`,
        params: { followingId: user.userId },
      });

      if (!error && data) {
        setIsFollowing(data.isFollowing);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const fetchOwnedNFTs = async (loadMore = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/token`,
        params: {
          ownerId: user.userId,
          sortBy,
          page: loadMore ? page + 1 : 1,
          limit: 20,
        },
      });

      if (!error && data) {
        if (loadMore) {
          setOwnedNFTs(prev => [...prev, ...(data.data || [])]);
          setPage(prev => prev + 1);
        } else {
          setOwnedNFTs(data.data || []);
          setPage(1);
        }
        setHasMore(data.pagination?.page < data.pagination?.totalPages);
      }
    } catch (error) {
      console.error("Error fetching owned NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreatedNFTs = async (loadMore = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/token`,
        params: {
          creatorId: user.userId,
          sortBy,
          page: loadMore ? page + 1 : 1,
          limit: 20,
        },
      });

      if (!error && data) {
        if (loadMore) {
          setCreatedNFTs(prev => [...prev, ...(data.data || [])]);
          setPage(prev => prev + 1);
        } else {
          setCreatedNFTs(data.data || []);
          setPage(1);
        }
        setHasMore(data.pagination?.page < data.pagination?.totalPages);
      }
    } catch (error) {
      console.error("Error fetching created NFTs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/collection`,
        params: {
          creatorId: user.userId,
          sortBy,
        },
      });

      if (!error && data) {
        setCollections(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/activity`,
        params: {
          userId: user.userId,
          limit: 50,
        },
      });

      if (!error && data) {
        setActivities(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (currentUser?.id !== user.userId) return; // Only show own favorites

    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/nft/favorite`,
        params: {
          userId: user.userId,
        },
      });

      if (!error && data) {
        setFavorites(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser?.id) {
      toast.error(t("please_login_to_follow_users"));
      return;
    }

    try {
      const { error } = await $fetch({
        url: `/api/nft/social/follow`,
        method: "POST",
        body: { followingId: user.userId },
        successMessage: isFollowing ? t("unfollowed_successfully") : t("following_successfully"),
      });

      if (!error) {
        setIsFollowing(!isFollowing);
        setUser(prev => ({
          ...prev,
          followerCount: prev.followerCount + (isFollowing ? -1 : 1),
        }));
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: user.displayName || `${user.firstName} ${user.lastName}`,
          text: user.bio,
          url: window.location.href,
        });
      } catch (error) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(t("link_copied_to_clipboard"));
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("link_copied_to_clipboard"));
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      if (activeTab === "owned") {
        fetchOwnedNFTs(true);
      } else if (activeTab === "created") {
        fetchCreatedNFTs(true);
      }
    }
  };

  const renderNFTGrid = (nfts: any[]) => (
    <div className={`grid gap-4 ${
      viewMode === "grid" 
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
        : "grid-cols-1"
    }`}>
      {nfts.map((token: any) => (
        <Link key={token.id} href={`/nft/${token.id}`}>
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardContent className="p-0">
              <div className="aspect-square relative overflow-hidden rounded-t-lg">
                <img
                  src={token.image || "/img/placeholder.svg"}
                  alt={token.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {token.rarity && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    {token.rarity}
                  </Badge>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold truncate">{token.name}</h3>
                {token.currentListing && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {token.currentListing.type === "AUCTION" ? t("current_bid") : t("Price")}
                    </div>
                    <div className="font-medium">
                      {formatCurrency(token.currentListing.price)} {token.currentListing.currency}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>#{token.tokenId}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatNumber(token.views || 0)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(token.likes || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

  const isOwnProfile = currentUser?.id === user.userId;
  const displayName = user.displayName || `${user.firstName} ${user.lastName}`;

  return (
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="relative">
        {/* Banner */}
        <div className="h-64 bg-gradient-to-r from-purple-500 to-pink-600 relative overflow-hidden">
          {user.bannerImage && (
            <img
              src={user.bannerImage}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Profile Info */}
        <div className="container mx-auto px-4 relative -mt-16">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              {user.verificationTier && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                  {user.verificationTier && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-100">
                      {user.verificationTier}
                    </Badge>
                  )}
                </div>
                {user.bio && (
                  <p className="text-gray-200 max-w-2xl leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-white">
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.totalItems || 0)}</div>
                  <div className="text-sm text-gray-300">{t("Items")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.followerCount || 0)}</div>
                  <div className="text-sm text-gray-300">{t("Followers")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.followingCount || 0)}</div>
                  <div className="text-sm text-gray-300">{t("Following")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(user.totalVolume || 0)}</div>
                  <div className="text-sm text-gray-300">{t("Volume")}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : ""}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        {t("Unfollow")}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t("Follow")}
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {t("Share")}
                </Button>
                {(user.website || user.twitter || user.discord) && (
                  <div className="flex gap-1">
                    {user.website && (
                      <a href={user.website} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {user.twitter && (
                      <a href={user.twitter} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
            <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full md:w-auto">
              <TabsTrigger value="owned" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Owned")}</span>
              </TabsTrigger>
              <TabsTrigger value="created" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Created")}</span>
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Collections")}</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Activity")}</span>
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="favorites" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("Favorites")}</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("sort_by")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recently_acquired">{t("recently_acquired")}</SelectItem>
                  <SelectItem value="recently_created">{t("recently_created")}</SelectItem>
                  <SelectItem value="price_low_to_high">{t("price_low_to_high")}</SelectItem>
                  <SelectItem value="price_high_to_low">{t("price_high_to_low")}</SelectItem>
                  <SelectItem value="most_liked">{t("most_liked")}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg">
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

          <TabsContent value="owned" className="space-y-6">
            {isLoading && ownedNFTs.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : ownedNFTs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isOwnProfile ? t("you_dont_own_any_nfts_yet") : t("this_user_doesnt_own_any_nfts_yet")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {renderNFTGrid(ownedNFTs)}
                {hasMore && (
                  <div className="text-center">
                    <Button onClick={handleLoadMore} disabled={isLoading} variant="outline" size="lg">
                      {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                      {t("load_more")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="created" className="space-y-6">
            {isLoading && createdNFTs.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : createdNFTs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isOwnProfile ? t("you_havent_created_any_nfts_yet") : t("this_user_hasnt_created_any_nfts_yet")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {renderNFTGrid(createdNFTs)}
                {hasMore && (
                  <div className="text-center">
                    <Button onClick={handleLoadMore} disabled={isLoading} variant="outline" size="lg">
                      {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                      {t("load_more")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : collections.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Grid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {isOwnProfile ? t("you_havent_created_any_collections_yet") : t("this_user_hasnt_created_any_collections_yet")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection: any) => (
                  <Link key={collection.id} href={`/nft/collection/${collection.id}`}>
                    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                      <CardContent className="p-0">
                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                          <img
                            src={collection.bannerImage || collection.logoImage || "/img/placeholder.svg"}
                            alt={collection.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={collection.logoImage} />
                              <AvatarFallback>{collection.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <h3 className="font-semibold truncate">{collection.name}</h3>
                            {collection.isVerified && (
                              <Shield className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {collection.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatNumber(collection.totalSupply || 0)} {t("items")}</span>
                            <span>{t("Floor")}: {formatCurrency(collection.floorPrice || 0)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : activities.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t("no_activity_yet")}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {activities.map((activity: any) => (
                      <div key={activity.id} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                        <div className="p-2 bg-accent rounded-lg">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{activity.type}</div>
                          <div className="text-sm text-muted-foreground">
                            {activity.token?.name && (
                              <span className="mr-2">{activity.token.name}</span>
                            )}
                            {activity.price && (
                              <span>
                                {formatCurrency(activity.price)} {activity.currency}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeAgo(activity.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="favorites" className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : favorites.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t("no_favorites_yet")}</p>
                  </CardContent>
                </Card>
              ) : (
                renderNFTGrid(favorites.map((fav: any) => fav.token).filter(Boolean))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
} 