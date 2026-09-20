import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { CellRendererProps } from "./cell-renderer-props";
import { useTranslations } from "next-intl";

const variants = {
  success: {
    dot: "bg-success",
    badge:
      "bg-success/10 dark:bg-success/20 hover:bg-success/15 dark:hover:bg-success/25 text-success-ink",
  },
  danger: {
    dot: "bg-destructive",
    badge:
      "bg-destructive/10 dark:bg-destructive/20 hover:bg-destructive/15 dark:hover:bg-destructive/25 text-destructive-ink",
  },
};

interface BooleanCellProps extends CellRendererProps<boolean> {
  labels?: {
    true: string;
    false: string;
  };
}

export function BooleanCell({ value, row, labels }: BooleanCellProps) {
  const t = useTranslations("common");
  if (labels) {
    return <span>{value ? labels.true : labels.false}</span>;
  }

  const variantKey = value ? "success" : "danger";
  const variant = variants[variantKey];
  const IconComponent = value ? Check : X;

  return (
    <div className="flex items-center">
      <Badge className={`font-medium transition-colors ${variant.badge}`}>
        <IconComponent className="mr-1.5 h-4 w-4" />
        {value ? t("yes") : t("no")}
      </Badge>
    </div>
  );
}
