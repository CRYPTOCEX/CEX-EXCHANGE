import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface MetadataConfigItem {
  key: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  options?: Option[];
  render?: (value: any, row: any) => React.ReactNode;
  title: string;
  type?: "text" | "date" | "select";
}

interface MetadataItemProps {
  item: MetadataConfigItem;
  value: any;
  row: any;
}

const colorVariants: Record<string, string> = {
  success:
    "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  danger:
    "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400",
  warning:
    "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  info: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400",
  primary: "bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary",
  secondary:
    "bg-secondary/10 hover:bg-secondary/20 text-secondary dark:text-secondary",
  muted: "bg-muted/10 hover:bg-muted/20 text-muted-foreground",
  default:
    "bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-gray-400",
};

export function MetadataItem({ item, value, row }: MetadataItemProps) {
  if (item.options) {
    const option = item.options.find(
      (opt: Option) => opt.value === value?.toString()
    );
    const colorClass = option?.color
      ? (colorVariants[option.color] ?? colorVariants.default)
      : colorVariants.default;
    return (
      <Badge
        variant="outline"
        className={cn(colorClass, "flex items-center gap-1 font-medium")}
      >
        {item.icon && <item.icon className="h-3 w-3" />}
        {value?.name || option?.label || value}
      </Badge>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {item.icon && <item.icon className="h-4 w-4" />}
      <span>{item.render ? item.render(value, row) : value}</span>
    </div>
  );
}
