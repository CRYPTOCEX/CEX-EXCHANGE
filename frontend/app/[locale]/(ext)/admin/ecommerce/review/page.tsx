"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecommerceReviewAnalytics } from "./analytics";
export default function EcommerceReviewPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/review"
      model="ecommerceReview"
      permissions={{
        access: "access.ecommerce.review",
        view: "view.ecommerce.review",
        create: "create.ecommerce.review",
        edit: "edit.ecommerce.review",
        delete: "delete.ecommerce.review",
      }}
      pageSize={10}
      canEdit
      canDelete
      canView
      title="Ecommerce Reviews"
      itemTitle="Review"
      columns={columns}
      analytics={ecommerceReviewAnalytics}
    />
  );
}
