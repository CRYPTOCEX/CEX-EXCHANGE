"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "../types/openapi";

interface MethodBadgeProps {
  method: HttpMethod | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const methodStyles: Record<string, string> = {
  get: "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30",
  post: "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30",
  put: "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30",
  patch: "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30",
  delete: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30",
  del: "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30", // Alias for delete
  options: "bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30",
  head: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30",
  trace: "bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30",
};

const sizeStyles = {
  sm: "text-[10px] px-1.5 py-0.5 font-semibold",
  md: "text-xs px-2 py-0.5 font-semibold",
  lg: "text-sm px-2.5 py-1 font-semibold",
};

export function MethodBadge({ method, size = "md", className }: MethodBadgeProps) {
  const methodLower = method.toLowerCase();
  const style = methodStyles[methodLower] || methodStyles.get;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono uppercase tracking-wide",
        style,
        sizeStyles[size],
        className
      )}
    >
      {method.toUpperCase()}
    </Badge>
  );
}

// Component for method filter checkboxes
interface MethodFilterProps {
  methods: HttpMethod[];
  selected: HttpMethod[];
  onChange: (methods: HttpMethod[]) => void;
  className?: string;
}

export function MethodFilter({ methods, selected, onChange, className }: MethodFilterProps) {
  const toggleMethod = (method: HttpMethod) => {
    if (selected.includes(method)) {
      onChange(selected.filter((m) => m !== method));
    } else {
      onChange([...selected, method]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {methods.map((method) => (
        <button
          key={method}
          onClick={() => toggleMethod(method)}
          className={cn(
            "transition-all",
            selected.includes(method)
              ? "opacity-100 scale-100"
              : "opacity-50 scale-95 hover:opacity-75"
          )}
        >
          <MethodBadge method={method} size="sm" />
        </button>
      ))}
    </div>
  );
}
