"use client";

import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, PenLine, Zap, Star } from "lucide-react";

export function CTASection() {
  const t = useTranslations("blog_blog");
  const { user } = useUserStore();

  if (!user) return null;

  return (
    <section className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600" />

      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-white/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Content */}
      <div className="relative z-10 px-4 py-20 text-center max-w-5xl mx-auto">
        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white mb-8"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="text-sm font-medium">Join our community</span>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-8"
        >
          <span className="bg-linear-to-r from-white via-indigo-200 to-white bg-clip-text text-transparent">
            {t("ready_to_share_your_knowledge")}
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto max-w-2xl text-xl sm:text-2xl text-white/80 mb-12"
        >
          {t("join_our_community_growing_audience")}
        </motion.p>

        {/* Features row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 mb-12"
        >
          {[
            { icon: PenLine, text: "Write articles" },
            { icon: Zap, text: "Reach readers" },
            { icon: Star, text: "Build reputation" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 text-white/90"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-lg">{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link href="/blog/author/apply">
            <Button
              size="lg"
              className="rounded-full bg-white text-indigo-700 hover:bg-white/90 shadow-2xl hover:shadow-white/25 transition-all duration-300 text-lg px-10 py-7 h-auto font-semibold"
            >
              {t("apply_to_be_an_author")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-24 h-24 border border-white/10 rounded-full opacity-50" />
        <div className="absolute bottom-20 right-10 w-40 h-40 border border-white/10 rounded-full opacity-50" />
        <div className="absolute top-1/3 right-20 w-3 h-3 bg-amber-400 rounded-full opacity-75 animate-pulse" />
        <div className="absolute bottom-1/3 left-16 w-2 h-2 bg-pink-400 rounded-full opacity-75 animate-pulse delay-500" />
        <div className="absolute top-1/2 left-10 w-4 h-4 bg-white/30 rounded-full opacity-50 animate-pulse delay-300" />
        <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-indigo-300 rounded-full opacity-75 animate-pulse delay-700" />
      </div>
    </section>
  );
}
