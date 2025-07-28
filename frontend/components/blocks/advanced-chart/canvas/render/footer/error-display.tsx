"use client";

import type React from "react";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useChart } from "../../../context/chart-context";
import { useTranslations } from "next-intl";

const ErrorDisplay: React.FC = () => {
  const t = useTranslations(
    "components/blocks/advanced-chart/canvas/render/footer/error-display"
  );
  const { error, refreshData, apiStatus, wsStatus } = useChart();

  if (!error) return null;

  return (
    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-red-900 bg-opacity-90 text-white px-4 py-3 rounded-md shadow-lg z-20 flex items-center max-w-md">
      <AlertTriangle size={20} className="mr-2 flex-shrink-0 text-red-300" />
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium">{error}</p>
        <p className="text-xs text-red-300 mt-1">
          {apiStatus === "error" && "API connection failed. "}
          {wsStatus === "error" && "WebSocket connection failed. "}
          {t("please_check_your_again_later")}.
        </p>
      </div>
      <button
        onClick={refreshData}
        className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center"
      >
        <RefreshCw size={12} className="mr-1" />
        {t("Retry")}
      </button>
    </div>
  );
};

export default ErrorDisplay;
