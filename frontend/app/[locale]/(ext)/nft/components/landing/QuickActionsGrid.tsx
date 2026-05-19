"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Palette,
  ShoppingBag,
  TrendingUp,
  Zap,
  BarChart3,
  Trophy,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useInView } from "react-intersection-observer";
import { useTranslations } from "next-intl";

export default function QuickActionsGrid() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const actions = [
    {
      icon: Palette,
      title: "Create NFT",
      description: "Turn your art into NFTs",
      href: "/nft/create",
      gradient: `from-purple-500 to-pink-500`,
      bgGradient: `from-purple-500/10 to-pink-500/10`,
      size: "large",
    },
    {
      icon: ShoppingBag,
      title: "Browse Marketplace",
      description: "Discover unique items",
      href: "/nft/marketplace",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-500/10 to-cyan-500/10",
      size: "large",
    },
    {
      icon: TrendingUp,
      title: "Sell Instantly",
      description: "List your NFTs",
      href: "/nft/creator",
      gradient: `from-purple-500 to-indigo-500`,
      bgGradient: `from-purple-500/10 to-indigo-500/10`,
      size: "medium",
    },
    {
      icon: Zap,
      title: "Batch Mint",
      description: "Mint multiple NFTs",
      href: "/nft/batch-mint",
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/10 to-orange-500/10",
      size: "medium",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Track your portfolio",
      href: "/nft/creator",
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/10",
      size: "medium",
    },
    {
      icon: Trophy,
      title: "Top Sellers",
      description: "View leaderboard",
      href: "/nft/marketplace",
      gradient: "from-yellow-500 to-amber-500",
      bgGradient: "from-yellow-500/10 to-amber-500/10",
      size: "medium",
    },
  ];

  return (
    <section ref={ref} className="py-20">
      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4 border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {tCommon("quick_actions")}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {tExt("what_would_you_like_to_do")}
          </h2>
          <p className="text-muted-foreground">
            {t("get_started_with_nfts_in_just_a_few_clicks")}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[200px]">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const gridSpan =
              action.size === "large"
                ? "lg:col-span-2"
                : action.size === "medium"
                ? "lg:col-span-1"
                : "";

            return (
              <Link key={action.title} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className={`group relative bg-card border border-border rounded-2xl p-6 overflow-hidden transition-all hover:shadow-xl cursor-pointer ${gridSpan}`}
                >
                  {/* Background Gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${action.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                  />

                  {/* Animated Orb */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${action.gradient} rounded-full blur-3xl opacity-20`}
                  />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {tCommon("get_started")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Decorative Pattern */}
                  <div className="absolute bottom-0 right-0 w-32 h-32 opacity-5">
                    <Layers className="w-full h-full" />
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* Additional CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            {t("not_sure_where_to_start")}
          </p>
          <Link href="/nft/marketplace">
            <Button size="lg" variant="outline" className="gap-2">
              {t("explore_collections")}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
