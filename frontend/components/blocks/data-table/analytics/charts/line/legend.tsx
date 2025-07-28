import React from "react";
import { variants } from "./utils";
import { LegendProps } from "./types";

export const Legend: React.FC<LegendProps> = React.memo(({ config }) => {
  return (
    <div className="mt-6 pt-6 border-t">
      <div
        className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:gap-x-8 sm:gap-y-4"
        role="list"
        aria-label="Chart legend"
      >
        {config.metrics?.map((metric, index) => (
          <div key={metric} className="flex items-center gap-2" role="listitem">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  variants[index === 0 ? "info" : "success"].stroke,
              }}
              aria-hidden="true"
            />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground">
              {config.labels?.[metric]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

Legend.displayName = "Legend";
