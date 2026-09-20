"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StatsCard, statsCardColors, isFigureValue } from "@/components/ui/card/stats-card";
import { MoneyFigure } from "@/components/ui/money-figure";
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
import { useKycGate } from "@/hooks/use-kyc-gate";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useNftStore } from "@/store/nft/nft-store";
import { useConfigStore } from "@/store/config";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { AuthModal } from "@/components/auth/auth-modal";
import { toast } from "sonner";
import MakeOfferModal from "../../components/modals/make-offer-modal";
import { useWalletStore } from "@/store/nft/wallet-store";
import { purchaseNFT } from "@/utils/nft-purchase";
import { publicName, publicShortName } from "@/utils/display-name";
import { cn } from "@/lib/utils";
import {
  ChainIcon,
  CurrencyIcon,
  chainDisplayName,
  chainNativeCurrency,
} from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { CollectionAvatar } from "@/app/[locale]/(ext)/nft/components/shared/collection-avatar";

interface NFTTokenClientProps {
  tokenId: string;
}

export default function NFTTokenClient({ tokenId }: NFTTokenClientProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("ext_nft");
  const tExt = useTranslations("ext");
  const router = useRouter();
  const { user } = useUserStore();
  // Second entry point to the same purchase the /nft/[id] page exposes: this
  // one signs the marketplace transaction directly, so gating only the other
  // route would leave the action reachable.
  const buyGate = useKycGate("buy_nft");
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
        toast.success(t("removed_from_favorites"));
      } else {
        await addToFavorites(selectedToken.id);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        toast.success(t("added_to_favorites"));
      }
    } catch (error) {
      toast.error(t("failed_to_update_favorites"));
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
      toast.success(tExt("link_copied_to_clipboard"));
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!isConnected) {
      toast.error(t("please_connect_your_wallet_first"));
      return;
    }

    if (!selectedToken?.currentListing) {
      toast.error(t("this_nft_is_not_listed_for_sale"));
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
        toast.success(t("nft_purchased_successfully"));
        router.push("/nft/creator?tab=nfts");
      } else {
        toast.error(t("failed_to_purchase_nft"));
      }
    } catch (error: any) {
      if (error.message?.includes("User denied")) {
        toast.error(t("transaction_was_cancelled"));
      } else {
        toast.error(error.message || t("failed_to_purchase_nft"));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleDelist = async () => {
    if (!selectedToken?.currentListing) {
      toast.error(t("no_active_listing_found"));
      return;
    }

    try {
      await cancelListing(selectedToken.currentListing.id);
      toast.success(t("listing_cancelled_successfully"));
      // Refresh the token data
      await fetchTokenById(tokenId);
    } catch (error: any) {
      toast.error(error.message || t("failed_to_cancel_listing"));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard"));
  };

  /*
    THE SPINNER THAT USED TO BE HERE
    ================================
    `if (loading) return <div className="min-h-screen"><LoadingSpinner/></div>`
    blanked the entire token page for the duration of one GET. That page is a
    two-column grid whose left column alone is a square hero image — on a
    desktop container that is ~620px tall — plus a three-up stat row; the right
    column is a title, an owner row, a price card and a tab panel. All of it
    arrived at once, and because the document was one viewport tall until then,
    the scrollbar appeared in the same frame and re-laid the whole grid out
    again.

    Everything structural here is knowable up front: the breadcrumb bar, the
    image frame (it is `aspect-square`, so its height comes from the column
    width, not from the image), the stat cards, the tab bar and the Token
    Details table are all literal markup. Only the strings inside them wait.

    `!loading && !selectedToken` below, because "not fetched yet" and "no such
    token" were the same test and the 404 panel would otherwise be the first
    thing every visitor sees.
  */
  /** The fetch RESOLVED and there is no such token. Not a pending state. */
  const tokenNotFound = !loading && !selectedToken;

  if (tokenNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className={`w-24 h-24 mx-auto bg-primary/20 rounded-full flex items-center justify-center`}>
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">{t("nft_not_found")}</h1>
          <p className="text-muted-foreground text-lg">{t("the_nft_youre_looking")}</p>
          <Link href="/nft/marketplace">
            <Button size="lg" className={`bg-primary`}>
              {t("browse_marketplace")}
            </Button>
          </Link>
        </m.div>
      </div>
    );
  }

  // Only a signed-in user who fails the KYC check is blocked: "loading" and
  // "anonymous" are not KYC problems and this page has its own AuthModal.
  const buyBlocked =
    buyGate.state === "needs_kyc" || buyGate.state === "needs_level";

  /**
   * The token as the RENDER sees it — never null, possibly empty.
   *
   * The markup below used to be reachable only after `if (!selectedToken)
   * return`, so it dereferences the token unguarded in about fifty places. Now
   * that the page also renders while the fetch is in flight, one `??` at the
   * top is what makes all fifty safe, instead of fifty separate `?.`s that
   * would each have to be remembered by the next person to touch this file.
   *
   * `Partial<…>` and not `any`: every field stays typed, it just becomes
   * optional, so a typo in a field name is still a compile error. It is derived
   * from `typeof selectedToken` rather than naming `NftToken` so it cannot
   * drift from whatever the store actually holds.
   */
  const token = selectedToken ?? ({} as Partial<NonNullable<typeof selectedToken>>);

  const isOwner = user?.id === token.ownerId;
  const isForSale = token.currentListing?.type === "FIXED_PRICE";
  const isAuction = token.currentListing?.type === "AUCTION";
  // Get chain-specific native currency
  const chain = token.collection?.chain?.toUpperCase() || "ETH";
  const displayCurrency = chainNativeCurrency(chain);

  /**
   * The activity tab RESOLVED and has nothing to show.
   *
   * Named for the same reason the guards above are: `!loading && …` written
   * inline reads as content being withheld while a fetch runs, and this is the
   * opposite — it can only be true once the fetch has settled.
   */
  const showNoActivity =
    !loading && (!token.priceHistory || token.priceHistory.length === 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header with Breadcrumb */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 pt-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/nft" className="hover:text-primary transition-colors">NFT</Link>
              <ChevronRight className="w-4 h-4" />
              {token.collection && (
                <>
                  <Link
                    href={`/nft/collection/${token.collection.id}`}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {token.collection.name}
                    {token.collection.isVerified && (
                      <Verified className="w-3 h-3 text-primary fill-primary" />
                    )}
                  </Link>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
              {/* The breadcrumb bar is a fixed-height row of `text-sm`, so the
                  placeholder only has to hold the line — but it holds it with
                  the same text metrics the name will use, which is why the bar
                  does not change height when the token arrives. */}
              <span className="text-foreground font-medium">
                <Loadable loading={loading} chars={18}>{token.name}</Loadable>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleLike}>
                <Heart className={cn("w-4 h-4", isLiked && "fill-destructive text-destructive")} />
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
                  <DropdownMenuItem onClick={() => window.open(`https://bscscan.com/token/${token.collection?.contractAddress}`, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {tCommon("view_on_explorer")}
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
            <div className={`relative aspect-square bg-primary/5 rounded-xl overflow-hidden border-2 border-border group`}>
              {token.imageUrl ? (
                <Image
                  src={token.imageUrl}
                  alt={token.name}
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
                  <Badge className="bg-success/90 backdrop-blur-sm border-0">
                    <Tag className="w-3 h-3 mr-1" />
                    {t("for_sale")}
                  </Badge>
                )}
                {isAuction && (
                  <Badge className="bg-warning/90 backdrop-blur-sm border-0">
                    <Flame className="w-3 h-3 mr-1" />
                    {t("live_auction")}
                  </Badge>
                )}
              </div>
              <div className="absolute top-4 right-4">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full backdrop-blur-sm bg-overlay/50 hover:bg-overlay/70"
                  onClick={() => window.open(token.imageUrl, '_blank')}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {/* `loading` goes to the CARD, not around the grid. The card
                  keeps its border, its label and its icon tile in both states
                  and swaps only the figure — which is the difference between
                  this row settling by 0px and the whole three-up row appearing
                  from nothing. */}
              <StatsCard
                label="Views"
                value={token.views || 0}
                icon={Eye}
                loading={loading}
                {...statsCardColors.neutral}
              />
              <StatsCard
                label="Favorites"
                value={likesCount}
                icon={Heart}
                loading={loading}
                {...statsCardColors.neutral}
              />
              <StatsCard
                label="Rank"
                value={`#${token.rank || "N/A"}`}
                icon={TrendingUp}
                loading={loading}
                {...statsCardColors.neutral}
              />
            </div>
          </div>

          {/* Right Column - Info & Actions */}
          <div className="space-y-4">
            {/* Collection Badge */}
            {token.collection && (
              <Link
                href={`/nft/collection/${token.collection.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-full hover:border-primary/50 transition-colors"
              >
                <CollectionAvatar
                  src={token.collection.logoImage}
                  name={token.collection.name}
                  size={20}
                />
                <span className="text-sm font-medium">{token.collection.name}</span>
                {token.collection.isVerified && (
                  <Verified className="w-4 h-4 text-primary fill-primary" />
                )}
              </Link>
            )}

            {/* Title. The `<Loadable>` sits INSIDE the `h1` so the reserved box
                is measured at `text-3xl` — a sibling `h-9 w-64` block would be
                a guess, and it would stop matching the moment anyone changed
                this heading's size. */}
            <h1 className="text-3xl font-bold">
              <Loadable loading={loading} chars={16}>{token.name}</Loadable>
            </h1>

            {/* Owner & Creator */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("owned_by")}</span>
                <Link href={`/nft/user/${token.ownerId}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={token.owner?.avatar} />
                    {/* The monogram was `firstName[0] + lastName[0]` — the two
                        initials off the identity document, on a page a
                        signed-out visitor can read. One letter off the public
                        name is all a monogram ever needed. */}
                    <AvatarFallback>
                      {publicShortName(token.owner, tCommon("unknown")).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-primary">
                    {/* Without this the row asserts the owner is "Unknown" for
                        the length of the fetch and then corrects itself. The
                        label "Owned by" beside it is static and stays. */}
                    <Loadable loading={loading} chars={14}>
                      {/* This joined `firstName` and `lastName` by hand, so the
                          holder's legal name was the label on every token page.
                          The ladder answers with the handle, and reduces a
                          surname that reached the browser to an initial. */}
                      {publicName(token.owner, tCommon("unknown"))}
                    </Loadable>
                  </span>
                </Link>
              </div>
              {token.creator && token.creatorId !== token.ownerId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{tExt("created_by")}</span>
                  <Link href={`/nft/creator/${token.creatorId}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={token.creator?.user?.avatar || token.creator?.avatar} />
                      {/* Same two identity-document initials as the owner
                          monogram above. */}
                      <AvatarFallback>
                        {(token.creator?.displayName ||
                          publicShortName(token.creator?.user, tCommon("unknown")))
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-primary">
                      {/* `displayName` is the creator's own chosen studio name
                          and stays first. What followed it was a hand-joined
                          `firstName lastName`, so a creator who never set one
                          was introduced to strangers by their KYC name. */}
                      {token.creator?.displayName ||
                        publicName(token.creator?.user, tCommon("unknown"))}
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* Price Card - Compact */}
            {(isForSale || isAuction) && token.currentListing && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {isAuction ? tCommon("current_bid") : tCommon("current_price")}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <CurrencyIcon currency={displayCurrency} size={22} className="self-center" />
                      <span className="text-2xl font-mono font-semibold leading-tight tracking-tight tabular-nums text-foreground">{Number(token.currentListing.price).toFixed(6)}</span>
                      <span className="text-lg text-muted-foreground">{displayCurrency}</span>
                    </div>
                  </div>
                  {/*
                    A SECOND SHIFT, ONE FULL SECOND AFTER THE PAGE SETTLES.

                    `timeLeft` is produced by a `setInterval` that only starts
                    once the listing has arrived, and its first tick is 1000ms
                    later — so gated on `isAuction && timeLeft` this whole
                    right-hand block was absent when the auction data landed and
                    appeared a second afterwards, when the user had already
                    started reading. It is a two-line block inside the price
                    card's flex row, so its arrival re-measured the row.

                    Gating on `isAuction` alone puts the label and the box on
                    screen with the rest of the listing, and only the ticking
                    figure waits for the first tick.
                  */}
                  {isAuction && (
                    <div className="text-right">
                      <div className="text-xs font-medium text-muted-foreground mb-1">{tCommon("ends_in")}</div>
                      {/* The countdown ticks every second, so it wants tabular
                          figures — but the same state ends on the word "Ended",
                          and a word in a monospace face reads as broken. */}
                      <div
                        className={cn(
                          "flex items-center gap-1 text-warning font-semibold",
                          (!timeLeft || isFigureValue(timeLeft)) && "font-mono tabular-nums"
                        )}
                      >
                        <Clock className="w-4 h-4" />
                        <Loadable loading={!timeLeft} placeholder="0d 00h 00m 00s">
                          {timeLeft}
                        </Loadable>
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
                  ) : buyBlocked ? (
                    <KycRequiredNotice
                      feature="buy_nft"
                      requirement={buyGate.requirement ?? "verification"}
                    />
                  ) : (
                    <>
                      {isForSale && (
                        <Button
                          onClick={handlePurchase}
                          disabled={isPurchasing}
                          className={`flex-1 bg-primary hover:bg-primary/90`}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {isPurchasing ? `${tCommon("processing")}…` : tCommon("buy_now")}
                        </Button>
                      )}
                      {user && !isOwner && token.currentListing && offersEnabled && (
                        <Button
                          onClick={() => setShowOfferModal(true)}
                          variant="outline"
                          className="flex-1 border-2 hover:border-primary/50"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          {tCommon("make_offer")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {!token.currentListing && isOwner && (
              <Button
                onClick={() => router.push(`/nft/token/${tokenId}/list`)}
                className={`w-full bg-primary hover:bg-primary/90`}
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
                {token.description && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Description
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {token.description}
                    </p>
                  </div>
                )}

                {/* Properties */}
                {token.attributes && Array.isArray(token.attributes) && token.attributes.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Properties
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {token.attributes.map((attr: any, idx: number) => (
                        <div key={idx} className="bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="text-xs text-primary font-medium">{attr.trait_type}</div>
                          <div className="text-sm font-semibold mt-1 text-foreground">{attr.value}</div>
                          {attr.rarity && (
                            <div className="text-[11px] text-subtle-foreground mt-1">{attr.rarity}% rarity</div>
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
                        onClick={() => copyToClipboard(token.collection?.contractAddress || "")}
                        className="flex items-center gap-1 text-primary hover:opacity-80"
                      >
                        <span className="font-mono text-xs">
                          <Loadable loading={loading} placeholder="0x1234...abcd">
                            {token.collection?.contractAddress?.slice(0, 6)}...{token.collection?.contractAddress?.slice(-4)}
                          </Loadable>
                        </span>
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tExt("token_id")}</span>
                      <span className="font-mono text-xs">
                        <Loadable loading={loading} placeholder="0000">{token.tokenId || token.id}</Loadable>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tExt("token_standard")}</span>
                      <span className="font-semibold">ERC-721</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Blockchain</span>
                      {/* This read "BNB Smart Chain" for every token, hardcoded,
                          whatever chain the collection was actually deployed to. */}
                      <span className="font-semibold flex items-center gap-1.5">
                        <ChainIcon chain={chain} size={16} />
                        {chainDisplayName(chain)}
                      </span>
                    </div>
                    {token.collectionId && token.tokenId && (
                      <>
                        <Separator className="my-3" />
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">{t("metadata_url")}</span>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => {
                                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                                const metadataUrl = `${siteUrl}/api/nft/metadata/${token.collectionId}/${token.tokenId}`;
                                window.open(metadataUrl, '_blank');
                              }}
                              className="flex items-center gap-1 text-primary hover:opacity-80 text-xs"
                            >
                              <span>{t("view_json")}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                                const metadataUrl = `${siteUrl}/api/nft/metadata/${token.collectionId}/${token.tokenId}`;
                                copyToClipboard(metadataUrl);
                              }}
                              className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs"
                            >
                              <span className="font-mono">
                                .../metadata/{token.tokenId}
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
                  {user && !isOwner && token.currentListing && !buyBlocked && (
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
                    {/* Pending rows in the SAME `space-y-3` stack, with the
                        same `py-2 border-b` row frame — so the panel's height
                        comes from the same box model in both states. */}
                    {loading &&
                      Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={`pending-${i}`}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">
                                <SkeletonText placeholder="Transfer" />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <SkeletonText placeholder="00/00/0000" />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">
                              <SkeletonText placeholder="0.0000 ETH" />
                            </div>
                          </div>
                        </div>
                      ))}
                    {token.priceHistory?.slice(0, 5).map((item: any, idx: number) => (
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
                          <div className="text-sm font-semibold text-foreground flex items-center justify-end gap-1.5">
                            <CurrencyIcon currency={item.currency || displayCurrency} size={14} />
                            <MoneyFigure value={`${item.price} ${item.currency || displayCurrency}`} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* An EMPTY price history and an unfetched one are not the
                        same fact; without the `loading` half of this predicate
                        the tab asserted "No activity yet" on every visit. */}
                    {showNoActivity && (
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
      {/* `selectedToken` and not the `token` alias: the modal wants a complete
          token, and this is the one place that is only reachable after a click,
          so the real value is guaranteed to be there. */}
      {showOfferModal && !buyBlocked && selectedToken && (
        <MakeOfferModal
          token={selectedToken}
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
        />
      )}
    </div>
  );
}
