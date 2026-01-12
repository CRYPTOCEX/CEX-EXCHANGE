"use client";

import React, { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Flame,
  ArrowLeft,
  Check,
  AlertTriangle,
  Sparkles,
  Loader2,
  Zap,
  Save,
  Settings,
  RotateCcw,
} from "lucide-react";

interface BinaryMarket {
  id: string;
  currency: string;
  pair: string;
  isTrending: boolean;
  isHot: boolean;
  status: boolean;
}

export default function EditBinaryMarketPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const marketId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [market, setMarket] = useState<BinaryMarket | null>(null);
  const [originalMarket, setOriginalMarket] = useState<BinaryMarket | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    isTrending: false,
    isHot: false,
    status: true,
  });

  useEffect(() => {
    if (marketId) {
      fetchMarket();
    }
  }, [marketId]);

  const fetchMarket = async () => {
    setLoading(true);
    try {
      const { data, error } = await $fetch<BinaryMarket>({
        url: `/api/admin/finance/binary/market/${marketId}`,
        silent: true,
      });

      if (error) {
        toast.error("Failed to load market");
        router.push("/admin/finance/binary/market");
        return;
      }

      setMarket(data);
      setOriginalMarket(data);
      setFormData({
        isTrending: data?.isTrending || false,
        isHot: data?.isHot || false,
        status: data?.status ?? true,
      });
    } catch (err) {
      console.error("Failed to load market", err);
      toast.error("Failed to load market");
      router.push("/admin/finance/binary/market");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (originalMarket) {
      setFormData({
        isTrending: originalMarket.isTrending || false,
        isHot: originalMarket.isHot || false,
        status: originalMarket.status ?? true,
      });
    }
  };

  const hasChanges =
    formData.isTrending !== (originalMarket?.isTrending || false) ||
    formData.isHot !== (originalMarket?.isHot || false) ||
    formData.status !== (originalMarket?.status ?? true);

  const handleSubmit = async () => {
    if (!market) return;

    try {
      setSaving(true);
      const { error } = await $fetch({
        url: `/api/admin/finance/binary/market/${marketId}`,
        method: "PUT",
        body: {
          currency: market.currency,
          pair: market.pair,
          isTrending: formData.isTrending,
          isHot: formData.isHot,
          status: formData.status,
        },
      });

      if (error) {
        toast.error(error || "Failed to update binary market");
        return;
      }

      toast.success("Binary market updated successfully!");
      router.push("/admin/finance/binary/market");
    } catch (err: any) {
      toast.error(err.message || "Failed to update binary market");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary relative" />
          </div>
          <p className="text-muted-foreground">Loading market...</p>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-semibold mb-2">Market Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested binary market could not be found.</p>
          <Button onClick={() => router.push("/admin/finance/binary/market")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Markets
          </Button>
        </div>
      </div>
    );
  }

  const symbol = `${market.currency}/${market.pair}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <HeroSection
        badge={{
          icon: <Settings className="h-3.5 w-3.5" />,
          text: "Edit Market",
          gradient: "from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950",
          iconColor: "text-emerald-500",
          textColor: "text-emerald-600 dark:text-emerald-400",
        }}
        title={[
          { text: "Edit " },
          {
            text: symbol,
            gradient: "from-emerald-600 via-teal-500 to-emerald-600 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-400",
          },
        ]}
        description="Update binary market settings and visibility options"
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContentAlign="center"
        background={{
          orbs: [
            { color: "#10b981", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#14b8a6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#10b981", "#14b8a6"],
          size: 8,
        }}
        rightContent={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/finance/binary/market")}
            className="border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Markets
          </Button>
        }
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        {/* Market Info Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Icon icon="mdi:bitcoin" className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{symbol}</CardTitle>
                <p className="text-sm text-muted-foreground">Binary Trading Market</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  formData.status ? "bg-emerald-500/10" : "bg-muted"
                )}>
                  <Zap className={cn(
                    "w-5 h-5",
                    formData.status ? "text-emerald-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="font-medium">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable trading on this market
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.status}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked }))}
              />
            </div>

            {/* Trending Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  formData.isTrending ? "bg-blue-500/10" : "bg-muted"
                )}>
                  <TrendingUp className={cn(
                    "w-5 h-5",
                    formData.isTrending ? "text-blue-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="font-medium">Mark as Trending</Label>
                  <p className="text-xs text-muted-foreground">
                    Highlight this market as currently trending
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isTrending}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isTrending: checked }))}
              />
            </div>

            {/* Hot Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  formData.isHot ? "bg-orange-500/10" : "bg-muted"
                )}>
                  <Flame className={cn(
                    "w-5 h-5",
                    formData.isHot ? "text-orange-500" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="font-medium">Mark as Hot</Label>
                  <p className="text-xs text-muted-foreground">
                    Feature this market as popular/hot
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isHot}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isHot: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Changes Indicator */}
        {hasChanges && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mt-2" />
              <div>
                <h5 className="font-medium text-amber-600 dark:text-amber-400">
                  You have unsaved changes
                </h5>
                <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                  Click "Save Changes" to apply your updates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/finance/binary/market")}
              className="border-primary/30 hover:border-primary/50"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-muted-foreground/30"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset
              </Button>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving || !hasChanges}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
