"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  HelpCircle,
  Info,
  Shield,
  TrendingUp,
  Users,
  Wallet,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import { calculateProfit } from "@/utils/calculations";
import {
  formatCurrency,
  formatDuration,
  formatPercentage,
} from "@/utils/formatters";
import PlanDetailLoading from "./loading";
import { $fetch } from "@/lib/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForexStore } from "@/store/forex/user";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";
const faqs = [
  {
    question: "How are profits calculated and distributed?",
    answer:
      "Profits are calculated based on the plan's performance in the forex market. The stated profit percentage is applied to your investment amount and distributed according to the selected duration period. You can withdraw profits at the end of each cycle or reinvest them for compound growth.",
  },
  {
    question: "What happens if I need to withdraw before the term ends?",
    answer:
      "Early withdrawals are possible but may incur a small fee depending on how much of the investment term has elapsed. Please contact customer support for specific details regarding your investment.",
  },
  {
    question: "How is my investment secured?",
    answer:
      "Your investment is secured through multiple layers of protection, including segregated accounts, risk management protocols, and insurance coverage for certain market conditions. We employ strict security measures to protect both your capital and personal information.",
  },
  {
    question: "Can I increase my investment amount later?",
    answer:
      "Yes, you can add to your investment at any time, subject to the plan's maximum investment limit. Additional investments will follow the same terms as your original investment.",
  },
];

export default function PlanDetailClient() {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { toast } = useToast();
  const { id } = useParams();
  const router = useRouter();
  const { durations, fetchDurations } = useForexStore();
  const [plan, setPlan] = useState<
    | (forexPlanAttributes & {
        totalInvestors: number;
        invested: number;
        durations: forexDurationAttributes[];
      })
    | null
  >(null);
  const [selectedDurationId, setSelectedDurationId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [estimatedProfit, setEstimatedProfit] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();

  const fetchPlan = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/forex/plan/${id}`,
        silentSuccess: true,
      });
      if (data) {
        setPlan(data);
        setAmount(data.minAmount || 100);
        if (data.durations && data.durations.length > 0) {
          setSelectedDurationId(data.durations[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
      router.push("/forex/plan");
    }
    setIsLoading(false);
  };

  const fetchWalletBalance = async () => {
    if (plan) {
      try {
        const { data, error } = await $fetch({
          url: `/api/finance/wallet/${plan.walletType}/${plan.currency}`,
          method: "GET",
          silentSuccess: true,
        });
        if (data) {
          setWalletBalance(data.balance);
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      }
    }
  };

  useEffect(() => {
    fetchPlan();
    fetchDurations();
  }, [id, router, fetchDurations]);

  useEffect(() => {
    fetchWalletBalance();
  }, [plan]);

  useEffect(() => {
    if (plan && amount) {
      const profit = calculateProfit(amount, plan.profitPercentage || 0);
      setEstimatedProfit(profit);
    }
  }, [plan, amount]);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const scrollPosition = window.scrollY;
        setIsScrolled(scrollPosition > headerRef.current.offsetHeight);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDurationChange = (durationId: string) => {
    setSelectedDurationId(durationId);
  };

  const maxAllowed = plan
    ? Math.min(plan.maxAmount || 100000, walletBalance)
    : 100000;

  const handleAmountChange = (value: number) => {
    if (plan) {
      const min = plan.minAmount || 100;
      const clampedValue = Math.max(min, Math.min(maxAllowed, value));
      setAmount(clampedValue);
    }
  };

  const handleInvest = async () => {
    if (amount > walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You do not have enough funds in your wallet",
      });
      return;
    }

    const { data, error } = await $fetch({
      url: "/api/forex/investment",
      method: "POST",
      body: {
        planId: plan!.id,
        durationId: selectedDurationId,
        amount,
      },
    });

    if (!error) {
      setIsSuccess(true);
    }
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const resetFormForMoreInvestment = () => {
    fetchWalletBalance();
    fetchPlan();
    setIsSuccess(false);
    setCurrentStep(1);
  };

  if (!plan) {
    return <PlanDetailLoading />;
  }

  const kycEnabled =
    settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("invest_forex");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="invest_forex" />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <main className="pt-20 pb-24">
        <div className="container mx-auto px-4">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg mx-auto"
            >
              <Card
                className={`border border-emerald-600/30 dark:border-emerald-600/30 shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden`}
              >
                <div
                  className={`absolute inset-0 bg-linear-to-br from-emerald-500/30 via-teal-500/30 to-emerald-600/30`}
                />
                <CardContent className="relative p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.2,
                    }}
                    className={`w-24 h-24 rounded-full bg-linear-to-br from-emerald-600 to-teal-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25`}
                  >
                    <CheckCircle className="h-12 w-12 text-white" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                    {t("investment_successful")}
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    {t("your_investment_of")} {formatCurrency(amount)}{" "}
                    {tCommon("in")} {plan.title}{" "}
                    {t("has_been_processed_successfully")}.
                  </p>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-8">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                      className={`bg-linear-to-r from-emerald-600 to-teal-600 h-2`}
                    />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    {t("what_would_you_like_to_do_next")}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/forex/dashboard">
                      <Button
                        className={`w-full sm:w-auto rounded-xl bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-size-[200%_100%] hover:bg-position-[100%_0] text-white font-semibold transition-all duration-300`}
                      >
                        {tCommon("go_to_dashboard")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={resetFormForMoreInvestment}
                      className={`rounded-xl border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/5 dark:text-emerald-400 dark:hover:bg-emerald-600/10`}
                    >
                      {t("invest_more")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <Link href="/forex/plan">
                    <Button
                      variant="outline"
                      size="icon"
                      className={`rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-emerald-500/5 dark:hover:bg-emerald-600/10 hover:border-emerald-600/30`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                        {plan.title}
                      </h1>
                      <Badge
                        className={`bg-linear-to-r from-emerald-600 to-teal-600 text-white px-3 py-1 font-semibold`}
                      >
                        {formatPercentage(plan.profitPercentage || 0)}{" "}
                        {tCommon("profit")}
                      </Badge>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {plan.description}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Plan Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Hero Image Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card className="overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                      <div className="relative h-64 sm:h-80">
                        <Image
                          src={plan.image || "/img/placeholder.svg"}
                          alt={plan.title || "Plan Image"}
                          fill
                          className="object-cover"
                          priority
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                              <DollarSign
                                className={`h-5 w-5 text-emerald-400 mr-2`}
                              />
                              <div>
                                <p className="text-xs text-white/70">
                                  {t("investment_range")}
                                </p>
                                <p className="text-white font-semibold">
                                  {formatCurrency(plan.minAmount || 0)} -{" "}
                                  {formatCurrency(plan.maxAmount || 100000)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                              <Calendar
                                className={`h-5 w-5 text-teal-400 mr-2`}
                              />
                              <div>
                                <p className="text-xs text-white/70">
                                  Duration
                                </p>
                                <p className="text-white font-semibold">
                                  {plan.durations && plan.durations.length > 0
                                    ? `${plan.durations[0].duration} - ${plan.durations[plan.durations.length - 1].duration} ${plan.durations[0].timeframe.toLowerCase()}s`
                                    : "Flexible"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                              <Users
                                className={`h-5 w-5 text-emerald-400 mr-2`}
                              />
                              <div>
                                <p className="text-xs text-white/70">
                                  Investors
                                </p>
                                <p className="text-white font-semibold">
                                  {plan.totalInvestors}{" "}
                                  {tCommon("active_investors")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Plan Highlights */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="flex items-center text-zinc-900 dark:text-white">
                          <div
                            className={`w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center mr-3`}
                          >
                            <BarChart3
                              className={`h-5 w-5 text-emerald-600`}
                            />
                          </div>
                          {t("plan_highlights")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div
                              className={`bg-emerald-500/10 dark:bg-emerald-600/10 rounded-xl p-4 border border-emerald-500/20 dark:border-emerald-600/20`}
                            >
                              <h3
                                className={`text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1`}
                              >
                                {t("profit_range")}
                              </h3>
                              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                {formatPercentage(plan.minProfit || 0)} -{" "}
                                {formatPercentage(plan.maxProfit || 0)}
                              </p>
                            </div>
                            <div
                              className={`bg-teal-500/10 dark:bg-teal-500/10 rounded-xl p-4 border border-teal-500/20 dark:border-teal-500/20`}
                            >
                              <h3
                                className={`text-sm font-medium text-teal-600 dark:text-teal-400 mb-1`}
                              >
                                {t("investment_range")}
                              </h3>
                              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                                {formatCurrency(plan.minAmount || 0)} -{" "}
                                {formatCurrency(plan.maxAmount || 100000)}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700">
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {tCommon("currency")}
                              </h3>
                              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                                {plan.currency}
                              </p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700">
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {tCommon("total_invested")}
                              </h3>
                              <p className="text-xl font-bold text-zinc-900 dark:text-white">
                                {formatCurrency(plan.invested)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Security & Features */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="flex items-center text-zinc-900 dark:text-white">
                          <div
                            className={`w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mr-3`}
                          >
                            <Shield
                              className={`h-5 w-5 text-teal-500`}
                            />
                          </div>
                          {t("plan_security_features")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-2 gap-6">
                          {[
                            {
                              icon: CheckCircle,
                              color: "primary",
                              title: t("secure_investment"),
                              desc: t("your_funds_are_security_measures"),
                            },
                            {
                              icon: Zap,
                              color: "secondary",
                              title: t("transparent_fees"),
                              desc: t(
                                "no_hidden_charges_all_fees_are_clearly_displayed"
                              ),
                            },
                            {
                              icon: Target,
                              color: "primary",
                              title: t("expert_management"),
                              desc: t(
                                "managed_by_professional_forex_traders"
                              ),
                            },
                            {
                              icon: Clock,
                              color: "secondary",
                              title: tExt("n_24_7_support"),
                              desc: t("get_help_whenever_you_need_it"),
                            },
                          ].map((item, i) => (
                            <div key={i} className="flex items-start">
                              <div
                                className={`shrink-0 w-12 h-12 rounded-xl ${item.color === "primary" ? `bg-emerald-600/10` : `bg-teal-500/10`} flex items-center justify-center mr-4`}
                              >
                                <item.icon
                                  className={`h-6 w-6 ${item.color === "primary" ? `text-emerald-600` : `text-teal-500`}`}
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                                  {item.title}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* FAQs */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="flex items-center text-zinc-900 dark:text-white">
                          <div
                            className={`w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center mr-3`}
                          >
                            <HelpCircle
                              className={`h-5 w-5 text-emerald-600`}
                            />
                          </div>
                          {tCommon("faq_question")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                            <AccordionItem
                              key={index}
                              value={`item-${index}`}
                              className="border-zinc-200 dark:border-zinc-700"
                            >
                              <AccordionTrigger
                                className={`text-left text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400`}
                              >
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-zinc-600 dark:text-zinc-400">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Right Column - Investment Form */}
                <div className="lg:col-span-1">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card className="sticky top-24 border border-zinc-200/50 dark:border-zinc-700/50 shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden">
                      {/* Header */}
                      <div
                        className={`bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 p-6`}
                      >
                        <CardTitle className="text-xl text-white mb-1">
                          {t("create_your_investment")}
                        </CardTitle>
                        <CardDescription className="text-white/80">
                          {currentStep === 1
                            ? "Step 1: Choose your duration"
                            : currentStep === 2
                              ? "Step 2: Set your investment amount"
                              : "Step 3: Review and confirm"}
                        </CardDescription>
                      </div>

                      {/* Progress Steps */}
                      <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between">
                          {[
                            { step: 1, label: tCommon("duration") },
                            { step: 2, label: tCommon("amount") },
                            { step: 3, label: tCommon("confirm") },
                          ].map((item, i) => (
                            <div key={item.step} className="flex items-center">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                    currentStep >= item.step
                                      ? `bg-linear-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25`
                                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {item.step}
                                </div>
                                <span
                                  className={`text-xs font-medium mt-1 ${
                                    currentStep >= item.step
                                      ? `text-emerald-600 dark:text-emerald-400`
                                      : "text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>
                              {i < 2 && (
                                <div
                                  className={`w-8 h-0.5 mx-2 transition-colors ${
                                    currentStep > item.step
                                      ? `bg-emerald-600`
                                      : "bg-zinc-200 dark:bg-zinc-700"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <CardContent className="p-6 max-h-96 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {currentStep === 1 && (
                            <motion.div
                              key="step1"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-6"
                            >
                              <div>
                                <Label className="text-base font-semibold mb-3 block text-zinc-900 dark:text-white">
                                  {t("select_investment_duration")}
                                </Label>
                                <RadioGroup
                                  value={selectedDurationId}
                                  onValueChange={handleDurationChange}
                                  className="grid grid-cols-2 gap-3"
                                >
                                  {durations.map((duration) => (
                                    <div
                                      key={duration.id}
                                      className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                                        selectedDurationId === duration.id
                                          ? `border-emerald-600 bg-emerald-500/10 dark:bg-emerald-600/10`
                                          : `border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/30 dark:hover:border-emerald-600/50 hover:bg-zinc-50 dark:hover:bg-zinc-800`
                                      }`}
                                      onClick={() =>
                                        handleDurationChange(duration.id)
                                      }
                                    >
                                      <RadioGroupItem
                                        value={duration.id}
                                        id={duration.id}
                                        className="sr-only"
                                      />
                                      <Label
                                        htmlFor={duration.id}
                                        className="flex items-center cursor-pointer w-full"
                                      >
                                        <Clock
                                          className={`h-4 w-4 mr-2 ${
                                            selectedDurationId === duration.id
                                              ? `text-emerald-600`
                                              : "text-zinc-400"
                                          }`}
                                        />
                                        <span
                                          className={`font-medium ${
                                            selectedDurationId === duration.id
                                              ? `text-emerald-700 dark:text-emerald-400`
                                              : "text-zinc-700 dark:text-zinc-300"
                                          }`}
                                        >
                                          {formatDuration(
                                            duration.duration,
                                            duration.timeframe
                                          )}
                                        </span>
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                              <div
                                className={`bg-emerald-500/10 dark:bg-emerald-600/10 p-4 rounded-xl border border-emerald-500/20 dark:border-emerald-600/20`}
                              >
                                <h3
                                  className={`font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center`}
                                >
                                  <Info className="h-4 w-4 mr-2" />
                                  {t("duration_information")}
                                </h3>
                                <p
                                  className={`text-sm text-emerald-700 dark:text-emerald-400`}
                                >
                                  {t("the_investment_duration_be_invested")}.{" "}
                                  {t(
                                    "longer_durations_often_longer_commitment"
                                  )}
                                  .
                                </p>
                              </div>
                            </motion.div>
                          )}

                          {currentStep === 2 && (
                            <motion.div
                              key="step2"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-6"
                            >
                              <div>
                                <Input
                                  type="number"
                                  value={amount}
                                  onChange={(e) =>
                                    handleAmountChange(
                                      Number.parseFloat(e.target.value)
                                    )
                                  }
                                  min={plan.minAmount || 100}
                                  max={maxAllowed}
                                  title={tCommon("investment_amount")}
                                  className="rounded-xl"
                                />
                                <div className="flex items-center justify-between mt-2 text-sm">
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {tExt("your_wallet_balance")}
                                  </span>
                                  <span
                                    className={`font-semibold text-emerald-600 dark:text-emerald-400`}
                                  >
                                    {formatCurrency(walletBalance)}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-3">
                                  <Label className="text-zinc-600 dark:text-zinc-400">
                                    {t("adjust_amount")}
                                  </Label>
                                  <span
                                    className={`font-bold text-emerald-600 dark:text-emerald-400`}
                                  >
                                    {formatCurrency(amount)}
                                  </span>
                                </div>
                                <Slider
                                  value={[amount]}
                                  min={plan.minAmount || 100}
                                  max={maxAllowed}
                                  step={100}
                                  onValueChange={(values) =>
                                    handleAmountChange(values[0])
                                  }
                                  className={`**:[[role=slider]]:bg-emerald-600`}
                                />
                                <div className="flex justify-between text-xs text-zinc-500 mt-2">
                                  <span>
                                    {formatCurrency(plan.minAmount || 100)}
                                  </span>
                                  <span>{formatCurrency(maxAllowed)}</span>
                                </div>
                              </div>
                              <div
                                className={`bg-teal-500/10 dark:bg-teal-500/10 p-4 rounded-xl border border-teal-500/20 dark:border-teal-500/20`}
                              >
                                <h3
                                  className={`font-semibold text-teal-600 dark:text-teal-400 mb-3 flex items-center`}
                                >
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  {t("profit_estimate")}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p
                                      className={`text-xs text-teal-600 dark:text-teal-400 mb-1`}
                                    >
                                      {t("monthly_profit")}
                                    </p>
                                    <p
                                      className={`text-xl font-bold text-teal-600 dark:text-teal-400`}
                                    >
                                      {formatCurrency(estimatedProfit / 12)}
                                    </p>
                                  </div>
                                  <div>
                                    <p
                                      className={`text-xs text-teal-600 dark:text-teal-400 mb-1`}
                                    >
                                      {t("annual_profit")}
                                    </p>
                                    <p
                                      className={`text-xl font-bold text-teal-600 dark:text-teal-400`}
                                    >
                                      {formatCurrency(estimatedProfit)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {currentStep === 3 && (
                            <motion.div
                              key="step3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-6"
                            >
                              <div className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center">
                                  <Info
                                    className={`h-4 w-4 mr-2 text-emerald-600`}
                                  />
                                  {t("investment_summary")}
                                </h3>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {tCommon("plan")}
                                    </span>
                                    <span className="font-medium text-zinc-900 dark:text-white">
                                      {plan.title}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {tCommon("duration")}
                                    </span>
                                    <span className="font-medium text-zinc-900 dark:text-white">
                                      {selectedDurationId && durations.length > 0
                                        ? formatDuration(
                                            durations.find(
                                              (d) => d.id === selectedDurationId
                                            )?.duration || 0,
                                            durations.find(
                                              (d) => d.id === selectedDurationId
                                            )?.timeframe || "DAY"
                                          )
                                        : "Select a duration"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {tCommon("amount")}
                                    </span>
                                    <span className="font-medium text-zinc-900 dark:text-white">
                                      {formatCurrency(amount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {t("profit_rate")}
                                    </span>
                                    <span className="font-medium text-zinc-900 dark:text-white">
                                      {formatPercentage(
                                        plan.profitPercentage || 0
                                      )}
                                    </span>
                                  </div>
                                  <Separator className="my-3" />
                                  <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 dark:text-zinc-400">
                                      {tCommon("estimated_profit")}
                                    </span>
                                    <span
                                      className={`font-bold text-emerald-600 dark:text-emerald-400`}
                                    >
                                      {formatCurrency(estimatedProfit)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium text-zinc-900 dark:text-white">
                                      {tCommon("total_return")}
                                    </span>
                                    <span
                                      className={`font-bold text-lg text-emerald-600 dark:text-emerald-400`}
                                    >
                                      {formatCurrency(amount + estimatedProfit)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                                <div className="flex items-start">
                                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 shrink-0" />
                                  <div>
                                    <h4 className="font-semibold text-amber-800 dark:text-amber-300">
                                      {tCommon("important_notice")}
                                    </h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                      {t("by_proceeding_with_and_conditions")}.{" "}
                                      {t("all_investments_carry_risk")}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>

                      <CardFooter className="flex justify-between bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700">
                        {currentStep > 1 && (
                          <Button
                            variant="outline"
                            onClick={prevStep}
                            className="rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {tCommon("back")}
                          </Button>
                        )}
                        {currentStep < 3 ? (
                          <Button
                            onClick={nextStep}
                            disabled={
                              (currentStep === 1 && !selectedDurationId) ||
                              (currentStep === 2 && amount <= 0)
                            }
                            className={`ml-auto rounded-xl bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-size-[200%_100%] hover:bg-position-[100%_0] text-white font-semibold transition-all duration-300`}
                          >
                            {tCommon("next")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={handleInvest}
                            disabled={
                              isLoading ||
                              !selectedDurationId ||
                              amount <= 0 ||
                              amount > walletBalance
                            }
                            className={`ml-auto rounded-xl bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-size-[200%_100%] hover:bg-position-[100%_0] text-white font-semibold transition-all duration-300`}
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                {tCommon("processing")}.
                              </>
                            ) : (
                              <>
                                {t("confirm_investment")}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
