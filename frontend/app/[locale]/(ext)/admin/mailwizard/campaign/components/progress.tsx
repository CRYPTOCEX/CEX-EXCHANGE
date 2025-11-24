"use client";

import React from "react";
import { useCampaignStore } from "./store";
import { useTranslations } from "next-intl";

export default function CampaignProgress() {
  const t = useTranslations("ext");
  const { items } = useCampaignStore();

  const totalTargets = items.length;
  // Assume targets with status "COMPLETED" are done.
  const doneTargets = items.filter((t) => t.status === "COMPLETED").length;
  const pendingTargets = totalTargets - doneTargets;
  const progressPercent = totalTargets
    ? Math.round((doneTargets / totalTargets) * 100)
    : 0;

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-semibold mb-2">{t("campaign_progress")}</h3>
      <div className="flex gap-5 items-center justify-between">
        <p>
          {t("total_targets")}
          <span className="font-medium">{totalTargets}</span>
        </p>
        <p>
          {t("pending_targets")}
          <span className="font-medium">{pendingTargets}</span>
        </p>
        <p>
          {t("completed_targets")}
          <span className="font-medium">{doneTargets}</span>
        </p>
      </div>
      <div className="mt-2 w-full bg-zinc-200 rounded-full h-2.5">
        <div
          className="bg-zinc-600 h-2.5 rounded-full"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {progressPercent}
        {t("%_completed")}
      </p>
    </div>
  );
}
