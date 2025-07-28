"use client";

import { motion } from "framer-motion";
import {
  Shield,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
  Zap,
  Lock,
  Award,
  Globe,
  Smartphone,
  HeadphonesIcon,
  CheckCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

const features = [
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description:
      "Your investments are protected with military-grade encryption and multi-layer security protocols.",
    color: "from-blue-500 to-cyan-500",
    bgColor:
      "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
  },
  {
    icon: TrendingUp,
    title: "Proven Returns",
    description:
      "Track record of consistent performance with transparent reporting and real-time analytics.",
    color: "from-green-500 to-emerald-500",
    bgColor:
      "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
  },
  {
    icon: Clock,
    title: "Flexible Durations",
    description:
      "Choose from various investment periods that match your financial goals and timeline.",
    color: "from-purple-500 to-violet-500",
    bgColor:
      "from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20",
  },
  {
    icon: Users,
    title: "Expert Management",
    description:
      "Professional portfolio managers with decades of experience in global markets.",
    color: "from-orange-500 to-red-500",
    bgColor:
      "from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Advanced dashboard with live performance metrics and detailed investment insights.",
    color: "from-indigo-500 to-blue-500",
    bgColor:
      "from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20",
  },
  {
    icon: Zap,
    title: "Instant Execution",
    description:
      "Lightning-fast investment processing with automated portfolio rebalancing.",
    color: "from-yellow-500 to-orange-500",
    bgColor:
      "from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20",
  },
];

const additionalFeatures = [
  {
    icon: Lock,
    title: "Regulatory Compliance",
    description: "Fully licensed and regulated by financial authorities",
  },
  {
    icon: Award,
    title: "Award-Winning Platform",
    description: "Recognized for excellence in investment technology",
  },
  {
    icon: Globe,
    title: "Global Markets",
    description: "Access to international investment opportunities",
  },
  {
    icon: Smartphone,
    title: "Mobile Optimized",
    description: "Full-featured mobile app for on-the-go investing",
  },
  {
    icon: HeadphonesIcon,
    title: "24/7 Support",
    description: "Round-the-clock customer service and technical support",
  },
  {
    icon: CheckCircle,
    title: "Transparent Fees",
    description: "No hidden charges with clear fee structure",
  },
];

export function FeaturesSection() {
  const t = useTranslations("investment/components/features-section");
  return (
    <section className="py-24 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6"
            >
              <Award className="w-4 h-4" />
              {t("why_choose_our_platform")}
            </motion.div>

            <h2 className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
              {t("built_for")}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {t("smart_investors")}
              </span>
            </h2>

            <p className="text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed">
              {t("experience_the_future_expert_management")}
            </p>
          </motion.div>

          {/* Main Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className={`relative group p-8 rounded-2xl bg-gradient-to-br ${feature.bgColor} border border-white/20 dark:border-zinc-700/50 shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-zinc-800/50 dark:to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Hover effect decoration */}
                <div
                  className={`absolute -inset-0.5 bg-gradient-to-br ${feature.color} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`}
                />
              </motion.div>
            ))}
          </div>

          {/* Additional Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-white/20 dark:border-zinc-700/50 shadow-xl"
          >
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                {t("everything_you_need_to_succeed")}
              </h3>
              <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
                {t("our_comprehensive_platform_integrated_solution")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {additionalFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-700 dark:to-zinc-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
