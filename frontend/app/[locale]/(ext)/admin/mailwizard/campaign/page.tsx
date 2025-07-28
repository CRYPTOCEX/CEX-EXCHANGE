"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { mailwizardCampaignAnalytics } from "./analytics";
export default function MailwizardCampaignPage() {
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
      pageSize={10}
      canCreate
      createLink="/admin/mailwizard/campaign/create"
      canEdit
      editLink="/admin/mailwizard/campaign/[id]"
      canDelete
      canView
      title="Mailwizard Campaigns"
      itemTitle="Campaign"
      columns={columns}
      analytics={mailwizardCampaignAnalytics}
    />
  );
}
