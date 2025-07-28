"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  ChevronRight,
  LineChart,
  BarChart3,
  Lock,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
const features = [
  {
    title: "Advanced Algorithms",
    description:
      "Proprietary trading algorithms with machine learning capabilities for optimal market execution.",
    list: [
      "AI-powered market analysis",
      "Risk-adjusted strategies",
      "Real-time optimization",
    ],
    Icon: LineChart,
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Professional Signals",
    description:
      "Institutional-grade MT5 signals backed by quantitative analysis and expert traders.",
    list: [
      "99.7% signal accuracy",
      "24/7 automated execution",
      "Custom risk parameters",
    ],
    Icon: BarChart3,
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    title: "Enterprise Security",
    description:
      "Bank-level security protocols with segregated accounts and comprehensive insurance.",
    list: [
      "256-bit encryption",
      "Segregated client funds",
      "Regular security audits",
    ],
    Icon: Lock,
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
];
export function FeaturesSection() {
  const router = useRouter();
  return (
    <section className="py-24 bg-white dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-20"
          initial={{
            opacity: 0,
            y: 30,
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
          }}
        >
          <Badge className="mb-6 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full text-sm font-semibold">
            Why Choose ForexPro
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Institutional-Grade Trading
          </h2>
          <p className="text-xl text-slate-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed">
            Advanced algorithmic strategies combined with deep market expertise
            to deliver consistent, risk-adjusted returns for professional
            investors.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((card, i) => {
            return (
              <motion.div
                key={i}
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
                  delay: i * 0.1,
                }}
              >
                <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-zinc-800 hover:-translate-y-2 h-full">
                  <CardHeader className="pb-6">
                    <div
                      className={`w-16 h-16 rounded-2xl ${card.bgColor} flex items-center justify-center mb-6`}
                    >
                      <card.Icon className={`h-8 w-8 ${card.iconColor}`} />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-zinc-300 text-base leading-relaxed">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {card.list.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                          <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700 dark:text-zinc-200 font-medium">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="ghost"
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 p-0 hover:bg-transparent font-semibold"
                      onClick={() => router.push("/forex/plan")}
                    >
                      Learn more <ChevronRight className="h-4 w-4 ml-1" />
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
