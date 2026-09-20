"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useCampaignStore } from "./store";
import { useTranslations } from "next-intl";

export default function CampaignControlButtons() {
  const tCommon = useTranslations("common");
  const { campaign, handleUpdateStatus, isLoading } = useCampaignStore();
  const currentStatus = campaign.status || "PENDING";

  return (
    <div className="grid grid-cols-2 gap-3 mb-6 md:grid-cols-4">
      <Button
        variant="default"
        className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
        onClick={() => handleUpdateStatus("ACTIVE")}
        disabled={
          isLoading ||
          ["ACTIVE", "COMPLETED", "CANCELLED"].includes(currentStatus)
        }
      >
        <Icon icon="line-md:play" className="mr-2 h-4 w-4" />
        {tCommon("start")}
      </Button>
      <Button
        variant="default"
        className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
        onClick={() => handleUpdateStatus("PAUSED")}
        disabled={
          isLoading ||
          ["PENDING", "STOPPED", "PAUSED", "COMPLETED", "CANCELLED"].includes(
            currentStatus
          )
        }
      >
        <Icon icon="line-md:pause" className="mr-2 h-4 w-4" />
        {tCommon("pause")}
      </Button>
      <Button
        variant="destructive"
        onClick={() => handleUpdateStatus("STOPPED")}
        disabled={
          isLoading ||
          ["PENDING", "COMPLETED", "CANCELLED", "STOPPED"].includes(
            currentStatus
          )
        }
      >
        <Icon icon="mdi:stop" className="mr-2 h-4 w-4" />
        {tCommon("stop")}
      </Button>
      <Button
        variant="outline"
        onClick={() => handleUpdateStatus("CANCELLED")}
        disabled={
          isLoading ||
          ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"].includes(currentStatus)
        }
      >
        <Icon icon="line-md:close" className="mr-2 h-4 w-4" />
        {tCommon("cancel")}
      </Button>
    </div>
  );
}
