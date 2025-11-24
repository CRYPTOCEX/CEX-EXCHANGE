"use client";

import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("blog");
  const { user } = useUserStore();
  if (!user) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl bg-gradient-to-r pb-8 from-indigo-700 via-indigo-800 to-indigo-900 dark:from-indigo-900 dark:via-indigo-950 dark:to-indigo-900 px-8 py-16 text-center sm:px-16 relative overflow-hidden"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-1/2 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-1/2 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent"></div>
      <div className="relative z-10">
        <h2 className="text-3xl font-bold tracking-tight text-white">
          {t("ready_to_share_your_knowledge")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-100">
          {t("join_our_community_growing_audience")}.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/blog/author/apply"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Button size="lg" variant="secondary">
              {t("apply_to_be_an_author")}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
