"use client";

import type React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TokenMetricCard = ({
  title,
  value,
  icon,
  description,
  trend,
  trendValue,
  comparison,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  comparison?: {
    label: string;
    value: string | number;
  };
}) => {
  return (
    <Card className="bg-primary/5 border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {trend && trendValue && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-medium",
                    trend === "up" &&
                      "bg-green-50 text-green-700 border-green-200",
                    trend === "down" && "bg-red-50 text-red-700 border-red-200",
                    trend === "neutral" &&
                      "bg-gray-50 text-gray-700 border-gray-200"
                  )}
                >
                  {trend === "up" && "↑"}
                  {trend === "down" && "↓"}
                  {trendValue}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {comparison && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <span>{comparison.label}:</span>
                <span className="font-medium">{comparison.value}</span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { TokenMetricCard };
