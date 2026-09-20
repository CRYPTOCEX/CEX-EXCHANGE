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
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/utils/format";
import { MoneyFigure } from "@/components/ui/money-figure";
import { CurrencyIcon } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { publicName } from "@/utils/display-name";
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
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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
  /*
    STARTS TRUE, and that is a fix rather than a tidy-up.

    Two effects below fire a tab fetch on mount, unconditionally — so a request
    is always in flight by the time the browser paints. With `false` here, the
    first render had `isLoading === false` and every list still `[]`, which put
    every tab straight into its empty state: "You don't own any NFTs yet" shown
    to a collector, for one frame, on every visit. The spinner used to cover the
    gap by accident on the second render; nothing covers the first.
  */
  const [isLoading, setIsLoading] = useState(true);
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

  /*
    ONE public name for the page — the heading, the banner's alt text, the
    avatar initial and the share sheet all read this.

    It was `user.displayName || `${user.firstName} ${user.lastName}``, written
    out twice, and it was wrong twice over: the pair is the name on the KYC
    identity document, on a profile a stranger can open; and it was read off
    the CREATOR row, which carries no name fields at all, so anybody who had
    never set a display name was shared and titled as "undefined undefined".
    The person is nested at `user.user`, and `publicName` prefers the handle.
  */
  const displayName =
    String(user.displayName ?? "").trim() ||
    publicName(user.user, t("anonymous_creator"));

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
      // The handler takes `{ userId, action }`. This sent `{ followingId }`,
      // a field it does not read, so every press came back with "User Id is
      // required.; Action is required." and the button never worked. It also
      // has to say WHICH way it is toggling — without `action` the same call
      // could not both follow and unfollow.
      const { error } = await $fetch({
        url: `/api/nft/social/follow`,
        method: "POST",
        body: {
          userId: user.userId,
          action: isFollowing ? "unfollow" : "follow",
        },
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
          title: displayName,
          text: user.bio,
          url: window.location.href,
        });
      } catch (error) {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(tExt("link_copied"));
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(tExt("link_copied"));
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

  /*
    `token === null` IS a pending card. Passing `pending` into the SAME grid is
    what keeps the five tabs on one card shape — five separate skeletons for
    five tabs of the same card is exactly how a duplicate starts drifting.

    Card anatomy, and why almost none of it needs to wait: the `aspect-square`
    image well takes its height from the COLUMN WIDTH, not from the image, so it
    is fully determined before anything loads; the `p-4 space-y-2` body, the
    title line, the price row and the stats row are all fixed type. Only the
    picture, the name, the figures and the counts are unknown.
  */
  const renderNFTGrid = (nfts: (any | null)[]) => (
    <div className={`grid gap-4 ${
      viewMode === "grid"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        : "grid-cols-1"
    }`}>
      {nfts.map((token: any, i: number) => {
        const pending = !token;
        /*
          Named predicates rather than `!pending &&` inline in the JSX. This is
          the resolution `scan-skeleton-debt.js` documents for its
          `hidden-while-loading` rule and it is the reason it exists: the rule
          cannot tell a withheld row from a value that has nothing to say yet,
          and it should not guess from markup — so the NAME is where you state
          which of the two this is. Each one below says what it gates and why it
          costs no height.
        */
        // The artwork is a block with no text metrics; its stand-in fills the
        // same `aspect-square` well, whose height comes from the column.
        const artworkReady = !pending;
        // Rarity is `absolute` over the image: no layout box either way.
        const showRarityBadge = !pending && token.rarity;
        // The currency mark sits beside the figure inside a line whose height
        // is set by the figure's own type.
        const showPriceMark = !pending;
        const card = (
          <Card className={`group transition-all duration-200 ${pending ? "" : "hover:shadow-lg cursor-pointer"}`}>
            <CardContent className="p-0">
              <div className="aspect-square relative overflow-hidden rounded-t-lg">
                {artworkReady ? (
                  <img
                    src={token.image || "/img/placeholder.svg"}
                    alt={token.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <SkeletonBlock className="w-full h-full rounded-none" />
                )}
                {/* Rarity is data-conditional AND absolutely positioned, so it
                    has no layout box to reserve either way. */}
                {showRarityBadge && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    {token.rarity}
                  </Badge>
                )}
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold truncate">
                  <Loadable loading={pending} placeholder={t("untitled_artwork_1")}>
                    {token?.name}
                  </Loadable>
                </h3>
                {/*
                  The price row is DATA-conditional — an unlisted token has no
                  listing — but it is reserved while pending anyway, because in
                  a marketplace grid most cards are listed and this row is 20px
                  of card height. Reserving the common case means a minority of
                  cards lose a row on settle instead of the majority gaining
                  one; the alternative shifts more cards, not fewer. That the
                  count of cards settles too is already accepted for lists
                  (SKELETONS.md) and this is the same trade one level down.
                */}
                {(pending || token.currentListing) && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      <Loadable loading={pending} placeholder={tCommon("price")}>
                        {pending
                          ? null
                          : token.currentListing.type === "AUCTION"
                          ? tCommon("current_bid")
                          : tCommon("price")}
                      </Loadable>
                    </div>
                    <div className="font-medium flex items-center gap-1.5">
                      {showPriceMark && (
                        <CurrencyIcon currency={token.currentListing.currency} size={14} />
                      )}
                      <Loadable loading={pending} placeholder="0.00 ETH">
                        {showPriceMark ? (
                          <MoneyFigure value={formatCurrency(token.currentListing.price, token.currentListing.currency)} />
                        ) : null}
                      </Loadable>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    #
                    <Loadable loading={pending} placeholder="1234">
                      {token?.tokenId}
                    </Loadable>
                  </span>
                  {/* Both icons are constants and stay painted; only the counts
                      beside them wait, inside the same `text-xs` line. */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <Loadable loading={pending} placeholder="1,234">
                        {pending ? null : formatNumber(token.views || 0)}
                      </Loadable>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <Loadable loading={pending} placeholder="123">
                        {pending ? null : formatNumber(token.likes || 0)}
                      </Loadable>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

        // No id to navigate to yet. A grid item is blockified whatever its tag,
        // so `<a>` and `<div>` occupy the identical box here — the swap moves
        // nothing, and it avoids a live link to `/nft/undefined`.
        return artworkReady ? (
          <Link key={token.id} href={`/nft/${token.id}`}>
            {card}
          </Link>
        ) : (
          <div key={`pending-${i}`}>{card}</div>
        );
      })}
    </div>
  );

  /*
    Every one of these empty states is a CLAIM about the person whose profile
    this is — "you haven't created any collections yet", "no activity yet" —
    and each was only unreachable during a fetch because a spinner sat in front
    of it. With the grids rendering through the load, `length === 0` is true for
    the whole request, so each guard names `isLoading` explicitly. Hoisted so
    that half is visibly part of the condition and not something to simplify
    away later.
  */
  const showEmptyCollections = !isLoading && collections.length === 0;
  const showEmptyActivity = !isLoading && activities.length === 0;

  /*
    The stand-in rows. `null` is the pending entry in each case, so the real
    renderer paints them and there is no second copy of any card.

    Eight cards because the grid runs 1/2/3/4-up from base to `xl`: eight is a
    whole number of rows at every one of those breakpoints, which a count like
    six is not — six leaves a two-card orphan row at `xl` that re-rags the
    moment the real page (12 per request) lands. Four activity rows fill the
    card below the tab bar without reserving a screen of pulse.
  */
  const PENDING_NFT_CARDS = [null, null, null, null, null, null, null, null];
  const collectionCards: (any | null)[] = isLoading
    ? [null, null, null]
    : collections;
  const activityRows: (any | null)[] = isLoading
    ? [null, null, null, null]
    : activities;

  const isOwnProfile = currentUser?.id === user.userId;

  return (
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="relative">
        {/* Banner */}
        <div className={`h-64 bg-primary relative overflow-hidden`}>
          {user.bannerImage && (
            <img
              src={user.bannerImage}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-overlay/20" />
        </div>

        {/* Profile Info */}
        <div className="container mx-auto px-4 relative -mt-16">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl">
                  {/* Two initials, taken from `firstName` and `lastName`. The
                      surname initial is a letter of a name a stranger is not
                      shown, and on this payload both fields were undefined, so
                      the ring rendered empty on every profile. One initial,
                      off the public name the rest of the page uses. */}
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {user.verificationTier && (
                <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-2">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-primary-foreground">{displayName}</h1>
                  {user.verificationTier && (
                    // This row is pulled up by `-mt-16` so it sits ON the h-64
                    // banner — `bg-primary` or the user's own image, never the
                    // page ground. `bg-primary/20 text-primary-ink` over
                    // `bg-primary` measured 1.20:1 light / 1.14:1 dark: the
                    // chip was invisible. `variant="secondary"` is already an
                    // opaque, contrast-checked pair (16.65 / 13.84) that reads
                    // on any banner, so the className was the whole defect.
                    <Badge variant="secondary">
                      {user.verificationTier}
                    </Badge>
                  )}
                </div>
                {user.bio && (
                  <p className="text-muted-foreground max-w-2xl leading-relaxed">
                    {user.bio}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-primary-foreground">
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.totalItems || 0)}</div>
                  <div className="text-sm text-muted-foreground">{tExt("items")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.followerCount || 0)}</div>
                  <div className="text-sm text-muted-foreground">{tExt("followers")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatNumber(user.followingCount || 0)}</div>
                  <div className="text-sm text-muted-foreground">{tCommon("following")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold flex items-center gap-1.5">
                    <CurrencyIcon currency={user.currency || "ETH"} size={20} />
                    <MoneyFigure value={formatCurrency(user.totalVolume || 0, user.currency || "ETH")} />
                  </div>
                  <div className="text-sm text-muted-foreground">{tCommon("volume")}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? "outline" : "default"}
                    className={isFollowing ? "bg-card/10 border-border/20 text-primary-foreground hover:bg-card/20" : ""}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        {t("unfollow")}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t("follow")}
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="bg-card/10 border-border/20 text-primary-foreground hover:bg-card/20"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {tExt("share")}
                </Button>
                {(user.website || user.twitter || user.discord) && (
                  <div className="flex gap-1">
                    {user.website && (
                      <a href={user.website} target="_blank" rel="noopener noreferrer">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-card/10 border-border/20 text-primary-foreground hover:bg-card/20"
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
                          className="bg-card/10 border-border/20 text-primary-foreground hover:bg-card/20"
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
                <span className="hidden sm:inline">{tCommon("owned")}</span>
              </TabsTrigger>
              <TabsTrigger value="created" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">{tCommon("created")}</span>
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">{t("collections")}</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">{tCommon("activity")}</span>
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="favorites" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">{tCommon("favorites")}</span>
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={tCommon("sort_by")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recently_acquired">{t("recently_acquired")}</SelectItem>
                  <SelectItem value="recently_created">{tExt("recently_created")}</SelectItem>
                  <SelectItem value="price_low_to_high">{tExt("price_low_to_high")}</SelectItem>
                  <SelectItem value="price_high_to_low">{tExt("price_high_to_low")}</SelectItem>
                  <SelectItem value="most_liked">{tExt("most_liked")}</SelectItem>
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

          {/*
            All five tabs used to swap their body for a `py-12` centred spinner
            — roughly 130px against a four-column grid of ~330px cards, so every
            tab switch and every sort collapsed the page to a tenth of its
            height and then sprang back. `renderNFTGrid` now paints stand-in
            cards instead, so the grid's height is reserved from the first
            frame and only the artwork and figures settle.
          */}
          <TabsContent value="owned" className="space-y-6">
            {isLoading && ownedNFTs.length === 0 ? (
              renderNFTGrid(PENDING_NFT_CARDS)
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
                    <Button onClick={handleLoadMore} loading={isLoading} variant="outline" size="lg">
                      {tCommon("load_more")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="created" className="space-y-6">
            {isLoading && createdNFTs.length === 0 ? (
              renderNFTGrid(PENDING_NFT_CARDS)
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
                    <Button onClick={handleLoadMore} loading={isLoading} variant="outline" size="lg">
                      {tCommon("load_more")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            {showEmptyCollections ? (
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
                {/* Same one-tree treatment as the NFT grid: the `aspect-video`
                    banner takes its height from the column, the 32px avatar and
                    the three text lines are fixed type, so the card's whole
                    ~300px is knowable and only its contents wait. */}
                {collectionCards.map((collection: any, i: number) => {
                  const pending = !collection;
                  // Named predicates — see the note in `renderNFTGrid` above
                  // for why the gate is hoisted rather than written inline.
                  const bannerReady = !pending; // `aspect-video` well, height from the column
                  const logoReady = !pending; // fixed 32px avatar box
                  const showVerifiedMark = !pending && collection.isVerified;
                  const showFloorMark = !pending; // inline glyph on a fixed line
                  const card = (
                    <Card className={`group transition-all duration-200 ${pending ? "" : "hover:shadow-lg cursor-pointer"}`}>
                      <CardContent className="p-0">
                        <div className="aspect-video relative overflow-hidden rounded-t-lg">
                          {bannerReady ? (
                            <img
                              src={collection.bannerImage || collection.logoImage || "/img/placeholder.svg"}
                              alt={collection.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <SkeletonBlock className="w-full h-full rounded-none" />
                          )}
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            {/* Avatar keeps its own 32px box in both states —
                                the fallback letter is what waits, not the ring. */}
                            {logoReady ? (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={collection.logoImage} />
                                <AvatarFallback>{collection.name?.[0]}</AvatarFallback>
                              </Avatar>
                            ) : (
                              <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
                            )}
                            <h3 className="font-semibold truncate">
                              <Loadable loading={pending} placeholder={tExt("collection_name")}>
                                {collection?.name}
                              </Loadable>
                            </h3>
                            {/* Verification is a claim about the collection —
                                it stays absent until the answer is in, and it
                                is an inline 16px glyph on a line whose height
                                comes from the avatar beside it. */}
                            {showVerifiedMark && (
                              <Shield className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {/* `line-clamp-2` caps this at two lines whatever
                                the description is, and the placeholder is sized
                                to fill them so the card cannot grow. */}
                            <Loadable
                              loading={pending}
                              placeholder={t("a_short_description_of_this_collection")}
                            >
                              {collection?.description}
                            </Loadable>
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              <Loadable loading={pending} placeholder="1,234">
                                {pending ? null : formatNumber(collection.totalSupply || 0)}
                              </Loadable>{" "}
                              {tExt("items")}
                            </span>
                            <span className="flex items-center gap-1">
                              {tExt("floor")}:
                              {showFloorMark && (
                                <CurrencyIcon currency={collection.currency || "ETH"} size={12} />
                              )}
                              <Loadable loading={pending} placeholder="0.00 ETH">
                                {pending
                                  ? null
                                  : formatCurrency(collection.floorPrice || 0, collection.currency || "ETH")}
                              </Loadable>
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );

                  return bannerReady ? (
                    <Link key={collection.id} href={`/nft/collection/${collection.id}`}>
                      {card}
                    </Link>
                  ) : (
                    <div key={`pending-${i}`}>{card}</div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            {showEmptyActivity ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{tExt("no_activity_yet")}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {/* The row frame — 32px icon well, `p-4`, the divider, the
                        two-line text block — is identical for every activity,
                        so the whole list height is chrome and only the words
                        inside it wait. */}
                    {activityRows.map((activity: any, i: number) => {
                      const pending = !activity;
                      // Named predicates — see `renderNFTGrid` above. Both of
                      // these gate the SECOND line of a two-line row that
                      // exists on every activity, so the row's height is held
                      // either way.
                      const showActivityName = pending || !!activity.token?.name;
                      const showActivityPrice = pending || !!activity.price;
                      const showActivityCurrencyMark = !pending;
                      return (
                        <div
                          key={activity?.id ?? `pending-${i}`}
                          className="flex items-center gap-4 p-4 border-b last:border-b-0"
                        >
                          <div className="p-2 bg-accent rounded-lg">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">
                              <Loadable loading={pending} placeholder="TRANSFER">
                                {activity?.type}
                              </Loadable>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {/* Name and price are both data-conditional on a
                                  real row, but this second line exists on every
                                  row and carries the row's lower half, so it is
                                  reserved rather than withheld — otherwise each
                                  row grows by ~20px on settle, times the whole
                                  list. */}
                              {showActivityName && (
                                <span className="mr-2">
                                  <Loadable loading={pending} placeholder={t("untitled_artwork_1")}>
                                    {activity?.token?.name}
                                  </Loadable>
                                </span>
                              )}
                              {showActivityPrice && (
                                <span className="inline-flex items-center gap-1.5">
                                  {showActivityCurrencyMark && (
                                    <CurrencyIcon currency={activity.currency} size={12} />
                                  )}
                                  <Loadable loading={pending} placeholder="0.00 ETH">
                                    {showActivityCurrencyMark ? (
                                      <MoneyFigure value={formatCurrency(activity.price, activity.currency)} />
                                    ) : null}
                                  </Loadable>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <Loadable loading={pending} placeholder="12 hours ago">
                              {pending ? null : formatTimeAgo(activity.createdAt)}
                            </Loadable>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="favorites" className="space-y-6">
              {isLoading ? (
                renderNFTGrid(PENDING_NFT_CARDS)
              ) : favorites.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{tCommon("no_favorites_yet")}</p>
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