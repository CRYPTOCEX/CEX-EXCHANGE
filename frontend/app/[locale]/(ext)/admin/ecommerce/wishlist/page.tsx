"use client";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { ecommerceWishlistAnalytics } from "./analytics";
export default function EcommerceWishlistPage() {
  return (
    <DataTable
      apiEndpoint="/api/admin/ecommerce/wishlist"
      model="ecommerceWishlist"
      permissions={{
        access: "access.ecommerce.wishlist",
        view: "view.ecommerce.wishlist",
        create: "create.ecommerce.wishlist",
        edit: "edit.ecommerce.wishlist",
        delete: "delete.ecommerce.wishlist",
      }}
      pageSize={10}
      canDelete
      canView
      title="Ecommerce Wishlists"
      itemTitle="Wishlist"
      columns={columns}
      analytics={ecommerceWishlistAnalytics}
    />
  );
}
