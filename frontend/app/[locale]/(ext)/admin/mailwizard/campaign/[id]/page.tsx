// CampaignEdit.tsx
"use client";
import React, { useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useCampaignStore } from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/store";
import { CampaignSettings } from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/settings";
import { CampaignTargets } from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/targets";
import CampaignControlButtons from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/controls";
import CampaignProgress from "@/app/[locale]/(ext)/admin/mailwizard/campaign/components/progress";
import { useTranslations } from "next-intl";

export default function CampaignEdit() {
  const t = useTranslations("ext");
  const router = useRouter();
  const params = useParams();
  // Ensure the param is a string
  const idParam = params.id;
  const campaignId = Array.isArray(idParam) ? idParam[0] : idParam;
  const { setCampaignId, fetchTemplates, fetchCampaign } = useCampaignStore();
  useEffect(() => {
    if (campaignId) {
      setCampaignId(campaignId);
      fetchTemplates();
      fetchCampaign();
    }
  }, [campaignId, setCampaignId, fetchTemplates, fetchCampaign]);
  return (
    <div className="space-y-5">
      {/* Page Title + Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {t("edit_campaign")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("update_the_campaign_your_targets")}.
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
      <div>
        {/* Campaign Control Buttons */}
        <CampaignControlButtons />
        {/* Campaign Progress Details */}
        <CampaignProgress />
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
    </div>
  );
}
