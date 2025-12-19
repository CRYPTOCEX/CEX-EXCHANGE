"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export default function FaqSection() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const faqCategories = [
    {
      title: "General Questions",
      icon: "mdi:help-circle",
      color: "primary",
      faqs: [
        {
          question: "What is AI Market Maker?",
          answer: "AI Market Maker is an automated trading system that provides liquidity to your ecosystem markets. It uses intelligent bots to place buy and sell orders, create trading volume, and maintain healthy market conditions - all while managing risk automatically.",
        },
        {
          question: "Is this legal?",
          answer: "Market making is a legitimate practice used by exchanges and trading platforms worldwide. However, you should ensure compliance with your local regulations and be transparent with your users about how markets operate. The system is designed for legitimate market making, not price manipulation.",
        },
        {
          question: "How much capital do I need to start?",
          answer: "You can start with as little as $100-500 for testing purposes. For production markets, we recommend starting with at least $1,000-5,000 per market to ensure sufficient liquidity for meaningful trading activity. Larger pools provide more stability and better performance.",
        },
        {
          question: "Can I lose money?",
          answer: "Yes, market making involves risk. While the system is designed to generate small, consistent profits from spreads, market conditions, configuration errors, or extreme volatility can result in losses. Always start small, use risk limits, and never invest more than you can afford to lose.",
        },
      ],
    },
    {
      title: "Technical Questions",
      icon: "mdi:cog",
      color: "info",
      faqs: [
        {
          question: "How do bots decide when to trade?",
          answer: "Bots use a combination of factors: time-based intervals (randomized for natural behavior), market conditions (current price vs target), pool balance, and configured parameters like aggression level and spread width. Each bot type has its own logic optimized for its purpose.",
        },
        {
          question: "What happens if the server goes down?",
          answer: "Active orders remain on the order book but no new orders are placed. When the server restarts, bots will resume from their last known state. We recommend monitoring your markets and having alerts set up for extended downtime.",
        },
        {
          question: "Can I run multiple markets simultaneously?",
          answer: "Yes, you can run as many markets as your configuration allows. The 'Max Concurrent Bots' setting limits total bots across all markets. Each market has its own pool and settings, operating independently.",
        },
        {
          question: "How does the target price work?",
          answer: "The target price is the price you want the market to gravitate toward. Bots will place orders that gently push the price in that direction while maintaining natural-looking movement. The price won't jump directly to the target - it moves gradually over time based on your aggression settings.",
        },
        {
          question: "What's the difference between 'Pause' and 'Stop'?",
          answer: "'Pause' temporarily halts trading while keeping the market ready to resume quickly. 'Stop' fully shuts down the market, cancels all orders, and requires a fresh start. Use Pause for temporary situations and Stop for extended maintenance or issues.",
        },
      ],
    },
    {
      title: "Configuration Questions",
      icon: "mdi:tune",
      color: "success",
      faqs: [
        {
          question: "What spread should I use?",
          answer: "It depends on the asset. For stable assets (stablecoins, major cryptos), use 0.1-0.3%. For moderate volatility, use 0.3-0.8%. For high volatility or illiquid assets, use 1-3% or more. Tighter spreads create more activity but less profit margin; wider spreads are safer but may reduce volume.",
        },
        {
          question: "How many bots should I configure per market?",
          answer: "For most markets, 3-5 bots of different types is sufficient. A typical setup might be: 1-2 Market Maker bots, 1 Volume bot, and 1 Trend bot. More bots don't necessarily mean better results - focus on quality configuration over quantity.",
        },
        {
          question: "Should I enable all bot types?",
          answer: "No, start simple. Market Maker and Volume bots are essential. Add Trend bot if you want to guide prices toward a target. Only add advanced bots (Arbitrage, Liquidity, Sentiment) once you're comfortable with the basics and have specific needs they address.",
        },
        {
          question: "How often should I adjust settings?",
          answer: "Initially, monitor daily and adjust as needed. Once you find settings that work, you can reduce to weekly reviews. Major market events or performance issues may require immediate adjustments. Avoid over-optimizing - small, stable gains are better than chasing performance.",
        },
      ],
    },
    {
      title: "Performance & P&L",
      icon: "mdi:chart-line",
      color: "warning",
      faqs: [
        {
          question: "Why is my bot P&L showing zero?",
          answer: "P&L is only calculated from trades between bots and REAL users. AI-to-AI trades (bots trading with each other) don't affect P&L since they're internal and net to zero. If no real users are trading on your market, P&L will remain at zero regardless of how many AI trades occur.",
        },
        {
          question: "How is bot P&L calculated for spot trading?",
          answer: "Bots track their 'position' (inventory) and 'average entry price'. P&L is realized when closing positions: If a bot bought 100 tokens at $50 (long position), then sells them at $55, the realized P&L is ($55-$50) × 100 = +$500. P&L is only recorded when positions are closed, not when opened.",
        },
        {
          question: "What does 'Position' mean for bots?",
          answer: "Position tracks the bot's inventory imbalance: Positive = bot holds base currency (bought more than sold), Negative = bot owes base currency (sold more than bought), Zero = balanced. This is NOT futures-style positions - it's spot market inventory tracking for P&L calculation.",
        },
        {
          question: "What's the difference between AI trades and real trades?",
          answer: "AI trades are internal trades between bots to create market activity and maintain price. Real trades are when actual users trade against bot orders. Only real trades affect: 1) Pool balances, 2) Bot P&L, 3) Win rate statistics. AI trades only update daily trade counts and volume metrics.",
        },
        {
          question: "Why do my bots have many trades but 0% win rate?",
          answer: "Win rate is calculated from 'real trades executed' (trades with real users), not total daily trades. If realTradesExecuted is 0, win rate will be 0% even with hundreds of AI-to-AI trades. This is expected - win rate only measures performance against real market participants.",
        },
        {
          question: "What's a good target achievement rate?",
          answer: "A target achievement rate of 60-80% indicates the bots are successfully guiding price toward your target most of the time. 100% isn't necessary or natural - some deviation is expected. Below 50% may indicate your target price needs adjustment.",
        },
      ],
    },
    {
      title: "Troubleshooting",
      icon: "mdi:alert-circle",
      color: "danger",
      faqs: [
        {
          question: "My market won't start - what should I check?",
          answer: "Check: 1) Pool has minimum required liquidity, 2) Global trading is enabled in Settings, 3) Maintenance mode is off, 4) Max concurrent bots limit isn't reached, 5) Market configuration is valid. Check logs for specific errors.",
        },
        {
          question: "Bots are running but no AI trades appearing",
          answer: "Check if bots have reached their Max Daily Trades limit. When all bots hit 100/100 trades, AI-to-AI trading stops. Daily limits reset automatically at midnight. You can also manually increase the limit or reset trade counts via database.",
        },
        {
          question: "Why did my bots stop trading after running fine?",
          answer: "Most common cause: bots reached their daily trade limit (default 100). Check bot stats - if dailyTradeCount equals maxDailyTrades, they've hit the limit. Wait for midnight reset, increase the limit, or manually reset via database: UPDATE ai_bot SET dailyTradeCount = 0;",
        },
        {
          question: "Price is stuck and not moving",
          answer: "Possible causes: 1) Aggression level too low, 2) Already at price range limits, 3) Strong external trading pressure, 4) All bots at daily trade limit. Try increasing aggression, reviewing price range settings, or adjusting target price.",
        },
        {
          question: "PAUSE shows STOPPED in the UI",
          answer: "This was a known bug where the sync process would incorrectly stop paused markets. Ensure your backend is updated. PAUSED markets should remain loaded in memory but not actively trading, and UI should show 'Resume' button.",
        },
        {
          question: "I'm seeing 'No orderbook entry found' errors",
          answer: "This is normal when stopping/pausing a market - it means the system is trying to cancel orders that were already removed from the orderbook. These are debug-level warnings and can be safely ignored unless they persist during normal operation.",
        },
      ],
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    primary: { bg: "bg-indigo-500/10 dark:bg-indigo-500/20", text: "text-indigo-500" },
    info: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-500" },
    success: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-500" },
    warning: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-500" },
    danger: { bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-500" },
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-transparent dark:from-indigo-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Icon icon="mdi:frequently-asked-questions" className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-muted-800 dark:text-muted-100">
                {tCommon('faq_question')}
              </h2>
              <p className="text-muted-600 dark:text-muted-400 mt-1">
                {t("find_answers_to_common_questions_about")} {tExt("cant_find_what_youre_looking_for")} {t("check_the_other_guide_sections_or_contact_support")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search hint */}
      <div className="flex items-center gap-2 text-sm text-muted-500">
        <Icon icon="mdi:lightbulb" className="w-4 h-4" />
        <span>{t("tip_use_your_browsers_search_ctrl")}</span>
      </div>

      {/* FAQ Categories */}
      {faqCategories.map((category) => (
        <Card key={category.title}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg ${colorClasses[category.color].bg} flex items-center justify-center`}>
                <Icon icon={category.icon} className={`w-5 h-5 ${colorClasses[category.color].text}`} />
              </div>
              <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
                {category.title}
              </h3>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {category.faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
                    <span className="text-sm font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-600 dark:text-muted-400 p-2">
                      {faq.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {/* Still have questions */}
      <Card className="bg-muted-50 dark:bg-muted-800/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Icon icon="mdi:help-circle-outline" className="w-12 h-12 text-muted-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100 mb-2">
              {tExt("still_have_questions")}
            </h3>
            <p className="text-sm text-muted-500 mb-4 max-w-md mx-auto">
              {t("if_you_couldnt_find_the_answer")}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
                <Icon icon="mdi:book-open-variant" className="w-4 h-4" />
                <span>{t("read_the_full_guide")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
                <Icon icon="mdi:file-document" className="w-4 h-4" />
                <span>{t("check_system_logs")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-600 dark:text-muted-400">
                <Icon icon="mdi:wrench" className="w-4 h-4" />
                <span>{t("review_troubleshooting")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
