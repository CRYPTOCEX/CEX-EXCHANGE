"use client";

import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return "bg-success-500/10 text-success-500 border-success-500/20";
      case "PAUSED":
        return "bg-warning-500/10 text-warning-500 border-warning-500/20";
      case "STOPPED":
        return "bg-danger-500/10 text-danger-500 border-danger-500/20";
      case "INITIALIZING":
        return "bg-info-500/10 text-info-500 border-info-500/20";
      case "COOLDOWN":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "ERROR":
        return "bg-danger-500/10 text-danger-500 border-danger-500/20";
      default:
        return "bg-muted-500/10 text-muted-500 border-muted-500/20";
    }
  };

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${getStatusColor(
        status
      )} ${sizeClasses[size]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === "ACTIVE"
            ? "bg-success-500 animate-pulse"
            : status === "PAUSED"
            ? "bg-warning-500"
            : status === "STOPPED"
            ? "bg-danger-500"
            : status === "INITIALIZING"
            ? "bg-info-500 animate-pulse"
            : "bg-muted-500"
        }`}
      />
      {status || "Unknown"}
    </span>
  );
};

export default StatusBadge;
