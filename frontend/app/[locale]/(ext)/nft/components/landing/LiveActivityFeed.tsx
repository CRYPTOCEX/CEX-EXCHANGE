"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ShoppingCart,
  Send,
  Tag,
  Sparkles,
  Gavel,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useInView } from "react-intersection-observer";
import { formatDistanceToNow } from "date-fns";
import { useNftStore } from "@/store/nft/nft-store";
import { formatCurrency } from "@/utils/format";
import { useTranslations } from "next-intl";

interface ActivityItem {
  id: string;
  type: "MINT" | "SALE" | "TRANSFER" | "LIST" | "BID" | "OFFER";
  user: string;
  nftName: string;
  price?: number;
  currency?: string;
  timestamp: Date;
  avatar?: string;
}

export default function LiveActivityFeed() {
  const t = useTranslations("ext");
  const tExtNft = useTranslations("ext_nft");
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const { activities: storeActivities, fetchActivities } = useNftStore();

  useEffect(() => {
    if (inView) {
      fetchActivities({ limit: 20 });
    }
  }, [inView, fetchActivities]);

  // Transform store activities to component format
  const activities: ActivityItem[] = storeActivities.map(activity => ({
    id: activity.id,
    type: activity.type as ActivityItem["type"],
    user: activity.fromUser
      ? `${activity.fromUser.firstName} ${activity.fromUser.lastName}`.trim()
      : activity.toUser
      ? `${activity.toUser.firstName} ${activity.toUser.lastName}`.trim()
      : "Unknown User",
    nftName: activity.token?.name || "NFT",
    price: activity.price,
    currency: activity.currency,
    timestamp: new Date(activity.createdAt || Date.now()),
    avatar: activity.fromUser?.avatar || activity.toUser?.avatar,
  }));

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "MINT":
        return <Sparkles className="w-4 h-4" />;
      case "SALE":
        return <ShoppingCart className="w-4 h-4" />;
      case "TRANSFER":
        return <Send className="w-4 h-4" />;
      case "LIST":
        return <Tag className="w-4 h-4" />;
      case "BID":
        return <Gavel className="w-4 h-4" />;
      case "OFFER":
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "MINT":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "SALE":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "TRANSFER":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "LIST":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "BID":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "OFFER":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    const formattedPrice = activity.price && activity.currency
      ? formatCurrency(activity.price, activity.currency)
      : '';

    switch (activity.type) {
      case "MINT":
        return `minted ${activity.nftName}`;
      case "SALE":
        return `bought ${activity.nftName} for ${formattedPrice}`;
      case "TRANSFER":
        return `transferred ${activity.nftName}`;
      case "LIST":
        return `listed ${activity.nftName} for ${formattedPrice}`;
      case "BID":
        return `bid ${formattedPrice} on ${activity.nftName}`;
      case "OFFER":
        return `made an offer on ${activity.nftName}`;
    }
  };

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl bg-green-500/50"
                />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">{t("live_activity")}</h2>
              <Badge variant="secondary" className="ml-2 animate-pulse">
                LIVE
              </Badge>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground"
            >
              {tExtNft("real_time_nft_marketplace_activity")}
            </motion.p>
          </div>
        </div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          ref={containerRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative"
        >
          <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -50, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 50, height: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Activity Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${getActivityColor(
                        activity.type
                      )}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Activity Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm">
                          <span className="font-semibold group-hover:text-primary transition-colors">
                            {activity.user}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {getActivityText(activity)}
                          </span>
                        </p>
                        {activity.price && activity.currency && (
                          <Badge variant="secondary" className="shrink-0">
                            {formatCurrency(activity.price, activity.currency)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(activity.timestamp, {
                            addSuffix: true,
                          })}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Gradient Overlays */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-muted/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/20 to-transparent pointer-events-none" />
        </motion.div>

        {/* View All Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <Link href="/nft/marketplace">
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 transition-colors"
            >
              {t("view_all_activity")} <ArrowRight className="w-3 h-3 ml-1" />
            </Badge>
          </Link>
        </motion.div>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary));
        }
      `}</style>
    </section>
  );
}
