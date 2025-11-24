"use client";

import { useTranslations } from "next-intl";

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

export default function TemplatesSelector({
  templates,
  applyTemplate,
  darkMode = true,
}: TemplatesSelectorProps) {
  const t = useTranslations("binary/components/order/templates-selector");
  return (
    <div
      className={`${darkMode ? "bg-zinc-900" : "bg-gray-100"} p-2 rounded-md`}
    >
      <div className="flex items-center justify-between mb-1">
        <div
          className={`${darkMode ? "text-gray-400" : "text-gray-500"} text-xs`}
        >
          {t("Templates")}
        </div>
      </div>
      <div className="flex gap-1">
        {templates.map((template) => (
          <button
            key={template.name}
            className={`flex-1 ${darkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-200 hover:bg-gray-300"} p-1 rounded text-[12px] ${darkMode ? "text-white" : "text-gray-800"}`}
            onClick={() => applyTemplate(template)}
          >
            {template.name}
          </button>
        ))}
      </div>
    </div>
  );
}
