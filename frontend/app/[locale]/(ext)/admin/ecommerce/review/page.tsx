"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceReviewPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
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
      pageSize={12}
      canEdit
      canDelete
      canView
      title={t("product_reviews")}
      description={t("moderate_customer_reviews")}
      itemTitle="Review"
      columns={columns}
      formConfig={formConfig}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: Star,
      }}
    />
  );
}
