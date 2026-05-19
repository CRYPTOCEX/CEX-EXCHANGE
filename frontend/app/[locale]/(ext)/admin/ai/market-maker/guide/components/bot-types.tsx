"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface BotType {
  id: string;
  name: string;
  icon: string;
  color: string;
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
      icon: "mdi:scale-balance",
      color: "purple",
      description: "Balanced bot that provides liquidity on both sides, the core bot for healthy markets.",
      tradingStyle: "Places both buy and sell orders around the current price, earning the spread while providing liquidity.",
      howItWorks: [
        "Places orders on BOTH buy and sell sides",
        "Maintains balanced position",
        "Provides liquidity to the market",
        "Earns from bid-ask spread",
        "Adapts to market conditions",
      ],
      parameters: [
        { name: "Trade Frequency", description: "How actively the bot trades", default: "MEDIUM-HIGH" },
        { name: "Risk Tolerance", description: "Position size risk (0.1-1.0)", default: "0.5" },
        { name: "Preferred Spread", description: "Target spread between buy/sell", default: "0.1-0.5%" },
        { name: "Max Daily Trades", description: "Maximum trades allowed per day", default: "50-200" },
      ],
      bestFor: ["All market conditions", "Liquidity provision", "Spread earning"],
      riskLevel: "Low",
    },
    {
      id: "SCALPER",
      name: "Scalper Bot",
      icon: "mdi:lightning-bolt",
      color: "yellow",
      description: "High-frequency trader that makes many small trades to capture tiny price movements.",
      tradingStyle: "Executes rapid trades with small profit targets, taking advantage of bid-ask spreads and minor price fluctuations.",
      howItWorks: [
        "Trades frequently with small order sizes",
        "Targets small price movements (0.1-0.5%)",
        "Quick entry and exit positions",
        "High daily trade count, low profit per trade",
        "Best during stable market conditions",
      ],
      parameters: [
        { name: "Trade Frequency", description: "How often the bot looks for opportunities", default: "HIGH" },
        { name: "Risk Tolerance", description: "How much risk the bot takes per trade (0.1-1.0)", default: "0.3-0.5" },
        { name: "Avg Order Size", description: "Typical order size in base currency", default: "Small (1-5%)" },
        { name: "Max Daily Trades", description: "Maximum trades allowed per day", default: "100-500" },
      ],
      bestFor: ["Stable markets", "High liquidity pairs", "Consistent small gains"],
      riskLevel: "Medium",
    },
    {
      id: "SWING",
      name: "Swing Trader Bot",
      icon: "mdi:chart-bell-curve",
      color: "purple",
      description: "Medium-term trader that captures larger price movements over longer periods.",
      tradingStyle: "Holds positions longer to capture significant price swings, trading less frequently but with larger profit targets.",
      howItWorks: [
        "Trades less frequently but holds longer",
        "Targets larger price movements (1-5%)",
        "Analyzes trend direction before entering",
        "Lower daily trade count, higher profit per trade",
        "Better during trending markets",
      ],
      parameters: [
        { name: "Trade Frequency", description: "How often the bot looks for opportunities", default: "LOW-MEDIUM" },
        { name: "Risk Tolerance", description: "How much risk the bot takes per trade (0.1-1.0)", default: "0.5-0.7" },
        { name: "Avg Order Size", description: "Typical order size in base currency", default: "Medium (5-15%)" },
        { name: "Max Daily Trades", description: "Maximum trades allowed per day", default: "10-50" },
      ],
      bestFor: ["Trending markets", "Volatile pairs", "Capturing major moves"],
      riskLevel: "Medium",
    },
    {
      id: "ACCUMULATOR",
      name: "Accumulator Bot",
      icon: "mdi:trending-up",
      color: "green",
      description: "Systematically buys and builds a position over time, ideal when you expect prices to rise.",
      tradingStyle: "Focuses on buying (accumulating) the base currency, building a long position gradually.",
      howItWorks: [
        "Primarily places BUY orders",
        "Builds position gradually over time",
        "Buys more when price dips",
        "Holds accumulated position for appreciation",
        "Helps push price toward target (upward)",
      ],
      parameters: [
        { name: "Trade Frequency", description: "How often the bot buys", default: "MEDIUM" },
        { name: "Risk Tolerance", description: "How aggressively to accumulate (0.1-1.0)", default: "0.4-0.6" },
        { name: "Avg Order Size", description: "Typical buy order size", default: "Medium (5-10%)" },
        { name: "Max Daily Trades", description: "Maximum buys allowed per day", default: "20-100" },
      ],
      bestFor: ["Bullish markets", "Building long positions", "Price support"],
      riskLevel: "Low",
    },
    {
      id: "DISTRIBUTOR",
      name: "Distributor Bot",
      icon: "mdi:trending-down",
      color: "red",
      description: "Systematically sells and reduces position over time, ideal when you expect prices to fall or want to take profits.",
      tradingStyle: "Focuses on selling (distributing) the base currency, reducing a long position or building a short.",
      howItWorks: [
        "Primarily places SELL orders",
        "Reduces position gradually over time",
        "Sells more when price rises",
        "Takes profits from accumulated position",
        "Helps push price toward target (downward)",
      ],
      parameters: [
        { name: "Trade Frequency", description: "How often the bot sells", default: "MEDIUM" },
        { name: "Risk Tolerance", description: "How aggressively to distribute (0.1-1.0)", default: "0.4-0.6" },
        { name: "Avg Order Size", description: "Typical sell order size", default: "Medium (5-10%)" },
        { name: "Max Daily Trades", description: "Maximum sells allowed per day", default: "20-100" },
      ],
      bestFor: ["Bearish markets", "Taking profits", "Price resistance"],
      riskLevel: "Low",
    },
  ];

  const selectedBotData = botTypes.find((b) => b.id === selectedBot);

  const colorClasses: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
    yellow: { bg: "bg-yellow-500/10 dark:bg-yellow-500/20", text: "text-yellow-500", border: "border-yellow-500/30", iconBg: "bg-yellow-500/20 dark:bg-yellow-500/30" },
    cyan: { bg: "bg-cyan-500/10 dark:bg-cyan-500/20", text: "text-cyan-500", border: "border-cyan-500/30", iconBg: "bg-cyan-500/20 dark:bg-cyan-500/30" },
    green: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-500", border: "border-green-500/30", iconBg: "bg-green-500/20 dark:bg-green-500/30" },
    red: { bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-500", border: "border-red-500/30", iconBg: "bg-red-500/20 dark:bg-red-500/30" },
    purple: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-500", border: "border-purple-500/30", iconBg: "bg-purple-500/20 dark:bg-purple-500/30" },
  };

  const riskColors: Record<string, string> = {
    Low: "bg-green-500/10 text-green-500 dark:bg-green-500/20",
    Medium: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
    High: "bg-red-500/10 text-red-500 dark:bg-red-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent dark:from-purple-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
              <Icon icon="mdi:robot" className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-muted-800 dark:text-muted-100">
                {t("bot_personality_types")}
              </h2>
              <p className="text-muted-600 dark:text-muted-400 mt-1">
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
                ? `border ${colorClasses[bot.color].border} ${colorClasses[bot.color].bg}`
                : "hover:shadow-md"
            }`}
            onClick={() => setSelectedBot(bot.id)}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-10 h-10 rounded-lg ${colorClasses[bot.color].iconBg} flex items-center justify-center`}>
                <Icon icon={bot.icon} className={`w-5 h-5 ${colorClasses[bot.color].text}`} />
              </div>
              <span className="text-xs font-medium text-muted-800 dark:text-muted-100">{bot.name}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Bot Details */}
      {selectedBotData && (
        <Card className={`border ${colorClasses[selectedBotData.color].border}`}>
          <CardContent className="pt-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-xl ${colorClasses[selectedBotData.color].iconBg} flex items-center justify-center shrink-0`}>
                <Icon icon={selectedBotData.icon} className={`w-8 h-8 ${colorClasses[selectedBotData.color].text}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-muted-800 dark:text-muted-100">
                    {selectedBotData.name}
                  </h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColors[selectedBotData.riskLevel]}`}>
                    {selectedBotData.riskLevel} Risk
                  </span>
                </div>
                <p className="text-muted-600 dark:text-muted-400 mt-1">
                  {selectedBotData.description}
                </p>
              </div>
            </div>

            {/* Trading Style */}
            <div className={`p-4 rounded-lg ${colorClasses[selectedBotData.color].bg}`}>
              <h4 className="font-semibold text-muted-800 dark:text-muted-100 mb-1">{tExt("trading_style")}</h4>
              <p className="text-sm text-muted-600 dark:text-muted-400">{selectedBotData.tradingStyle}</p>
            </div>

            {/* How It Works */}
            <div>
              <h4 className="font-semibold text-muted-800 dark:text-muted-100 mb-3">{tExt("how_it_works")}</h4>
              <ul className="space-y-2">
                {selectedBotData.howItWorks.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full ${colorClasses[selectedBotData.color].bg} ${colorClasses[selectedBotData.color].text} flex items-center justify-center text-xs font-medium shrink-0`}>
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-600 dark:text-muted-400">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Parameters */}
            <div>
              <h4 className="font-semibold text-muted-800 dark:text-muted-100 mb-3">{t("configuration_parameters")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedBotData.parameters.map((param) => (
                  <div key={param.name} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-muted-800 dark:text-muted-100">{param.name}</span>
                      <span className="text-xs text-muted-500 bg-muted-100 dark:bg-muted-800 px-2 py-0.5 rounded">
                        {param.default}
                      </span>
                    </div>
                    <p className="text-xs text-muted-500 mt-1">{param.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Best For */}
            <div>
              <h4 className="font-semibold text-muted-800 dark:text-muted-100 mb-3">{t("best_used_for")}</h4>
              <div className="flex flex-wrap gap-2">
                {selectedBotData.bestFor.map((use) => (
                  <span
                    key={use}
                    className={`px-3 py-1 rounded-full text-sm ${colorClasses[selectedBotData.color].bg} ${colorClasses[selectedBotData.color].text}`}
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
      <Card className="border-purple-500/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-muted-800 dark:text-muted-100 mb-4 flex items-center gap-2">
            <Icon icon="mdi:chart-line" className="w-5 h-5 text-purple-500" />
            {t("understanding_bot_p_l_profit_loss")} ({tCommon("profit_loss")})
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 rounded-lg">
              <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2">{t("how_p_l_is_tracked")}</h4>
              <p className="text-sm text-muted-600 dark:text-muted-400">
                {t("p_l_is_only_calculated_from")} <strong>{t("real_users")}</strong>{t("ai_to_ai_trades_bots_trading")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2 flex items-center gap-2">
                  <Icon icon="mdi:wallet" className="w-4 h-4 text-amber-500" />
                  {t("position_inventory")} ({t("inventory")})
                </h4>
                <ul className="text-sm text-muted-600 dark:text-muted-400 space-y-1">
                  <li><strong>{t("positive")}</strong> {t("bot_holds_base_currency_bought_more_than_sold")} ({t("bought_more_than_sold")})</li>
                  <li><strong>{t("negative")}</strong> {t("bot_owes_base_currency_sold_more_than_bought")} ({t("sold_more_than_bought")})</li>
                  <li><strong>{t("zero")}</strong> {t("bot_is_balanced")}</li>
                </ul>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2 flex items-center gap-2">
                  <Icon icon="mdi:calculator" className="w-4 h-4 text-green-500" />
                  {t("when_p_l_is_realized")}
                </h4>
                <ul className="text-sm text-muted-600 dark:text-muted-400 space-y-1">
                  <li><strong>{t("long_position")}</strong> {t("p_l_realized_when_bot_sells_to_close")}</li>
                  <li><strong>{t("short_position")}</strong> {t("p_l_realized_when_bot_buys_to_close")}</li>
                  <li>{t("opening_positions_doesnt_realize_p_l")}</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 rounded-lg border border-amber-500/20">
              <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2 flex items-center gap-2">
                <Icon icon="mdi:lightbulb" className="w-4 h-4 text-amber-500" />
                {t("example_spot_trading_p_l")}
              </h4>
              <ol className="text-sm text-muted-600 dark:text-muted-400 space-y-2 list-decimal list-inside">
                <li>{t("bot_starts_with_position_0")}</li>
                <li>{t("real_user_sells_100_btc_to")}</li>
                <li>{t("price_rises_to_52_000")}</li>
                <li>{t("real_user_buys_100_btc_from")}</li>
                <li className="text-green-600 dark:text-green-400 font-medium">
                  {t("realized_p_l_52_000_50_000_100_200_000_profit")}
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Limits Section */}
      <Card className="border-amber-500/20">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-muted-800 dark:text-muted-100 mb-4 flex items-center gap-2">
            <Icon icon="mdi:timer-sand" className="w-5 h-5 text-amber-500" />
            {t("daily_trade_limits")}
          </h3>

          <div className="space-y-4">
            <p className="text-sm text-muted-600 dark:text-muted-400">
              {t("each_bot_has_a")} <strong>{tCommon("max_daily_trades")}</strong> {t("limit_that_controls_how_many_trades")} {t("this_prevents_runaway_trading_and_helps")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2">{t("daily_count")}</h4>
                <p className="text-sm text-muted-600 dark:text-muted-400">
                  {t("shows_current_trades_vs_max_allowed")} {t("when_a_bot_reaches_its_limit")}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2">{t("automatic_reset")}</h4>
                <p className="text-sm text-muted-600 dark:text-muted-400">
                  {t("daily_trade_counts_reset_automatically_at")}
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2">Configuration</h4>
                <p className="text-sm text-muted-600 dark:text-muted-400">
                  {t("you_can_configure_max_daily_trades")}
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-500/5 dark:bg-red-500/10 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-muted-800 dark:text-muted-100 mb-2 flex items-center gap-2">
                <Icon icon="mdi:alert" className="w-4 h-4 text-red-500" />
                {t("troubleshooting_bots_not_trading")}
              </h4>
              <p className="text-sm text-muted-600 dark:text-muted-400">
                {t("if_bots_suddenly_stop_executing_ai")} {t("you_can_manually_reset_via_database")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
