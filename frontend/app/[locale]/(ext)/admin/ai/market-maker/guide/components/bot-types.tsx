"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { useTranslations } from "next-intl";
import {
  Bot,
  Calculator,
  ChartArea,
  ChartLine,
  Lightbulb,
  Scale,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";

interface BotType {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  tradingStyle: string;
  howItWorks: string[];
  parameters: {
    name: string;
    description: string;
    default: string;
  }[];
  bestFor: string[];
  riskLevel: "Low" | "Medium" | "High";
}

export default function BotTypesSection() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [selectedBot, setSelectedBot] = useState<string>("MARKET_MAKER");

  const botTypes: BotType[] = [
    {
      id: "MARKET_MAKER",
      name: "Market Maker Bot",
      icon: Scale,
      description: t("balanced_bot_that_provides_liquidity_on"),
      tradingStyle: "Places both buy and sell orders around the current price, earning the spread while providing liquidity.",
      howItWorks: [
        "Places orders on BOTH buy and sell sides",
        "Maintains balanced position",
        "Provides liquidity to the market",
        "Earns from bid-ask spread",
        "Adapts to market conditions",
      ],
      parameters: [
        { name: "Trade Frequency", description: t("how_actively_the_bot_trades"), default: "MEDIUM-HIGH" },
        { name: "Risk Tolerance", description: t("position_size_risk_0_1_1_0"), default: "0.5" },
        { name: "Preferred Spread", description: t("target_spread_between_buy_sell"), default: "0.1-0.5%" },
        { name: "Max Daily Trades", description: t("maximum_trades_allowed_per_day"), default: "50-200" },
      ],
      bestFor: ["All market conditions", "Liquidity provision", "Spread earning"],
      riskLevel: "Low",
    },
    {
      id: "SCALPER",
      name: "Scalper Bot",
      icon: Zap,
      description: t("high_frequency_trader_that_makes_many"),
      tradingStyle: "Executes rapid trades with small profit targets, taking advantage of bid-ask spreads and minor price fluctuations.",
      howItWorks: [
        "Trades frequently with small order sizes",
        "Targets small price movements (0.1-0.5%)",
        "Quick entry and exit positions",
        "High daily trade count, low profit per trade",
        "Best during stable market conditions",
      ],
      parameters: [
        { name: "Trade Frequency", description: t("how_often_the_bot_looks_for_opportunities"), default: "HIGH" },
        { name: "Risk Tolerance", description: t("how_much_risk_the_bot_takes_per_trade_0_1_1_0"), default: "0.3-0.5" },
        { name: "Avg Order Size", description: t("typical_order_size_in_base_currency"), default: "Small (1-5%)" },
        { name: "Max Daily Trades", description: t("maximum_trades_allowed_per_day"), default: "100-500" },
      ],
      bestFor: ["Stable markets", "High liquidity pairs", "Consistent small gains"],
      riskLevel: "Medium",
    },
    {
      id: "SWING",
      name: "Swing Trader Bot",
      icon: ChartArea,
      description: t("medium_term_trader_that_captures_larger"),
      tradingStyle: "Holds positions longer to capture significant price swings, trading less frequently but with larger profit targets.",
      howItWorks: [
        "Trades less frequently but holds longer",
        "Targets larger price movements (1-5%)",
        "Analyzes trend direction before entering",
        "Lower daily trade count, higher profit per trade",
        "Better during trending markets",
      ],
      parameters: [
        { name: "Trade Frequency", description: t("how_often_the_bot_looks_for_opportunities"), default: "LOW-MEDIUM" },
        { name: "Risk Tolerance", description: t("how_much_risk_the_bot_takes_per_trade_0_1_1_0"), default: "0.5-0.7" },
        { name: "Avg Order Size", description: t("typical_order_size_in_base_currency"), default: "Medium (5-15%)" },
        { name: "Max Daily Trades", description: t("maximum_trades_allowed_per_day"), default: "10-50" },
      ],
      bestFor: ["Trending markets", "Volatile pairs", "Capturing major moves"],
      riskLevel: "Medium",
    },
    {
      id: "ACCUMULATOR",
      name: "Accumulator Bot",
      icon: TrendingUp,
      description: t("systematically_buys_and_builds_a_position"),
      tradingStyle: "Focuses on buying (accumulating) the base currency, building a long position gradually.",
      howItWorks: [
        "Primarily places BUY orders",
        "Builds position gradually over time",
        "Buys more when price dips",
        "Holds accumulated position for appreciation",
        "Helps push price toward target (upward)",
      ],
      parameters: [
        { name: "Trade Frequency", description: t("how_often_the_bot_buys"), default: "MEDIUM" },
        { name: "Risk Tolerance", description: t("how_aggressively_to_accumulate_0_1_1_0"), default: "0.4-0.6" },
        { name: "Avg Order Size", description: t("typical_buy_order_size"), default: "Medium (5-10%)" },
        { name: "Max Daily Trades", description: t("maximum_buys_allowed_per_day"), default: "20-100" },
      ],
      bestFor: ["Bullish markets", "Building long positions", "Price support"],
      riskLevel: "Low",
    },
    {
      id: "DISTRIBUTOR",
      name: "Distributor Bot",
      icon: TrendingDown,
      description: t("systematically_sells_and_reduces_position_over"),
      tradingStyle: "Focuses on selling (distributing) the base currency, reducing a long position or building a short.",
      howItWorks: [
        "Primarily places SELL orders",
        "Reduces position gradually over time",
        "Sells more when price rises",
        "Takes profits from accumulated position",
        "Helps push price toward target (downward)",
      ],
      parameters: [
        { name: "Trade Frequency", description: t("how_often_the_bot_sells"), default: "MEDIUM" },
        { name: "Risk Tolerance", description: t("how_aggressively_to_distribute_0_1_1_0"), default: "0.4-0.6" },
        { name: "Avg Order Size", description: t("typical_sell_order_size"), default: "Medium (5-10%)" },
        { name: "Max Daily Trades", description: t("maximum_sells_allowed_per_day"), default: "20-100" },
      ],
      bestFor: ["Bearish markets", "Taking profits", "Price resistance"],
      riskLevel: "Low",
    },
  ];

  const selectedBotData = botTypes.find((b) => b.id === selectedBot);


  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                {t("bot_personality_types")}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t("each_market_has_multiple_bots_with")} {t("the_system_automatically_creates_6_bots")} ({t("the_system_bots_details")})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bot Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {botTypes.map((bot) => (
          <Card
            key={bot.id}
            className={`p-3 cursor-pointer transition-all hover:scale-[1.02] ${
              selectedBot === bot.id
                ? `border border-border bg-primary/10`
                : "hover:border-border-strong"
            }`}
            onClick={() => setSelectedBot(bot.id)}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
                {(() => { const Glyph = bot.icon; return <Glyph className={`w-5 h-5 text-primary`} />; })()}
              </div>
              <span className="text-xs font-medium text-foreground">{bot.name}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Bot Details */}
      {selectedBotData && (
        <Card className={`border border-border`}>
          <CardContent className="pt-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0`}>
                {(() => { const Glyph = selectedBotData.icon; return <Glyph className={`w-8 h-8 text-primary`} />; })()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                    {selectedBotData.name}
                  </h2>
                  <StatusBadge
                    status={selectedBotData.riskLevel}
                    label={t("risk", { riskLevel: String(selectedBotData.riskLevel) })}
                    className="rounded-full"
                  />
                </div>
                <p className="text-muted-foreground mt-1">
                  {selectedBotData.description}
                </p>
              </div>
            </div>

            {/* Trading Style */}
            <div className={`p-4 rounded-lg bg-primary/10`}>
              <h4 className="font-semibold text-foreground mb-1">{tExt("trading_style")}</h4>
              <p className="text-sm text-muted-foreground">{selectedBotData.tradingStyle}</p>
            </div>

            {/* How It Works */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">{tCommon("how_eyebrow")}</h4>
              <ul className="space-y-2">
                {selectedBotData.howItWorks.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full bg-primary/10 text-primary-ink flex items-center justify-center text-xs font-medium shrink-0`}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Parameters */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">{t("configuration_parameters")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedBotData.parameters.map((param) => (
                  <div key={param.name} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-foreground">{param.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {param.default}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Best For */}
            <div>
              <h4 className="font-semibold text-foreground mb-3">{t("best_used_for")}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedBotData.bestFor.map((use) => (
                  <span
                    key={use}
                    className={`px-3 py-1 rounded-full text-sm bg-primary/10 text-primary-ink`}
                  >
                    {use}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* P&L Tracking Section */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ChartLine className="w-5 h-5 text-primary" />
            {t("understanding_bot_p_l_profit_loss")} ({tCommon("profit_loss")})
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">{t("how_p_l_is_tracked")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("p_l_is_only_calculated_from")} <strong>{t("real_users")}</strong>{t("ai_to_ai_trades_bots_trading")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-warning" />
                  {t("position_inventory")} ({t("inventory")})
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>{t("positive")}</strong> {t("bot_holds_base_currency_bought_more_than_sold")} ({t("bought_more_than_sold")})</li>
                  <li><strong>{t("negative")}</strong> {t("bot_owes_base_currency_sold_more_than_bought")} ({t("sold_more_than_bought")})</li>
                  <li><strong>{t("zero")}</strong> {t("bot_is_balanced")}</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-success" />
                  {t("when_p_l_is_realized")}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>{t("long_position")}</strong> {t("p_l_realized_when_bot_sells_to_close")}</li>
                  <li><strong>{t("short_position")}</strong> {t("p_l_realized_when_bot_buys_to_close")}</li>
                  <li>{t("opening_positions_doesnt_realize_p_l")}</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-warning/5 dark:bg-warning/10 rounded-lg border border-warning/20">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                {t("example_spot_trading_p_l")}
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>{t("bot_starts_with_position_0")}</li>
                <li>Real user sells 100 BTC to bot @ $50,000 → Bot position = +100, avgEntry = $50,000</li>
                <li>Price rises to $52,000</li>
                <li>Real user buys 100 BTC from bot @ $52,000 → Bot position = 0</li>
                <li className="text-success font-medium">
                  Realized P&L = ($52,000 - $50,000) × 100 = +$200,000 profit!
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Limits Section */}
      <Card className="border-warning/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-warning" />
            {t("daily_trade_limits")}
          </h3>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("each_bot_has_a")} <strong>{tCommon("max_daily_trades")}</strong> {t("limit_that_controls_how_many_trades")} {t("this_prevents_runaway_trading_and_helps")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-foreground mb-2">{t("daily_count")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("shows_current_trades_vs_max_allowed")} {t("when_a_bot_reaches_its_limit")}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-foreground mb-2">{t("automatic_reset")}</h4>
                <p className="text-sm text-muted-foreground">
                  {t("daily_trade_counts_reset_automatically_at")}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Configuration</h4>
                <p className="text-sm text-muted-foreground">
                  {t("you_can_configure_max_daily_trades")}
                </p>
              </div>
            </div>

            <div className="p-4 bg-destructive/5 dark:bg-destructive/10 rounded-lg border border-destructive/20">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <TriangleAlert className="w-4 h-4 text-destructive" />
                {t("troubleshooting_bots_not_trading")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t("if_bots_suddenly_stop_executing_ai")} {t("you_can_manually_reset_via_database")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
