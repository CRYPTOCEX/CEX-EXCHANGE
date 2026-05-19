"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBgColor?: string;
  valueColor?: string;
}

interface StatsGroupProps {
  stats: StatItem[];
  gap?: string;
  animationDelay?: number; // Base delay before starting the stagger
}

export function StatsGroup({ stats, gap = "gap-6", animationDelay = 0.4 }: StatsGroupProps) {
  return (
    <div className={`flex flex-wrap ${gap}`}>
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: animationDelay + index * 0.1, // Stagger each stat by 100ms
          }}
          className="flex items-center gap-2"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              stat.iconBgColor || "bg-primary/10"
            }`}
          >
            <stat.icon
              className={`h-4 w-4 ${stat.iconColor || "text-primary"}`}
            />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</p>
            {stat.value && (
              <p
                className={`font-bold ${
                  stat.valueColor || "text-zinc-900 dark:text-white"
                }`}
              >
                {stat.value}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
