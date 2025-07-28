import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { CellRendererProps } from "./cell-renderer-props";

const variants = {
  success: {
    dot: "bg-emerald-500 dark:bg-emerald-400",
    badge:
      "bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/15 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400",
  },
  danger: {
    dot: "bg-rose-500 dark:bg-rose-400",
    badge:
      "bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400",
  },
};

interface BooleanCellProps extends CellRendererProps<boolean> {
  labels?: {
    true: string;
    false: string;
  };
}

export function BooleanCell({ value, row, labels }: BooleanCellProps) {
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
        {value ? "Yes" : "No"}
      </Badge>
    </div>
  );
}
