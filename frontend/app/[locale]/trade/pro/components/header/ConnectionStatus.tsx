"use client";

import React, { memo, useState, useEffect } from "react";
import { cn } from "../../utils/cn";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  isConnected?: boolean;
  onReconnect?: () => void;
  compact?: boolean;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  isConnected = true,
  onReconnect,
  compact = false,
}: ConnectionStatusProps) {
  const [latency, setLatency] = useState<number | null>(null);

  // Measure latency periodically
  useEffect(() => {
    if (!isConnected) {
      setLatency(null);
      return;
    }

    const measureLatency = async () => {
      const start = performance.now();
      // This would ideally ping the WebSocket server
      // For now, we'll simulate
      await new Promise((resolve) => setTimeout(resolve, 10));
      const end = performance.now();
      setLatency(Math.round(end - start));
    };

    measureLatency();
    const interval = setInterval(measureLatency, 10000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <button
      onClick={!isConnected ? onReconnect : undefined}
      className={cn(
        "flex items-center",
        compact ? "gap-1 px-1.5 py-1" : "gap-1.5 px-2 py-1.5",
        "rounded-lg",
        "text-xs",
        "transition-colors",
        isConnected
          ? "text-[var(--tp-green)] hover:bg-[var(--tp-bg-tertiary)]"
          : "text-[var(--tp-red)] hover:bg-[var(--tp-red)]/10 cursor-pointer"
      )}
      title={
        isConnected
          ? `Connected (${latency}ms)`
          : "Disconnected - Click to reconnect"
      }
    >
      {isConnected ? (
        <>
          <Wifi size={compact ? 12 : 14} />
          {!compact && <span className="hidden sm:inline font-mono">{latency}ms</span>}
        </>
      ) : (
        <>
          <WifiOff size={compact ? 12 : 14} />
          {!compact && <span className="hidden sm:inline">Reconnect</span>}
        </>
      )}
    </button>
  );
});
