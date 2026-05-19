"use client";

import { Shield, Scale, Flame, Zap, Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
  darkMode?: boolean;
}

// Template styles with unique colors and icons
const templateStyles: Record<string, {
  icon: typeof Shield;
  textColor: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  Conservative: {
    icon: Shield,
    textColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Safe",
  },
  Balanced: {
    icon: Scale,
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "Balanced",
  },
  Aggressive: {
    icon: Flame,
    textColor: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    label: "Risk",
  },
};

export default function TemplatesSelector({
  templates,
  applyTemplate,
  darkMode = true,
}: TemplatesSelectorProps) {
  const t = useTranslations("binary_components");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleApplyTemplate = (template: typeof templates[0]) => {
    setActiveTemplate(template.name);
    applyTemplate(template);
    setTimeout(() => setActiveTemplate(null), 300);
  };

  return (
    <div className={`rounded-lg overflow-hidden transition-all duration-200 ${
      darkMode
        ? "bg-zinc-900/50 border border-zinc-800/40"
        : "bg-gray-50 border border-gray-200"
    }`}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 transition-colors cursor-pointer ${
          darkMode ? "hover:bg-zinc-800/30" : "hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Zap size={11} className={darkMode ? "text-zinc-500" : "text-gray-400"} />
          <span className={`text-[10px] font-medium uppercase tracking-wide ${
            darkMode ? "text-zinc-500" : "text-gray-500"
          }`}>
            {t("templates")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
            Presets
          </span>
          <ChevronDown
            size={10}
            className={`transition-transform duration-200 ${
              darkMode ? "text-zinc-600" : "text-gray-400"
            } ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Template cards - Collapsible */}
      <div className={`grid grid-cols-3 gap-1.5 overflow-hidden transition-all duration-200 ${
        isExpanded ? "max-h-[80px] p-2 pt-1.5" : "max-h-0 p-0"
      }`}>
        {templates.map((template) => {
          const style = templateStyles[template.name] || templateStyles.Balanced;
          const Icon = style.icon;
          const isActive = activeTemplate === template.name;

          return (
            <button
              key={template.name}
              className={`relative group rounded-lg p-1.5 transition-all duration-200 cursor-pointer ${
                darkMode
                  ? `bg-zinc-900/60 border ${isActive ? style.borderColor : "border-zinc-800/50"} hover:border-zinc-700`
                  : `bg-white border ${isActive ? style.borderColor : "border-gray-200"} hover:border-gray-300`
              } ${isActive ? "scale-95" : ""} active:scale-95`}
              onClick={() => handleApplyTemplate(template)}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded flex items-center justify-center ${style.bgColor}`}>
                  <Icon size={14} className={style.textColor} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className={`text-[10px] font-medium truncate ${
                    darkMode ? "text-zinc-300" : "text-gray-700"
                  }`}>
                    {style.label}
                  </div>
                  <div className={`text-[9px] ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
                    ${template.amount}
                  </div>
                </div>
                {isActive && (
                  <Check size={8} className={style.textColor} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
