"use client";
import { useMemo } from "react";
import DataTable from "@/components/blocks/data-table";
import { Newspaper } from "lucide-react";
import { useColumns, useViewConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function MarketNewsPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const marketNewsColumns = useColumns();
  const viewConfig = useViewConfig();

  const formGroups = useMemo(
    () => [
      {
        title: tCommon("story"),
        description:
          tCommon("items_you_create_here_are_manual"),
        fields: [
          { key: "headline", required: true },
          { key: "summary" },
          { key: "publishedAt" },
        ],
      },
      {
        title: tCommon("links"),
        description: tCommon("http_or_https_only_other_schemes_are_rejected"),
        fields: [{ key: "url" }, { key: "imageUrl" }],
      },
      {
        title: tCommon("tagging"),
        description:
          t("comma_separated_assets_btc_usdt_leave"),
        fields: [{ key: "category" }, { key: "relatedSymbols" }],
      },
      {
        title: tCommon("visibility"),
        fields: [{ key: "status" }],
      },
    ],
    []
  );

  return (
    <DataTable
      apiEndpoint="/api/admin/system/news"
      model="marketNews"
      permissions={{
        access: "access.market.news",
        view: "view.market.news",
        create: "create.market.news",
        edit: "edit.market.news",
        delete: "delete.market.news",
      }}
      pageSize={15}
      canCreate
      canEdit
      canDelete
      canView
      isParanoid={false}
      title={tCommon("market_news")}
      description={tCommon("news_shown_in_the_trading_terminal")}
      itemTitle="Story"
      columns={marketNewsColumns}
      viewConfig={viewConfig}
      formConfig={{
        create: { groups: formGroups },
        edit: { groups: formGroups },
      }}
      design={{
        icon: Newspaper,
      }}
    />
  );
}
