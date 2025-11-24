import { ConnectionStatus } from "@/services/ws-manager";
import { Wifi, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
}

export function ConnectionStatusIndicator({
  status,
}: ConnectionStatusIndicatorProps) {
  const t = useTranslations(
    "trade/components/markets/connection-status-indicator"
  );
  if (status === ConnectionStatus.CONNECTED) {
    return null;
  }

  return (
    <div className="px-2 py-1 flex items-center justify-end text-xs border-t border-zinc-200 dark:border-zinc-800 mt-auto">
      {status === ConnectionStatus.CONNECTING ? (
        <div className="flex items-center text-amber-500">
          <Wifi className="h-3 w-3 mr-1 animate-pulse" />
          <span>{t("Connecting")}.</span>
        </div>
      ) : (
        <div className="flex items-center text-red-500">
          <WifiOff className="h-3 w-3 mr-1" />
          <span>
            {status === ConnectionStatus.ERROR ? "Error" : "Disconnected"}
          </span>
        </div>
      )}
    </div>
  );
}
