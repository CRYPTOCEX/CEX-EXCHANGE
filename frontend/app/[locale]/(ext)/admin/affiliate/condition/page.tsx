"use client";

import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { Percent } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AffiliateConditionPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      apiEndpoint="/api/admin/affiliate/condition"
      model="mlmReferralCondition"
      permissions={{
        access: "access.affiliate.condition",
        view: "view.affiliate.condition",
        create: "create.affiliate.condition",
        edit: "edit.affiliate.condition",
        delete: "delete.affiliate.condition",
      }}
      pageSize={12}
      canEdit
      canView
      isParanoid={false}
      title={t("referral_conditions")}
      description={t("configure_affiliate_commission_tiers_and_referral")}
      itemTitle="Referral Condition"
      columns={columns}
      formConfig={formConfig}
      design={{
        animation: "orbs",
        primaryColor: "blue",
        secondaryColor: "amber",
        icon: Percent,
      }}
    />
  );
}
