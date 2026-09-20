"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
  ChartSpline,
  CircleCheck,
  CirclePlay,
  CirclePlus,
  Droplets,
  Lightbulb,
  Settings,
  Target,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

export default function GettingStartedSection() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const router = useRouter();

  const steps = [
    {
      number: 1,
      title: t("understand_the_system"),
      description: t("ai_market_maker_creates_automated_trading"),
      icon: Lightbulb,
    },
    {
      number: 2,
      title: t("configure_global_settings"),
      description: t("set_up_your_global_risk_parameters"),
      icon: Settings,
      action: {
        label: tExt("go_to_settings"),
        href: "/admin/ai/market-maker/settings",
      },
    },
    {
      number: 3,
      title: tCommon("create_your_first_market"),
      description: t("select_an_ecosystem_market_configure_the"),
      icon: CirclePlus,
      action: {
        label: tCommon("create_market"),
        href: "/admin/ai/market-maker/market/create",
      },
    },
    {
      number: 4,
      title: t("fund_the_liquidity_pool"),
      description: t("add_base_and_quote_currency_to"),
      icon: WalletCards,
    },
    {
      number: 5,
      title: t("configure_bots"),
      description: t("add_different_bot_types_to_your"),
      icon: Bot,
    },
    {
      number: 6,
      title: tCommon("start_trading"),
      description: t("activate_your_market_and_monitor_performance"),
      icon: CirclePlay,
      action: {
        label: tCommon("view_dashboard"),
        href: "/admin/ai/market-maker",
      },
    },
  ];


  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground mb-3">
                {t("welcome_to_ai_market_maker")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("ai_market_maker_is_a_powerful")}
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CircleCheck className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">{t("automated_liquidity")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheck className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">{tCommon("risk_management")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheck className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">{t("human_like_behavior")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CircleCheck className="w-5 h-5 text-success" />
                  <span className="text-sm text-muted-foreground">{t("real_time_analytics")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Bot className="w-16 h-16 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t("setup_steps")}
        </h3>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.number}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary`}>
                    <span className="font-mono text-xs font-semibold tabular-nums">{step.number}</span>
                  </span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                          {(() => { const Glyph = step.icon; return <Glyph className={`w-5 h-5 text-primary`} />; })()}
                          {step.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      </div>
                      {step.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(step.action!.href)}
                          className="shrink-0"
                        >
                          {step.action.label}
                          <ArrowRight className="w-4 h-4 ml-1" />
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
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {t("key_concepts")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Droplets className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="font-semibold text-foreground">{t("liquidity_pool")}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("the_pool_holds_the_base_currency")} {t("pool_size_determines_how_much_trading")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                  <Target className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="font-semibold text-foreground">{tCommon("target_price")}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("the_price_you_want_the_market_to_gravitate_towards")} {t("bots_will_place_orders_to_gradually")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                  <ChartSpline className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="font-semibold text-foreground">Spread</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("the_difference_between_buy_and_sell_prices")} {t("tighter_spreads_mean_more_competitive_markets")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="font-semibold text-foreground">{t("bot_personalities")}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("different_bot_personalities_serve_different_purposes")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warning */}
      <Card className="border-warning/20 bg-warning/5 dark:bg-warning/10">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
              <TriangleAlert className="h-3.5 w-3.5" />
            </span>
            <div>
              <h4 className="font-semibold text-warning">{t("important_considerations")}</h4>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
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
