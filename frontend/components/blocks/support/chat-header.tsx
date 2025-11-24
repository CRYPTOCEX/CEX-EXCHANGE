"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface ChatHeaderProps {
  isSupport: boolean;
  ticketStatus: TicketStatus;
  onStatusChange: (status: TicketStatus) => void;
}

export function ChatHeader({
  isSupport,
  ticketStatus,
  onStatusChange,
}: ChatHeaderProps) {
  const t = useTranslations("components/blocks/support/chat-header");
  const showCloseButton =
    ticketStatus !== "CLOSED" && (isSupport || ticketStatus !== "RESOLVED");

  return (
    <CardHeader className="bg-card text-card-foreground border-b px-4 py-3">
      <div className="flex justify-between items-center">
        <CardTitle className="text-xl font-bold">{t("Chat")}</CardTitle>
        <div className="flex items-center gap-2">
          {isSupport && showCloseButton && (
            <Button
              variant="destructive"
              onClick={() => onStatusChange("CLOSED")}
              size="sm"
            >
              {t("close_ticket")}
            </Button>
          )}
          {!isSupport &&
            ticketStatus !== "CLOSED" &&
            ticketStatus !== "RESOLVED" && (
              <Button onClick={() => onStatusChange("RESOLVED")}>
                {t("resolve_ticket")}
              </Button>
            )}
        </div>
      </div>
    </CardHeader>
  );
}
