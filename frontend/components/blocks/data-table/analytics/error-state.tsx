"use client";

import React from "react";
import { motion } from "framer-motion";
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
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="relative overflow-hidden border-destructive/20 bg-gradient-to-b from-destructive/5 to-transparent">
          {/* Animated background pattern */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
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
            <motion.div
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
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="relative"
              >
                <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <motion.div
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
                  </motion.div>
                </div>
                {/* Decorative chart icon */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border"
                >
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </motion.div>

              {/* Error Message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {t("analytics_unavailable")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {error || t("we_couldnt_load_the_analytics_data") + ". " +  tCommon("please_try_again") + ". "}
                </p>
              </motion.div>

              {/* Retry Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  variant="outline"
                  className="gap-2 border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all duration-300"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
                  />
                  {isRetrying ? t("retrying")+"..." : tCommon("try_again")}
                </Button>
              </motion.div>

              {/* Decorative dots */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-1 pt-2"
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
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
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
