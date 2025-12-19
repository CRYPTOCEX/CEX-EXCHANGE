"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface TrustItem {
  icon: LucideIcon;
  label: string;
  description?: string;
}

export interface TrustBarProps {
  items: TrustItem[];
  theme?: {
    primary?: string;
    secondary?: string;
  };
  variant?: "default" | "minimal" | "detailed";
  title?: string;
  className?: string;
}

// Color map
const colorMap: Record<string, { from: string; to: string }> = {
  teal: { from: "#14b8a6", to: "#0d9488" },
  cyan: { from: "#06b6d4", to: "#0891b2" },
  sky: { from: "#0ea5e9", to: "#0284c7" },
  blue: { from: "#3b82f6", to: "#2563eb" },
  purple: { from: "#a855f7", to: "#9333ea" },
  emerald: { from: "#10b981", to: "#059669" },
  indigo: { from: "#6366f1", to: "#4f46e5" },
  amber: { from: "#f59e0b", to: "#d97706" },
  rose: { from: "#f43f5e", to: "#e11d48" },
};

export default function TrustBar({
  items,
  theme = { primary: "teal", secondary: "cyan" },
  variant = "default",
  title = "Why Trust Us",
  className = "",
}: TrustBarProps) {
  const gradient = colorMap[theme.primary || "teal"] || colorMap.teal;

  if (!items || items.length === 0) {
    return null;
  }

  if (variant === "minimal") {
    return (
      <div className={`relative py-6 ${className}`}>
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {items.slice(0, 4).map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-zinc-400"
              >
                <item.icon className="w-4 h-4" style={{ color: gradient.from }} />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={`relative py-10 ${className}`}>
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className={`grid grid-cols-2 md:grid-cols-3 ${items.length <= 4 ? "lg:grid-cols-4" : "lg:grid-cols-6"} gap-6`}
          >
            {items.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}20, ${gradient.to}20)`,
                  }}
                >
                  <item.icon className="w-5 h-5" style={{ color: gradient.from }} />
                </div>
                <span className="text-sm font-semibold text-white mb-1">
                  {item.label}
                </span>
                {item.description && (
                  <span className="text-xs text-zinc-400">{item.description}</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // Default variant - scrolling marquee style
  return (
    <div className={`relative py-8 overflow-hidden ${className}`}>

      <div className="container mx-auto relative z-20">
        {/* Trust label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div
            className="h-px w-12"
            style={{
              background: `linear-gradient(to right, transparent, ${gradient.from}50)`,
            }}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {title}
          </span>
          <div
            className="h-px w-12"
            style={{
              background: `linear-gradient(to left, transparent, ${gradient.from}50)`,
            }}
          />
        </motion.div>

        {/* Trust items - animated marquee */}
        <div className="relative">
          <motion.div
            className="flex items-center gap-12 md:gap-16"
            animate={{
              x: [0, -1000],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear",
              },
            }}
          >
            {/* Triple the items for seamless loop */}
            {[...items, ...items, ...items].map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex items-center gap-3 shrink-0"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.from}15, ${gradient.to}15)`,
                    border: `1px solid ${gradient.from}30`,
                  }}
                >
                  <item.icon
                    className="w-5 h-5"
                    style={{ color: gradient.from }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                      {item.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-8 h-px mx-auto max-w-2xl"
          style={{
            background: `linear-gradient(90deg, transparent, ${gradient.from}30, ${gradient.to}30, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
