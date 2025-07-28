"use client";

import { useCronStore } from "@/store/cron";
import { Badge } from "@/components/ui/badge";
import { WifiIcon, WifiOffIcon } from "lucide-react";
import { motion } from "framer-motion";
import { memo } from "react";
import { useTranslations } from "next-intl";

export const ConnectionStatus = memo(function ConnectionStatus() {
  const t = useTranslations("dashboard");
  const { isConnected } = useCronStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center"
    >
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className={`flex items-center text-sm gap-1 ${isConnected ? "bg-green-500 hover:bg-green-600" : ""}`}
      >
        {isConnected ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            >
              <WifiIcon className="h-4 w-4" />
            </motion.div>
            <span>{t("Connected")}</span>
          </>
        ) : (
          <>
            <WifiOffIcon className="h-4 w-4" />
            <span>{t("Disconnected")}</span>
          </>
        )}
      </Badge>
    </motion.div>
  );
});
