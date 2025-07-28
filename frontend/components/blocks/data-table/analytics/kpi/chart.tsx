import React, { useCallback, useMemo, useEffect, useRef } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import PropTypes from "prop-types";

// color variants for "light"/"dark"
const variants = {
  success: { light: "rgb(16, 185, 129)", dark: "rgb(5, 150, 105)" },
  danger: { light: "rgb(239, 68, 68)", dark: "rgb(220, 38, 38)" },
  warning: { light: "rgb(245, 158, 11)", dark: "rgb(217, 119, 6)" },
  info: { light: "rgb(59, 130, 246)", dark: "rgb(37, 99, 235)" },
  primary: { light: "hsl(var(--primary))", dark: "hsl(var(--primary))" },
  secondary: { light: "hsl(var(--secondary))", dark: "hsl(var(--secondary))" },
  muted: { light: "hsl(var(--muted))", dark: "hsl(var(--muted))" },
  default: { light: "hsl(var(--foreground))", dark: "hsl(var(--foreground))" },
};

interface ChartProps {
  id: string;
  trend: Array<{ date: string; value: number }>;
  variant: keyof typeof variants;
  loading?: boolean;
  onHover: (data: { value: number; change: number } | null) => void;
  timeframe?: "24h" | "other";
}

function ChartImpl({
  id,
  trend,
  variant,
  loading,
  onHover,
  timeframe = "other",
}: ChartProps) {
  const { theme } = useTheme();
  const colorMode = theme === "dark" ? "dark" : "light";
  const color = variants[variant][colorMode];

  const data = useMemo(
    () =>
      trend.map((item) => ({
        ...item,
        date: new Date(item.date),
      })),
    [trend]
  );

  const handleMouseMove = useCallback(
    (mouseData: any) => {
      if (mouseData && mouseData.activePayload && mouseData.activePayload[0]) {
        const currentPoint = mouseData.activePayload[0].payload;
        const currentIndex = data.findIndex(
          (p) => p.date.getTime() === currentPoint.date.getTime()
        );
        const previousPoint = data[currentIndex - 1] || data[currentIndex];

        if (previousPoint) {
          let rawChange = 0;
          if (previousPoint.value === 0) {
            rawChange = currentPoint.value === 0 ? 0 : 100;
          } else {
            rawChange =
              ((currentPoint.value - previousPoint.value) /
                previousPoint.value) *
              100;
          }
          if (!Number.isFinite(rawChange)) {
            rawChange =
              rawChange === Infinity ? 100 : rawChange === -Infinity ? -100 : 0;
          }
          const changeValue = Math.round(rawChange * 100) / 100;
          onHover({ value: currentPoint.value, change: changeValue });
        }
      }
    },
    [data, onHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  if (loading) {
    return (
      <div className="absolute bottom-0 left-0 right-0 h-[50px] bg-muted/10 animate-pulse" />
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 h-[50px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background/95 backdrop-blur-xs supports-backdrop-filter:bg-background/85 p-2 shadow-2xs">
                    <p className="text-sm font-medium text-muted-foreground">
                      {format(
                        point.date,
                        timeframe === "24h" ? "h:mm a" : "MMM dd, yyyy"
                      )}
                    </p>
                  </div>
                );
              }
              return null;
            }}
            cursor={{
              stroke: "hsl(var(--border))",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: "hsl(var(--background))",
              stroke: color,
              strokeWidth: 2,
            }}
            fill={`url(#gradient-${id})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

ChartImpl.propTypes = {
  id: PropTypes.string.isRequired,
  trend: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  variant: PropTypes.oneOf(Object.keys(variants)),
  loading: PropTypes.bool,
  onHover: PropTypes.func.isRequired,
  timeframe: PropTypes.oneOf(["24h", "other"]),
};

ChartImpl.displayName = "Chart";

export const Chart = React.memo(ChartImpl);

export default Chart;
