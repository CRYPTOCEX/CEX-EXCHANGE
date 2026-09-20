"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { WifiIcon, WifiOffIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useCronStore } from "@/store/cron";

/**
 * Is the LIVE stream attached?
 *
 * Deliberately narrow, and worth stating because the old page conflated it with
 * something else: a green "Connected" pill sat in the header of a job list that
 * could just as well have come from a scheduler that died an hour ago. The
 * socket and the scheduler are independent facts — the socket is served by the
 * WEB process, the jobs run on the CRON one — so the scheduler now has its own
 * banner and this reports only whether the log is live.
 */
export const ConnectionStatus = memo(function ConnectionStatus() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  // Subscribed to the one field, not the whole store: every WebSocket frame
  // writes this store, and a whole-store subscription re-rendered this badge on
  // each of them.
  const isConnected = useCronStore((state) => state.isConnected);

  return (
    <Badge
      tone={isConnected ? "success" : "destructive"}
      appearance="soft"
      className="gap-1 text-xs"
    >
      {isConnected ? (
        <WifiIcon className="h-3 w-3" />
      ) : (
        <WifiOffIcon className="h-3 w-3" />
      )}
      <span>{isConnected ? tCommon("connected") : t("disconnected")}</span>
    </Badge>
  );
});
