"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";

interface TradeTimerProps {
  startTime: string;
  timeLimit: number; // in minutes
  status: string;
}

export function TradeTimer({ startTime, timeLimit, status }: TradeTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (["completed", "cancelled", "disputed"].includes(status)) {
      setTimeLeft("Completed");
      return;
    }

    const calculateTimeLeft = () => {
      const startDate = new Date(startTime).getTime();
      const endDate = startDate + timeLimit * 60 * 1000;
      const now = Date.now();
      const difference = endDate - now;

      if (difference <= 0) {
        setIsExpired(true);
        return "Time expired";
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, timeLimit, status]);

  if (["completed", "cancelled", "disputed"].includes(status)) {
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
