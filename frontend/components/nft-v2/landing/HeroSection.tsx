"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Sparkles,
  TrendingUp,
  Zap,
  ArrowRight,
  Play,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useNftStore } from "@/store/nft/nft-store";
import CountUp from "react-countup";

export default function HeroSection() {
  const { stats } = useNftStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-24">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5">
        {/* Animated Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <Badge className="px-4 py-2 text-sm bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30">
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              Discover the Future of Digital Art
            </Badge>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center mb-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              Discover, Collect
            </span>
            <br />
            <span className="text-foreground">& Sell Extraordinary NFTs</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground text-center max-w-3xl mx-auto mb-10"
          >
            The world's first and largest digital marketplace for crypto
            collectibles and non-fungible tokens. Buy, sell, and discover
            exclusive digital items.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition" />
              <div className="relative flex gap-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search NFTs, collections, or creators..."
                    className="pl-12 h-12 border-0 bg-transparent focus-visible:ring-0 text-base"
                  />
                </div>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shrink-0"
                >
                  Search
                </Button>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <Link href="/nft/marketplace">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/25"
              >
                <TrendingUp className="w-5 h-5" />
                Explore Marketplace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/nft/create">
              <Button size="lg" variant="outline" className="gap-2 shadow-lg">
                <Zap className="w-5 h-5" />
                Create NFT
              </Button>
            </Link>
            <Button size="lg" variant="ghost" className="gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Stats */}
          {mounted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              {[
                {
                  label: "Total Volume",
                  rawValue: stats?.totalVolume || 2400000,
                  value: (stats?.totalVolume || 2400000) / 1000000,
                  prefix: "$",
                  suffix: "M",
                  decimals: 1,
                },
                {
                  label: "Total NFTs",
                  rawValue: stats?.totalNFTs || 1200000,
                  value: (stats?.totalNFTs || 1200000) / 1000,
                  suffix: "K",
                  decimals: 1,
                },
                {
                  label: "Collections",
                  rawValue: stats?.totalCollections || 45000,
                  value: (stats?.totalCollections || 45000) / 1000,
                  suffix: "K",
                  decimals: 1,
                },
                {
                  label: "Active Traders",
                  rawValue: stats?.totalUsers || 8200,
                  value: (stats?.totalUsers || 8200) / 1000,
                  suffix: "K",
                  decimals: 1,
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-4 rounded-xl bg-background/50 backdrop-blur border border-border/50 hover:border-primary/50 transition"
                >
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {stat.prefix}
                    <CountUp
                      end={stat.value}
                      duration={2.5}
                      decimals={stat.decimals}
                      separator=","
                    />
                    {stat.suffix}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
}
