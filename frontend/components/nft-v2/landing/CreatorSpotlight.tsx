"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useNftStore } from "@/store/nft/nft-store";

interface Creator {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar?: string;
  banner?: string;
  isVerified: boolean;
  verificationTier?: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  totalItems: number;
  totalSales: number;
  totalVolume: number;
  followers: number;
  isFollowing?: boolean;
}

export default function CreatorSpotlight() {
  const { topCreators, fetchTopCreators } = useNftStore();
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      fetchTopCreators(4, "all", "volume");
    }
  }, [inView, fetchTopCreators]);

  // Transform backend data to component format
  const creators: Creator[] = topCreators.map(creator => ({
    id: creator.id,
    name: creator.displayName || creator.username,
    username: creator.username || `@${creator.displayName?.toLowerCase().replace(/\s+/g, '')}`,
    bio: creator.bio || "Creating amazing NFTs",
    avatar: creator.avatar || creator.user?.avatar,
    banner: creator.banner,
    isVerified: creator.isVerified || false,
    verificationTier: creator.verificationTier,
    totalItems: creator.metrics?.totalItems || 0,
    totalSales: creator.metrics?.totalSales || 0,
    totalVolume: creator.metrics?.totalVolume || 0,
    followers: 0, // Not tracked in current backend
  }));

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case "PLATINUM":
        return "from-cyan-400 to-blue-400";
      case "GOLD":
        return "from-amber-400 to-yellow-400";
      case "SILVER":
        return "from-gray-300 to-gray-400";
      case "BRONZE":
        return "from-orange-400 to-amber-600";
      default:
        return "from-primary to-purple-600";
    }
  };

  const handleFollow = (creatorId: string) => {
    setCreators((prev) =>
      prev.map((creator) =>
        creator.id === creatorId
          ? {
              ...creator,
              isFollowing: !creator.isFollowing,
              followers: creator.isFollowing
                ? creator.followers - 1
                : creator.followers + 1,
            }
          : creator
      )
    );
  };

  return (
    <section ref={ref} className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                Featured Creators
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-muted-foreground"
            >
              Meet the talented artists shaping the NFT space
            </motion.p>
          </div>
          <Link href="/nft/marketplace">
            <Button variant="outline" className="gap-2 hidden md:flex">
              View All Creators
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Creators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {creators.map((creator, index) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:border-primary/50 transition-all">
                {/* Banner */}
                <div className="relative h-24 bg-gradient-to-br from-primary/20 via-purple-600/20 to-pink-600/20">
                  {creator.banner ? (
                    <img
                      src={creator.banner}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-600/30 to-pink-600/30" />
                  )}
                </div>

                {/* Avatar Overlap */}
                <div className="px-6 -mt-12 relative z-10">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border-4 border-card shadow-xl">
                    {creator.avatar ? (
                      <img
                        src={creator.avatar}
                        alt={creator.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-full h-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-2xl",
                          `bg-gradient-to-br ${getTierColor(creator.verificationTier)}`
                        )}
                      >
                        {creator.name.charAt(0)}
                      </div>
                    )}
                    {/* Verification Badge Overlay */}
                    {creator.isVerified && (
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center border-2 border-card",
                          getTierColor(creator.verificationTier)
                        )}
                      >
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 pt-4">
                  {/* Name & Username */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate">
                        {creator.name}
                      </h3>
                      {creator.verificationTier && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {creator.verificationTier}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {creator.username}
                    </p>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                    {creator.bio}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold">
                        {creator.totalItems}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Items
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold">
                        {(creator.totalVolume / 1000).toFixed(1)}K
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Volume
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold">
                        {(creator.followers / 1000).toFixed(1)}K
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Followers
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={creator.isFollowing ? "outline" : "default"}
                      className="flex-1 gap-1"
                      onClick={() => handleFollow(creator.id)}
                    >
                      <Users className="w-3 h-3" />
                      {creator.isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Link href={`/nft/creator/${creator.id}`}>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="flex justify-center mt-8 md:hidden">
          <Link href="/nft/marketplace">
            <Button className="gap-2">
              View All Creators
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {/* Become a Creator CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-600/10 to-pink-600/10 border border-primary/20"
        >
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4 border border-primary/30">
              <Palette className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Become a Creator
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-3">
              Ready to showcase your art?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of creators earning from their digital art. Start
              minting your NFTs today with zero upfront costs.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/nft/create">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-purple-600"
                >
                  <Palette className="w-5 h-5" />
                  Create Your First NFT
                </Button>
              </Link>
              <Link href="/nft/creator">
                <Button size="lg" variant="outline" className="gap-2">
                  <TrendingUp className="w-5 h-5" />
                  View Creator Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
