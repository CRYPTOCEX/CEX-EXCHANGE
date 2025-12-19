"use client";

import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Shield,
  Zap,
  BarChart3,
  Users,
  Target,
  DollarSign,
  Smartphone,
  Globe,
  Award,
  Star,
  Heart,
  Lock,
  Cpu,
  Wifi,
  Clock,
  TrendingUp,
  CheckCircle,
  Settings,
  CreditCard,
  Gift,
  Headphones,
  Eye,
  Layers,
  Rocket,
  Lightbulb,
  Database,
  Cloud,
  Wallet,
  Activity,
  PieChart,
  LineChart,
  LayoutGrid
} from "lucide-react";
import { EditorProps } from "./types";
import { cn } from "@/lib/utils";

// Icon mapping
const iconMap: Record<string, any> = {
  Shield, Zap, BarChart3, Users, Target, DollarSign, Smartphone, Globe,
  Award, Star, Heart, Lock, Cpu, Wifi, Clock, TrendingUp, CheckCircle,
  Settings, CreditCard, Gift, Headphones, Eye, Layers, Rocket, Lightbulb,
  Database, Cloud, Wallet, Activity, PieChart, LineChart
};

const ICON_OPTIONS = [
  { value: "Shield", label: "Security" },
  { value: "Zap", label: "Lightning Fast" },
  { value: "Globe", label: "Global" },
  { value: "Clock", label: "24/7 Support" },
  { value: "BarChart3", label: "Analytics" },
  { value: "Users", label: "Community" },
  { value: "Target", label: "Goals" },
  { value: "DollarSign", label: "Money" },
  { value: "Smartphone", label: "Mobile" },
  { value: "Award", label: "Award" },
  { value: "Star", label: "Premium" },
  { value: "Heart", label: "Trusted" },
  { value: "Lock", label: "Secure" },
  { value: "Cpu", label: "Performance" },
  { value: "Wifi", label: "Connected" },
  { value: "TrendingUp", label: "Growth" },
  { value: "CheckCircle", label: "Verified" },
  { value: "Settings", label: "Customize" },
  { value: "CreditCard", label: "Payment" },
  { value: "Gift", label: "Rewards" },
  { value: "Headphones", label: "Support" },
  { value: "Eye", label: "Transparency" },
  { value: "Layers", label: "Multi-layer" },
  { value: "Rocket", label: "Fast" },
  { value: "Lightbulb", label: "Innovation" },
  { value: "Database", label: "Data" },
  { value: "Cloud", label: "Cloud" },
  { value: "Wallet", label: "Wallet" },
  { value: "Activity", label: "Activity" },
  { value: "PieChart", label: "Diversified" },
  { value: "LineChart", label: "Analytics" },
];

const GRADIENT_OPTIONS = [
  { value: "from-emerald-500 to-cyan-500", label: "Emerald to Cyan" },
  { value: "from-yellow-500 to-orange-500", label: "Yellow to Orange" },
  { value: "from-blue-500 to-indigo-500", label: "Blue to Indigo" },
  { value: "from-purple-500 to-pink-500", label: "Purple to Pink" },
  { value: "from-red-500 to-rose-500", label: "Red to Rose" },
  { value: "from-green-500 to-emerald-500", label: "Green to Emerald" },
  { value: "from-orange-500 to-red-500", label: "Orange to Red" },
  { value: "from-cyan-500 to-blue-500", label: "Cyan to Blue" },
  { value: "from-pink-500 to-rose-500", label: "Pink to Rose" },
  { value: "from-indigo-500 to-purple-500", label: "Indigo to Purple" },
];

// Default features matching home.tsx
const DEFAULT_FEATURES = [
  { icon: "Shield", title: "Bank-Grade Security", description: "Multi-layer security with cold storage and 2FA", gradient: "from-emerald-500 to-cyan-500" },
  { icon: "Zap", title: "Lightning Fast", description: "Ultra-low latency trading engine", gradient: "from-yellow-500 to-orange-500" },
  { icon: "Globe", title: "Global Access", description: "Trade from anywhere in the world", gradient: "from-blue-500 to-indigo-500" },
  { icon: "Clock", title: "24/7 Support", description: "Round-the-clock customer support", gradient: "from-purple-500 to-pink-500" },
];

export const FeaturesSectionEditor = React.memo(function FeaturesSectionEditor({
  variables,
  getValue,
  updateVariable
}: EditorProps) {
  // Initialize with exactly 4 features (matching frontend display limit)
  const features = getValue('features') || DEFAULT_FEATURES;

  // Ensure we always have exactly 4 features
  const displayFeatures = features.slice(0, 4);

  // If less than 4, pad with defaults
  while (displayFeatures.length < 4) {
    displayFeatures.push(DEFAULT_FEATURES[displayFeatures.length]);
  }

  const updateFeature = useCallback((index: number, field: string, value: any) => {
    const newFeatures = [...displayFeatures];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    updateVariable('features', newFeatures);
  }, [displayFeatures, updateVariable]);

  return (
    <div className="space-y-6">
      {/* Section Header Settings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-4 xl:col-span-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            Features Section
          </h3>

          <div>
            <Label htmlFor="features-badge">Badge Text</Label>
            <Input
              id="features-badge"
              value={getValue('featuresSection.badge') || ''}
              onChange={(e) => updateVariable('featuresSection.badge', e.target.value)}
              placeholder="e.g., Why Choose Us"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="features-title">Title</Label>
              <Input
                id="features-title"
                value={getValue('featuresSection.title') || ''}
                onChange={(e) => updateVariable('featuresSection.title', e.target.value)}
                placeholder="e.g., Built for"
              />
            </div>
            <div>
              <Label htmlFor="features-subtitle">Subtitle (Gradient)</Label>
              <Input
                id="features-subtitle"
                value={getValue('featuresSection.subtitle') || ''}
                onChange={(e) => updateVariable('featuresSection.subtitle', e.target.value)}
                placeholder="e.g., Professional Traders"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="features-description">Description</Label>
            <Textarea
              id="features-description"
              value={getValue('featuresSection.description') || ''}
              onChange={(e) => updateVariable('featuresSection.description', e.target.value)}
              rows={2}
              placeholder="Explain why users should choose your platform"
            />
          </div>
        </div>

        {/* Header Preview */}
        <div className="relative rounded-xl border overflow-hidden xl:col-span-2">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-5 left-10 w-20 h-20 rounded-full opacity-20 blur-[60px] bg-blue-500/40" />
            <div className="absolute bottom-5 right-10 w-24 h-24 rounded-full opacity-20 blur-[60px] bg-purple-500/40" />
          </div>
          <div className="relative p-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary mb-3">
              <Award className="w-3 h-3" />
              {getValue('featuresSection.badge') || 'Why Choose Us'}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {getValue('featuresSection.title') || 'Built for'}{" "}
              <span className="bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {getValue('featuresSection.subtitle') || 'Professional Traders'}
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {getValue('featuresSection.description') || 'Experience unmatched security, lightning-fast execution, and professional-grade tools designed for serious traders.'}
            </p>
          </div>
        </div>
      </div>

      {/* Features List Editor */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Features (4 Total)</h3>
          <p className="text-sm text-muted-foreground">Edit the 4 key features shown in "Why Choose Us" section</p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-3">
          {displayFeatures.map((feature: any, index: number) => {
            const IconComponent = iconMap[feature.icon] || Shield;
            return (
              <div key={index} className="p-4 border rounded-lg bg-card">
                <div className="flex items-start gap-4">
                  {/* Feature Preview Icon */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-linear-to-br",
                    feature.gradient || "from-blue-500 to-cyan-500"
                  )}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>

                  {/* Feature Editor */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={feature.title || ''}
                        onChange={(e) => updateFeature(index, 'title', e.target.value)}
                        placeholder="Feature title"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Icon</Label>
                      <Select value={feature.icon || 'Shield'} onValueChange={(v) => updateFeature(index, 'icon', v)}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => {
                            const Icon = iconMap[opt.value];
                            return (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Gradient</Label>
                      <Select value={feature.gradient || 'from-blue-500 to-cyan-500'} onValueChange={(v) => updateFeature(index, 'gradient', v)}>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADIENT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-4 h-4 rounded bg-linear-to-r", opt.value)} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={feature.description || ''}
                        onChange={(e) => updateFeature(index, 'description', e.target.value)}
                        placeholder="Brief feature description"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Section Preview */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>SECTION PREVIEW</span>
          <Badge variant="secondary" className="text-xs">
            {displayFeatures.length} features
          </Badge>
        </div>

        <div className="relative overflow-hidden rounded-xl border">
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-1/4 w-32 h-32 rounded-full opacity-20 blur-[80px] bg-blue-500/40" />
            <div className="absolute bottom-10 right-1/4 w-40 h-40 rounded-full opacity-20 blur-[80px] bg-purple-500/40" />
          </div>

          <div className="relative py-12 px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Header */}
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary/10 border border-primary/20 text-primary mb-4">
                  <Award className="w-4 h-4" />
                  {getValue('featuresSection.badge') || 'Why Choose Us'}
                </div>

                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {getValue('featuresSection.title') || 'Built for'}{" "}
                  <span className="bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                    {getValue('featuresSection.subtitle') || 'Professional Traders'}
                  </span>
                </h2>

                <p className="text-lg text-muted-foreground mb-8">
                  {getValue('featuresSection.description') || 'Experience unmatched security, lightning-fast execution, and professional-grade tools designed for serious traders.'}
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayFeatures.slice(0, 4).map((feature: any, i: number) => {
                    const Icon = iconMap[feature.icon] || Shield;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-linear-to-br",
                          feature.gradient || "from-blue-500 to-cyan-500"
                        )}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm mb-0.5">{feature.title}</h4>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right side - Platform Features Card */}
              <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 p-6 shadow-lg">
                <h3 className="text-xl font-bold mb-6">
                  {getValue('globalSection.platformFeatures.title') || 'Platform Features'}
                </h3>
                <div className="space-y-4">
                  {(getValue('globalSection.platformFeatures.items') || [
                    "Real-time market data and price feeds",
                    "Advanced order types (Limit, Market, Stop-Loss)",
                    "Professional TradingView charts integration",
                    "Mobile apps for iOS and Android",
                    "API access for algorithmic trading",
                    "Multi-language support",
                  ]).map((item: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
