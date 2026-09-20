"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { m } from "framer-motion";
import {
  Users,
  Target,
  TrendingUp,
  Coins,
  Shield,
  BarChart3,
  Zap,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  DollarSign,
  Search,
  ChevronLeft,
  Lightbulb,
  Wallet,
  Settings,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Users,
    tile: "bg-chart-1/10",
    ink: "text-chart-1",
    content: [
      {
        title: "What is Copy Trading?",
        description:
          "Copy trading allows you to automatically replicate the trades of experienced traders. When a leader makes a trade, the same trade is executed in your account proportionally.",
        benefits: [
          "Learn from experienced traders",
          "Passive income potential",
          "Diversify your trading strategy",
          "No trading experience required",
        ],
      },
      {
        title: "How to Start Following",
        description:
          "Getting started with copy trading is simple and takes just a few minutes.",
        steps: [
          "Browse available leaders on the Leaders page",
          "Review their performance, risk level, and trading style",
          "Click Follow and choose your allocation amount",
          "Select which markets you want to copy",
        ],
      },
    ],
  },
  {
    id: "choosing-leaders",
    title: "Choosing Leaders",
    icon: Search,
    tile: "bg-chart-2/10",
    ink: "text-chart-2",
    content: [
      {
        title: "Evaluating Leaders",
        description:
          "Take time to research leaders before following them. Look at their complete profile.",
        metrics: [
          "ROI - Overall return on investment percentage",
          "Win Rate - Percentage of profitable trades",
          "Total Trades - Experience level indicator",
          "Follower Count - Social proof from other users",
          "Risk Level - How aggressive their trading is",
        ],
      },
      {
        title: "Red Flags to Watch",
        description: "Be cautious of leaders showing these warning signs.",
        warnings: [
          "Unrealistic ROI promises (100%+ monthly)",
          "Very high risk level with many followers",
          "New accounts with limited track record",
          "Extremely high profit share percentages",
          "Inconsistent trading patterns",
        ],
      },
    ],
  },
  {
    id: "allocations",
    title: "Managing Allocations",
    icon: Coins,
    tile: "bg-chart-3/10",
    ink: "text-chart-3",
    content: [
      {
        title: "Per-Market Allocations",
        description:
          "You allocate funds to specific markets, not just to leaders. This gives you more control.",
        steps: [
          "Choose which markets to follow (e.g., BTC/USDT, ETH/USDT)",
          "Check for minimum allocation requirements set by the leader",
          "Set base currency amount (for selling)",
          "Set quote currency amount (for buying)",
          "Each market has independent allocation and tracking",
        ],
      },
      {
        title: "Minimum Allocation Requirements",
        description:
          "Leaders can set minimum allocation amounts per market to ensure you have enough liquidity.",
        tips: [
          "Check each market's minimum requirements before allocating",
          "Minimums are shown with a warning icon on the follow page",
          "You must meet the minimum for base OR quote currency",
          "If below minimum, the input field will be highlighted in red",
          "Skipping a market entirely is always allowed",
        ],
      },
      {
        title: "Allocation Tips",
        description: "Best practices for managing your copy trading funds.",
        tips: [
          "Start small and increase after seeing results",
          "Don't allocate more than you can afford to lose",
          "Diversify across multiple leaders and markets",
          "Keep some funds in reserve for opportunities",
        ],
      },
    ],
  },
  {
    id: "managing",
    title: "Managing Subscriptions",
    icon: Settings,
    tile: "bg-chart-4/10",
    ink: "text-chart-4",
    content: [
      {
        title: "Subscription Controls",
        description:
          "You have full control over your copy trading subscriptions at all times.",
        features: [
          "Pause/Resume - Temporarily stop copying without unfollowing",
          "Add Funds - Increase allocation to existing markets",
          "Remove Funds - Withdraw from allocations (unused funds only)",
          "Stop Following - End subscription and return all unused funds",
        ],
      },
      {
        title: "Setting Limits",
        description: "Protect yourself with trading limits.",
        limits: [
          "Maximum trade amount per copy",
          "Daily loss limit to auto-pause",
          "Minimum allocation per market",
          "Maximum allocation percentage",
        ],
      },
    ],
  },
  {
    id: "costs",
    title: "Costs & Fees",
    icon: DollarSign,
    tile: "bg-chart-5/10",
    ink: "text-chart-5",
    content: [
      {
        title: "Understanding Fees",
        description: "Know what you're paying when copy trading.",
        fees: [
          "Profit Share - Percentage of profits paid to leader (e.g., 20%)",
          "Platform Fee - Small percentage taken by platform",
          "Trading Fees - Standard exchange fees on each trade",
          "No fees on losses - You only pay when you profit",
        ],
      },
      {
        title: "Fee Example",
        description: "Here's how fees work in practice:",
        example:
          "If you profit $100 and the leader's share is 20%: Leader gets $20, Platform gets ~$2 (10% of leader share), You keep $78. No profit share is charged on losing trades.",
      },
    ],
  },
  {
    id: "risk",
    title: "Risk Management",
    icon: Shield,
    tile: "bg-chart-6/10",
    ink: "text-chart-6",
    content: [
      {
        title: "Understanding Risks",
        description: "Copy trading involves real financial risk. Be aware of:",
        risks: [
          "Past performance doesn't guarantee future results",
          "Leaders can have losing streaks",
          "Market conditions can change rapidly",
          "You can lose some or all of your allocation",
        ],
      },
      {
        title: "Protecting Yourself",
        description: "Steps to minimize your risk exposure.",
        tips: [
          "Never invest more than you can afford to lose",
          "Diversify across multiple leaders",
          "Set stop-loss limits on your subscriptions",
          "Monitor your positions regularly",
          "Start with smaller amounts while learning",
        ],
      },
    ],
  },
];

const faqs = [
  {
    question: "What happens when I follow a leader?",
    answer:
      "When you follow a leader, any trades they make on your allocated markets will be automatically copied to your account, sized proportionally to your allocation.",
  },
  {
    question: "Can I stop copying at any time?",
    answer:
      "Yes, you can pause, stop, or unfollow at any time. Unused funds are returned to your wallet immediately. Funds in open trades are returned when those trades close.",
  },
  {
    question: "What if the leader makes a losing trade?",
    answer:
      "You will also experience the loss proportionally. However, you don't pay any profit share on losing trades. Only profitable trades incur the profit share fee.",
  },
  {
    question: "How much should I allocate?",
    answer:
      "Start with an amount you're comfortable losing. Many users start with 5-10% of their trading capital and increase as they gain confidence in a leader.",
  },
  {
    question: "Can I follow multiple leaders?",
    answer:
      "Yes, you can follow as many leaders as you want. This is actually recommended for diversification. Each subscription is independent.",
  },
  {
    question: "What currencies do I need?",
    answer:
      "You need both base and quote currencies for each market. For BTC/USDT: BTC for sell orders, USDT for buy orders. You can add funds in either currency.",
  },
  {
    question: "What are minimum allocation requirements?",
    answer:
      "Leaders can set minimum amounts you must allocate for each market. This ensures you have enough liquidity to copy their trades effectively. If a market has minimums, they are displayed on the follow page. You can skip markets entirely if you don't want to meet the minimums.",
  },
];

export default function FollowerGuidePage() {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const [activeSection, setActiveSection] = useState(sections[0].id);

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      {/* Hero Section */}
      <div className="relative pt-24 pb-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-linear-to-r from-chart-4/10 to-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <Link
            href="/copy-trading"
            className="inline-flex items-center gap-2 text-sm text-subtle-foreground hover:text-primary transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back_to_copy_trading")}
          </Link>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <Badge className="mb-4 bg-primary/10 text-primary-ink border-0">
              <BookOpen className="h-3 w-3 mr-1" />
              {t("follower_guide")}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-1 text-primary-ink leading-tight">
              {t("copy_trading_follower_guide")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("learn_how_to_find_the_best")}
            </p>
          </m.div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 pb-20">
        {/* Tab Navigation */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
        >
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`p-4 rounded-xl border transition-all text-center group ${
                activeSection === section.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                  activeSection === section.id
                    ? "bg-primary/20"
                    : section.tile
                }`}
              >
                <section.icon
                  className={`h-5 w-5 ${
                    activeSection === section.id
                      ? "text-primary"
                      : section.ink
                  }`}
                />
              </div>
              <span
                className={`text-sm font-medium ${
                  activeSection === section.id
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-primary"
                }`}
              >
                {section.title}
              </span>
            </button>
          ))}
        </m.div>

        {/* Important Notice */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Card className="border border-warning/30 bg-warning/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {t("important_risk_warning")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("copy_trading_risk_warning") + ' ' + t("invest_responsibly_disclaimer")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* Active Section Content */}
        {currentSection && (
          <m.div
            key={currentSection.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border border-border bg-card overflow-hidden">
              <CardHeader className="border-b border-border bg-muted/50 dark:bg-muted/30">
                <CardTitle className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${currentSection.tile} ${currentSection.ink}`}
                  >
                    <currentSection.icon className="h-3.5 w-3.5" />
                  </span>
                  {currentSection.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {currentSection.content.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="p-4 rounded-lg bg-surface-2 border border-border"
                    >
                      <h4 className="font-semibold text-foreground mb-2">
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        {item.description}
                      </p>

                      {item.steps && (
                        <div className="space-y-2">
                          {item.steps.map((step, stepIndex) => (
                            <div
                              key={stepIndex}
                              className="flex items-start gap-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-primary">
                                  {stepIndex + 1}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {step}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.benefits && (
                        <div className="space-y-2">
                          {item.benefits.map((benefit, benefitIndex) => (
                            <div
                              key={benefitIndex}
                              className="flex items-start gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {benefit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.tips && (
                        <div className="space-y-2">
                          {item.tips.map((tip, tipIndex) => (
                            <div
                              key={tipIndex}
                              className="flex items-start gap-2"
                            >
                              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {tip}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.metrics && (
                        <div className="space-y-2">
                          {item.metrics.map((metric, metricIndex) => (
                            <div
                              key={metricIndex}
                              className="flex items-start gap-2"
                            >
                              <BarChart3 className="h-4 w-4 text-chart-4 shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {metric}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.warnings && (
                        <div className="space-y-2">
                          {item.warnings.map((warning, warningIndex) => (
                            <div
                              key={warningIndex}
                              className="flex items-start gap-2"
                            >
                              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {warning}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.features && (
                        <div className="space-y-2">
                          {item.features.map((feature, featureIndex) => (
                            <div
                              key={featureIndex}
                              className="flex items-start gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.limits && (
                        <div className="space-y-2">
                          {item.limits.map((limit, limitIndex) => (
                            <div
                              key={limitIndex}
                              className="flex items-start gap-2"
                            >
                              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {limit}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.fees && (
                        <div className="space-y-2">
                          {item.fees.map((fee, feeIndex) => (
                            <div
                              key={feeIndex}
                              className="flex items-start gap-2"
                            >
                              <DollarSign className="h-4 w-4 text-success shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {fee}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.risks && (
                        <div className="space-y-2">
                          {item.risks.map((risk, riskIndex) => (
                            <div
                              key={riskIndex}
                              className="flex items-start gap-2"
                            >
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {risk}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.example && (
                        <div className="mt-4 p-3 rounded-lg bg-success/5 dark:bg-success/10 border border-success/20">
                          <p className="text-sm text-success">
                            {item.example}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}

        {/* FAQs */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="border border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/50 dark:bg-muted/30">
              <CardTitle className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-chart-4/15 text-chart-4">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                {tCommon("faq_question")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-surface-2 border border-border"
                  >
                    <h4 className="font-semibold text-foreground mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </m.div>

        {/* CTA */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Card className="border border-primary/30 bg-card overflow-hidden">
            <CardContent className="p-8">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mx-auto mb-4">
                <Users className="h-3.5 w-3.5" />
              </span>
              <h3 className="text-2xl font-bold mb-2 text-foreground">
                {t("ready_to_start_following")}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t("browse_our_top_performing_leaders") + ' ' + t("remember_to_start_small_and_diversify")}
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/copy-trading/leader">
                  <Button className="bg-primary text-primary-foreground">
                    {t("browse_leaders")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/copy-trading/guide/leader">
                  <Button variant="outline">{t("view_leader_guide")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </m.div>
      </div>
    </div>
  );
}
