"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Star,
  Users,
  DollarSign,
  TrendingUp,
  Globe,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { $fetch } from "@/lib/api";
const fadeIn = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
};
export function HeroSection() {
  const router = useRouter();
  const [stats, setStats] = useState([
    {
      label: "Active Investors",
      value: "—",
      icon: Users,
    },
    {
      label: "Total Invested",
      value: "—",
      icon: DollarSign,
    },
    {
      label: "Average Return",
      value: "—",
      icon: TrendingUp,
    },
  ]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    $fetch({
      url: "/api/forex/stats",
      silent: true,
    })
      .then((res) => {
        if (!res.data) return setLoading(false);
        const { activeInvestors, totalInvested, averageReturn } = res.data;
        setStats([
          {
            label: "Active Investors",
            value: activeInvestors?.toLocaleString() + "+",
            icon: Users,
          },
          {
            label: "Total Invested",
            value: "$" + Number(totalInvested).toLocaleString() + "+",
            icon: DollarSign,
          },
          {
            label: "Average Return",
            value: averageReturn?.toFixed(2) + "%",
            icon: TrendingUp,
          },
        ]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 text-white pb-24 pt-20 md:pt-32 min-h-[90vh] flex items-center">
      {/* Background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-[url('/img/home/forex.png')] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundAttachment: "fixed",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/80 to-slate-900/90 dark:from-zinc-900/85 dark:via-zinc-800/80 dark:to-zinc-900/90" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center space-y-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {
              opacity: 0,
            },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          <motion.div variants={fadeIn} custom={0}>
            <Badge className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm text-sm font-medium mb-6">
              <Star className="h-4 w-4 mr-2 text-emerald-400" />
              Trusted by {loading ? "—" : stats[0].value} Professional Investors
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight"
            variants={fadeIn}
            custom={1}
          >
            <span className="block text-white">Professional Forex</span>
            <span className="block mt-2 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Investment Platform
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-slate-200 max-w-3xl mx-auto font-light leading-relaxed"
            variants={fadeIn}
            custom={2}
          >
            Access institutional-grade forex trading with advanced algorithms,
            professional risk management, and consistent returns for serious
            investors.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
            variants={fadeIn}
            custom={3}
          >
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              onClick={() => router.push("/forex/plan")}
            >
              Start Investing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-zinc-300/30 dark:border-zinc-600/30 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100/10 dark:hover:bg-zinc-800/20 backdrop-blur-sm px-8 py-4 text-lg font-semibold transition-all duration-300"
              onClick={() => router.push("/forex/dashboard")}
            >
              View Dashboard
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-16 pt-16 border-t border-white/20"
            variants={fadeIn}
            custom={4}
          >
            {stats.map((stat, index) => {
              return (
                <motion.div
                  key={index}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20 hover:bg-white/15 transition-all duration-300"
                  whileHover={{
                    y: -5,
                    scale: 1.02,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                >
                  <stat.icon className="h-8 w-8 mx-auto mb-3 text-emerald-400" />
                  <p className="text-3xl font-bold text-white mb-1">
                    {loading ? (
                      <span className="animate-pulse">—</span>
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="text-sm text-slate-300 font-medium">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
