import React from "react";
import { useTableStore } from "../store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
export const AnalyticsOverview: React.FC = () => {
  const t = useTranslations("common");
  const filters = useTableStore((state) => state.filters);
  if (!filters) {
    return <div>{t("no_data_available")}</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(
        filters as Record<
          string,
          Record<
            string,
            {
              count: number;
              percentage: number;
            }
          >
        >
      ).map(([key, values]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>{key}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(values).map(([filterValue, result]) => {
              return (
                <div
                  key={filterValue}
                  className="flex justify-between items-center mb-2"
                >
                  <span>{filterValue}</span>
                  <span>
                    {result.count} ({result.percentage.toFixed(2)}%)
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
