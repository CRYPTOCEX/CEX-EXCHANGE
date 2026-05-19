"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Coins,
  ArrowRightLeft,
  ShoppingCart,
  Tag,
  ListX,
  Gavel,
  Gift,
  Flame,
  ExternalLink,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ActivityItemProps {
  activity: {
    id: string;
    type: string;
    tokenId?: string;
    collectionId?: string;
    listingId?: string;
    fromUserId?: string;
    toUserId?: string;
    price?: number;
    currency?: string;
    transactionHash?: string;
    blockNumber?: number;
    metadata?: any;
    createdAt: string;
    token?: {
      id: string;
      name: string;
      tokenId: string;
      image?: string;
      collection?: {
        id: string;
        name: string;
        symbol: string;
        logoImage?: string;
      };
    };
    collection?: {
      id: string;
      name: string;
      symbol: string;
      logoImage?: string;
    };
    fromUser?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatar?: string;
    };
    toUser?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatar?: string;
    };
    listing?: {
      id: string;
      type: string;
      price: number;
      currency: string;
      status: string;
    };
  };
  onView?: (activity: any) => void;
  onDelete?: (id: string) => void;
  index?: number;
}

export function ActivityItem({ activity, onView, onDelete, index = 0 }: ActivityItemProps) {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case "MINT":
        return <Coins className="h-5 w-5 text-green-500" />;
      case "TRANSFER":
        return <ArrowRightLeft className="h-5 w-5 text-blue-500" />;
      case "SALE":
        return <ShoppingCart className="h-5 w-5 text-purple-500" />;
      case "LIST":
        return <Tag className="h-5 w-5 text-yellow-500" />;
      case "DELIST":
        return <ListX className="h-5 w-5 text-gray-500" />;
      case "BID":
        return <Gavel className="h-5 w-5 text-orange-500" />;
      case "OFFER":
        return <Gift className="h-5 w-5 text-pink-500" />;
      case "BURN":
        return <Flame className="h-5 w-5 text-red-500" />;
      default:
        return <Coins className="h-5 w-5 text-gray-500" />;
    }
  };

  const getIconBackground = (type: string) => {
    switch (type) {
      case "MINT":
        return "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20";
      case "TRANSFER":
        return "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20";
      case "SALE":
        return "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20";
      case "LIST":
        return "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20";
      case "DELIST":
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20";
      case "BID":
        return "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20";
      case "OFFER":
        return "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20";
      case "BURN":
        return "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20";
      default:
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20";
    }
  };

  const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "MINT":
      case "SALE":
        return "default";
      case "TRANSFER":
      case "LIST":
        return "secondary";
      case "BURN":
      case "DELIST":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (!price || !currency) return null;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return null;
    if (numPrice < 0.01) {
      return `${numPrice.toFixed(8).replace(/\.?0+$/, '')} ${currency}`;
    } else {
      return `${numPrice.toFixed(4).replace(/\.?0+$/, '')} ${currency}`;
    }
  };

  const getActivityDescription = () => {
    const collection = activity.token?.collection || activity.collection;
    const tokenName = activity.token?.name;
    const fromUser = activity.fromUser;
    const toUser = activity.toUser;

    switch (activity.type) {
      case "MINT":
        return (
          <span>
            <span className="font-medium">{tokenName || 'Token'}</span> {t("minted_in")}{' '}
            <span className="font-medium">{collection?.name}</span>
            {toUser && (
              <> by <span className="font-medium">{toUser.firstName} {toUser.lastName}</span></>
            )}
          </span>
        );
      case "TRANSFER":
        return (
          <span>
            <span className="font-medium">{tokenName || 'Token'}</span> transferred
            {fromUser && (
              <> from <span className="font-medium">{fromUser.firstName} {fromUser.lastName}</span></>
            )}
            {toUser && (
              <> to <span className="font-medium">{toUser.firstName} {toUser.lastName}</span></>
            )}
          </span>
        );
      case "SALE":
        return (
          <span>
            <span className="font-medium">{tokenName || 'Token'}</span> sold
            {activity.price && activity.currency && (
              <> for <span className="font-medium text-green-600 dark:text-green-400">{formatPrice(activity.price, activity.currency)}</span></>
            )}
          </span>
        );
      case "LIST":
        return (
          <span>
            <span className="font-medium">{tokenName || 'Token'}</span> {t("listed_for_sale")}
            {activity.listing?.price && activity.listing?.currency && (
              <> at <span className="font-medium">{formatPrice(activity.listing.price, activity.listing.currency)}</span></>
            )}
          </span>
        );
      case "DELIST":
        return (
          <span>
            <span className="font-medium">{tokenName || 'Token'}</span> {t("removed_from_marketplace")}
          </span>
        );
      case "BID":
        return (
          <span>
            {t("bid_placed_on")} <span className="font-medium">{tokenName || 'Token'}</span>
            {activity.price && activity.currency && (
              <> for <span className="font-medium text-orange-600 dark:text-orange-400">{formatPrice(activity.price, activity.currency)}</span></>
            )}
          </span>
        );
      case "OFFER":
        return (
          <span>
            {t("offer_made_on")} <span className="font-medium">{tokenName || 'Token'}</span>
            {activity.price && activity.currency && (
              <> for <span className="font-medium">{formatPrice(activity.price, activity.currency)}</span></>
            )}
          </span>
        );
      case "BURN":
        return (
          <span>
            <span className="font-medium">{tokenName || 'Token'}</span> {t("burned_from")}{' '}
            <span className="font-medium">{collection?.name}</span>
          </span>
        );
      default:
        return `${activity.type} activity on ${tokenName || 'Token'}`;
    }
  };

  const getUserName = (user: any) => {
    if (!user) return "Unknown";
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div className={cn(
        "relative flex items-start gap-4 rounded-lg border p-4 transition-all duration-200",
        "hover:shadow-lg hover:border-primary/20 cursor-pointer",
        isExpanded && "shadow-lg border-primary/30"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Timeline line connector */}
        <div className="absolute left-[30px] top-[60px] bottom-[-24px] w-[2px] bg-gradient-to-b from-border via-border/50 to-transparent" />

        {/* Icon */}
        <div className={cn(
          "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          getIconBackground(activity.type),
          "transition-transform duration-300 group-hover:scale-110",
          "ring-2 ring-background"
        )}>
          {getIcon(activity.type)}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getBadgeVariant(activity.type)} className="font-medium">
                {activity.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(activity);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {getActivityDescription()}
          </p>

          {/* Token preview with collection */}
          {activity.token && (
            <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
              {activity.token.image && (
                <img
                  src={activity.token.image}
                  alt={activity.token.name}
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.token.name}</p>
                {activity.token.collection && (
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.token.collection.name} #{activity.token.tokenId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 pt-3 border-t"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                {activity.fromUser && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">From</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.fromUser.avatar} />
                        <AvatarFallback>{activity.fromUser.firstName?.[0]}{activity.fromUser.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{getUserName(activity.fromUser)}</span>
                    </div>
                  </div>
                )}
                {activity.toUser && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">To</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={activity.toUser.avatar} />
                        <AvatarFallback>{activity.toUser.firstName?.[0]}{activity.toUser.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{getUserName(activity.toUser)}</span>
                    </div>
                  </div>
                )}
                {activity.transactionHash && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">{tCommon("transaction_hash")}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {activity.transactionHash}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://bscscan.com/tx/${activity.transactionHash}`, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {activity.blockNumber && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("block_number")}</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      #{activity.blockNumber}
                    </code>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-xs">
                    {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
