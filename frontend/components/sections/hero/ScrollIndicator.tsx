"use client";

import { m } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ScrollIndicatorConfig } from "./types";

interface ScrollIndicatorProps {
  config?: ScrollIndicatorConfig;
}

export default function ScrollIndicator({ config }: ScrollIndicatorProps) {
  if (!config?.enabled) return null;

  const { style = "mouse", text, className } = config;

  const renderMouse = () => (
    <m.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-6 h-10 rounded-full border-2 border-border-strong flex items-start justify-center p-2"
    >
      <m.div className="w-1.5 h-1.5 rounded-full bg-primary" />
    </m.div>
  );

  const renderArrow = () => (
    <m.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="flex flex-col items-center gap-1"
    >
      <div className="w-0.5 h-8 bg-muted" />
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </m.div>
  );

  const renderChevron = () => (
    <m.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="flex flex-col items-center"
    >
      <ChevronDown className="w-6 h-6 text-muted-foreground" />
      <ChevronDown className="w-6 h-6 -mt-3 text-muted-foreground" />
    </m.div>
  );

  const renderDot = () => (
    <m.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="w-3 h-3 rounded-full bg-primary/50"
    />
  );

  const renderIndicator = () => {
    switch (style) {
      case "mouse":
        return renderMouse();
      case "arrow":
        return renderArrow();
      case "chevron":
        return renderChevron();
      case "dot":
        return renderDot();
      default:
        return renderMouse();
    }
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5 }}
      className={
        className || "hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-10"
      }
    >
      {renderIndicator()}
      {text && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {text}
        </span>
      )}
    </m.div>
  );
}
