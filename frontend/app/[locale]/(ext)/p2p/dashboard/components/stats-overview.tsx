"use client";

import { BarChart3, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatItem {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral" | string;
  icon: string;
  gradient: string;
}

interface StatsOverviewProps {
  stats: StatItem[] | any;
  isLoading: boolean;
}

export function StatsOverview({ stats, isLoading }: StatsOverviewProps) {
  if (isLoading) {
    return <StatsSkeleton />;
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "wallet":
        return <Wallet className="h-6 w-6" />;
      case "trending-up":
        return <TrendingUp className="h-6 w-6" />;
      case "bar-chart":
        return <BarChart3 className="h-6 w-6" />;
      case "shield-check":
        return <ShieldCheck className="h-6 w-6" />;
      default:
        return <Wallet className="h-6 w-6" />;
    }
  };

  // Ensure stats is an array before mapping
  const statsArray = Array.isArray(stats) ? stats : [];

  // Default stats if none are provided
  if (statsArray.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Balance",
            value: "$0",
            change: "+0.0% from last month",
            changeType: "neutral",
            icon: "wallet",
            gradient: "from-blue-500 to-blue-700",
          },
          {
            title: "Trading Volume",
            value: "$0",
            change: "+0.0% from last month",
            changeType: "neutral",
            icon: "trending-up",
            gradient: "from-green-500 to-green-700",
          },
          {
            title: "Active Trades",
            value: "0",
            change: "0 pending completion",
            changeType: "neutral",
            icon: "bar-chart",
            gradient: "from-violet-500 to-violet-700",
          },
          {
            title: "Success Rate",
            value: "0%",
            change: "Based on 0 trades",
            changeType: "neutral",
            icon: "shield-check",
            gradient: "from-amber-500 to-amber-700",
          },
        ].map((stat, index) => (
          <StatCard key={stat.title} stat={stat} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsArray.map((stat: StatItem, index: number) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  );
}

interface StatCardProps {
  stat: StatItem;
  index: number;
}

function StatCard({ stat, index }: StatCardProps) {
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "wallet":
        return <Wallet className="h-6 w-6" />;
      case "trending-up":
        return <TrendingUp className="h-6 w-6" />;
      case "bar-chart":
        return <BarChart3 className="h-6 w-6" />;
      case "shield-check":
        return <ShieldCheck className="h-6 w-6" />;
      default:
        return <Wallet className="h-6 w-6" />;
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className={`h-1.5 w-full bg-gradient-to-r ${stat.gradient}`} />
        <CardHeader className="flex flex-row items-center justify-between py-5">
          <CardTitle className="text-base font-medium">{stat.title}</CardTitle>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${stat.gradient} text-white`}
          >
            {getIconComponent(stat.icon)}
          </div>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="text-3xl font-bold">{stat.value}</div>
          <p
            className={`text-sm ${stat.changeType === "positive" ? "text-green-500" : stat.changeType === "negative" ? "text-red-500" : "text-muted-foreground"}`}
          >
            {stat.change}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border rounded-lg overflow-hidden">
          <Skeleton className="h-1.5 w-full" />
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
