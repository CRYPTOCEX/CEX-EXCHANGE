"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardLoading() {
  const t = useTranslations("ext_copy-trading");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950 flex items-center justify-center pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 mx-auto mb-6 bg-linear-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center">
            <Crown className="h-10 w-10 text-white animate-pulse" />
          </div>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400">{t("loading_your_dashboard_ellipsis")}</p>
      </motion.div>
    </div>
  );
}
