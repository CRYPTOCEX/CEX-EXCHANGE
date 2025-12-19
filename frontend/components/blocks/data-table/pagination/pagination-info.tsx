import React from "react";
import { useTableStore } from "../store";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Animated number transition variants
const numberVariants = {
  initial: { opacity: 0, y: -10, scale: 0.8 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.8 },
};

export function PaginationInfo() {
  const t = useTranslations("common");
  const page = useTableStore((state) => state.page);
  const totalPages = useTableStore((state) => state.totalPages);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 px-4 py-2",
        "rounded-lg",
        "bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40",
        "border border-border/30",
        "text-sm font-medium"
      )}
    >
      <span className="text-muted-foreground">{t("page")}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={page}
          variants={numberVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "inline-flex items-center justify-center",
            "min-w-6 h-6 px-1.5",
            "rounded-md",
            "bg-primary/10 text-primary",
            "font-semibold tabular-nums"
          )}
        >
          {page}
        </motion.span>
      </AnimatePresence>
      <span className="text-muted-foreground">{t("of")}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={totalPages}
          variants={numberVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "inline-flex items-center justify-center",
            "min-w-6 h-6 px-1.5",
            "rounded-md",
            "bg-muted/50",
            "font-semibold tabular-nums text-foreground"
          )}
        >
          {totalPages}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
