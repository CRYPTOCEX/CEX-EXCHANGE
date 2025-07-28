"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { mlmReferralAnalytics } from "./analytics";
export default function AffiliateReferralPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/affiliate/referral"
      model="mlmReferral"
      permissions={{
        access: "access.affiliate.referral",
        view: "view.affiliate.referral",
        create: "create.affiliate.referral",
        edit: "edit.affiliate.referral",
        delete: "delete.affiliate.referral",
      }}
      pageSize={10}
      canCreate
      canEdit
      canDelete
      canView
      viewLink="/admin/affiliate/referral/[id]"
      title="Affiliate Referrals"
      itemTitle="Referral"
      columns={columns}
      analytics={mlmReferralAnalytics}
    />
  );
}
