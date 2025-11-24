"use client";
import type React from "react";
import { useState, useEffect } from "react";

interface LineChartProps {
  width?: number;
  height?: number;
  values?: number[];
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  width = 150,
  height = 80,
  values = [],
  className = "",
}) => {
  const padding = 10; // Add padding to ensure the circle is fully visible
  const svgBox = `0 0 ${width + padding * 2} ${height + padding * 2}`;
  const [strokeColor, setStrokeColor] = useState<string>("#6b7280");

  useEffect(() => {
    if (values.length < 2) {
      setStrokeColor("#6b7280");
      return;
    }

    const lastValue = values[values.length - 1];
    const prevValue = values[values.length - 2];

    if (lastValue > prevValue) {
      setStrokeColor("#14b8a6"); // green for increase
    } else if (lastValue < prevValue) {
      setStrokeColor("#f43f5e"); // red for decrease
    }
    // If there's no change, keep the current color
  }, [values]);

  const calculatePathData = () => {
    if (values.length === 0) return { pathData: "", cx: 0, cy: 0 };

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue;

    // Handle cases where all values are the same (range == 0)
    const effectiveRange = range === 0 ? 1 : range;

    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 2 * padding) + padding;
      const y =
        height -
        ((value - minValue) / effectiveRange) * (height - 2 * padding) -
        padding; // Adjust y to prevent cutoff
      return { x, y };
    });

    const pathData = points.reduce((acc, point, index, arr) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const prev = arr[index - 1];
      const cp1x = (prev.x + point.x) / 2;
      const cp1y = prev.y;
      const cp2x = (prev.x + point.x) / 2;
      const cp2y = point.y;
      return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }, "");

    const lastPoint = points[points.length - 1] || { x: 0, y: 0 };

    return {
      pathData,
      cx: lastPoint.x,
      cy: lastPoint.y,
    };
  };

  const { pathData, cx, cy } = calculatePathData();

  return (
    <div className={`${!values.length ? "transparent" : ""} ${className}`}>
      <svg
        viewBox={svgBox}
        xmlns="http://www.w3.org/2000/svg"
        width={width + padding * 2}
        height={height + padding * 2}
      >
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={cx} cy={cy} r="3" fill={strokeColor} stroke="none" />
        <circle
          cx={cx}
          cy={cy}
          r="3"
          className="animate-ping opacity-75"
          style={{ stroke: strokeColor }}
        />
      </svg>
    </div>
  );
};

export default LineChart;
