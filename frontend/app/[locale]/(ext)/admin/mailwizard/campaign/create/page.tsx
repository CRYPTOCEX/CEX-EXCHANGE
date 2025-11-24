"use client";
import React, { useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useCampaignStore } from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/store";
import { CampaignSettings } from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/settings";
import { CampaignTargets } from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/targets";
import { useTranslations } from "next-intl";

export default function CampaignCreate() {
  const t = useTranslations("ext");
  const router = useRouter();
  const { setCampaignId, fetchTemplates, handleCreateCampaign } =
    useCampaignStore();
  useEffect(() => {
    // Reset campaignId to empty (or null) when creating a new campaign
    setCampaignId("");
    // Fetch available templates for the campaign settings form
    fetchTemplates();
    // Optionally, you can also reset the campaign state here if needed.
  }, [setCampaignId, fetchTemplates]);
  const onCreateCampaign = async () => {
    await handleCreateCampaign();
  };
  return (
    <div className="space-y-5">
      {/* Page Title + Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {t("create_campaign")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("configure_your_campaign_your_targets")}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/mailwizard/campaign")}
        >
          <Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
          {t("Back")}
        </Button>
      </div>
      {/* Main Layout: left column = settings, right column = targets */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Left: Campaign Settings */}
        <CampaignSettings />
        {/* Right: Targets */}
        <div className="flex flex-col gap-4">
          <CampaignTargets />
        </div>
      </div>
    </div>
  );
}
