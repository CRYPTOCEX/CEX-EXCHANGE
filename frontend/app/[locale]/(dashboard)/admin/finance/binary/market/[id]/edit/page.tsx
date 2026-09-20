"use client";

import React, { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { Loadable } from "@/components/ui/skeleton";
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
  Bitcoin,
} from "lucide-react";

interface BinaryMarket {
  id: string;
  currency: string;
  pair: string;
  minAmount?: number;
  maxAmount?: number;
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
    minAmount: 1,
    maxAmount: 10000,
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
        toast.error(t("failed_to_load_market"));
        router.push("/admin/finance/binary/market");
        return;
      }

      setMarket(data);
      setOriginalMarket(data);
      setFormData({
        minAmount: data?.minAmount || 1,
        maxAmount: data?.maxAmount || 10000,
        isTrending: data?.isTrending || false,
        isHot: data?.isHot || false,
        status: data?.status ?? true,
      });
    } catch (err) {
      console.error("Failed to load market", err);
      toast.error(t("failed_to_load_market"));
      router.push("/admin/finance/binary/market");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (originalMarket) {
      setFormData({
        minAmount: originalMarket.minAmount || 1,
        maxAmount: originalMarket.maxAmount || 10000,
        isTrending: originalMarket.isTrending || false,
        isHot: originalMarket.isHot || false,
        status: originalMarket.status ?? true,
      });
    }
  };

  const hasChanges =
    formData.minAmount !== (originalMarket?.minAmount || 1) ||
    formData.maxAmount !== (originalMarket?.maxAmount || 10000) ||
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
          minAmount: formData.minAmount,
          maxAmount: formData.maxAmount,
          isTrending: formData.isTrending,
          isHot: formData.isHot,
          status: formData.status,
        },
      });

      if (error) {
        toast.error(error || t("failed_to_update_binary_market"));
        return;
      }

      toast.success(t("binary_market_updated_successfully"));
      router.push("/admin/finance/binary/market");
    } catch (err: any) {
      toast.error(err.message || t("failed_to_update_binary_market"));
    } finally {
      setSaving(false);
    }
  };

  /**
   * ONE PAGE, THREE STATES — not three pages.
   * ==========================================================================
   *
   * This file used to open with two component-level bail-outs, each returning
   * a `min-h-[60vh] flex items-center justify-center` box: a spinning
   * `Loader2` while the market loaded, and a "Market Not Found" panel if it
   * did not. Everything below them — the hero with its orbs and particles, the
   * market card, four labelled controls, the action bar — existed only in the
   * third branch, so on every visit the operator got a centred spinner and
   * then watched the entire page assemble around it. The scanner scored the
   * pair 54 (full-swap plus shapeless fallback, both multiplied for covering
   * the viewport), tied for the worst in this area.
   *
   * The frame is knowable immediately: this route is reached from a row in the
   * markets table, so we know it is an edit form for a binary market before we
   * know which one. The hero, the card, the field labels and their captions,
   * the toggles and the buttons all render on the first frame. Only the pair
   * symbol waits, inside the `CardTitle` that will carry it, and the inputs
   * are `disabled` until their values are real — a number input is the same
   * height empty as full, so nothing moves when they fill.
   *
   * `loading` and `notFound` are kept as separate conclusions. Pending means
   * we have not heard back and says nothing; not-found means we have and there
   * is no such market, which is a real answer and gets a real message — inside
   * the same card frame, not in place of the page.
   */
  const notFound = !loading && !market;
  const symbol = market ? `${market.currency}/${market.pair}` : "";

  return (
    /* The root carries no colour. The hero below mounts `WorkspaceGround`, and
       the fade-in-fade-out wash that used to sit here covered it completely —
       the ground was mounted and composited on every visit and invisible on
       every one. `min-h-screen` is kept because the ground is `fixed` and this
       shell is what makes the page tall enough to hold it. */
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <Settings className="h-3.5 w-3.5" />,
          text: "Edit Market",
        }}
        /* The hero heading is one line at every state: "Edit Market" until the
           pair is known, "Edit BTC/USDT" after. A `HeroSection` title is a
           list of plain strings — there is nowhere to put a `<Loadable>` — so
           the honest reservation is a word of the same shape rather than a
           gap that later fills. Width settles; the line box does not move. */
        title={[
          { text: "Edit " },
          {
            text: symbol || "Market",
          },
        ]}
        description={t("update_binary_market_settings_and_visibility")}
        layout="split"
        rightContentAlign="center"
        rightContent={
          <Button
            variant="outline"
            onClick={() => router.push("/admin/finance/binary/market")}
            className="border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {tCommon("back_to_markets")}
          </Button>
        }
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl">
        {/* Market Info Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-success" />
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-success flex items-center justify-center shadow-lg">
                <Bitcoin className="w-7 h-7 text-success-foreground" />
              </div>
              <div>
                {/* The pair is the one unknown in this header, so it is the
                    only thing that gets a placeholder — measured by the same
                    `text-xl` box that will hold the real symbol. */}
                <CardTitle className="text-xl">
                  <Loadable loading={loading} placeholder="BTC/USDT">
                    {symbol}
                  </Loadable>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("binary_trading_market")}</p>
              </div>
            </div>
          </CardHeader>
          {notFound ? (
            /* A market id that resolves to nothing is an ANSWER, not a wait.
               It replaces the form's body — there is no record to edit — and
               keeps the card, the hero and the action bar, so the operator is
               still on the page they navigated to and the Back control they
               would reach for is where it was. */
            <CardContent className="py-10 text-center">
              <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-destructive" />
              <h2 className="text-lg font-semibold mb-2">{t("market_not_found")}</h2>
              <p className="text-muted-foreground">
                {t("the_requested_binary_market_could_not_be_found")}
              </p>
            </CardContent>
          ) : (
          <CardContent className="space-y-4">
            {/* Min/Max Amount Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Min Amount */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <Label className="font-medium mb-2 block">{tCommon("minimum_amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  value={market ? formData.minAmount : ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minAmount: parseFloat(e.target.value) || 0 }))}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("minimum_order_amount_allowed_for_this_market")}
                </p>
              </div>

              {/* Max Amount */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <Label className="font-medium mb-2 block">{tCommon("maximum_amount")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={loading}
                  value={market ? formData.maxAmount : ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxAmount: parseFloat(e.target.value) || 0 }))}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t("maximum_order_amount_allowed_for_this_market")}
                </p>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  formData.status ? "bg-success/10" : "bg-muted"
                )}>
                  <Zap className={cn(
                    "w-5 h-5",
                    formData.status ? "text-success" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="font-medium">{tCommon("active_status")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("enable_or_disable_trading_on_this_market")}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.status}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, status: checked }))}
                disabled={loading}
              />
            </div>

            {/* Trending Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  formData.isTrending ? "bg-primary/10" : "bg-muted"
                )}>
                  <TrendingUp className={cn(
                    "w-5 h-5",
                    formData.isTrending ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="font-medium">{t("mark_as_trending")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("highlight_this_market_as_currently_trending")}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isTrending}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isTrending: checked }))}
                disabled={loading}
              />
            </div>

            {/* Hot Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  formData.isHot ? "bg-warning/10" : "bg-muted"
                )}>
                  <Flame className={cn(
                    "w-5 h-5",
                    formData.isHot ? "text-warning" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <Label className="font-medium">{t("mark_as_hot")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("feature_this_market_as_popular_hot")}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.isHot}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isHot: checked }))}
                disabled={loading}
              />
            </div>
          </CardContent>
          )}
        </Card>

        {/* Changes Indicator */}
        {hasChanges && (
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse mt-2" />
              <div>
                <h5 className="font-medium text-warning">
                  {tCommon("you_have_unsaved_changes")}
                </h5>
                <p className="text-sm text-warning/80">
                  {t("click_save_changes_to_apply_your_updates")}
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
            className="bg-success"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {saving ? `${tCommon("saving")}…` : tCommon("save_changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}
