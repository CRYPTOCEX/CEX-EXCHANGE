"use client";

import React, { memo, useMemo } from "react";
import { Link2, Unlink2 } from "lucide-react";
import type { MeasurementLabelProps } from "../types";
import { useTranslations } from "next-intl";

export const MeasurementLabel = memo<MeasurementLabelProps>(
  ({ direction, value, isActive, isLinked, variant, toggleLink }) => {
    const t = useTranslations("dashboard");
    const labelPosition = useMemo((): React.CSSProperties => {
      switch (direction) {
        case "top":
          return {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          };
        case "right":
          return {
            top: "50%",
            right: "50%",
            transform: "translate(50%, -50%)",
          };
        case "bottom":
          return {
            bottom: "50%",
            left: "50%",
            transform: "translate(-50%, 50%)",
          };
        case "left":
          return {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          };
      }
    }, [direction]);

    const colorClasses = useMemo(
      () => ({
        value: variant === "padding" ? "text-blue-500" : "text-green-500",
        icon: variant === "padding" ? "text-blue-400" : "text-green-400",
      }),
      [variant]
    );

    const axis = useMemo(
      () =>
        direction === "top" || direction === "bottom"
          ? "vertical"
          : "horizontal",
      [direction]
    );

    const handleLinkToggle = useMemo(
      () => (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleLink(axis, direction, e);
      },
      [axis, direction, toggleLink]
    );

    if (!isActive) return null;

    return (
      <div
        className="absolute pointer-events-none z-20 flex items-center gap-1"
        style={labelPosition}
      >
        <span
          className={`text-xs font-medium px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded shadow-sm ${colorClasses.value}`}
        >
          {value}
          {t("px")}
        </span>
        <button
          className={`p-0.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded hover:bg-gray-50 dark:hover:bg-zinc-700 pointer-events-auto ${colorClasses.icon}`}
          onClick={handleLinkToggle}
          title={`${isLinked ? "Unlink" : "Link"} ${axis} ${variant}`}
        >
          {isLinked ? (
            <Link2 className="h-3 w-3" />
          ) : (
            <Unlink2 className="h-3 w-3" />
          )}
        </button>
      </div>
    );
  }
);

MeasurementLabel.displayName = "MeasurementLabel";
