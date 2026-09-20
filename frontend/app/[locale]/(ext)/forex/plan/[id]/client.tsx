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
import { m, AnimatePresence } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import { calculateProfit } from "@/utils/calculations";
import {
  formatCurrency,
  formatDuration,
  formatPercentage,
} from "@/utils/formatters";
import { $fetch } from "@/lib/api";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useForexStore } from "@/store/forex/user";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";
import { FixedReturnDisclosure } from "@/components/blocks/investment/fixed-return-disclosure";
/*
 * THE FAQ THIS REPLACES WAS THREE-QUARTERS FALSE, AND HARDCODED IN ENGLISH.
 *
 * It told the investor, on the page where they commit money:
 *
 *   · "Profits are calculated based on the plan's performance in the forex
 *     market."  There is no forex market in this path. `profitPercentage` is a
 *     number the operator typed and the settlement cron pays it on a schedule
 *     regardless of any market.
 *   · "Your investment is secured through multiple layers of protection,
 *     including segregated accounts, risk management protocols, and insurance
 *     coverage."  There are no segregated accounts and no insurance anywhere
 *     in this codebase. The funds sit in the operator's wallet.
 *   · "Early withdrawals ... may incur a small fee."  There is no user-facing
 *     early-withdrawal route for a forex investment at all —
 *     `(ext)/forex/investment/[id]/` holds only reads. An operator has to act
 *     on it, and there is no fee mechanism to incur.
 *
 * The replacements below say what the code does. They are also translated
 * rather than hardcoded: the originals rendered in English on all 90 locales,
 * which meant the one part of this page a non-English reader most needed to
 * understand was the part they could not.
 *
 * Built inside the component because it needs `t`.
 */

export default function PlanDetailClient() {
  const t = useTranslations("ext_forex");
  const faqs = [
    { question: t("faq_profits_q"), answer: t("faq_profits_a") },
    { question: t("faq_early_exit_q"), answer: t("faq_early_exit_a") },
    { question: t("faq_security_q"), answer: t("faq_security_a") },
    { question: t("faq_top_up_q"), answer: t("faq_top_up_a") },
  ];
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const { id } = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<
    | (forexPlanAttributes & {
        totalInvestors: number;
        invested: number;
        durations: forexDurationAttributes[];
      })
    | null
  >(null);
  // Deliberately NOT the store's global `durations`: that list is every
  // duration configured on the platform, and offering it here let a user pair
  // a 30-day plan with a 1-hour term and collect the plan's full percentage in
  // an hour. Only the terms this plan actually offers may be chosen.
  const planDurations = plan?.durations ?? [];
  const [selectedDurationId, setSelectedDurationId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [estimatedProfit, setEstimatedProfit] = useState<number>(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  /*
    `walletBalance` initialises to 0 and its fetch is a SECOND request, fired by
    an effect keyed on `plan` — so it lands after the plan does. With the old
    full-page swap that was invisible; without one, the amount step would print
    a confident "$0.00" as the user's forex balance, which is a claim about
    their money and is wrong for anyone who has any. This flag is what keeps it
    pending until the account request has actually answered.
  */
  const [isBalanceLoading, setIsBalanceLoading] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const gate = useKycGate("invest_forex");

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

  /**
   * The investable balance is the user's LIVE FOREX ACCOUNT, not their wallet.
   *
   * Investing debits `forex_account.balance`; the main wallet is not touched.
   * Reading the wallet here meant a user who had done exactly what the product
   * asks — moved 5,000 from their spot wallet into their forex account — saw a
   * balance of 0, an amount slider clamped to the plan minimum, and a disabled
   * Invest button telling them they had insufficient funds.
   */
  const fetchInvestableBalance = async () => {
    try {
      const { data, error } = await $fetch({
        url: "/api/forex/account",
        method: "GET",
        silentSuccess: true,
      });
      if (error) {
        setWalletBalance(0);
        return;
      }
      const accounts = Array.isArray(data) ? data : Object.values(data ?? {});
      const live = (accounts as any[]).find((a) => a?.type === "LIVE");
      setWalletBalance(Number(live?.balance ?? 0));
    } catch (error) {
      console.error("Error fetching forex account balance:", error);
    } finally {
      /* In `finally`, not on the success path: an error still RESOLVES the
         question (the answer is 0), and leaving the flag set would pulse the
         balance forever for anyone whose request failed. */
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [id, router]);

  useEffect(() => {
    fetchInvestableBalance();
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
        title: tCommon("insufficient_balance"),
        description:
          t("investments_are_funded_from_your_forex"),
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
        acceptTerms: true, // User accepts by clicking confirm on step 3
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
    fetchInvestableBalance();
    fetchPlan();
    setIsSuccess(false);
    setCurrentStep(1);
  };

  /*
    THREE FULL-PAGE SWAPS REMOVED, TWO OF WHICH WERE NOT ABOUT THIS PAGE'S DATA
    ===========================================================================

    1. `if (!plan) return <PlanDetailLoading/>`. A separate 200-line tree that
       has to be kept in step with this 1000-line one by hand, and it is not:
       `loading.tsx` renders a two-column grid with a 384px hero, four `h-24`
       highlight blocks and a right rail of five bars — the real page has a
       `h-64 sm:h-80` hero with THREE floating stat chips on it, four highlight
       tiles of a different height, a security card, an FAQ accordion and a
       sticky invest card with a 3-step header. Nothing about the two layouts
       agrees except that both are two columns.

    2. `if (gate.state === "loading" ...)` — the KYC hook. This is the one that
       matters most, because it is not about the plan at all: `gate.state` is
       "loading" whenever the USER STORE has not resolved, which on a cold load
       is every render up to hydration. So a fully-cached plan, already in
       state, was still shown as a blank skeleton page until an unrelated
       request came back. A permission check should decide whether the ACTION is
       available, not whether the page exists.

    3. `gate.state === "anonymous"` returned the skeleton FOREVER. Anonymous is
       terminal — nobody is going to sign in without leaving this page — so a
       logged-out visitor who followed a link to a plan sat on a pulsing grey
       page indefinitely. Plan details are public marketing copy; they render.

    What replaces them: the page, with `isPending` reaching the ~20 values that
    genuinely come from the fetch, and the KYC notice raised only once the gate
    has actually decided against the user. The invest button carries the gate
    instead of the page doing it.
  */
  const isPending = isLoading || !plan;

  if (gate.state === "needs_kyc" || gate.state === "needs_level") {
    return (
      <KycRequiredNotice
        feature="invest_forex"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:via-surface-2/30">
      <main className="pt-20 pb-24">
        <div className="container mx-auto px-4">
          {isSuccess ? (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-lg mx-auto"
            >
              <Card
                className={`border border-success/30 dark:border-success/30 bg-card overflow-hidden`}
              >
                <div
                  className={`absolute inset-0 bg-success/30`}
                />
                <CardContent className="relative p-8 text-center">
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.2,
                    }}
                    className={`w-24 h-24 rounded-full bg-success flex items-center justify-center mx-auto mb-6 shadow-xl shadow-success/25`}
                  >
                    <CheckCircle className="h-12 w-12 text-success-foreground" />
                  </m.div>
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground mb-2">
                    {t("investment_successful")}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {t("your_investment_of")} {formatCurrency(amount)}{" "}
                    {tCommon("in")} {plan?.title}{" "}
                    {t("has_been_processed_successfully")}.
                  </p>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-8">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2 }}
                      className={`bg-success h-2`}
                    />
                  </div>
                  <p className="text-sm text-subtle-foreground mb-6">
                    {t("what_would_you_like_to_do_next")}
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/forex/dashboard">
                      <Button
                        className={`w-full sm:w-auto rounded-xl bg-linear-to-r! from-success! via-success! to-success! hover:opacity-90 text-success-foreground font-semibold transition-all duration-300 shadow-md`}
                      >
                        {tCommon("go_to_dashboard")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={resetFormForMoreInvestment}
                      className={`rounded-xl border-success/30 text-success hover:bg-success/5 hover:text-success-ink dark:hover:bg-success/10`}
                    >
                      {t("invest_more")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </m.div>
          ) : (
            <>
              {/* Header */}
              <m.div
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
                      className={`rounded-xl border-border hover:bg-success/5 dark:hover:bg-success/10 hover:border-success/30`}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      {/* `text-3xl md:text-4xl` is a 36/40px line box. The old
                          skeleton stood in for it with an `h-10 w-64` block —
                          right at `md`, 4px tall at every smaller width, on the
                          element that sets the whole header's height. Measured
                          from the heading itself, it cannot be wrong at either. */}
                      <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                        <Loadable loading={isPending} placeholder={t("forex_plan")}>
                          {plan?.title}
                        </Loadable>
                      </h1>
                      <Badge
                        className={`bg-success text-success-foreground px-3 py-1 font-semibold`}
                      >
                        <Loadable loading={isPending} placeholder="00.0%">
                          {plan ? formatPercentage(plan.profitPercentage || 0) : null}
                        </Loadable>{" "}
                        {tCommon("profit")}
                      </Badge>
                    </div>
                    {/* Prose, so `chars` reserves an average rather than an
                        identity — the width settles, the line count does not,
                        which is the only part that could move the grid below. */}
                    <p className="text-muted-foreground">
                      <Loadable loading={isPending} chars={72}>
                        {plan?.description}
                      </Loadable>
                    </p>
                  </div>
                </div>
              </m.div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Plan Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Hero Image Card */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card className="overflow-hidden border border-border bg-card">
                      <div className="relative h-64 sm:h-80">
                        {/* The hero box is `h-64 sm:h-80` regardless, so the
                            image needs no placeholder of its own — the frame is
                            the reservation. */}
                        <Image
                          src={plan?.image || "/img/placeholder.svg"}
                          alt={plan?.title || tCommon("plan_image")}
                          fill
                          className="object-cover"
                          priority
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent" />
                        {/* On-media chrome. These chips lie on an arbitrary
                            plan image, so they take the scrim pair
                            (`--overlay` / `--overlay-foreground`), which is
                            dark-on-light in BOTH themes. They used to be
                            `bg-card/10` — a ground so transparent the ink fell
                            straight onto the photo — inked with
                            `primary-foreground`, the ink for a filled accent
                            fill: near-black in dark mode, so every label
                            vanished into the gradient. The opaque-enough scrim
                            is what makes the contrast independent of whatever
                            image the admin uploads. */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center bg-overlay/60 backdrop-blur-sm rounded-lg px-4 py-2">
                              <DollarSign
                                className={`h-5 w-5 text-success mr-2`}
                              />
                              <div>
                                <p className="text-xs text-overlay-foreground/70">
                                  {tCommon("investment_range")}
                                </p>
                                <p className="text-overlay-foreground font-semibold font-mono tabular-nums">
                                  <Loadable loading={isPending} placeholder="$100 - $100,000">
                                    {plan
                                      ? `${formatCurrency(plan.minAmount || 0)} - ${formatCurrency(plan.maxAmount || 100000)}`
                                      : null}
                                  </Loadable>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center bg-overlay/60 backdrop-blur-sm rounded-lg px-4 py-2">
                              <Calendar
                                className={`h-5 w-5 text-success mr-2`}
                              />
                              <div>
                                <p className="text-xs text-overlay-foreground/70">
                                  Duration
                                </p>
                                {/* "Flexible" is the answer for a plan with no
                                    declared terms — it is NOT the answer for a
                                    plan whose terms have not arrived yet, and
                                    printing it during the fetch stated a fact
                                    about the product that was often false. */}
                                <p className="text-overlay-foreground font-semibold">
                                  <Loadable loading={isPending} placeholder="7 - 90 days">
                                    {plan
                                      ? plan.durations && plan.durations.length > 0
                                        ? `${plan.durations[0].duration} - ${plan.durations[plan.durations.length - 1].duration} ${plan.durations[0].timeframe.toLowerCase()}s`
                                        : tCommon("flexible")
                                      : null}
                                  </Loadable>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center bg-overlay/60 backdrop-blur-sm rounded-lg px-4 py-2">
                              <Users
                                className={`h-5 w-5 text-success mr-2`}
                              />
                              <div>
                                <p className="text-xs text-overlay-foreground/70">
                                  Investors
                                </p>
                                <p className="text-overlay-foreground font-semibold">
                                  <Loadable loading={isPending} placeholder="000">
                                    {plan?.totalInvestors}
                                  </Loadable>{" "}
                                  {tCommon("active_investors")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </m.div>

                  {/* Plan Highlights */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card className="border border-border bg-card">
                      <CardHeader>
                        <CardTitle className="flex items-center text-foreground">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mr-3">
                            <BarChart3 className="h-3.5 w-3.5" />
                          </span>
                          {t("plan_highlights")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="bg-muted rounded-lg p-4 border border-border">
                              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                                {t("profit_range")}
                              </h3>
                              {/* `text-2xl leading-tight` is a 30px line box;
                                  the retired skeleton used `h-8` (32px) for the
                                  same figure. Four of these tiles, two per
                                  column — 8px of drift down the card. Measured
                                  in place, it is 30px in both states. */}
                              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                                <Loadable loading={isPending} placeholder="0.0% - 0.0%">
                                  {plan
                                    ? `${formatPercentage(plan.minProfit || 0)} - ${formatPercentage(plan.maxProfit || 0)}`
                                    : null}
                                </Loadable>
                              </p>
                            </div>
                            <div className="bg-muted rounded-lg p-4 border border-border">
                              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                                {tCommon("investment_range")}
                              </h3>
                              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                                <Loadable loading={isPending} placeholder="$100 - $100,000">
                                  {plan
                                    ? `${formatCurrency(plan.minAmount || 0)} - ${formatCurrency(plan.maxAmount || 100000)}`
                                    : null}
                                </Loadable>
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-muted rounded-lg p-4 border border-border">
                              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                                {tCommon("currency")}
                              </h3>
                              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                                <Loadable loading={isPending} placeholder="USD">
                                  {plan?.currency}
                                </Loadable>
                              </p>
                            </div>
                            <div className="bg-muted rounded-lg p-4 border border-border">
                              <h3 className="text-xs font-medium text-muted-foreground mb-1">
                                {tCommon("total_invested")}
                              </h3>
                              <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                                <Loadable loading={isPending} placeholder="$000,000">
                                  {plan ? formatCurrency(plan.invested) : null}
                                </Loadable>
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </m.div>

                  {/* Security & Features */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Card className="border border-border bg-card">
                      <CardHeader>
                        <CardTitle className="flex items-center text-foreground">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mr-3">
                            <Shield className="h-3.5 w-3.5" />
                          </span>
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
                              title: "24/7 Support",
                              desc: t("get_help_whenever_you_need_it"),
                            },
                          ].map((item, i) => (
                            <div key={i} className="flex items-start">
                              <div
                                className={`shrink-0 w-12 h-12 rounded-xl ${item.color === "primary" ? `bg-success/10` : `bg-success/10`} flex items-center justify-center mr-4`}
                              >
                                <item.icon
                                  className={`h-6 w-6 ${item.color === "primary" ? `text-success` : `text-success`}`}
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground mb-1">
                                  {item.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </m.div>

                  {/* FAQs */}
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Card className="border border-border bg-card">
                      <CardHeader>
                        <CardTitle className="flex items-center text-foreground">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success mr-3">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </span>
                          {tCommon("faq_question")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                          {faqs.map((faq, index) => (
                            <AccordionItem
                              key={index}
                              value={`item-${index}`}
                              className="border-border"
                            >
                              <AccordionTrigger
                                className={`text-left text-foreground hover:text-success dark:hover:text-success`}
                              >
                                {faq.question}
                              </AccordionTrigger>
                              <AccordionContent className="text-muted-foreground">
                                {faq.answer}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </m.div>
                </div>

                {/* Right Column - Investment Form */}
                <div className="lg:col-span-1">
                  <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card className="sticky top-24 border border-border bg-card overflow-hidden">
                      {/* Header */}
                      <div
                        className={`bg-success p-6`}
                      >
                        {/* This header is a filled `bg-success` panel, so its
                            ink is `success-foreground`. `primary-foreground`
                            only tracks `--primary`; the two are the same value
                            today, but nothing keeps them paired once the admin
                            design panel moves one of them. */}
                        <CardTitle className="text-xl text-success-foreground mb-1">
                          {t("create_your_investment")}
                        </CardTitle>
                        <CardDescription className="text-success-foreground/80">
                          {currentStep === 1
                            ? t("step_1_choose_your_duration")
                            : currentStep === 2
                              ? t("step_2_set_your_investment_amount")
                              : t("step_3_review_and_confirm")}
                        </CardDescription>
                      </div>

                      {/* Progress Steps */}
                      <div className="px-6 py-4 bg-muted dark:bg-muted/50 border-b border-border">
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
                                      ? `bg-success text-success-foreground shadow-lg shadow-success/25`
                                      : "bg-muted text-subtle-foreground"
                                  }`}
                                >
                                  {item.step}
                                </div>
                                <span
                                  className={`text-xs font-medium mt-1 ${
                                    currentStep >= item.step
                                      ? `text-success`
                                      : "text-subtle-foreground"
                                  }`}
                                >
                                  {item.label}
                                </span>
                              </div>
                              {i < 2 && (
                                <div
                                  className={`w-8 h-0.5 mx-2 transition-colors ${
                                    currentStep > item.step
                                      ? `bg-success`
                                      : "bg-muted"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <CardContent className="max-h-96 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {currentStep === 1 && (
                            <m.div
                              key="step1"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-6"
                            >
                              <div>
                                <Label className="text-base font-semibold mb-3 block text-foreground">
                                  {t("select_investment_duration")}
                                </Label>
                                <RadioGroup
                                  value={selectedDurationId}
                                  onValueChange={handleDurationChange}
                                  className="grid grid-cols-2 gap-3"
                                >
                                  {/*
                                    The term tiles, reserved.

                                    `planDurations` is `plan?.durations ?? []`,
                                    so while the fetch is in flight this grid
                                    had NO children and collapsed to zero
                                    height. Everything under it inside the
                                    sticky card — the "Duration information"
                                    panel and the whole footer — sat ~150px
                                    higher and then dropped. Four tiles is the
                                    common shape and reserves two rows of the
                                    real `grid-cols-2 gap-3`; the count settles
                                    from there, which is the accepted part.
                                  */}
                                  {isPending &&
                                    [0, 1, 2, 3].map((i) => (
                                      <div
                                        key={`pending-${i}`}
                                        className="border-2 rounded-xl p-3 border-border"
                                      >
                                        <span className="flex items-center w-full">
                                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                          <span className="font-medium text-muted-foreground">
                                            <SkeletonText placeholder="30 days" />
                                          </span>
                                        </span>
                                      </div>
                                    ))}
                                  {planDurations.map((duration) => (
                                    <div
                                      key={duration.id}
                                      className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                                        selectedDurationId === duration.id
                                          ? `border-success bg-success/10 dark:bg-success/10`
                                          : `border-border hover:border-success/30 dark:hover:border-success/50 hover:bg-muted dark:hover:bg-muted`
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
                                              ? `text-success`
                                              : "text-muted-foreground"
                                          }`}
                                        />
                                        <span
                                          className={`font-medium ${
                                            selectedDurationId === duration.id
                                              ? `text-success`
                                              : "text-muted-foreground"
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
                                className={`bg-success/10 dark:bg-success/10 p-4 rounded-xl border border-success/20 dark:border-success/20`}
                              >
                                <h3
                                  className={`font-semibold text-success mb-2 flex items-center`}
                                >
                                  <Info className="h-4 w-4 mr-2" />
                                  {t("duration_information")}
                                </h3>
                                <p
                                  className={`text-sm text-success`}
                                >
                                  {t("the_investment_duration_be_invested")}.{" "}
                                  {t(
                                    "longer_durations_often_longer_commitment"
                                  )}
                                  .
                                </p>
                              </div>
                            </m.div>
                          )}

                          {currentStep === 2 && (
                            <m.div
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
                                  min={plan?.minAmount || 100}
                                  max={maxAllowed}
                                  title={tCommon("investment_amount")}
                                  className="rounded-xl"
                                />
                                <div className="flex items-center justify-between mt-2 text-sm">
                                  <span className="text-subtle-foreground">
                                    {t("your_forex_account_balance")}
                                  </span>
                                  <span
                                    className={`font-semibold text-success font-mono tabular-nums`}
                                  >
                                    <Loadable loading={isBalanceLoading} placeholder="$0,000.00">
                                      {formatCurrency(walletBalance)}
                                    </Loadable>
                                  </span>
                                </div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-3">
                                  <Label className="text-muted-foreground">
                                    {t("adjust_amount")}
                                  </Label>
                                  <span
                                    className={`font-semibold text-success font-mono tabular-nums`}
                                  >
                                    {formatCurrency(amount)}
                                  </span>
                                </div>
                                <Slider
                                  value={[amount]}
                                  min={plan?.minAmount || 100}
                                  max={maxAllowed}
                                  step={100}
                                  onValueChange={(values) =>
                                    handleAmountChange(values[0])
                                  }
                                  className={`**:[[role=slider]]:bg-success`}
                                />
                                <div className="flex justify-between text-xs text-subtle-foreground mt-2">
                                  <span>
                                    {formatCurrency(plan?.minAmount || 100)}
                                  </span>
                                  {/* `maxAllowed` is `min(plan.maxAmount,
                                      walletBalance)` — derived from BOTH
                                      requests, so it is only true once both
                                      have landed. Until then it reads 100,000
                                      (the plan fallback) or 0 (the balance
                                      one), and both are wrong. */}
                                  <span>
                                    <Loadable
                                      loading={isPending || isBalanceLoading}
                                      placeholder="$00,000"
                                    >
                                      {formatCurrency(maxAllowed)}
                                    </Loadable>
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`bg-success/10 dark:bg-success/10 p-4 rounded-xl border border-success/20 dark:border-success/20`}
                              >
                                <h3
                                  className={`font-semibold text-success mb-3 flex items-center`}
                                >
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  {t("profit_estimate")}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {t("monthly_profit")}
                                    </p>
                                    <p className="text-xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                                      <Loadable loading={isPending} placeholder="$000.00">
                                        {formatCurrency(estimatedProfit / 12)}
                                      </Loadable>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      {t("annual_profit")}
                                    </p>
                                    <p className="text-xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                                      <Loadable loading={isPending} placeholder="$0,000.00">
                                        {formatCurrency(estimatedProfit)}
                                      </Loadable>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </m.div>
                          )}

                          {currentStep === 3 && (
                            <m.div
                              key="step3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-6"
                            >
                              <div className="bg-muted p-4 rounded-xl border border-border">
                                <h3 className="font-semibold text-foreground mb-4 flex items-center">
                                  <Info
                                    className={`h-4 w-4 mr-2 text-success`}
                                  />
                                  {t("investment_summary")}
                                </h3>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-subtle-foreground">
                                      {tCommon("plan")}
                                    </span>
                                    <span className="font-medium text-foreground">
                                      <Loadable loading={isPending} placeholder={t("forex_plan")}>
                                        {plan?.title}
                                      </Loadable>
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-subtle-foreground">
                                      {tCommon("duration")}
                                    </span>
                                    <span className="font-medium text-foreground">
                                      {selectedDurationId && planDurations.length > 0
                                        ? formatDuration(
                                            planDurations.find(
                                              (d) => d.id === selectedDurationId
                                            )?.duration || 0,
                                            planDurations.find(
                                              (d) => d.id === selectedDurationId
                                            )?.timeframe || "DAY"
                                          )
                                        : t("select_a_duration")}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-subtle-foreground">
                                      {tCommon("amount")}
                                    </span>
                                    <span className="font-medium text-foreground font-mono tabular-nums">
                                      {formatCurrency(amount)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-subtle-foreground">
                                      {tCommon("profit_rate")}
                                    </span>
                                    <span className="font-medium text-foreground font-mono tabular-nums">
                                      <Loadable loading={isPending} placeholder="00.0%">
                                        {plan
                                          ? formatPercentage(plan.profitPercentage || 0)
                                          : null}
                                      </Loadable>
                                    </span>
                                  </div>
                                  <Separator className="my-3" />
                                  <div className="flex justify-between text-sm">
                                    <span className="text-subtle-foreground">
                                      {tCommon("estimated_profit")}
                                    </span>
                                    {/* `estimatedProfit` is computed by an
                                        effect over `plan` and `amount`, so it
                                        is 0 for a render AFTER the plan lands —
                                        a second, later settle that a first-vs-
                                        final comparison never sees. Keyed on
                                        the plan, both figures stay pending
                                        through that extra tick. */}
                                    <span
                                      className={`font-semibold text-success font-mono tabular-nums`}
                                    >
                                      <Loadable loading={isPending} placeholder="$0,000.00">
                                        {formatCurrency(estimatedProfit)}
                                      </Loadable>
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium text-foreground">
                                      {tCommon("total_return")}
                                    </span>
                                    <span
                                      className={`font-semibold text-lg text-success font-mono tabular-nums`}
                                    >
                                      <Loadable loading={isPending} placeholder="$00,000.00">
                                        {formatCurrency(amount + estimatedProfit)}
                                      </Loadable>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 border-2 border-warning/20 dark:border-warning/30 bg-warning/5 dark:bg-warning/10 rounded-xl">
                                <div className="flex items-start">
                                  <AlertCircle className="h-5 w-5 text-warning mr-3 mt-0.5 shrink-0" />
                                  <div>
                                    <h4 className="font-semibold text-warning">
                                      {tCommon("important_notice")}
                                    </h4>
                                    <p className="text-sm text-warning mt-1">
                                      {t("by_proceeding_with_and_conditions")}.{" "}
                                      {t("all_investments_carry_risk")}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </CardContent>

                      <CardFooter className="flex justify-between bg-muted dark:bg-muted/50 px-6 py-4 border-t border-border">
                        {currentStep > 1 && (
                          <Button
                            variant="outline"
                            onClick={prevStep}
                            className="rounded-xl border-border hover:bg-muted"
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
                            className={`ml-auto rounded-xl bg-linear-to-r! from-success! via-success! to-success! hover:opacity-90 text-success-foreground font-semibold transition-all duration-300 shadow-md`}
                          >
                            {tCommon("next")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          /*
                            The action carries the permission check now, which
                            is where it belonged: the page used to be replaced
                            wholesale while `gate.state` was "loading" or
                            "anonymous", so a signed-out visitor could not read
                            the plan at all. `gate.allowed` is false in both of
                            those states, so the ONE thing that needs the
                            permission — submitting an investment — stays
                            unavailable, and everything else renders.

                            The hand-rolled `animate-spin` div is gone in favour
                            of `Button`'s own `loading`, which renders the same
                            16px spinner in the same slot and adds `aria-busy`.
                            Two trees became one element whose LABEL changes;
                            the arrow stays in both, so the only thing that
                            moves is the word, inside a right-aligned button.
                          */
                          <Button
                            onClick={handleInvest}
                            loading={isPending || isBalanceLoading}
                            disabled={
                              !gate.allowed ||
                              !selectedDurationId ||
                              amount <= 0 ||
                              amount > walletBalance
                            }
                            className={`ml-auto rounded-xl bg-linear-to-r! from-success! via-success! to-success! hover:opacity-90 text-success-foreground font-semibold transition-all duration-300 shadow-md`}
                          >
                            {isPending || isBalanceLoading
                              ? `${tCommon("processing")}.`
                              : t("confirm_investment")}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </CardFooter>
                      {/* Under the step controls, inside the card the reader is
                          acting in — the same reason it sits above the button
                          on the core composer. It is a fact about the product,
                          not a transient warning, so it renders on every step
                          rather than only on the last one. */}
                      <div className="px-6 pb-6">
                        <FixedReturnDisclosure />
                      </div>
                    </Card>
                  </m.div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
