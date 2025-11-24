"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, RotateCcw } from "lucide-react";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";

interface WSStatusIndicatorProps {
  connectionId?: string;
  showText?: boolean;
  className?: string;
}

export function WSStatusIndicator({
  connectionId = "default",
  showText = true,
  className = "",
}: WSStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED
  );

  useEffect(() => {
    // Add status listener
    const handleStatusChange = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
    };

    wsManager.addStatusListener(handleStatusChange, connectionId);

    // Cleanup
    return () => {
      wsManager.removeStatusListener(handleStatusChange, connectionId);
    };
  }, [connectionId]);

  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: "Connected",
          className:
            "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800",
        };
      case ConnectionStatus.CONNECTING:
        return {
          icon: <RotateCcw className="h-3 w-3 animate-spin" />,
          text: "Connecting",
          className:
            "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800",
        };
      case ConnectionStatus.RECONNECTING:
        return {
          icon: <RotateCcw className="h-3 w-3 animate-spin" />,
          text: "Reconnecting",
          className:
            "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800",
        };
      case ConnectionStatus.ERROR:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Error",
          className:
            "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800",
        };
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: "Disconnected",
          className:
            "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className} flex items-center gap-1 text-xs`}
    >
      {config.icon}
      {showText && <span>{config.text}</span>}
    </Badge>
  );
}
