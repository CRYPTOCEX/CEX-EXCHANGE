"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { PlanCard, type ForexPlan } from "./plan-card";
import { useTranslations } from "next-intl";

interface FeaturedPlansSectionProps {
  trendingPlans: ForexPlan[];
}

export function FeaturedPlansSection({
  trendingPlans,
}: FeaturedPlansSectionProps) {
  const t = useTranslations("ext_forex");
  if (trendingPlans.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div
          className={`absolute -top-40 left-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl`}
        />
        <div
          className={`absolute bottom-0 right-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl`}
        />
      </div>

      <div className="container mx-auto relative z-10">
        <motion.div
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <Badge
              variant="outline"
              className={`px-4 py-2 rounded-full mb-6 bg-linear-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/20`}
            >
              <Sparkles className={`w-4 h-4 text-emerald-500 mr-2`} />
              <span
                className={`text-sm font-medium text-emerald-600 dark:text-emerald-400`}
              >
                {t("featured_plans")}
              </span>
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              <span className="bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                {t("premium_investment")}
              </span>
              <br />
              <span
                className={`bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent`}
              >
                Opportunities
              </span>
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              {t("choose_from_our_range_of_institutional")}
            </p>
          </div>
          <Link href="/forex/plan">
            <Button
              variant="outline"
              className={`rounded-xl border-2 border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 dark:hover:bg-emerald-600/10 font-semibold transition-all duration-300`}
            >
              {t("view_all_plans")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="h-full"
            >
              <PlanCard plan={plan} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
