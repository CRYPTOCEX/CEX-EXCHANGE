"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  getFieldIcon,
  getFieldTypeName,
  getFieldTypeColor,
  getFieldCategory,
} from "./utils";
import { useTranslations } from "next-intl";

interface FieldSummaryProps {
  field: KycField;
  onClose: () => void;
  summaryRef: React.RefObject<HTMLDivElement | null>;
}

export function FieldSummary({
  field,
  onClose,
  summaryRef,
}: FieldSummaryProps) {
  const t = useTranslations("dashboard");
  const fieldColor = getFieldTypeColor(field.type);

  return (
    <div
      ref={summaryRef}
      className={`bg-${fieldColor}-50 dark:bg-${fieldColor}-900/20 p-4 border-b border-${fieldColor}-100 dark:border-${fieldColor}-800/30`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`bg-${fieldColor}-100 dark:bg-${fieldColor}-800/30 p-1.5 rounded-md`}
          >
            {getFieldIcon(field.type)}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`bg-${fieldColor}-50 dark:bg-${fieldColor}-900/20 text-${fieldColor}-600 dark:text-${fieldColor}-400 border-${fieldColor}-100 dark:border-${fieldColor}-800/30 font-normal`}
            >
              {getFieldTypeName(field.type)}
            </Badge>
            <Badge
              variant="outline"
              className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 font-normal"
            >
              {getFieldCategory(field.type)}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
        </Button>
      </div>

      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1 truncate">
        {field.label}
      </h2>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-zinc-400 mt-2">
        <div className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full bg-${fieldColor}-400 dark:bg-${fieldColor}-500`}
          ></span>
          <span>
            {t("id")}
            {field.id.substring(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full bg-${fieldColor}-400 dark:bg-${fieldColor}-500`}
          ></span>
          <span>
            {t("order")}
            {field.order}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${field.required ? "bg-red-500" : "bg-gray-400 dark:bg-zinc-600"}`}
          ></span>
          <span
            className={field.required ? "text-red-500 dark:text-red-400" : ""}
          >
            {field.required ? "Required" : "Optional"}
          </span>
        </div>
        {field.hidden && (
          <div className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            <span className="text-amber-500 dark:text-amber-400">
              {t("Hidden")}
            </span>
          </div>
        )}
      </div>

      {field.description && (
        <div className="mt-3 text-xs text-gray-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-900/50 p-2 rounded-md border border-gray-100 dark:border-zinc-800">
          <p className="italic">{field.description}</p>
        </div>
      )}
    </div>
  );
}
