import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeText: string;
  trend: "up" | "down" | "neutral";
  icon: ReactNode;
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  changeText,
  trend,
  icon,
  isLoading = false,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-6 w-24 animate-pulse rounded bg-muted"></div>
            <div className="h-4 w-32 animate-pulse rounded bg-muted"></div>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center text-xs">
              {trend === "up" && (
                <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
              )}
              {trend === "down" && (
                <TrendingDown className="mr-1 h-3 w-3 text-rose-500" />
              )}
              <span
                className={cn(
                  trend === "up" && "text-emerald-500",
                  trend === "down" && "text-rose-500"
                )}
              >
                {change}
              </span>
              <span className="ml-1 text-muted-foreground">{changeText}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
