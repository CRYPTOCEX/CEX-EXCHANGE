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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "@/i18n/routing";
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
  const t = useTranslations("ext");
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

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("invest_forex");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="invest_forex" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="max-w-md mx-auto p-8 text-center border-green-200 dark:border-green-700 shadow-lg">
                <div className="flex flex-col items-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.2,
                    }}
                    className="rounded-full bg-green-100 dark:bg-green-900 p-4"
                  >
                    <CheckCircle className="h-16 w-16 text-green-600" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {t("investment_successful")}
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    {t("your_investment_of")}
                    {formatCurrency(amount)}
                    {t("in")}
                    {plan.title} {t("has_been_processed_successfully")}.
                  </p>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-700 h-2 rounded-full mt-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                      className="bg-green-500 h-2 rounded-full"
                    ></motion.div>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("what_would_you_like_to_do_next")}
                  </p>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Button onClick={() => router.push("/forex/dashboard")}>
                      {t("go_to_dashboard")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetFormForMoreInvestment}
                    >
                      {t("invest_more")}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 pb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-wrap items-center justify-start gap-4 mb-6">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => router.push("/forex/plan")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <div className="flex items-center">
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          {plan.title}
                        </h1>
                        <Badge
                          variant="outline"
                          className="ml-3 px-3 py-1 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                        >
                          {formatPercentage(plan.profitPercentage || 0)}
                          {t("Profit")}
                        </Badge>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-1">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  <Card className="overflow-hidden mb-8 shadow-md border-0 bg-white dark:bg-zinc-800">
                    <div className="relative h-64 sm:h-80">
                      <Image
                        src={plan.image || "/img/placeholder.svg"}
                        alt={plan.title || "Plan Image"}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        <div className="p-6 text-white">
                          <div className="flex items-center space-x-2 mb-2">
                            <DollarSign className="h-5 w-5 mr-1" />
                            <span className="font-medium">
                              {formatCurrency(plan.minAmount || 0)} -{" "}
                              {formatCurrency(plan.maxAmount || 100000)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <Wallet className="h-4 w-4 mr-1" />
                              <span className="text-sm">{plan.walletType}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span className="text-sm">
                                {plan.durations && plan.durations.length > 0
                                  ? `${plan.durations[0].duration} - ${plan.durations[plan.durations.length - 1].duration} ${plan.durations[0].timeframe.toLowerCase()}s`
                                  : "Flexible duration"}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              <span className="text-sm">
                                {plan.totalInvestors} {t("active_investors")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-6">
                    <Card className="bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                          {t("plan_highlights")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {t("profit_range")}
                              </h3>
                              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatPercentage(plan.minProfit || 0)} -{" "}
                                {formatPercentage(plan.maxProfit || 0)}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {t("investment_range")}
                              </h3>
                              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatCurrency(plan.minAmount || 0)} -{" "}
                                {formatCurrency(plan.maxAmount || 100000)}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {t("Currency")}
                              </h3>
                              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                {plan.currency}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {t("wallet_type")}
                              </h3>
                              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                {plan.walletType}
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                                {t("total_invested")}
                              </h3>
                              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                {formatCurrency(plan.invested)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Shield className="h-5 w-5 mr-2 text-blue-600" />
                          {t("plan_security_&_features")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {t("secure_investment")}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  {t("your_funds_are_security_measures")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {t("transparent_fees")}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  {t(
                                    "No hidden charges, all fees are clearly displayed"
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                                <CheckCircle className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {t("expert_management")}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  {t("managed_by_professional_forex_traders")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mr-3">
                                <CheckCircle className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                                  {t("24_7_support")}
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                  {t("get_help_whenever_you_need_it")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-zinc-900">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                          {t("frequently_asked_questions")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                              <AccordionTrigger className="text-left dark:text-zinc-100">
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="dark:text-zinc-300">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </div>

              <div id="investment-form" className="lg:col-span-1">
                <Card className="sticky top-22 shadow-lg bg-white dark:bg-zinc-950/40 rounded-lg">
                  <div className="bg-zinc-100 dark:bg-zinc-900 rounded-t-lg px-6 py-4">
                    <CardTitle className="text-xl">
                      {t("create_your_investment")}
                    </CardTitle>
                    <CardDescription>
                      {currentStep === 1
                        ? "Step 1: Choose your duration"
                        : currentStep === 2
                          ? "Step 2: Set your investment amount"
                          : "Step 3: Review and confirm"}
                    </CardDescription>
                  </div>
                  <div className="px-6 pt-6 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`flex flex-col items-center ${
                          currentStep >= 1
                            ? "text-blue-600 dark:text-blue-300"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                            currentStep >= 1
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          1:
                        </div>
                        <span className="text-sm font-medium">
                          {t("Duration")}
                        </span>
                      </div>
                      <div className="w-12 h-0.5 bg-zinc-200 dark:bg-zinc-700"></div>
                      <div
                        className={`flex flex-col items-center ${
                          currentStep >= 2
                            ? "text-blue-600 dark:text-blue-300"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                            currentStep >= 2
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          2
                        </div>
                        <span className="text-sm font-medium">
                          {t("Amount")}
                        </span>
                      </div>
                      <div className="w-12 h-0.5 bg-zinc-200 dark:bg-zinc-700"></div>
                      <div
                        className={`flex flex-col items-center ${
                          currentStep >= 3
                            ? "text-blue-600 dark:text-blue-300"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                            currentStep >= 3
                              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                          }`}
                        >
                          3
                        </div>
                        <span className="text-sm font-medium">
                          {t("Confirm")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="px-6 max-h-[50vh] overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {currentStep === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="space-y-6">
                            <div>
                              <Label className="text-base font-medium mb-2 block text-zinc-900 dark:text-zinc-100">
                                {t("select_investment_duration")}
                              </Label>
                              <RadioGroup
                                value={selectedDurationId}
                                onValueChange={handleDurationChange}
                                className="grid grid-cols-2 gap-4 mt-2"
                              >
                                {durations.map((duration) => (
                                  <div
                                    key={duration.id}
                                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                      selectedDurationId === duration.id
                                        ? "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300"
                                        : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-800"
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
                                      className="flex items-center cursor-pointer w-full h-full"
                                    >
                                      <Clock className="h-4 w-4 mr-2" />
                                      <span className="font-medium">
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
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center">
                                <Info className="h-4 w-4 mr-2" />
                                {t("duration_information")}
                              </h3>
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                {t("the_investment_duration_be_invested")}.{" "}
                                {t("longer_durations_often_longer_commitment")}.
                              </p>
                            </div>
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
                        >
                          <div className="space-y-6">
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
                                title="Investment Amount"
                                hasShadow={false}
                              />
                              <div className="mt-2">
                                <Label className="text-xs text-zinc-600 dark:text-zinc-300">
                                  {t("your_wallet_balance")}{" "}
                                  {formatCurrency(walletBalance)}
                                </Label>
                              </div>
                              <div className="mt-4">
                                <div className="flex justify-between text-sm mb-2">
                                  <Label className="text-zinc-600 dark:text-zinc-300">
                                    {t("adjust_amount")}
                                  </Label>
                                  <span className="font-medium text-blue-600 dark:text-blue-300">
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
                                  className="mt-2"
                                />
                                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                  <span>
                                    {formatCurrency(plan.minAmount || 100)}
                                  </span>
                                  <span>{formatCurrency(maxAllowed)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                              <h3 className="font-medium text-green-900 dark:text-green-300 mb-2 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                {t("profit_estimate")}
                              </h3>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                                    {t("monthly_profit")}
                                  </p>
                                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                                    {formatCurrency(estimatedProfit / 12)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                                    {t("annual_profit")}
                                  </p>
                                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                                    {formatCurrency(estimatedProfit)}
                                  </p>
                                </div>
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
                        >
                          <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-3 flex items-center">
                                <Info className="h-4 w-4 mr-2" />
                                {t("investment_summary")}
                              </h3>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-600 dark:text-zinc-300">
                                    {t("plan")}
                                  </span>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {plan.title}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-600 dark:text-zinc-300">
                                    {t("duration")}
                                  </span>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
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
                                  <span className="text-zinc-600 dark:text-zinc-300">
                                    {t("amount")}
                                  </span>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatCurrency(amount)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-zinc-600 dark:text-zinc-300">
                                    {t("profit_rate")}
                                  </span>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatPercentage(
                                      plan.profitPercentage || 0
                                    )}
                                  </span>
                                </div>
                                <Separator className="my-2 bg-blue-200 dark:bg-blue-700/20" />
                                <div className="flex justify-between text-sm font-medium text-blue-900 dark:text-blue-100">
                                  <span>{t("estimated_profit")}</span>
                                  <span className="text-green-600 dark:text-green-300">
                                    {formatCurrency(estimatedProfit)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-blue-900 dark:text-blue-100">
                                  <span className="font-medium">
                                    {t("total_return")}
                                  </span>
                                  <span className="font-bold">
                                    {formatCurrency(amount + estimatedProfit)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                              <div className="flex items-start">
                                <AlertCircle className="h-5 w-12 text-yellow-600 dark:text-yellow-300 mr-2 mt-0.5" />
                                <div>
                                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                                    {t("important_notice")}
                                  </h4>
                                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                    {t("by_proceeding_with_and_conditions")}.{" "}
                                    {t("all_investments_carry_risk")}.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                  <CardFooter className="flex justify-between bg-zinc-100 dark:bg-zinc-900 px-6 py-3 rounded-b-lg">
                    {currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={prevStep}
                        className="group"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        {t("Back")}
                      </Button>
                    )}
                    {currentStep < 3 ? (
                      <Button
                        className="transition-colors group ml-auto"
                        onClick={nextStep}
                        disabled={
                          (currentStep === 1 && !selectedDurationId) ||
                          (currentStep === 2 && amount <= 0)
                        }
                      >
                        {t("Next")}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <Button
                        className="transition-colors group ml-auto"
                        onClick={handleInvest}
                        disabled={
                          isLoading ||
                          !selectedDurationId ||
                          amount <= 0 ||
                          amount > walletBalance
                        }
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t("Processing")}.
                          </>
                        ) : (
                          <>
                            {t("confirm_investment")}
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
