"use client";

import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";

export default function AffiliateConditionPage() {
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
      pageSize={10}
      canEdit
      canView
      isParanoid={false}
      title="Affiliate Conditions"
      itemTitle="Condition"
      columns={columns}
    />
  );
}
