"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Star, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Link } from "@/i18n/routing";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { useTranslations } from "next-intl";

export interface ForexPlan {
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

interface PlanCardProps {
  plan: ForexPlan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const t = useTranslations("ext_forex");
  const tCommon = useTranslations("common");
  return (
    <Link href={`/forex/plan/${plan.id}`} className="block h-full">
      <Card
        className="group relative overflow-hidden border border-zinc-800 bg-zinc-900 shadow-xl hover:shadow-emerald-600/10 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1 cursor-pointer rounded-2xl h-full flex flex-col"
      >
        {/* Trending badge */}
        {plan.trending && (
          <div className="absolute top-4 right-4 z-20">
            <Badge className="bg-linear-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 font-semibold shadow-lg shadow-orange-500/30 rounded-lg">
              <Star className="h-3.5 w-3.5 mr-1.5 fill-white" />
              Premium
            </Badge>
          </div>
        )}

        {/* Image with overlay */}
        <div className="h-40 relative overflow-hidden shrink-0">
          <Image
            src={plan.image || `/img/placeholder.svg`}
            alt={plan.title || plan.name}
            fill
            className="object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
        </div>

        <CardContent className="relative p-5 flex flex-col grow">
          {/* Plan Title & Description */}
          <div className="mb-4">
            <h3
              className="text-lg font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors duration-300 line-clamp-1"
            >
              {plan.title || plan.name}
            </h3>
            <p className="text-zinc-400 text-sm line-clamp-2 leading-relaxed min-h-10">
              {plan.description}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Profit Range */}
            <div className="rounded-xl bg-zinc-800/80 p-3 border border-zinc-700/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-5 h-5 rounded bg-emerald-600/20 flex items-center justify-center"
                >
                  <TrendingUp
                    className="h-3 w-3 text-emerald-400"
                  />
                </div>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Profit
                </span>
              </div>
              <p className="text-sm font-bold text-white">
                {formatPercentage(plan.minProfit)} -{" "}
                {formatPercentage(plan.maxProfit)}
              </p>
            </div>

            {/* Min Investment */}
            <div className="rounded-xl bg-zinc-800/80 p-3 border border-zinc-700/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center"
                >
                  <DollarSign
                    className="h-3 w-3 text-teal-400"
                  />
                </div>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Min
                </span>
              </div>
              <p className="text-sm font-bold text-white">
                {formatCurrency(plan.minAmount || 0)}
              </p>
            </div>
          </div>

          {/* Duration info */}
          <div className="flex items-center gap-2 mb-4 text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">{t("flexible_investment_duration")}</span>
          </div>

          {/* CTA Button - pushed to bottom */}
          <div className="mt-auto">
            <Button size="default" className="w-full rounded-xl">
              {tCommon("invest_now")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
