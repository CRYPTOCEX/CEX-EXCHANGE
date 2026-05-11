"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";

interface TradeTimerProps {
  startTime: string;
  timeLimit: number; // in minutes
  status: string;
  onExpiry?: () => void;
}

export function TradeTimer({ startTime, timeLimit, status, onExpiry }: TradeTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Normalize status for case-insensitive comparison
  const normalizedStatus = status?.toUpperCase() || "";

  useEffect(() => {
    if (["COMPLETED", "CANCELLED", "DISPUTED", "EXPIRED"].includes(normalizedStatus)) {
      setTimeLeft(normalizedStatus === "EXPIRED" ? "Timed Out" : "Completed");
      return;
    }

    const calculateTimeLeft = () => {
      const startDate = new Date(startTime).getTime();
      const endDate = startDate + timeLimit * 60 * 1000;
      const now = Date.now();
      const difference = endDate - now;

      if (difference <= 0) {
        setIsExpired(true);
        // M22: clear interval when timer expires instead of letting it run forever
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onExpiry?.();
        return "Time expired";
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    setTimeLeft(calculateTimeLeft());

    intervalRef.current = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, timeLimit, normalizedStatus, onExpiry]);

  if (["COMPLETED", "CANCELLED", "DISPUTED", "EXPIRED"].includes(normalizedStatus)) {
    return null;
  }

  return (
    <Badge
      variant={isExpired ? "destructive" : "outline"}
      className="flex items-center gap-1"
    >
      <Timer className="h-3 w-3" />
      <span>{timeLeft}</span>
    </Badge>
  );
}
