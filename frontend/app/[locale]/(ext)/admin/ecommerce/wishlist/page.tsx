"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

export default function EcommerceWishlistPage() {
  const t = useTranslations("ext_admin");
  const columns = useColumns();
  const analytics = useAnalytics();
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/wishlist"
      model="ecommerceWishlist"
      permissions={{
        access: "access.ecommerce.wishlist",
        view: "view.ecommerce.wishlist",
        create: "create.ecommerce.wishlist",
        edit: "edit.ecommerce.wishlist",
        delete: "delete.ecommerce.wishlist"}}
      pageSize={12}
      canDelete
      canView
      title={t("customer_wishlists")}
      description={t("view_customer_wishlists")}
      itemTitle="Wishlist"
      columns={columns}
      analytics={analytics}
      design={{
        animation: "orbs",
        primaryColor: "amber",
        secondaryColor: "emerald",
        icon: Heart}}
    />
  );
}
