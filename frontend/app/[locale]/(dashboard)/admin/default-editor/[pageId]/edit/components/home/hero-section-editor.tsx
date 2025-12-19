"use client";

import React, { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Play,
  User,
  UserX,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Eye,
  EyeOff,
  Wallet,
} from "lucide-react";
import { EditorProps } from "./types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Mock data for preview
const MOCK_ASSETS = [
  {
    name: "Bitcoin",
    symbol: "BTC/USDT",
    currency: "BTC",
    price: 67234.5,
    change24h: 2.45,
  },
  {
    name: "Ethereum",
    symbol: "ETH/USDT",
    currency: "ETH",
    price: 3456.78,
    change24h: -1.23,
  },
  {
    name: "Solana",
    symbol: "SOL/USDT",
    currency: "SOL",
    price: 178.9,
    change24h: 5.67,
  },
  {
    name: "Cardano",
    symbol: "ADA/USDT",
    currency: "ADA",
    price: 0.65,
    change24h: -0.89,
  },
  {
    name: "Polkadot",
    symbol: "DOT/USDT",
    currency: "DOT",
    price: 8.45,
    change24h: 3.21,
  },
];

const MOCK_PORTFOLIO = {
  totalBalance: 125678.9,
  change24h: 2.34,
  assets: [
    { name: "Bitcoin", symbol: "BTC", value: 67234.5, allocation: 53.5 },
    { name: "Ethereum", symbol: "ETH", value: 34567.8, allocation: 27.5 },
    { name: "Others", symbol: "MISC", value: 23876.6, allocation: 19.0 },
  ],
};

export const HeroSectionEditor = React.memo(function HeroSectionEditor({
  variables,
  getValue,
  updateVariable,
}: EditorProps) {
  const [previewState, setPreviewState] = useState<"logged-out" | "logged-in">(
    "logged-out"
  );
  const [showBalance, setShowBalance] = useState(true);
  const heroFeatures = getValue("hero.features") || [];

  const addHeroFeature = useCallback(() => {
    const newFeatures = [
      ...heroFeatures,
      `New Feature ${heroFeatures.length + 1}`,
    ];
    updateVariable("hero.features", newFeatures);
  }, [heroFeatures, updateVariable]);

  const removeHeroFeature = useCallback(
    (index: number) => {
      const newFeatures = heroFeatures.filter(
        (_: any, i: number) => i !== index
      );
      updateVariable("hero.features", newFeatures);
    },
    [heroFeatures, updateVariable]
  );

  const updateHeroFeature = useCallback(
    (index: number, value: string) => {
      const newFeatures = [...heroFeatures];
      newFeatures[index] = value;
      updateVariable("hero.features", newFeatures);
    },
    [heroFeatures, updateVariable]
  );

  return (
    <div className="space-y-6">
      {/* State Toggle */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Preview State:</span>
          <Tabs
            value={previewState}
            onValueChange={(v) => setPreviewState(v as any)}
          >
            <TabsList>
              <TabsTrigger value="logged-out" className="gap-2">
                <UserX className="w-4 h-4" />
                Guest
              </TabsTrigger>
              <TabsTrigger value="logged-in" className="gap-2">
                <User className="w-4 h-4" />
                Logged In
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Badge variant="outline" className="text-xs">
          {previewState === "logged-in"
            ? "Shows portfolio panel"
            : "Shows markets panel"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Editor Panel */}
        <div className="space-y-4 xl:col-span-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Hero Section Settings
          </h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="hero-badge">Badge Text</Label>
              <Input
                id="hero-badge"
                value={getValue("hero.badge") || ""}
                onChange={(e) => updateVariable("hero.badge", e.target.value)}
                placeholder="e.g., #1 Crypto Trading Platform"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hero-title">Main Title</Label>
                <Input
                  id="hero-title"
                  value={getValue("hero.title") || ""}
                  onChange={(e) => updateVariable("hero.title", e.target.value)}
                  placeholder="e.g., Trade Crypto"
                />
              </div>

              <div>
                <Label htmlFor="hero-subtitle">Subtitle (Gradient)</Label>
                <Input
                  id="hero-subtitle"
                  value={getValue("hero.subtitle") || ""}
                  onChange={(e) =>
                    updateVariable("hero.subtitle", e.target.value)
                  }
                  placeholder="e.g., Like a Pro"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="hero-description">Description</Label>
              <Textarea
                id="hero-description"
                value={getValue("hero.description") || ""}
                onChange={(e) =>
                  updateVariable("hero.description", e.target.value)
                }
                rows={3}
                placeholder="Brief description of your platform"
              />
            </div>

            <div>
              <Label htmlFor="hero-cta">CTA Button Text (Guest Users)</Label>
              <Input
                id="hero-cta"
                value={getValue("hero.cta") || ""}
                onChange={(e) => updateVariable("hero.cta", e.target.value)}
                placeholder="e.g., Start Trading Free"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Logged-in users see "Start Trading" automatically
              </p>
            </div>

            {/* Hero Features */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Trust Badges / Features</Label>
                <Button
                  onClick={addHeroFeature}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {heroFeatures.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    No features added. Click "Add" to create trust badges.
                  </p>
                )}
                {heroFeatures.map((feature: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateHeroFeature(index, e.target.value)}
                      placeholder="e.g., Bank-Grade Security"
                    />
                    <Button
                      onClick={() => removeHeroFeature(index)}
                      size="icon"
                      variant="outline"
                      className="shrink-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="relative xl:col-span-2">
          <div className="sticky top-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
              <span>LIVE PREVIEW</span>
              <Badge variant="secondary" className="text-xs">
                {previewState === "logged-in" ? "Logged In View" : "Guest View"}
              </Badge>
            </div>
            <div className="relative overflow-hidden rounded-xl border bg-background">
              {/* Mock Hero Section - matching home.tsx exactly */}
              <div className="relative min-h-125 p-6 bg-linear-to-br from-background via-background to-primary/5">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[100px] bg-blue-500/30" />
                  <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-20 blur-[100px] bg-purple-500/30" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left Content */}
                  <div className="flex-1 space-y-4">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary">
                      <Sparkles className="w-3 h-3" />
                      {getValue("hero.badge") || "#1 Crypto Trading Platform"}
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                        {getValue("hero.title") || "Trade Crypto"}
                      </h1>
                      <h2 className="text-3xl lg:text-4xl font-bold bg-linear-to-r from-blue-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                        {getValue("hero.subtitle") || "like a pro"}
                      </h2>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                      {getValue("hero.description") ||
                        "Experience lightning-fast execution, institutional-grade security, and advanced trading tools designed for the modern trader."}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button className="inline-flex items-center gap-2 h-10 px-5 bg-linear-to-r from-blue-600 to-purple-600 rounded-xl font-semibold text-white text-sm shadow-lg">
                        {previewState === "logged-in"
                          ? "Start Trading"
                          : getValue("hero.cta") || "Start Trading Free"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button className="inline-flex items-center gap-2 h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-sm">
                        <Play className="w-4 h-4" />
                        Explore Markets
                      </button>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      {(heroFeatures.length > 0
                        ? heroFeatures
                        : [
                            "Bank-Grade Security",
                            "24/7 Trading",
                            "Instant Deposits",
                          ]
                      ).map((feature: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Panel - Conditional */}
                  <div className="w-full lg:w-70 shrink-0">
                    {previewState === "logged-in" ? (
                      /* Portfolio Summary */
                      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-sm">Portfolio</h3>
                            <p className="text-xs text-muted-foreground">
                              Your assets
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setShowBalance(!showBalance)}
                          >
                            {showBalance ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        <div className="mb-4">
                          <div className="text-2xl font-bold">
                            {showBalance
                              ? `$${MOCK_PORTFOLIO.totalBalance.toLocaleString()}`
                              : "••••••"}
                          </div>
                          <div className="flex items-center gap-1 text-emerald-500 text-sm">
                            <ArrowUpRight className="w-3 h-3" />+
                            {MOCK_PORTFOLIO.change24h}% today
                          </div>
                        </div>

                        <div className="space-y-2">
                          {MOCK_PORTFOLIO.assets.map((asset, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                  {asset.symbol.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-xs font-medium">
                                    {asset.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {asset.allocation}%
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-mono">
                                {showBalance
                                  ? `$${asset.value.toLocaleString()}`
                                  : "••••"}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button className="w-full mt-3 flex items-center justify-center gap-2 text-xs text-primary font-semibold py-2 rounded-lg bg-primary/10 hover:bg-primary/15">
                          <Wallet className="w-3.5 h-3.5" />
                          Manage Portfolio
                        </button>
                      </div>
                    ) : (
                      /* Live Markets Panel */
                      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-4 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-sm">Live Markets</h3>
                            <p className="text-xs text-muted-foreground">
                              Top assets
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            <span className="text-[10px] text-emerald-500 font-semibold">
                              Live
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          {MOCK_ASSETS.slice(0, 5).map((asset, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold">
                                  {asset.currency.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-xs font-medium">
                                    {asset.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {asset.symbol}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-mono font-medium">
                                  ${asset.price.toLocaleString()}
                                </div>
                                <div
                                  className={cn(
                                    "text-[10px] font-semibold flex items-center justify-end gap-0.5",
                                    asset.change24h >= 0
                                      ? "text-emerald-500"
                                      : "text-red-500"
                                  )}
                                >
                                  {asset.change24h >= 0 ? (
                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                  ) : (
                                    <ArrowDownRight className="w-2.5 h-2.5" />
                                  )}
                                  {asset.change24h >= 0 ? "+" : ""}
                                  {asset.change24h}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button className="w-full mt-3 flex items-center justify-center gap-2 text-xs text-primary font-semibold py-2 rounded-lg bg-primary/10 hover:bg-primary/15">
                          View all markets
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <div className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center p-1">
                    <div className="w-1 h-2 bg-white/40 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
