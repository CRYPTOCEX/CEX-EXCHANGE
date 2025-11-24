"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { StatCardProps } from "../../types";

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = "default",
}: StatCardProps) {
  const colorClasses = {
    default: "border-border/50 bg-card/50 hover:bg-accent/50",
    blue: "border-blue-200/50 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/90 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10 hover:from-blue-100/90 dark:hover:from-blue-900/30",
    green:
      "border-green-200/50 dark:border-green-800/50 bg-gradient-to-br from-green-50/90 to-green-50/30 dark:from-green-950/30 dark:to-green-950/10 hover:from-green-100/90 dark:hover:from-green-900/30",
    amber:
      "border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/90 to-amber-50/30 dark:from-amber-950/30 dark:to-amber-950/10 hover:from-amber-100/90 dark:hover:from-amber-900/30",
    red: "border-red-200/50 dark:border-red-800/50 bg-gradient-to-br from-red-50/90 to-red-50/30 dark:from-red-950/30 dark:to-red-950/10 hover:from-red-100/90 dark:hover:from-red-900/30",
    purple:
      "border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/90 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-950/10 hover:from-purple-100/90 dark:hover:from-purple-900/30",
  };

  const iconColorClasses = {
    default: "text-muted-foreground bg-muted",
    blue: "text-blue-600 dark:text-blue-400 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-800/30",
    green:
      "text-green-600 dark:text-green-400 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/50 dark:to-green-800/30",
    amber:
      "text-amber-600 dark:text-amber-400 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-800/30",
    red: "text-red-600 dark:text-red-400 bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/50 dark:to-red-800/30",
    purple:
      "text-purple-600 dark:text-purple-400 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/50 dark:to-purple-800/30",
  };

  const trendClasses = {
    positive:
      "bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/30 dark:to-green-800/20 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-800/50",
    negative:
      "bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-800/50",
  };

  const iconVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const contentVariants = {
    initial: { y: 10, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.3,
        delay: 0.1,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover={{
        y: -5,
        transition: { duration: 0.2 },
      }}
      className="h-full"
    >
      <Card
        className={`border shadow-sm transition-all duration-200 overflow-hidden ${colorClasses[color]} h-full`}
      >
        <CardContent className="p-6 relative flex flex-col h-full">
          <div className="flex justify-between items-start">
            <motion.div variants={contentVariants} className="z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {title}
              </p>
              <h3 className="text-2xl font-bold text-foreground">{value}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </motion.div>
            <motion.div
              variants={iconVariants}
              className={`p-3 rounded-full shadow-sm ${iconColorClasses[color]} z-10`}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
          </div>

          {trend && (
            <motion.div
              className="flex items-center mt-auto pt-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            >
              <Badge
                variant="outline"
                className={`${trend.value > 0 ? trendClasses.positive : trendClasses.negative} shadow-sm`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </Badge>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
