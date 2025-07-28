import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface CountdownProps {
  initialTimeInSeconds: number;
  onExpire: () => void;
  className?: string;
  showWarning?: boolean;
  warningThreshold?: number; // seconds
}

export function Countdown({
  initialTimeInSeconds,
  onExpire,
  className,
  showWarning = true,
  warningThreshold = 300, // 5 minutes default
}: CountdownProps) {
  const t = useTranslations("components/ui/countdown");
  const [timeLeft, setTimeLeft] = useState(initialTimeInSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= warningThreshold && showWarning) {
          setIsWarning(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire, warningThreshold, showWarning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getProgress = () => {
    return ((initialTimeInSeconds - timeLeft) / initialTimeInSeconds) * 100;
  };

  const getTimeDisplay = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
      <div className="flex items-center gap-2 text-2xl font-mono font-bold">
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "bg-gradient-to-b px-3 py-2 rounded-lg border",
              isWarning
                ? "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                : "from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
            )}
          >
            {minutes.toString().padStart(2, "0")}
          </div>
          <span className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
            {t("MIN")}
          </span>
        </div>
        <span
          className={cn(
            "mx-2",
            isWarning
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-400 dark:text-zinc-500"
          )}
        >
          :
        </span>
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "bg-gradient-to-b px-3 py-2 rounded-lg border",
              isWarning
                ? "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                : "from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
            )}
          >
            {seconds.toString().padStart(2, "0")}
          </div>
          <span className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
            {t("SEC")}
          </span>
        </div>
      </div>
    );
  };

  if (timeLeft <= 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl",
          className
        )}
      >
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-red-600 dark:text-red-400 font-semibold">
            {t("session_expired")}
          </p>
          <p className="text-sm text-red-500 dark:text-red-400">
            {t("please_refresh_to_start_a_new_deposit_session")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isWarning
          ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border border-red-200 dark:border-red-800"
          : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800",
        "rounded-xl p-6",
        className
      )}
    >
      {/* Progress Bar Background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 dark:bg-zinc-700">
        <div
          className={cn(
            "h-1 transition-all duration-1000 ease-linear",
            isWarning
              ? "bg-gradient-to-r from-red-500 to-orange-500"
              : "bg-gradient-to-r from-blue-500 to-indigo-500"
          )}
          style={{ width: `${getProgress()}%` }}
        />
      </div>

      <div className="flex items-center justify-center space-y-4 flex-col">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-2 rounded-full",
              isWarning
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            )}
          >
            <Clock className="h-5 w-5" />
          </div>
          <h3
            className={cn(
              "font-semibold",
              isWarning
                ? "text-red-700 dark:text-red-300"
                : "text-blue-700 dark:text-blue-300"
            )}
          >
            {isWarning ? "Deposit Expiring Soon!" : "Deposit Session Active"}
          </h3>
        </div>

        {getTimeDisplay()}

        <p
          className={cn(
            "text-sm text-center max-w-md",
            isWarning
              ? "text-red-600/80 dark:text-red-400/80"
              : "text-blue-600/80 dark:text-blue-400/80"
          )}
        >
          {isWarning
            ? "⚠️ Your deposit session will expire soon. Please complete your deposit to avoid losing this address."
            : "🔒 Your deposit address is reserved. Complete your deposit within the time limit."}
        </p>
      </div>
    </div>
  );
}
