"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Zap, Clock } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const features = [
  { label: "Enterprise Security", icon: Shield },
  { label: "24/7 Expert Support", icon: Users },
  { label: "Instant Withdrawals", icon: Zap },
  { label: "Real-Time Analytics", icon: Clock },
];

export function CTASection() {
  const t = useTranslations("ext");
  const router = useRouter();

  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 text-white relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/img/home/forex.png')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90" />
      </div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            {t("ready_to_maximize_your_returns")}
          </h2>
          <p className="text-xl md:text-2xl text-slate-200 mb-12 leading-relaxed">
            {t("join_thousands_of_institutional-grade_platform")}.
          </p>

          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-10 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              onClick={() => router.push("/forex/plan")}
            >
              {t("start_investing")}
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-zinc-300/30 dark:border-zinc-600/30 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100/10 dark:hover:bg-zinc-800/20 backdrop-blur-sm px-10 py-4 text-lg font-semibold transition-all duration-300"
              onClick={() => router.push("/forex/dashboard")}
            >
              {t("view_dashboard")}
            </Button>
          </motion.div>

          <motion.div
            className="mt-20 pt-20 border-t border-white/20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {features.map((item, i) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * i + 0.5 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/20">
                    <item.icon className="h-8 w-8 text-emerald-400" />
                  </div>
                  <span className="text-white font-semibold text-lg">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
