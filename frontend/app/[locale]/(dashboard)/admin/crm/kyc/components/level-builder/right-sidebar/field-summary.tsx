"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { getFieldIcon, getFieldTypeName } from "./utils";
import { FIELD_TONE, getFieldCategoryLabel } from "../field-tokens";
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
  const t = useTranslations("common");

  return (
    <div
      ref={summaryRef}
      className={`p-4 border-b ${FIELD_TONE.strip}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${FIELD_TONE.chipOnStrip}`}>
            {getFieldIcon(field.type)}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={`font-normal ${FIELD_TONE.badge}`}
            >
              {getFieldTypeName(field.type)}
            </Badge>
            <Badge
              variant="outline"
              className={`font-normal ${FIELD_TONE.badge}`}
            >
              {getFieldCategoryLabel(field.type)}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 rounded-full hover:bg-muted"
        >
          <X className="h-3.5 w-3.5 text-subtle-foreground" />
        </Button>
      </div>

      <h2 className="text-lg font-medium text-foreground mb-1 truncate">
        {field.label}
      </h2>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle-foreground mt-2">
        <div className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${FIELD_TONE.dot}`}
          ></span>
          <span>
            ID {field.id.substring(0, 8)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${FIELD_TONE.dot}`}
          ></span>
          <span>
            {t("order")} {field.order}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${field.required ? "bg-destructive" : "bg-border-strong"}`}
          ></span>
          <span
            className={field.required ? "text-destructive" : ""}
          >
            {field.required ? t("required") : t("optional")}
          </span>
        </div>
        {field.hidden && (
          <div className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning"></span>
            <span className="text-warning">
              {t("hidden")}
            </span>
          </div>
        )}
      </div>

      {field.description && (
        <div className="mt-3 text-xs text-muted-foreground bg-card/50 dark:bg-surface-2/50 p-2 rounded-md border border-border">
          <p className="italic">{field.description}</p>
        </div>
      )}
    </div>
  );
}
