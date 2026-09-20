"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";
import {
  BotOff,
  CircleAlert,
  CircleCheck,
  CircleOff,
  CirclePlay,
  FileText,
  Gauge,
  OctagonAlert,
  Wallet,
  Wrench,
} from "lucide-react";

export default function TroubleshootingSection() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const issues = [
    {
      category: "Market Not Starting",
      icon: CirclePlay,
      problems: [
        {
          symptom: "Market status stuck on 'INITIALIZING'",
          causes: [
            "Insufficient pool liquidity",
            "Global trading is disabled",
            "Maintenance mode is enabled",
          ],
          solutions: [
            "Check that pool has sufficient funds (meets minimum liquidity requirement)",
            "Go to Settings → Trading and ensure 'Trading Enabled' is ON",
            "Disable maintenance mode if enabled",
            "Check system logs for specific error messages",
          ],
        },
        {
          symptom: "Market won't start after clicking 'Start'",
          causes: [
            "Max concurrent bots limit reached",
            "Market configuration invalid",
            "Database or backend errors",
          ],
          solutions: [
            "Check current bot count vs max limit in Settings",
            "Review market configuration for invalid values",
            "Check backend logs for errors",
            "Try refreshing the page and starting again",
          ],
        },
      ],
    },
    {
      category: "Bots Not Trading",
      icon: BotOff,
      problems: [
        {
          symptom: "Bots are active but no trades appearing",
          causes: [
            "Orders being placed but not filled",
            "Spread too wide for market conditions",
            "Volume target already met",
          ],
          solutions: [
            "Check order book to verify orders are being placed",
            "Reduce spread width to increase fill probability",
            "Review volume settings and daily limits",
            "Increase aggression level to create more trades",
          ],
        },
        {
          symptom: "Bots suddenly stopped trading (market shows 'Idle - Daily Limit')",
          causes: [
            "All bots have reached their maxDailyTrades limit",
            "Daily trade counts reset at midnight UTC",
          ],
          solutions: [
            "Wait for midnight UTC reset (automatic)",
            "Increase maxDailyTrades in bot configuration",
            "Add more bots to distribute trade load",
            "Check bot stats to see dailyTradeCount vs maxDailyTrades",
          ],
        },
        {
          symptom: "Bot status shows errors",
          causes: [
            "Insufficient balance for orders",
            "API rate limiting",
            "Network connectivity issues",
          ],
          solutions: [
            "Check pool balance and add funds if needed",
            "Reduce bot activity frequency (increase intervals)",
            "Check server connectivity and network status",
            "Review bot logs for specific error messages",
          ],
        },
      ],
    },
    {
      category: "Price Issues",
      icon: CircleOff,
      problems: [
        {
          symptom: "Price not moving toward target",
          causes: [
            "Aggression level too low",
            "Strong opposing market pressure",
            "Price already at range limits",
          ],
          solutions: [
            "Increase aggression level in market settings",
            "Verify target price is within price range limits",
            "Check if external traders are pushing price opposite direction",
            "Consider adjusting target price to be more realistic",
          ],
        },
        {
          symptom: "Price moving too fast/erratically",
          causes: [
            "Aggression level too high",
            "Pool too small for market",
            "Volatility threshold too permissive",
          ],
          solutions: [
            "Reduce aggression level",
            "Increase pool size for more stability",
            "Lower volatility threshold to pause during volatility",
            "Review and adjust bot configurations",
          ],
        },
      ],
    },
    {
      category: "Pool & Balance Issues",
      icon: Wallet,
      problems: [
        {
          symptom: "Pool becoming significantly imbalanced",
          causes: [
            "One-sided market pressure",
            "Target price mismatch with market",
            "Insufficient counter-trades",
          ],
          solutions: [
            "Manual rebalancing through pool management",
            "Adjust target price closer to current market price",
            "Add Volume bot with balanced buy/sell ratio",
            "Consider if market fundamentals justify the imbalance",
          ],
        },
        {
          symptom: "P&L consistently negative",
          causes: [
            "Spread too tight for volatility",
            "Adverse selection (trading against informed traders)",
            "Pool size too small",
          ],
          solutions: [
            "Widen spreads to increase profit margin",
            "Review trade history to identify problematic patterns",
            "Increase pool size for better resilience",
            "Enable or tighten stop loss settings",
          ],
        },
      ],
    },
    {
      category: "Performance Issues",
      icon: Gauge,
      problems: [
        {
          symptom: "Dashboard loading slowly",
          causes: [
            "Too many markets/bots",
            "Database queries slow",
            "Server resource constraints",
          ],
          solutions: [
            "Reduce polling frequency in settings",
            "Check server resource usage",
            "Consider database optimization",
            "Reduce number of active bots if excessive",
          ],
        },
        {
          symptom: "Orders taking long time to place",
          causes: [
            "Network latency",
            "Exchange/market API slowdown",
            "Queue processing delays",
          ],
          solutions: [
            "Check network connectivity",
            "Review backend queue processing",
            "Increase bot intervals to reduce load",
            "Check for any API rate limiting",
          ],
        },
      ],
    },
  ];


  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("troubleshooting_guide")}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t("common_issues_and_their_solutions_if")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-destructive/15 text-destructive">
              <OctagonAlert className="h-3.5 w-3.5" />
            </span>
            <h3 className="font-semibold text-destructive">
              {t("emergency_actions")}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/20">
              <h4 className="font-medium text-sm text-foreground">{t("if_something_looks_wrong")}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Use <strong className="text-destructive">{t("global_pause")}</strong> to immediately stop all trading while you investigate.
                Markets remain ready to resume.
              </p>
            </div>
            <div className="p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/20">
              <h4 className="font-medium text-sm text-foreground">{t("if_theres_a_major_issue")}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Use <strong className="text-destructive">{tCommon("emergency_stop")}</strong> to immediately halt all operations and cancel orders.
                Requires manual restart.
              </p>
            </div>
            <div className="p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/20">
              <h4 className="font-medium text-sm text-foreground">{t("for_single_market_issues")}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Use the <strong className="text-destructive">Stop</strong> button on the specific market's page to stop just that market.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Categories */}
      {issues.map((category) => (
        <Card key={category.category}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/10 text-primary`}>
                {(() => { const Glyph = category.icon; return <Glyph className="h-3.5 w-3.5" />; })()}
              </span>
              <h3 className="text-lg font-semibold text-foreground">
                {category.category}
              </h3>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {category.problems.map((problem, index) => (
                <AccordionItem key={index} value={`problem-${index}`}>
                  <AccordionTrigger className="text-left">
                    <span className="text-sm">{problem.symptom}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 p-2">
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-2">
                          {t("possible_causes")}
                        </h5>
                        <ul className="space-y-1">
                          {problem.causes.map((cause, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CircleAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-2">
                          Solutions
                        </h5>
                        <ul className="space-y-1">
                          {problem.solutions.map((solution, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CircleCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
                              {solution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}

      {/* Logging */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {t("checking_logs")}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("if_you_cant_resolve_an_issue")}
          </p>
          <div className="p-4 bg-muted rounded-lg font-mono text-xs">
            <p className="text-muted-foreground"># {t("backend_logs_location")}</p>
            <p className="text-foreground">backend/logs/ai-market-maker.log</p>
            <p className="text-muted-foreground mt-2"># {t("bot_specific_logs")}</p>
            <p className="text-foreground">backend/logs/ai-market-maker-bots.log</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
