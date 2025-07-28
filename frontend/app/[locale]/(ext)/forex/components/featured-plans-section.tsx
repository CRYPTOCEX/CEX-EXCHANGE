"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowRight, Star } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
interface Plan {
  id: string;
  title?: string;
  name: string;
  description?: string;
  image?: string;
  minProfit: number;
  maxProfit: number;
  minAmount?: number;
  invested: number;
  trending?: boolean;
}
interface FeaturedPlansSectionProps {
  trendingPlans: Plan[];
}
export function FeaturedPlansSection({
  trendingPlans,
}: FeaturedPlansSectionProps) {
  const router = useRouter();
  if (trendingPlans.length === 0) {
    return null;
  }
  return (
    <section className="py-24 bg-slate-50 dark:bg-zinc-900 relative">
      <div className="container mx-auto px-4">
        <motion.div
          className="flex flex-col md:flex-row justify-between items-center mb-20"
          initial={{
            opacity: 0,
          }}
          whileInView={{
            opacity: 1,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            duration: 0.6,
          }}
        >
          <div>
            <Badge className="mb-6 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-semibold">
              Investment Plans
            </Badge>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Premium Investment Plans
            </h2>
            <p className="text-xl text-slate-600 dark:text-zinc-300 max-w-2xl">
              Choose from our range of institutional-grade forex investment
              plans designed to maximize your returns.
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-6 md:mt-0 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-900/20 font-semibold"
            onClick={() => router.push("/forex/plan")}
          >
            View All Plans <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {trendingPlans.map((plan, index) => {
            return (
              <motion.div
                key={plan.id}
                initial={{
                  opacity: 0,
                  y: 40,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                }}
                whileHover={{
                  y: -8,
                }}
              >
                <Card className="relative overflow-visible border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-zinc-800">
                  {plan.trending && (
                    <div className="absolute -top-4 -right-4 z-50">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 font-bold shadow-lg">
                        <Star className="h-4 w-4 mr-1 fill-white" /> Premium
                      </Badge>
                    </div>
                  )}

                  <div className="h-56 relative">
                    <Image
                      src={
                        plan.image ||
                        `/placeholder.svg?height=400&width=600&query=professional+trading+chart+${index + 1 || "/placeholder.svg"}`
                      }
                      alt={plan.title || plan.name}
                      fill
                      className="object-cover rounded-t-xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-t-xl" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <h3 className="text-white text-2xl font-bold mb-2">
                        {plan.title || plan.name}
                      </h3>
                      <p className="text-white/90 text-sm font-medium">
                        {plan.description?.substring(0, 80)}...
                      </p>
                    </div>
                  </div>

                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-zinc-700">
                        <div>
                          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                            Profit Range
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatPercentage(plan.minProfit)} -{" "}
                            {formatPercentage(plan.maxProfit)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-1">
                            Min Investment
                          </p>
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">
                            {formatCurrency(plan.minAmount || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-base">
                          <span className="text-slate-600 dark:text-zinc-400 font-medium">
                            Duration:
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            Flexible
                          </span>
                        </div>
                        <div className="flex justify-between text-base">
                          <span className="text-slate-600 dark:text-zinc-400 font-medium">
                            Total Invested:
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(plan.invested)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-8 pb-8 pt-0">
                    <Button
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => router.push(`/forex/plan/${plan.id}`)}
                    >
                      Invest Now
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
