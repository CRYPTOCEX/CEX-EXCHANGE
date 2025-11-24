"use client";

import { DisputeStatusBadge } from "./dispute-status-badge";
import { PriorityBadge } from "./priority-badge";
import { useTranslations } from "next-intl";

interface DisputeHeaderProps {
  id: string;
  status: string;
  filedOn: string;
  tradeId: string;
  priority: string;
}

export function DisputeHeader({
  id,
  status,
  filedOn,
  tradeId,
  priority,
}: DisputeHeaderProps) {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("Dispute")}
          {id}
          <DisputeStatusBadge status={status} />
        </h1>
        <p className="text-muted-foreground">
          {t("filed_on")}
          {filedOn}
          {t("|_trade")}{" "}
          <a
            href={`/admin/trades/${tradeId}`}
            className="text-primary hover:underline"
          >
            {tradeId}
          </a>
        </p>
      </div>
      <PriorityBadge priority={priority} />
    </div>
  );
}
