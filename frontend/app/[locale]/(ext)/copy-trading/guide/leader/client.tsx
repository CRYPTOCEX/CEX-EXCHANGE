"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Crown,
  Target,
  Users,
  TrendingUp,
  Settings,
  Coins,
  Shield,
  BarChart3,
  Gift,
  Zap,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  AlertTriangle,
  DollarSign,
  Clock,
  ChevronLeft,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

const sections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Crown,
    color: "amber",
    content: [
      {
        title: "Becoming a Leader",
        description:
          "To become a copy trading leader, you need to apply through the platform. Your application will be reviewed by our team to ensure quality traders on the platform.",
        steps: [
          "Navigate to Copy Trading > Become a Leader",
          "Fill out the application form with your trading experience",
          "Set your initial profit share percentage and minimum follow amount",
          "Wait for approval from the platform administrators",
        ],
      },
      {
        title: "Setting Up Your Profile",
        description:
          "A complete profile helps attract more followers. Make sure to fill out all details.",
        steps: [
          "Add a professional bio describing your trading strategy",
          "Set your risk level (Low, Medium, High) honestly",
          "Choose your trading style (Day Trading, Swing, Position, etc.)",
          "Enable your profile to be publicly visible",
        ],
      },
    ],
  },
  {
    id: "markets",
    title: "Managing Markets",
    icon: Coins,
    color: "blue",
    content: [
      {
        title: "Declaring Trading Markets",
        description:
          "You must declare which markets you plan to trade. Followers will allocate funds specifically to these markets.",
        steps: [
          "Go to Dashboard > Markets tab",
          "Toggle on the markets you want to trade",
          "Set minimum allocation amounts per market (optional)",
          "Followers can only copy your trades on enabled markets",
          "Disabling a market will automatically refund follower allocations",
        ],
      },
      {
        title: "Setting Minimum Allocations",
        description:
          "You can set minimum allocation requirements for each market to ensure followers have enough liquidity.",
        steps: [
          "Enable a market in your dashboard",
          "Click the Edit button on the market card",
          "Set minimum base currency (for SELL orders)",
          "Set minimum quote currency (for BUY orders)",
          "Followers must meet these minimums to copy your trades",
        ],
      },
      {
        title: "Market Best Practices",
        description: "Choose markets wisely to maximize your success.",
        tips: [
          "Start with markets you're most experienced in",
          "Don't enable too many markets initially",
          "Set reasonable minimums to attract more followers",
          "Consider liquidity when choosing markets",
          "Monitor each market's performance separately",
        ],
      },
    ],
  },
  {
    id: "trading",
    title: "Trading & Execution",
    icon: TrendingUp,
    color: "emerald",
    content: [
      {
        title: "How Copy Trading Works",
        description:
          "When you execute a trade, the system automatically copies it for all your followers proportionally.",
        steps: [
          "You place a trade on any of your declared markets",
          "The system detects your trade and notifies followers",
          "Each follower's trade is sized based on their allocation",
          "Trades are executed at market price for followers",
        ],
      },
      {
        title: "Trade Sizing",
        description:
          "Follower trade sizes are calculated proportionally based on allocations.",
        tips: [
          "If you trade 10% of your balance, followers trade 10% of their allocation",
          "Minimum trade amounts are enforced to avoid dust trades",
          "Maximum trade amounts can be set by followers",
          "Consider your followers when sizing positions",
        ],
      },
    ],
  },
  {
    id: "earnings",
    title: "Earnings & Fees",
    icon: DollarSign,
    color: "indigo",
    content: [
      {
        title: "Profit Sharing",
        description:
          "You earn a percentage of your followers' profits. This is your main income as a leader.",
        steps: [
          "Set your profit share percentage (e.g., 20%)",
          "When followers profit, you receive your share automatically",
          "Earnings are calculated when trades are closed",
          "Platform takes a small fee from profit shares",
        ],
      },
      {
        title: "Maximizing Earnings",
        description: "Tips to increase your copy trading income.",
        tips: [
          "Consistent profits attract more followers",
          "Lower profit share can attract more followers initially",
          "Build a track record before raising fees",
          "Quality over quantity - profitable trades matter most",
        ],
      },
    ],
  },
  {
    id: "risk",
    title: "Risk Management",
    icon: Shield,
    color: "red",
    content: [
      {
        title: "Protecting Your Followers",
        description:
          "As a leader, you're responsible for managing risk appropriately.",
        tips: [
          "Never risk more than you can afford to lose",
          "Use stop losses on all trades",
          "Don't over-leverage positions",
          "Communicate clearly about your risk approach",
        ],
      },
      {
        title: "Platform Safeguards",
        description: "The platform has automatic protections in place.",
        features: [
          "Daily loss limits can pause copy trading",
          "Maximum drawdown protections",
          "Followers can set their own risk limits",
          "Real-time monitoring of all positions",
        ],
      },
    ],
  },
  {
    id: "analytics",
    title: "Performance Analytics",
    icon: BarChart3,
    color: "purple",
    content: [
      {
        title: "Tracking Your Performance",
        description:
          "Monitor your trading metrics to improve and attract more followers.",
        metrics: [
          "ROI (Return on Investment) - Overall performance",
          "Win Rate - Percentage of profitable trades",
          "Total Profit - Absolute profit generated",
          "Follower Growth - How your following is growing",
        ],
      },
      {
        title: "Performance Tips",
        description: "How to improve your metrics over time.",
        tips: [
          "Focus on consistent, smaller wins over big risky trades",
          "Review losing trades to identify patterns",
          "Track performance per market to find your strengths",
          "Set realistic targets and stick to your strategy",
        ],
      },
    ],
  },
];

const faqs = [
  {
    question: "How long does approval take?",
    answer:
      "Leader applications are typically reviewed within 24-48 hours. You'll receive a notification once approved.",
  },
  {
    question: "Can I change my profit share percentage?",
    answer:
      "Yes, you can adjust your profit share in the Settings tab. Changes apply to new followers only.",
  },
  {
    question: "What happens if I have a losing streak?",
    answer:
      "Followers can choose to stop following at any time. Focus on risk management and transparent communication.",
  },
  {
    question: "Can followers copy only specific markets?",
    answer:
      "Yes, followers allocate funds per market. They choose which of your declared markets to follow.",
  },
  {
    question: "How are my earnings paid out?",
    answer:
      "Earnings are credited to your wallet automatically when profitable trades are closed.",
  },
  {
    question: "What are minimum allocations per market?",
    answer:
      "You can set minimum base and quote currency amounts for each market. Followers must allocate at least these amounts to copy your trades on that market. This ensures followers have enough liquidity for your trading strategy.",
  },
];

export default function LeaderGuidePage() {
  const t = useTranslations("ext_copy-trading");
  const tCommon = useTranslations("common");
  const [activeSection, setActiveSection] = useState(sections[0].id);

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <div className="relative pt-24 pb-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-linear-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-linear-to-r from-indigo-500/10 to-violet-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <Link
            href="/copy-trading/dashboard"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-500 transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            {tCommon("back_to_dashboard")}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <Badge className="mb-4 bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
              <BookOpen className="h-3 w-3 mr-1" />
              {t("leader_guide")}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 pb-1 bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent leading-tight">
              {t("copy_trading_leader_guide")}
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t("everything_you_need_to_know_about")}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 pb-20">
        {/* Tab Navigation */}
        <motion.div
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
                  ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-500/50 hover:bg-amber-500/5"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                  activeSection === section.id
                    ? "bg-amber-500/20"
                    : `bg-${section.color}-100 dark:bg-${section.color}-500/20`
                }`}
              >
                <section.icon
                  className={`h-5 w-5 ${
                    activeSection === section.id
                      ? "text-amber-600 dark:text-amber-400"
                      : `text-${section.color}-600 dark:text-${section.color}-400`
                  }`}
                />
              </div>
              <span
                className={`text-sm font-medium ${
                  activeSection === section.id
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-zinc-700 dark:text-zinc-300 group-hover:text-amber-600"
                }`}
              >
                {section.title}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Active Section Content */}
        {currentSection && (
          <motion.div
            key={currentSection.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <CardTitle className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl bg-${currentSection.color}-100 dark:bg-${currentSection.color}-500/20`}
                  >
                    <currentSection.icon
                      className={`h-5 w-5 text-${currentSection.color}-600 dark:text-${currentSection.color}-400`}
                    />
                  </div>
                  {currentSection.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {currentSection.content.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
                    >
                      <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">
                        {item.title}
                      </h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                        {item.description}
                      </p>

                      {item.steps && (
                        <div className="space-y-2">
                          {item.steps.map((step, stepIndex) => (
                            <div
                              key={stepIndex}
                              className="flex items-start gap-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-amber-600">
                                  {stepIndex + 1}
                                </span>
                              </div>
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {step}
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
                              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
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
                              <BarChart3 className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {metric}
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
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-500/20">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {tCommon("faq_question")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50"
                  >
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Card className="border-2 border-amber-500/30 bg-linear-to-br from-amber-500/5 via-orange-500/5 to-transparent overflow-hidden">
            <CardContent className="p-8">
              <Crown className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">
                {t("ready_to_start_leading")}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                {t("apply_now_to_become_a_copy")}
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/copy-trading/dashboard">
                  <Button className="bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                    {tCommon("go_to_dashboard")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/copy-trading/guide/follower">
                  <Button variant="outline">{t("view_follower_guide")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
