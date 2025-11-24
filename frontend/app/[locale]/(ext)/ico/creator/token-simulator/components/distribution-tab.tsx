"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/ico/utils";
import type { TokenDistribution } from "@/lib/ico/token-simulator/types";
import { useTranslations } from "next-intl";

interface DistributionTabProps {
  distribution: TokenDistribution[];
  totalSupply: number;
  onDistributionChange: (index: number, value: number) => void;
}
export function DistributionTab({
  distribution,
  totalSupply,
  onDistributionChange,
}: DistributionTabProps) {
  const t = useTranslations("ext");
  const totalAllocation = distribution.reduce(
    (sum, item) => sum + item.value,
    0
  );
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Left side: Distribution items */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t("allocation_percentages")}</h3>

        <div className="grid gap-4">
          {distribution.map((item, index) => {
            const tokensForItem = Math.floor((item.value / 100) * totalSupply);
            return (
              <div
                key={index}
                className="p-4 rounded-md border border-border space-y-3"
              >
                {/* Header row: color + name + token count */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: item.color,
                      }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(tokensForItem)}
                    {t("tokens")}
                  </span>
                </div>

                {/* Slider + input row */}
                <div className="flex items-center gap-3">
                  <Slider
                    value={[item.value]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) =>
                      onDistributionChange(index, value[0])
                    }
                    className="w-full"
                  />
                  <Input
                    type="number"
                    value={item.value}
                    onChange={(e) =>
                      onDistributionChange(index, Number(e.target.value))
                    }
                    min={0}
                    max={100}
                    className="w-24 text-center"
                    icon="mdi:percent"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total allocation */}
        <div className="p-4 bg-muted rounded-md flex items-center justify-between border border-border/30">
          <span className="text-sm font-medium">{t("total_allocation")}</span>
          <span
            className={`text-sm font-medium ${totalAllocation === 100 ? "text-green-500" : "text-red-500"}`}
          >
            {totalAllocation}%
          </span>
        </div>
      </div>

      {/* Right side: Pie chart */}
      <div className="flex flex-col">
        <h3 className="text-lg font-medium mb-4">
          {t("distribution_visualization")}
        </h3>
        <div className="flex-1 h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="90%"
                innerRadius="50%"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {distribution.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
