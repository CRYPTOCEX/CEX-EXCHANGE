"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

export default function BestPracticesSection() {
  const t = useTranslations("ext_admin");
  const practices = [
    {
      category: "Getting Started",
      icon: "mdi:rocket-launch",
      color: "primary",
      tips: [
        {
          title: "Start Small",
          description: "Begin with a small pool (e.g., $100-500) to test your configuration before scaling up.",
          importance: "critical",
        },
        {
          title: "Test on Low-Value Markets First",
          description: "Practice on less critical markets before deploying on your main trading pairs.",
          importance: "high",
        },
        {
          title: "Document Your Settings",
          description: "Keep a record of your configuration and any changes you make for future reference.",
          importance: "medium",
        },
      ],
    },
    {
      category: "Risk Management",
      icon: "mdi:shield-check",
      color: "danger",
      tips: [
        {
          title: "Never Risk More Than You Can Afford to Lose",
          description: "AI trading involves real capital. Only use funds you're prepared to potentially lose.",
          importance: "critical",
        },
        {
          title: "Set Conservative Loss Limits",
          description: "Start with 2-3% max daily loss. Increase only after establishing consistent performance.",
          importance: "critical",
        },
        {
          title: "Keep Reserve Funds",
          description: "Maintain 20-30% of your total capital outside active pools for emergencies and rebalancing.",
          importance: "high",
        },
        {
          title: "Use Stop Loss Features",
          description: "Always enable automatic stop loss to protect against extreme market movements.",
          importance: "high",
        },
      ],
    },
    {
      category: "Configuration",
      icon: "mdi:cog",
      color: "info",
      tips: [
        {
          title: "Match Spread to Asset Volatility",
          description: "Volatile assets need wider spreads. Stable assets can use tighter spreads for more activity.",
          importance: "high",
        },
        {
          title: "Balance Your Pool",
          description: "Maintain roughly 50/50 balance between base and quote currency for neutral exposure.",
          importance: "high",
        },
        {
          title: "Set Realistic Target Prices",
          description: "Target prices should reflect actual market value. Extreme targets cause unnatural behavior.",
          importance: "medium",
        },
        {
          title: "Use Appropriate Bot Combinations",
          description: "Start with Market Maker + Volume bots. Add others only when you understand their behavior.",
          importance: "medium",
        },
      ],
    },
    {
      category: "Monitoring",
      icon: "mdi:monitor-eye",
      color: "success",
      tips: [
        {
          title: "Check Daily",
          description: "Review P&L, volume, and bot status at least once per day. Catch issues early.",
          importance: "critical",
        },
        {
          title: "Watch for Anomalies",
          description: "Sudden P&L changes, unusual volume patterns, or bot errors need immediate attention.",
          importance: "high",
        },
        {
          title: "Monitor Pool Balance",
          description: "Significant imbalances indicate potential issues with pricing or market conditions.",
          importance: "high",
        },
        {
          title: "Track Performance Over Time",
          description: "Use analytics to identify trends. What works in one market may not work in another.",
          importance: "medium",
        },
      ],
    },
    {
      category: "Maintenance",
      icon: "mdi:wrench",
      color: "warning",
      tips: [
        {
          title: "Rebalance Regularly",
          description: "When pool becomes significantly imbalanced (>70/30), consider rebalancing to neutral.",
          importance: "high",
        },
        {
          title: "Update Target Prices",
          description: "Periodically review and adjust target prices based on market fundamentals.",
          importance: "medium",
        },
        {
          title: "Clean Up Stale Orders",
          description: "Bots should auto-cancel old orders, but verify no stale orders accumulate.",
          importance: "medium",
        },
        {
          title: "Review and Optimize",
          description: "Monthly review of all settings. Optimize based on performance data.",
          importance: "medium",
        },
      ],
    },
    {
      category: "Security",
      icon: "mdi:lock",
      color: "purple",
      tips: [
        {
          title: "Limit Admin Access",
          description: "Only trusted personnel should have access to AI Market Maker controls.",
          importance: "critical",
        },
        {
          title: "Use Emergency Stop Sparingly",
          description: "Know where the emergency stop is, but only use it in genuine emergencies.",
          importance: "high",
        },
        {
          title: "Audit Changes",
          description: "Log all configuration changes. Know who changed what and when.",
          importance: "medium",
        },
      ],
    },
  ];

  const importanceColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-500" },
    high: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-500" },
    medium: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-500" },
  };

  const categoryColors: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-500" },
    danger: { bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-500" },
    info: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-500" },
    success: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-500" },
    warning: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-500" },
    purple: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-500" },
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent dark:from-green-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center shrink-0">
              <Icon icon="mdi:lightbulb-on" className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-muted-800 dark:text-muted-100">
                {t("best_practices_for_ai_market_maker")}
              </h2>
              <p className="text-muted-600 dark:text-muted-400 mt-1">
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
          <span className="text-sm text-muted-500">{t("must_follow")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors.high.bg} ${importanceColors.high.text}`}>
            High
          </span>
          <span className="text-sm text-muted-500">{t("strongly_recommended")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors.medium.bg} ${importanceColors.medium.text}`}>
            Medium
          </span>
          <span className="text-sm text-muted-500">{t("good_to_follow")}</span>
        </div>
      </div>

      {/* Practice Categories */}
      <div className="space-y-6">
        {practices.map((category) => (
          <Card key={category.category}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${categoryColors[category.color].bg} flex items-center justify-center`}>
                  <Icon icon={category.icon} className={`w-5 h-5 ${categoryColors[category.color].text}`} />
                </div>
                <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
                  {category.category}
                </h3>
              </div>

              <div className="space-y-3">
                {category.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted-50 dark:bg-muted-800/50"
                  >
                    <Icon icon="mdi:check-circle" className={`w-5 h-5 ${categoryColors[category.color].text} shrink-0 mt-0.5`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-muted-800 dark:text-muted-100">{tip.title}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${importanceColors[tip.importance].bg} ${importanceColors[tip.importance].text}`}>
                          {tip.importance}
                        </span>
                      </div>
                      <p className="text-sm text-muted-500 mt-1">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Reference Checklist */}
      <Card className="border-indigo-500/20">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100 mb-4">
            {t("daily_checklist")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-700 dark:text-muted-300">{t("morning_review")}</h4>
              <div className="space-y-1">
                {[
                  "Check overnight P&L",
                  "Review any alerts or errors",
                  "Verify all markets are running",
                  "Check pool balances",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
                    <div className="w-4 h-4 border rounded flex items-center justify-center">
                      <Icon icon="mdi:check" className="w-3 h-3 text-transparent" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-700 dark:text-muted-300">{t("end_of_day")}</h4>
              <div className="space-y-1">
                {[
                  "Review daily volume",
                  "Check P&L vs target",
                  "Note any anomalies",
                  "Plan adjustments for tomorrow",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
                    <div className="w-4 h-4 border rounded flex items-center justify-center">
                      <Icon icon="mdi:check" className="w-3 h-3 text-transparent" />
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
