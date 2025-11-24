"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Award, DollarSign, TrendingUp } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const steps = [
  {
    step: 1,
    title: "Create Account",
    description:
      "Complete our secure KYC verification process to access our investment platform.",
    icon: Users,
    color: "blue",
  },
  {
    step: 2,
    title: "Select Plan",
    description:
      "Choose from our range of institutional-grade investment plans tailored to your goals.",
    icon: Award,
    color: "emerald",
  },
  {
    step: 3,
    title: "Fund Account",
    description:
      "Deposit funds securely via bank transfer, cryptocurrency, or other supported methods.",
    icon: DollarSign,
    color: "purple",
  },
  {
    step: 4,
    title: "Monitor Performance",
    description:
      "Track your investments in real-time through our advanced analytics dashboard.",
    icon: TrendingUp,
    color: "orange",
  },
];

export function HowItWorksSection() {
  const t = useTranslations("ext");
  const router = useRouter();

  return (
    <section className="py-24 bg-white dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Badge className="mb-6 px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-sm font-semibold">
            {t("getting_started")}
          </Badge>
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
            {t("simple_4-step_process")}
          </h2>
          <p className="text-xl text-slate-600 dark:text-zinc-300 max-w-3xl mx-auto">
            {t("our_streamlined_onboarding_forex_trading")}.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              className="relative text-center"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br from-${item.color}-500 to-${item.color}-600 flex items-center justify-center mb-8 mx-auto shadow-xl`}
              >
                <item.icon className="h-10 w-10 text-white" />
              </div>

              <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
                <div
                  className={`w-10 h-10 rounded-full bg-white flex items-center justify-center text-${item.color}-600 font-bold text-lg shadow-lg border-4 border-${item.color}-500`}
                >
                  {item.step}
                </div>
              </div>

              {item.step < 4 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+2.5rem)] right-[calc(50%-2.5rem)] h-1 bg-gradient-to-r from-slate-300 to-slate-300 dark:from-zinc-600 dark:to-zinc-600" />
              )}

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                {item.title}
              </h3>
              <p className="text-slate-600 dark:text-zinc-300 text-base leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold px-10 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            onClick={() => router.push("/forex/plan")}
          >
            {t("get_started_now")}
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
