"use client";

import DataTable from "@/components/blocks/data-table";
import { useForexInvestmentColumns } from "../dashboard/components/columns";
import { useAnalytics } from "../dashboard/components/analytics";
import { useUserStore } from "@/store/user";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ForexInvestmentsClient() {
  const t = useTranslations("common");
  const tExtForex = useTranslations("ext_forex");
  const { user } = useUserStore();
  const forexInvestmentColumns = useForexInvestmentColumns();
  const forexInvestmentAnalytics = useAnalytics();

  return (
    <DataTable
      apiEndpoint="/api/forex/investment"
      model="forexInvestment"
      userAnalytics={true}
      pageSize={12}
      canEdit={false}
      canView
      canCreate={false}
      isParanoid={false}
      title={t("forex_investments")}
      description={tExtForex("view_and_manage_all_your_forex")}
      itemTitle="Investment"
      columns={forexInvestmentColumns}
      analytics={forexInvestmentAnalytics}
      viewLink="/forex/investment/[id]"
      design={{
        animation: "orbs",
        primaryColor: `emerald-600`,
        secondaryColor: `teal-500`,
        badge: "Investment Portfolio",
        icon: TrendingUp,
      }}
    />
  );
}
