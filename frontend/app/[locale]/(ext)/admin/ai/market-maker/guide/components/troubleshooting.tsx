"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TroubleshootingSection() {
  const issues = [
    {
      category: "Market Not Starting",
      icon: "mdi:play-circle-outline",
      color: "danger",
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
      icon: "mdi:robot-off",
      color: "warning",
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
      icon: "mdi:currency-usd-off",
      color: "info",
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
      icon: "mdi:wallet-outline",
      color: "success",
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
      icon: "mdi:speedometer-slow",
      color: "purple",
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

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    danger: { bg: "bg-red-500/10 dark:bg-red-500/20", text: "text-red-500", border: "border-red-500/30" },
    warning: { bg: "bg-amber-500/10 dark:bg-amber-500/20", text: "text-amber-500", border: "border-amber-500/30" },
    info: { bg: "bg-blue-500/10 dark:bg-blue-500/20", text: "text-blue-500", border: "border-blue-500/30" },
    success: { bg: "bg-green-500/10 dark:bg-green-500/20", text: "text-green-500", border: "border-green-500/30" },
    purple: { bg: "bg-purple-500/10 dark:bg-purple-500/20", text: "text-purple-500", border: "border-purple-500/30" },
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
              <Icon icon="mdi:wrench" className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-muted-800 dark:text-muted-100">
                Troubleshooting Guide
              </h2>
              <p className="text-muted-600 dark:text-muted-400 mt-1">
                Common issues and their solutions. If you can't find your issue here,
                check the system logs or contact support.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Actions */}
      <Card className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="mdi:alert-octagon" className="w-6 h-6 text-red-500" />
            <h3 className="font-semibold text-red-600 dark:text-red-400">
              Emergency Actions
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-sm text-muted-800 dark:text-muted-100">If Something Looks Wrong</h4>
              <p className="text-xs text-muted-600 dark:text-muted-400 mt-1">
                Use <strong className="text-red-500">Global Pause</strong> to immediately stop all trading while you investigate.
                Markets remain ready to resume.
              </p>
            </div>
            <div className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-sm text-muted-800 dark:text-muted-100">If There's a Major Issue</h4>
              <p className="text-xs text-muted-600 dark:text-muted-400 mt-1">
                Use <strong className="text-red-500">Emergency Stop</strong> to immediately halt all operations and cancel orders.
                Requires manual restart.
              </p>
            </div>
            <div className="p-3 bg-red-500/10 dark:bg-red-500/20 rounded-lg border border-red-500/20">
              <h4 className="font-medium text-sm text-muted-800 dark:text-muted-100">For Single Market Issues</h4>
              <p className="text-xs text-muted-600 dark:text-muted-400 mt-1">
                Use the <strong className="text-red-500">Stop</strong> button on the specific market's page to stop just that market.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Categories */}
      {issues.map((category) => (
        <Card key={category.category} className={colorClasses[category.color].border}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg ${colorClasses[category.color].bg} flex items-center justify-center`}>
                <Icon icon={category.icon} className={`w-5 h-5 ${colorClasses[category.color].text}`} />
              </div>
              <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
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
                        <h5 className="text-sm font-medium text-muted-700 dark:text-muted-300 mb-2">
                          Possible Causes
                        </h5>
                        <ul className="space-y-1">
                          {problem.causes.map((cause, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-500">
                              <Icon icon="mdi:alert-circle-outline" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              {cause}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-muted-700 dark:text-muted-300 mb-2">
                          Solutions
                        </h5>
                        <ul className="space-y-1">
                          {problem.solutions.map((solution, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-500">
                              <Icon icon="mdi:check-circle" className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
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
            <div className="w-10 h-10 rounded-lg bg-muted-500/10 flex items-center justify-center">
              <Icon icon="mdi:file-document-outline" className="w-5 h-5 text-muted-500" />
            </div>
            <h3 className="text-lg font-semibold text-muted-800 dark:text-muted-100">
              Checking Logs
            </h3>
          </div>
          <p className="text-sm text-muted-600 dark:text-muted-400 mb-4">
            If you can't resolve an issue using this guide, check the system logs for more detailed error information.
          </p>
          <div className="p-4 bg-muted-100 dark:bg-muted-800 rounded-lg font-mono text-xs">
            <p className="text-muted-500"># Backend logs location</p>
            <p className="text-muted-800 dark:text-muted-200">backend/logs/ai-market-maker.log</p>
            <p className="text-muted-500 mt-2"># Bot-specific logs</p>
            <p className="text-muted-800 dark:text-muted-200">backend/logs/ai-market-maker-bots.log</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
