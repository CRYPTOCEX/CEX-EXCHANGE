"use client";

import React from "react";
import { Input } from "@/components/ui/input";

export interface AffiliateLevelsProps {
  levelsCount: number;
  levelPrefix: string;
  title: string;
  formValues: Record<string, any>;
  handleChange: (key: string, value: string | File | null) => void;
}

export const AffiliateLevels: React.FC<AffiliateLevelsProps> = ({
  levelsCount,
  levelPrefix,
  title,
  formValues,
  handleChange,
}) => {
  return (
    <div>
      <h4 className="text-md font-medium">{title}</h4>
      <div className="grid grid-cols-12 gap-6">
        {Array.from({ length: levelsCount }, (_, i) => (
          <div className="col-span-12 md:col-span-6" key={i}>
            <Input
              title={`Level ${i + 1} Percentage`}
              placeholder="0"
              type="number"
              min={0}
              max={100}
              value={formValues[`${levelPrefix}${i + 1}`] || ""}
              onChange={(e) =>
                handleChange(`${levelPrefix}${i + 1}`, e.target.value)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};
