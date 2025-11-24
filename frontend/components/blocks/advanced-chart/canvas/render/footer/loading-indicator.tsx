"use client";

import type React from "react";

import { useChart } from "../../../context/chart-context";
import { useTranslations } from "next-intl";

const LoadingIndicator: React.FC = () => {
  const t = useTranslations(
    "components/blocks/advanced-chart/canvas/render/footer/loading-indicator"
  );
  const { loading, apiStatus, wsStatus, candleData } = useChart();

  // Only show the full-screen loading indicator if we're loading and have no data yet
  // This prevents the loading indicator from appearing during regular polling updates
  if (!loading || (candleData && candleData.length > 0)) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E2130] bg-opacity-80 z-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
      <div className="text-white text-sm font-medium">
        {t("loading_chart_data")}
      </div>
      <div className="text-gray-400 text-xs mt-2">
        {apiStatus === "connecting" && "Connecting to API..."}
        {apiStatus === "connected" &&
          wsStatus === "connecting" &&
          "Establishing WebSocket connection..."}
        {apiStatus === "connected" &&
          wsStatus === "connected" &&
          "Processing data..."}
      </div>
    </div>
  );
};

export default LoadingIndicator;
