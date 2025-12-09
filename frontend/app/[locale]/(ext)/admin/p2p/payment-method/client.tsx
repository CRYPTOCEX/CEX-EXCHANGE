"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";

export default function P2PPaymentMethodClient() {
  const t = useTranslations("ext");
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = () => {
    router.push("/admin/p2p/payment-method/new");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t("payment_methods")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("manage_global_payment_methods_available")}
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t("add_payment_method")}
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/p2p/payment-method"
        model="p2pPaymentMethod"
        permissions={{
          access: "access.p2p.payment_method",
          view: "view.p2p.payment_method",
          create: "create.p2p.payment_method",
          edit: "edit.p2p.payment_method",
          delete: "delete.p2p.payment_method",
        }}
        pageSize={10}
        canCreate={false} // We handle create with custom button
        canEdit={true}
        editLink="/admin/p2p/payment-method/[id]"
        canDelete={true}
        canView={false}
        title=""
        itemTitle="Payment Method"
        columns={columns}
        isParanoid={false}
      />
    </div>
  );
}