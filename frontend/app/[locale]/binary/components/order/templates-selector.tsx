"use client";

import { Shield, Scale, Flame, Zap, Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FieldLabel, Panel } from "./order-ui";

interface TemplatesSelectorProps {
  templates: Array<{
    name: string;
    amount: number;
    expiryMinutes: number;
    riskPercent: number;
    takeProfitPercent: number;
    stopLossPercent: number;
  }>;
  applyTemplate: (template: {
    name: string;
    amount: number;
    expiryMinutes: number;
    riskPercent: number;
    takeProfitPercent: number;
    stopLossPercent: number;
  }) => void;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
}

/**
 * The three presets are a risk LADDER, not three identities, so they read as
 * neutral -> interactive -> caution rather than as three brand hues. Nothing
 * here is an error, so `destructive` is deliberately not used.
 */
const templateStyles: Record<
  string,
  { icon: typeof Shield; tint: string; ink: string; label: string }
> = {
  Conservative: {
    icon: Shield,
    tint: "bg-surface-3",
    ink: "text-muted-foreground",
    label: "Safe",
  },
  Balanced: {
    icon: Scale,
    tint: "bg-primary/10",
    ink: "text-primary",
    label: "Balanced",
  },
  Aggressive: {
    icon: Flame,
    tint: "bg-warning/10",
    ink: "text-warning",
    label: "Risk",
  },
};

export default function TemplatesSelector({
  templates,
  applyTemplate,
}: TemplatesSelectorProps) {
  const t = useTranslations("binary_components");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleApplyTemplate = (template: (typeof templates)[0]) => {
    setActiveTemplate(template.name);
    applyTemplate(template);
    setTimeout(() => setActiveTemplate(null), 300);
  };

  return (
    <Panel className="transition-all duration-200">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 transition-colors cursor-pointer hover:bg-surface-3"
      >
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-subtle-foreground" />
          <FieldLabel>{t("templates")}</FieldLabel>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-subtle-foreground">Presets</span>
          <ChevronDown
            size={10}
            className={cn(
              "transition-transform duration-200 text-subtle-foreground",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Template cards - Collapsible */}
      <div
        className={cn(
          "grid grid-cols-3 gap-1.5 overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[80px] p-2 pt-1.5" : "max-h-0 p-0"
        )}
      >
        {templates.map((template) => {
          const style = templateStyles[template.name] || templateStyles.Balanced;
          const Icon = style.icon;
          const isActive = activeTemplate === template.name;

          return (
            <button
              key={template.name}
              className={cn(
                "relative group rounded-lg p-1.5 transition-all duration-200 cursor-pointer bg-card border hover:border-border-strong active:scale-95",
                isActive ? "border-primary scale-95" : "border-border"
              )}
              onClick={() => handleApplyTemplate(template)}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded flex items-center justify-center",
                    style.tint
                  )}
                >
                  <Icon size={14} className={style.ink} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-[10px] font-medium truncate text-foreground">
                    {style.label}
                  </div>
                  <div className="text-[9px] text-subtle-foreground">
                    ${template.amount}
                  </div>
                </div>
                {isActive && <Check size={8} className="text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
