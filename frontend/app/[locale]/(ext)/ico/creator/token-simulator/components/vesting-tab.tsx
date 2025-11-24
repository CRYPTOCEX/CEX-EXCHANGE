"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumber, formatPercentage } from "@/lib/ico/utils";
import type {
  VestingSchedule,
  VestingReleaseData,
} from "@/lib/ico/token-simulator/types";
interface VestingTabProps {
  vestingSchedules: VestingSchedule[];
  vestingReleaseData: VestingReleaseData[];
  totalSupply: number;
  projectionMonths: number;
  onVestingChange: (
    id: string,
    field: keyof VestingSchedule,
    value: number
  ) => void;
}
export function VestingTab({
  vestingSchedules,
  vestingReleaseData,
  totalSupply,
  projectionMonths,
  onVestingChange,
}: VestingTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Vesting Parameters</h3>
        <div className="grid gap-6">
          {vestingSchedules.map((schedule) => {
            return (
              <div
                key={schedule.id}
                className="p-4 border rounded-lg space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: schedule.color,
                    }}
                  ></div>
                  <h4 className="font-medium">{schedule.name}</h4>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {schedule.allocation}%
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Initial Unlock (%)
                  </label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[schedule.initialUnlock]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(value) =>
                        onVestingChange(schedule.id, "initialUnlock", value[0])
                      }
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={schedule.initialUnlock}
                      onChange={(e) =>
                        onVestingChange(
                          schedule.id,
                          "initialUnlock",
                          Number(e.target.value)
                        )
                      }
                      min={0}
                      max={100}
                      className="w-24 text-center"
                      icon="mdi:percent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Cliff (months)
                    </label>
                    <Input
                      type="number"
                      value={schedule.cliffMonths}
                      onChange={(e) =>
                        onVestingChange(
                          schedule.id,
                          "cliffMonths",
                          Number(e.target.value)
                        )
                      }
                      min={0}
                      max={36}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Vesting (months)
                    </label>
                    <Input
                      type="number"
                      value={schedule.vestingMonths}
                      onChange={(e) =>
                        onVestingChange(
                          schedule.id,
                          "vestingMonths",
                          Number(e.target.value)
                        )
                      }
                      min={1}
                      max={60}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium">Token Release Schedule</h3>
        <div className="aspect-4/3 w-full bg-card/50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={vestingReleaseData.filter(
                (_, i) =>
                  i % Math.max(1, Math.floor(projectionMonths / 24)) === 0 ||
                  i === 0 ||
                  i === projectionMonths
              )}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                {vestingSchedules.map((schedule) => (
                  <linearGradient
                    key={schedule.id}
                    id={`color-${schedule.name.replace(/\s+/g, "-").toLowerCase()}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={schedule.color}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={schedule.color}
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.2}
              />
              <XAxis
                dataKey="month"
                label={{
                  value: "Months After TGE",
                  position: "insideBottom",
                  offset: -5,
                }}
                tick={{
                  fontSize: 12,
                }}
              />
              <YAxis
                tickFormatter={(value) =>
                  `${((value / totalSupply) * 100).toFixed(0)}%`
                }
                label={{
                  value: "% of Total Supply",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                }}
                tick={{
                  fontSize: 12,
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-md shadow-md p-3 text-sm">
                        <p className="font-medium mb-2">Month {label}</p>
                        <div className="space-y-1">
                          {payload
                            .filter(
                              (entry) =>
                                entry.dataKey !== "month" &&
                                entry.dataKey !== "totalReleased" &&
                                typeof entry.value === "number" &&
                                entry.value > 0
                            )
                            .sort(
                              (a, b) =>
                                (b.value as number) - (a.value as number)
                            )
                            .map((entry, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between gap-4"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        vestingSchedules.find(
                                          (s) => s.name === entry.dataKey
                                        )?.color || "#888",
                                    }}
                                  />
                                  <span>{entry.dataKey as string}:</span>
                                </div>
                                <span className="font-medium">
                                  {formatPercentage(
                                    ((entry.value as number) / totalSupply) *
                                      100
                                  )}
                                </span>
                              </div>
                            ))}
                          <div className="border-t pt-1 mt-1">
                            <div className="flex items-center justify-between font-medium">
                              <span>Total Circulating:</span>
                              <span>
                                {formatPercentage(
                                  (payload.find(
                                    (p) => p.dataKey === "percentReleased"
                                  )?.value as number) || 0
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{
                  paddingBottom: "10px",
                }}
                payload={vestingSchedules
                  .filter((schedule) => schedule.allocation > 0)
                  .map((schedule) => ({
                    value: schedule.name,
                    type: "square",
                    color: schedule.color,
                  }))}
              />
              {vestingSchedules
                .filter((schedule) => schedule.allocation > 0)
                .map((schedule) => (
                  <Area
                    key={schedule.id}
                    type="monotone"
                    dataKey={schedule.name}
                    stackId="1"
                    stroke={schedule.color}
                    fillOpacity={1}
                    fill={`url(#color-${schedule.name.replace(/\s+/g, "-").toLowerCase()})`}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              TGE Circulating Supply
            </p>
            <p className="font-medium">
              {formatNumber(vestingReleaseData[0]?.circulatingSupply || 0)}
              <span className="text-sm text-muted-foreground ml-2">
                ({formatPercentage(vestingReleaseData[0]?.percentReleased || 0)}
                )
              </span>
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">After 1 Year</p>
            <p className="font-medium">
              {formatNumber(vestingReleaseData[12]?.circulatingSupply || 0)}
              <span className="text-sm text-muted-foreground ml-2">
                (
                {formatPercentage(vestingReleaseData[12]?.percentReleased || 0)}
                )
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {vestingSchedules
            .filter((schedule) => schedule.allocation > 0)
            .slice(0, 4)
            .map((schedule) => {
              return (
                <div
                  key={schedule.id}
                  className="p-3 bg-card/50 border rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: schedule.color,
                      }}
                    ></div>
                    <p className="text-sm font-medium">{schedule.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {schedule.initialUnlock}% at TGE,{" "}
                    {schedule.cliffMonths > 0
                      ? `${schedule.cliffMonths} month cliff, `
                      : ""}
                    {schedule.vestingMonths} month vesting
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
