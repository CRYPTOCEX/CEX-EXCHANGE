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
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
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
              "px-3 py-2 rounded-lg border",
              isWarning
                ? "bg-destructive/10 border-destructive/30 text-destructive-ink"
                : "bg-muted border-border text-foreground"
            )}
          >
            {minutes.toString().padStart(2, "0")}
          </div>
          <span className="text-xs mt-1 text-muted-foreground">
            {tCommon("min")}
          </span>
        </div>
        <span
          className={cn(
            "mx-2",
            isWarning
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          :
        </span>
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "px-3 py-2 rounded-lg border",
              isWarning
                ? "bg-destructive/10 border-destructive/30 text-destructive-ink"
                : "bg-muted border-border text-foreground"
            )}
          >
            {seconds.toString().padStart(2, "0")}
          </div>
          <span className="text-xs mt-1 text-muted-foreground">
            SEC
          </span>
        </div>
      </div>
    );
  };

  if (timeLeft <= 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-6 bg-destructive/10 border border-destructive/30 rounded-xl",
          className
        )}
      >
        <div className="text-center space-y-2">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive font-semibold">
            {t("session_expired")}
          </p>
          <p className="text-sm text-destructive">
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
          ? "bg-destructive/10 border border-destructive/30"
          : "bg-primary/10 border border-primary/30",
        "rounded-xl p-6",
        className
      )}
    >
      {/* Progress Bar Background */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div
          className={cn(
            "h-1 transition-all duration-1000 ease-linear",
            isWarning
              ? "bg-destructive"
              : "bg-primary"
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
                ? "bg-destructive/15 text-destructive-ink"
                : "bg-primary/15 text-primary-ink"
            )}
          >
            <Clock className="h-5 w-5" />
          </div>
          <h3
            className={cn(
              "font-semibold",
              isWarning
                ? "text-destructive"
                : "text-primary"
            )}
          >
            {isWarning ? t("deposit_expiring_soon") : t("deposit_session_active")}
          </h3>
        </div>

        {getTimeDisplay()}

        <p
          className={cn(
            "text-sm text-center max-w-md",
            isWarning
              ? "text-destructive/80"
              : "text-primary/80"
          )}
        >
          {isWarning
            ? t("your_deposit_session_will_expire_soon")
            : t("your_deposit_address_is_reserved_complete")}
        </p>
      </div>
    </div>
  );
}
