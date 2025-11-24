"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { mlmReferralRewardAnalytics } from "./analytics";
export default function AffiliateRewardPage() {
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
      pageSize={10}
      canEdit
      canDelete
      canView
      title="Affiliate Rewards"
      itemTitle="Reward"
      columns={columns}
      analytics={mlmReferralRewardAnalytics}
    />
  );
}
