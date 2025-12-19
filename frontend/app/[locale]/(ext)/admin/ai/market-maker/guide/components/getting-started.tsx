"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function GettingStartedSection() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const steps = [
    {
      number: 1,
      title: "Understand the System",
      description: "AI Market Maker creates automated trading activity on your ecosystem markets to provide liquidity and natural price movement.",
      icon: "mdi:lightbulb-on",
      color: "primary",
    },
    {
      number: 2,
      title: "Configure Global Settings",
      description: "Set up your global risk parameters, bot limits, and default spreads before creating any markets.",
      icon: "mdi:cog",
      color: "info",
      action: {
        label: "Go to Settings",
        href: "/admin/ai/market-maker/settings",
      },
    },
    {
      number: 3,
      title: "Create Your First Market",
      description: "Select an ecosystem market, configure the target price, and set up your liquidity pool.",
      icon: "mdi:plus-circle",
      color: "success",
      action: {
        label: "Create Market",
        href: "/admin/ai/market-maker/market/create",
      },
    },
    {
      number: 4,
      title: "Fund the Liquidity Pool",
      description: "Add base and quote currency to the pool. This is the capital your bots will use for trading.",
      icon: "mdi:wallet-plus",
      color: "warning",
    },
    {
      number: 5,
      title: "Configure Bots",
      description: "Add different bot types to your market. Each bot type serves a specific purpose.",
      icon: "mdi:robot",
      color: "purple",
    },
    {
      number: 6,
      title: "Start Trading",
      description: "Activate your market and monitor performance through the analytics dashboard.",
      icon: "mdi:play-circle",
      color: "success",
      action: {
        label: "View Dashboard",
        href: "/admin/ai/market-maker",
      },
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-500", border: "border-indigo-500/20" },
    info: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-500", border: "border-blue-500/20" },
    success: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-500", border: "border-green-500/20" },
    warning: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-500", border: "border-amber-500/20" },
    purple: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-500", border: "border-purple-500/20" },
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-transparent dark:from-indigo-500/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-muted-800 dark:text-muted-100 mb-3">
                {t("welcome_to_ai_market_maker")}
              </h2>
              <p className="text-muted-600 dark:text-muted-400 mb-4">
                AI Market Maker is a powerful tool that automates trading activity on your ecosystem markets.
                It uses intelligent bots to provide liquidity, maintain healthy spreads, and create natural
                price movement - all while protecting your capital with built-in risk management.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-600 dark:text-muted-400">{t("automated_liquidity")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-600 dark:text-muted-400">{tCommon("risk_management")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-600 dark:text-muted-400">{t("human_like_behavior")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-muted-600 dark:text-muted-400">{t("real_time_analytics")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                <Icon icon="mdi:robot-happy" className="w-16 h-16 text-indigo-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div>
        <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100 mb-4">
          {t("setup_steps")}
        </h3>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.number} className={`border ${colorClasses[step.color].border}`}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-full ${colorClasses[step.color].bg} flex items-center justify-center shrink-0`}>
                    <span className={`text-lg font-bold ${colorClasses[step.color].text}`}>{step.number}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-muted-800 dark:text-muted-100 flex items-center gap-2">
                          <Icon icon={step.icon} className={`w-5 h-5 ${colorClasses[step.color].text}`} />
                          {step.title}
                        </h4>
                        <p className="text-sm text-muted-500 mt-1">{step.description}</p>
                      </div>
                      {step.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(step.action!.href)}
                          className="shrink-0"
                        >
                          {step.action.label}
                          <Icon icon="mdi:arrow-right" className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Key Concepts */}
      <div>
        <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100 mb-4">
          {t("key_concepts")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:water" className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-muted-800 dark:text-muted-100">{t("liquidity_pool")}</h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("the_pool_holds_the_base_currency")} {t("pool_size_determines_how_much_trading")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:target" className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-muted-800 dark:text-muted-100">{tExt("target_price")}</h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("the_price_you_want_the_market_to_gravitate_towards")} {t("bots_will_place_orders_to_gradually")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:chart-timeline-variant" className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-muted-800 dark:text-muted-100">Spread</h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("the_difference_between_buy_and_sell_prices")} {t("tighter_spreads_mean_more_competitive_markets")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:robot" className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-muted-800 dark:text-muted-100">{t("bot_personalities")}</h4>
                  <p className="text-sm text-muted-500 mt-1">
                    {t("different_bot_personalities_serve_different_purposes")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warning */}
      <Card className="border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <Icon icon="mdi:alert" className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-600 dark:text-amber-400">{t("important_considerations")}</h4>
              <ul className="text-sm text-muted-600 dark:text-muted-400 mt-2 space-y-1 list-disc list-inside">
                <li>{t("start_with_small_amounts_to_test")}</li>
                <li>{t("monitor_your_markets_closely_for_the")}</li>
                <li>{t("set_appropriate_risk_limits_to_protect")}</li>
                <li>{t("keep_some_reserve_funds_outside_the")}</li>
                <li>{t("review_analytics_regularly_and_adjust_settings")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
