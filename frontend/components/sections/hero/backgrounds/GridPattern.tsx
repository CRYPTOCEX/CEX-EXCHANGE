"use client";

import { GridPatternConfig } from "../types";

interface GridPatternProps {
  config?: GridPatternConfig;
}

export default function GridPattern({ config }: GridPatternProps) {
  if (!config?.enabled) return null;

  const { opacity = 0.02, size = 60, color = "000" } = config;

  const svgPattern = `url("data:image/svg+xml,%3Csvg width='${size}' height='${size}' viewBox='0 0 ${size} ${size}' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${color}' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: svgPattern,
        opacity: opacity,
      }}
    />
  );
}
