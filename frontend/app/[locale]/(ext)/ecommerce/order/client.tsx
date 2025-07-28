"use client";

import { useUserStore } from "@/store/user";
import DataTable from "@/components/blocks/data-table";
import { ecommerceOrderAnalytics } from "./analytics";
import { columns } from "./columns";

export default function AccountClient() {
  const { user } = useUserStore();

  return (
    <div className="container mx-auto px-4 py-8 dark:bg-zinc-900 dark:text-zinc-100 min-h-[calc(100vh-8rem)]">
      <DataTable
        apiEndpoint="/api/ecommerce/order"
        model="ecommerceOrder"
        modelConfig={{
          userId: user?.id,
        }}
        pageSize={10}
        isParanoid={false}
        viewLink="/ecommerce/order/[id]"
        title="Ecommerce Orders"
        itemTitle="Order"
        columns={columns}
        analytics={ecommerceOrderAnalytics}
      />
    </div>
  );
}
