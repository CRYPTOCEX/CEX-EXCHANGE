"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { Gift } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AffiliateRewardPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/admin/affiliate/reward"
      model="mlmReferralReward"
      permissions={{
        access: "access.affiliate.reward",
        view: "view.affiliate.reward",
        create: "create.affiliate.reward",
        edit: "edit.affiliate.reward",
        delete: "delete.affiliate.reward",
      }}
      pageSize={12}
      canEdit
      canDelete
      canView
      title={t("referral_rewards")}
      description={t("manage_affiliate_reward_payouts_and_commission")}
      itemTitle="Referral Reward"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "amber",
        icon: Gift,
      }}
    />
  );
}
