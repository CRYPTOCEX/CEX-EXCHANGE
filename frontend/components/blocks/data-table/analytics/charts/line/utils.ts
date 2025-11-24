type ChartColors = {
  [key: string]: {
    stroke: string;
    fill: string;
  };
};

export const variants: ChartColors = {
  success: {
    stroke: "rgb(16, 185, 129)", // Emerald-500
    fill: "rgba(16, 185, 129, 0.2)",
  },
  danger: {
    stroke: "rgb(239, 68, 68)", // Red-500
    fill: "rgba(239, 68, 68, 0.2)",
  },
  warning: {
    stroke: "rgb(245, 158, 11)", // Amber-500
    fill: "rgba(245, 158, 11, 0.2)",
  },
  info: {
    stroke: "rgb(59, 130, 246)", // Blue-500
    fill: "rgba(59, 130, 246, 0.2)",
  },
  primary: {
    stroke: "hsl(var(--primary))",
    fill: "hsl(var(--primary) / 0.2)",
  },
  secondary: {
    stroke: "hsl(var(--secondary))",
    fill: "hsl(var(--secondary) / 0.2)",
  },
  muted: {
    stroke: "hsl(var(--muted-foreground))",
    fill: "hsl(var(--muted-foreground) / 0.2)",
  },
  default: {
    stroke: "hsl(var(--foreground))",
    fill: "hsl(var(--foreground) / 0.2)",
  },
};

export const formatNumber = (value: number): string => {
  if (typeof value !== "number") return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

export const getColorForMetric = (
  index: number
): { stroke: string; fill: string } =>
  variants[index === 0 ? "info" : "success"];
