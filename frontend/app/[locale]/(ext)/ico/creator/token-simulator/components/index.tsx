"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

import { DistributionTab } from "./distribution-tab";
import { VestingTab } from "./vesting-tab";
import { ProjectionTab } from "./projection-tab";
import { SimulatorHeader } from "./simulator-header";

import { INITIAL_STATE } from "@/lib/ico/token-simulator/constants";
import { calculateSimulatorData } from "@/lib/ico/token-simulator/calculations";
import type {
  TokenDistribution,
  VestingSchedule,
  SimulatorState,
} from "@/lib/ico/token-simulator/types";
import { toast } from "sonner";
import { debounce } from "@/utils/debounce";
import { useTranslations } from "next-intl";

export function TokenEconomicsSimulator() {
  const t = useTranslations("ext");
  const [activeTab, setActiveTab] = useState("distribution");
  const [state, setState] = useState<SimulatorState>(INITIAL_STATE);

  // Calculate derived data
  const { vestingReleaseData, marketProjections, initialMarketCap } = useMemo(
    () => calculateSimulatorData(state),
    [state]
  );

  // Update total supply
  const updateTotalSupply = (value: number) => {
    setState((prev) => ({ ...prev, totalSupply: value }));
  };

  // Update initial price
  const updateInitialPrice = (value: number) => {
    setState((prev) => ({ ...prev, initialPrice: value }));
  };

  // Update distribution
  const updateDistribution = (newDistribution: TokenDistribution[]) => {
    setState((prev) => ({ ...prev, distribution: newDistribution }));
  };

  // Update vesting schedules
  const updateVestingSchedules = (newSchedules: VestingSchedule[]) => {
    setState((prev) => ({ ...prev, vestingSchedules: newSchedules }));
  };

  // Update market parameters
  const updateMarketParams = (params: Partial<SimulatorState>) => {
    setState((prev) => ({ ...prev, ...params }));
  };

  // Handle distribution change
  const handleDistributionChangeCore = (index: number, newValue: number) => {
    // Calculate the sum of all other allocations
    const currentTotal = state.distribution.reduce(
      (sum, item, i) => sum + (i === index ? 0 : item.value),
      0
    );

    // Clamp the new value so that the total cannot exceed 100%
    let finalValue = newValue;
    if (currentTotal + finalValue > 100) {
      finalValue = Math.max(0, 100 - currentTotal);
    }

    // Update distribution
    const newDistribution = [...state.distribution];
    newDistribution[index].value = finalValue;
    updateDistribution(newDistribution);

    // Also update vesting schedules, if needed
    const newVestingSchedules = [...state.vestingSchedules];
    const scheduleIndex = newVestingSchedules.findIndex(
      (s) => s.name === state.distribution[index].name
    );
    if (scheduleIndex !== -1) {
      newVestingSchedules[scheduleIndex].allocation = finalValue;
      updateVestingSchedules(newVestingSchedules);
    }
  };

  const handleDistributionChange = debounce(handleDistributionChangeCore, 100);

  // Handle vesting schedule change
  const handleVestingChange = (
    id: string,
    field: keyof VestingSchedule,
    value: number
  ) => {
    const newVestingSchedules = state.vestingSchedules.map((schedule) =>
      schedule.id === id ? { ...schedule, [field]: value } : schedule
    );
    updateVestingSchedules(newVestingSchedules);
  };

  // Export data as CSV
  const exportData = () => {
    // Create CSV content
    let csv = "Month,Price,Market Cap,Circulating Supply,% Released\n";

    marketProjections.forEach((data) => {
      csv += `${data.month},${data.price.toFixed(4)},${data.marketCap.toFixed(
        2
      )},${data.circulatingSupply.toFixed(0)},${data.percentReleased.toFixed(
        2
      )}\n`;
    });

    // Create download link
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "token_economics_projection.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast("Export successful", {
      description: "Your token economics data has been exported as CSV",
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <SimulatorHeader onExport={exportData} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              {t("total_token_supply")}
            </label>
            <input
              type="number"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={state.totalSupply}
              onChange={(e) => updateTotalSupply(Number(e.target.value))}
              min={1000000}
              max={10000000000}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center">
              {t("initial_token_price_(usd)")}
            </label>
            <input
              type="number"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={state.initialPrice}
              onChange={(e) => updateInitialPrice(Number(e.target.value))}
              min={0.0001}
              max={10}
              step={0.0001}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("initial_market_cap")}
            </label>
            <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
              / $
              {initialMarketCap.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="distribution">
              {t("token_distribution")}
            </TabsTrigger>
            <TabsTrigger value="vesting">{t("vesting_schedule")}</TabsTrigger>
            <TabsTrigger value="projection">
              {t("market_projection")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="space-y-6 pt-4">
            <DistributionTab
              distribution={state.distribution}
              totalSupply={state.totalSupply}
              onDistributionChange={handleDistributionChange}
            />
          </TabsContent>

          <TabsContent value="vesting" className="space-y-6 pt-4">
            <VestingTab
              vestingSchedules={state.vestingSchedules}
              vestingReleaseData={vestingReleaseData}
              totalSupply={state.totalSupply}
              projectionMonths={state.projectionMonths}
              onVestingChange={handleVestingChange}
            />
          </TabsContent>

          <TabsContent value="projection" className="space-y-6 pt-4">
            <ProjectionTab
              marketProjections={marketProjections}
              initialPrice={state.initialPrice}
              growthRate={state.growthRate}
              volatility={state.volatility}
              projectionMonths={state.projectionMonths}
              onMarketParamsChange={updateMarketParams}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-4">
        <Button
          variant="outline"
          onClick={() =>
            setActiveTab(
              activeTab === "distribution"
                ? "distribution"
                : activeTab === "vesting"
                  ? "distribution"
                  : "vesting"
            )
          }
        >
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          {activeTab === "distribution"
            ? "Distribution"
            : activeTab === "vesting"
              ? "Distribution"
              : "Vesting"}
        </Button>
        {activeTab !== "projection" && (
          <Button
            onClick={() =>
              setActiveTab(
                activeTab === "distribution"
                  ? "vesting"
                  : activeTab === "vesting"
                    ? "projection"
                    : "projection"
              )
            }
          >
            {activeTab === "distribution"
              ? "Vesting"
              : activeTab === "vesting"
                ? "Projection"
                : "Projection"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
