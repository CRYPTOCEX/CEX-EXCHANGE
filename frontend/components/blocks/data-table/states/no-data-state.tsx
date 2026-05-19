import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ShieldOff,
  FileX2,
  Search,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

// Premium state animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0.5, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const textVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Subtle floating animation for the icon
const floatingAnimation = {
  y: [-2, 2, -2],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

interface NoDataStateProps {
  colSpan: number;
  type: "no-permission" | "no-results" | "filtered" | "error" | "loading";
  className?: string;
  isCard?: boolean;
}

export function NoDataState({ colSpan, type, className, isCard }: NoDataStateProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");

  const stateConfig = {
    "no-permission": {
      icon: ShieldOff,
      message: t("you_dont_have_permission_to_view_this_data"),
      description: t("please_contact_your_administrator_for_access"),
    },
    "no-results": {
      icon: FileX2,
      message: tCommon("no_data_available"),
      description: t("there_are_no_items_to_display_at_this_time"),
    },
    filtered: {
      icon: Search,
      message: t("no_matching_results"),
      description: tCommon("try_adjusting_your_search_or_filter_criteria"),
    },
    error: {
      icon: AlertTriangle,
      message: t("an_error_occurred"),
      description: t("there_was_a_problem_fetching_the_data"),
    },
    loading: {
      icon: Loader2,
      message: t("loading_data"),
      description: t("please_wait_while_we_fetch_the_data"),
    },
  };

  const config = stateConfig[type];
  const Icon = config.icon;

  // Card view content (without table wrapper)
  const content = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full space-y-4"
    >
      <motion.div
        variants={iconVariants}
        animate={type !== "loading" ? floatingAnimation : undefined}
        className="relative"
      >
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-20",
            type === "error" ? "bg-destructive" : "bg-muted-foreground"
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <Icon
          className={cn(
            "h-12 w-12 text-muted-foreground relative z-10",
            type === "loading" && "animate-spin"
          )}
        />
      </motion.div>
      <motion.div
        variants={textVariants}
        className="space-y-2 max-w-[250px] flex items-center justify-center flex-col"
      >
        <motion.p
          variants={textVariants}
          className="text-lg font-medium text-foreground text-center"
        >
          {config.message}
        </motion.p>
        <motion.p
          variants={textVariants}
          className="text-sm text-muted-foreground text-center"
        >
          {config.description}
        </motion.p>
      </motion.div>
    </motion.div>
  );

  // For card view, return content directly without table wrapper
  if (isCard) {
    return (
      <div className={cn("h-[300px] flex items-center justify-center", className)}>
        {content}
      </div>
    );
  }

  // For table view, wrap in TableRow/TableCell
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn("h-[400px] text-center", className)}
      >
        {content}
      </TableCell>
    </TableRow>
  );
}
