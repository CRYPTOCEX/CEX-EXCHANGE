"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import {
  Check,
  CircleCheck,
  Lightbulb,
  Lock,
  MonitorDot,
  Rocket,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export default function BestPracticesSection() {
  const t = useTranslations("ext_admin");
  const practices = [
    {
      category: "Getting Started",
      icon: Rocket,
      tips: [
        {
          title: t("start_small"),
          description: "Begin with a small pool (e.g., $100-500) to test your configuration before scaling up.",
          importance: "critical",
        },
        {
          title: t("test_on_low_value_markets_first"),
          description: t("practice_on_less_critical_markets_before"),
          importance: "high",
        },
        {
          title: t("document_your_settings"),
          description: t("keep_a_record_of_your_configuration"),
          importance: "medium",
        },
      ],
    },
    {
      category: "Risk Management",
      icon: ShieldCheck,
      tips: [
        {
          title: t("never_risk_more_than_you_can_afford_to_lose"),
          description: t("ai_trading_involves_real_capital_only"),
          importance: "critical",
        },
        {
          title: t("set_conservative_loss_limits"),
          description: t("start_with_2_3_max_daily"),
          importance: "critical",
        },
        {
          title: t("keep_reserve_funds"),
          description: t("maintain_20_30_of_your_total"),
          importance: "high",
        },
        {
          title: t("use_stop_loss_features"),
          description: t("always_enable_automatic_stop_loss_to"),
          importance: "high",
        },
      ],
    },
    {
      category: "Configuration",
      icon: Settings,
      tips: [
        {
          title: t("match_spread_to_asset_volatility"),
          description: t("volatile_assets_need_wider_spreads_stable"),
          importance: "high",
        },
        {
          title: t("balance_your_pool"),
          description: t("maintain_roughly_50_50_balance_between"),
          importance: "high",
        },
        {
          title: t("set_realistic_target_prices"),
          description: t("target_prices_should_reflect_actual_market"),
          importance: "medium",
        },
        {
          title: t("use_appropriate_bot_combinations"),
          description: t("start_with_market_maker_volume_bots"),
          importance: "medium",
        },
      ],
    },
    {
      category: "Monitoring",
      icon: MonitorDot,
      tips: [
        {
          title: t("check_daily"),
          description: t("review_p_l_volume_and_bot"),
          importance: "critical",
        },
        {
          title: t("watch_for_anomalies"),
          description: t("sudden_p_l_changes_unusual_volume"),
          importance: "high",
        },
        {
          title: t("monitor_pool_balance"),
          description: t("significant_imbalances_indicate_potential_issues_with"),
          importance: "high",
        },
        {
          title: t("track_performance_over_time"),
          description: t("use_analytics_to_identify_trends_what"),
          importance: "medium",
        },
      ],
    },
    {
      category: "Maintenance",
      icon: Wrench,
      tips: [
        {
          title: t("rebalance_regularly"),
          description: t("when_pool_becomes_significantly_imbalanced_70"),
          importance: "high",
        },
        {
          title: t("update_target_prices"),
          description: t("periodically_review_and_adjust_target_prices"),
          importance: "medium",
        },
        {
          title: t("clean_up_stale_orders"),
          description: t("bots_should_auto_cancel_old_orders"),
          importance: "medium",
        },
        {
          title: t("review_and_optimize"),
          description: t("monthly_review_of_all_settings_optimize"),
          importance: "medium",
        },
      ],
    },
    {
      category: "Security",
      icon: Lock,
      tips: [
        {
          title: t("limit_admin_access"),
          description: t("only_trusted_personnel_should_have_access"),
          importance: "critical",
        },
        {
          title: t("use_emergency_stop_sparingly"),
          description: t("know_where_the_emergency_stop_is"),
          importance: "high",
        },
        {
          title: t("audit_changes"),
          description: t("log_all_configuration_changes_know_who"),
          importance: "medium",
        },
      ],
    },
  ];

  const importanceColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: "bg-destructive/10 dark:bg-destructive/20", text: "text-destructive" },
    high: { bg: "bg-warning/10 dark:bg-warning/20", text: "text-warning" },
    medium: { bg: "bg-primary/10 dark:bg-primary/20", text: "text-primary" },
  };

  const categoryColors: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-primary/10 dark:bg-primary/20", text: "text-primary" },
    danger: { bg: "bg-destructive/10 dark:bg-destructive/20", text: "text-destructive" },
    info: { bg: "bg-primary/10 dark:bg-primary/20", text: "text-primary" },
    success: { bg: "bg-success/10 dark:bg-success/20", text: "text-success" },
    warning: { bg: "bg-warning/10 dark:bg-warning/20", text: "text-warning" },
    purple: { bg: "bg-primary/10 dark:bg-primary/20", text: "text-primary" },
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-success/20 bg-success/5 dark:bg-success/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
              <Lightbulb className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                {t("best_practices_for_ai_market_maker")}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t("follow_these_guidelines_to_maximize_success")} {t("tips_are_categorized_by_importance_critical")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors.critical.bg} ${importanceColors.critical.text}`}>
            Critical
          </span>
          <span className="text-sm text-muted-foreground">{t("must_follow")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors.high.bg} ${importanceColors.high.text}`}>
            High
          </span>
          <span className="text-sm text-muted-foreground">{t("strongly_recommended")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors.medium.bg} ${importanceColors.medium.text}`}>
            Medium
          </span>
          <span className="text-sm text-muted-foreground">{t("good_to_follow")}</span>
        </div>
      </div>

      {/* Practice Categories */}
      <div className="space-y-6">
        {practices.map((category) => (
          <Card key={category.category}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${categoryColors["primary"].bg} ${categoryColors["primary"].text}`}>
                  {(() => { const Glyph = category.icon; return <Glyph className="h-3.5 w-3.5" />; })()}
                </span>
                <h3 className="text-lg font-semibold text-foreground">
                  {category.category}
                </h3>
              </div>

              <div className="space-y-3">
                {category.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted"
                  >
                    <CircleCheck className={`w-5 h-5 ${categoryColors["primary"].text} shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-foreground">{tip.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors[tip.importance].bg} ${importanceColors[tip.importance].text}`}>
                          {tip.importance}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Reference Checklist */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {t("daily_checklist")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-foreground">{t("morning_review")}</h4>
              <div className="space-y-1">
                {[
                  "Check overnight P&L",
                  "Review any alerts or errors",
                  "Verify all markets are running",
                  "Check pool balances",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-transparent" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-foreground">{t("end_of_day")}</h4>
              <div className="space-y-1">
                {[
                  "Review daily volume",
                  "Check P&L vs target",
                  "Note any anomalies",
                  "Plan adjustments for tomorrow",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border rounded flex items-center justify-center">
                      <Check className="w-3 h-3 text-transparent" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
