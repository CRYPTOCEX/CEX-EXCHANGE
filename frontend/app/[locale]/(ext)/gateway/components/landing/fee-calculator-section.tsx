"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, DollarSign, Percent, ArrowRight, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";

interface FeeStructure {
  type: string;
  percentage: number;
  fixed: number;
  example: {
    amount: number;
    fee: number;
    netAmount: number;
  };
}

interface FeeCalculatorSectionProps {
  feeStructure: FeeStructure;
  isLoading?: boolean;
}

export default function FeeCalculatorSection({
  feeStructure,
  isLoading,
}: FeeCalculatorSectionProps) {
  const t = useTranslations("ext_gateway");
  const [amount, setAmount] = useState(100);

  const calculation = useMemo(() => {
    const percentage = feeStructure?.percentage || 2.9;
    const fixed = feeStructure?.fixed || 0.3;
    const fee = amount * (percentage / 100) + fixed;
    const netAmount = amount - fee;
    return {
      fee: Math.round(fee * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      percentage,
      fixed,
    };
  }, [amount, feeStructure]);

  if (isLoading) {
    return (
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mx-auto mb-6" />
            <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-indigo-500/20"
          >
            <Calculator className="w-4 h-4 text-indigo-500 mr-2" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {t("transparent_pricing") || "Transparent Pricing"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("simple") || "Simple"},{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              {t("predictable_fees") || "Predictable Fees"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("no_hidden_fees_description") ||
              "No hidden fees, no monthly charges. Only pay when you get paid."}
          </p>
        </motion.div>

        {/* Calculator Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 rounded-3xl blur-xl" />

            <div className="relative p-8 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-indigo-500/20 backdrop-blur-sm">
              {/* Fee Structure Display */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10">
                  <Percent className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {calculation.percentage}%
                  </span>
                </div>
                <span className="text-zinc-400">+</span>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10">
                  <DollarSign className="w-4 h-4 text-cyan-500" />
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    ${calculation.fixed.toFixed(2)}
                  </span>
                </div>
                <span className="text-sm text-zinc-500">per transaction</span>
              </div>

              {/* Amount Input */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  {t("payment_amount") || "Payment Amount"}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) =>
                      setAmount(Math.max(0, Number(e.target.value)))
                    }
                    className="pl-10 h-14 text-xl font-bold rounded-xl border-zinc-200 dark:border-zinc-700 focus:border-indigo-500"
                    min={0}
                    max={10000}
                  />
                </div>
                <Slider
                  value={[amount]}
                  onValueChange={([value]) => setAmount(value)}
                  min={0}
                  max={1000}
                  step={10}
                  className="mt-4"
                />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>$0</span>
                  <span>$1,000</span>
                </div>
              </div>

              {/* Calculation Result */}
              <div className="grid grid-cols-3 gap-4 p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                <div className="text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    {t("you_charge") || "You Charge"}
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    ${amount.toFixed(2)}
                  </p>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-zinc-400" />
                  <p className="text-xs text-zinc-500 mt-1">
                    Fee: ${calculation.fee.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                    {t("you_receive") || "You Receive"}
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${calculation.netAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {[
                  t("no_setup_fees") || "No setup fees",
                  t("no_monthly_fees") || "No monthly fees",
                  t("no_hidden_charges") || "No hidden charges",
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
