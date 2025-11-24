"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import PaymentMethodDialog from "./components/payment-method-dialog";

export default function P2PPaymentMethodClient() {
  const t = useTranslations("ext.admin.p2p.paymentMethod");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = () => {
    setEditingMethod(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (method: any) => {
    setEditingMethod(method);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (shouldRefresh?: boolean) => {
    setIsDialogOpen(false);
    setEditingMethod(null);
    if (shouldRefresh) {
      setRefreshKey(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Methods
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage global payment methods available to all P2P users
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Method
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
        canDelete={true}
        canView={false}
        title=""
        itemTitle="Payment Method"
        columns={columns}
        isParanoid={false}
        onEditClick={handleEdit}
      />

      {/* Dialog */}
      <PaymentMethodDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        method={editingMethod}
      />
    </div>
  );
}