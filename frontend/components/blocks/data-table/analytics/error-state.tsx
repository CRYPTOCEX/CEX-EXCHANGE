"use client";

import React from "react";
import { m } from "framer-motion";
import { AlertCircle, RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    /* Entrance-free, like the rest of the data table: the card, the icon, the
       message, the retry button and the dots used to arrive on a 0.1 -> 0.4
       delay ladder, assembling an error notice piece by piece in front of
       someone who is already waiting. The looping decorations (halos, the icon
       shake, the pulsing dots) are unchanged. */
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <div className="w-full max-w-md">
        <Card className="relative overflow-hidden border-destructive/20 bg-linear-to-b from-destructive/5 to-transparent">
          {/* Animated background pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <m.div
              className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-destructive/10 blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <m.div
              className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-destructive/10 blur-2xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
          </div>

          <CardContent className="relative z-10 pt-8 pb-8 px-6">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Animated Icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <m.div
                    animate={{
                      rotate: [0, -10, 10, -10, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                  >
                    <AlertCircle className="w-10 h-10 text-destructive" />
                  </m.div>
                </div>
                {/* Decorative chart icon */}
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {tCommon("analytics_unavailable")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {error || t("we_couldnt_load_the_analytics_data") + ". " +  tCommon("please_try_again") + ". "}
                </p>
              </div>

              {/* Retry Button */}
              <div>
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  variant="outline"
                  className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-300"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
                  />
                  {isRetrying ? tCommon("retrying")+"..." : tCommon("try_again")}
                </Button>
              </div>

              {/* Decorative dots */}
              <div className="flex items-center gap-1 pt-2">
                {[...Array(3)].map((_, i) => (
                  <m.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-destructive/30"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
