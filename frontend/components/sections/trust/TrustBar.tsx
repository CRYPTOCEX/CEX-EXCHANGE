"use client";

import { withAlpha } from "../shared/types";
import { m } from "framer-motion";
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
  teal: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.75)" },
  cyan: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.75)" },
  sky: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.75)" },
  blue: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.75)" },
  purple: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.75)" },
  emerald: { from: "hsl(var(--success))", to: "hsl(var(--success) / 0.75)" },
  indigo: { from: "hsl(var(--primary))", to: "hsl(var(--primary) / 0.75)" },
  amber: { from: "hsl(var(--warning))", to: "hsl(var(--warning) / 0.75)" },
  rose: { from: "hsl(var(--destructive))", to: "hsl(var(--destructive) / 0.75)" },
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
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
          >
            {items.slice(0, 4).map((item, index) => (
              <m.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <item.icon className="w-4 h-4" style={{ color: gradient.from }} />
                <span className="text-sm font-medium">{item.label}</span>
              </m.div>
            ))}
          </m.div>
        </div>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={`relative py-10 ${className}`}>
        <div className="container mx-auto">
          <m.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className={`grid grid-cols-2 md:grid-cols-3 ${items.length <= 4 ? "lg:grid-cols-4" : "lg:grid-cols-6"} gap-6`}
          >
            {items.map((item, index) => (
              <m.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-card/5 backdrop-blur-sm border border-border"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${withAlpha(gradient.from, 0.13)}, ${withAlpha(gradient.to, 0.13)})`,
                  }}
                >
                  <item.icon className="w-5 h-5" style={{ color: gradient.from }} />
                </div>
                <span className="text-sm font-semibold text-foreground mb-1">
                  {item.label}
                </span>
                {item.description && (
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                )}
              </m.div>
            ))}
          </m.div>
        </div>
      </div>
    );
  }

  // Default variant - scrolling marquee style
  return (
    <div className={`relative py-8 overflow-hidden ${className}`}>

      <div className="container mx-auto relative z-20">
        {/* Trust label */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div
            className="h-px w-12"
            style={{
              background: `linear-gradient(to right, transparent, ${withAlpha(gradient.from, 0.31)})`,
            }}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-subtle-foreground">
            {title}
          </span>
          <div
            className="h-px w-12"
            style={{
              background: `linear-gradient(to left, transparent, ${withAlpha(gradient.from, 0.31)})`,
            }}
          />
        </m.div>

        {/* Trust items - animated marquee */}
        <div className="relative">
          <m.div
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
                    background: `linear-gradient(135deg, ${withAlpha(gradient.from, 0.08)}, ${withAlpha(gradient.to, 0.08)})`,
                    border: `1px solid ${withAlpha(gradient.from, 0.19)}`,
                  }}
                >
                  <item.icon
                    className="w-5 h-5"
                    style={{ color: gradient.from }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-xs text-subtle-foreground whitespace-nowrap">
                      {item.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </m.div>
        </div>

        {/* Bottom accent line */}
        <m.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mt-8 h-px mx-auto max-w-2xl"
          style={{
            background: `linear-gradient(90deg, transparent, ${withAlpha(gradient.from, 0.19)}, ${withAlpha(gradient.to, 0.19)}, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
