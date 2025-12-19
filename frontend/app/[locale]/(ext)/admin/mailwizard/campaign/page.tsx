"use client";
import DataTable from "@/components/blocks/data-table";
import { Megaphone } from "lucide-react";

import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
export default function MailwizardCampaignPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/mailwizard/campaign"
      model="mailwizardCampaign"
      permissions={{
        access: "access.mailwizard.campaign",
        view: "view.mailwizard.campaign",
        create: "create.mailwizard.campaign",
        edit: "edit.mailwizard.campaign",
        delete: "delete.mailwizard.campaign",
      }}
      pageSize={12}
      canCreate
      createLink="/admin/mailwizard/campaign/create"
      canEdit
      editLink="/admin/mailwizard/campaign/[id]"
      canDelete
      canView
      title={t("email_campaign_management")}
      description={t("create_manage_and_track_email_marketing")}
      itemTitle="Campaign"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "violet",
        secondaryColor: "rose",
        icon: Megaphone,
      }}
    />
  );
}
