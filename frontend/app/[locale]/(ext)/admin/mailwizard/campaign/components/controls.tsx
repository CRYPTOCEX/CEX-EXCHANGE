"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useCampaignStore } from "./store";
import { useTranslations } from "next-intl";

export default function CampaignControlButtons() {
  const t = useTranslations("ext");
  const { campaign, handleUpdateStatus, isLoading } = useCampaignStore();
  const currentStatus = campaign.status || "PENDING";

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
      <Button
        color="success"
        onClick={() => handleUpdateStatus("ACTIVE")}
        disabled={
          isLoading ||
          ["ACTIVE", "COMPLETED", "CANCELLED"].includes(currentStatus)
        }
      >
        <Icon icon="line-md:play" className="mr-2 h-4 w-4" />
        {t("Start")}
      </Button>
      <Button
        color="warning"
        onClick={() => handleUpdateStatus("PAUSED")}
        disabled={
          isLoading ||
          ["PENDING", "STOPPED", "PAUSED", "COMPLETED", "CANCELLED"].includes(
            currentStatus
          )
        }
      >
        <Icon icon="line-md:pause" className="mr-2 h-4 w-4" />
        {t("Pause")}
      </Button>
      <Button
        color="destructive"
        onClick={() => handleUpdateStatus("STOPPED")}
        disabled={
          isLoading ||
          ["PENDING", "COMPLETED", "CANCELLED", "STOPPED"].includes(
            currentStatus
          )
        }
      >
        <Icon icon="mdi:stop" className="mr-2 h-4 w-4" />
        {t("Stop")}
      </Button>
      <Button
        onClick={() => handleUpdateStatus("CANCELLED")}
        disabled={
          isLoading ||
          ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].includes(currentStatus)
        }
      >
        <Icon icon="line-md:close" className="mr-2 h-4 w-4" />
        {t("Cancel")}
      </Button>
    </div>
  );
}
