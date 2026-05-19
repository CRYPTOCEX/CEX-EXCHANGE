"use client";

import React from "react";
import { Eye, CreditCard } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { useColumns, useFormConfig } from "./columns";
import { useAdminGatewayMode } from "../context/admin-gateway-mode";
import { Link } from "@/i18n/routing";

export default function AdminPaymentsPage() {
  const { mode } = useAdminGatewayMode();
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
    <DataTable
      key={mode}
      apiEndpoint={`/api/admin/gateway/payment?mode=${mode}`}
      model="gatewayPayment"
      permissions={{
        access: "access.gateway.payment",
        view: "view.gateway.payment",
        create: "create.gateway.payment",
        edit: "edit.gateway.payment",
        delete: "delete.gateway.payment",
      }}
      pageSize={12}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      title="Gateway Payments"
      description="Monitor payment gateway transactions"
      itemTitle="Payment"
      columns={columns}
      formConfig={formConfig}
      isParanoid={false}
      expandedButtons={(row) => (
        <div className="flex gap-2">
          <Link href={`/admin/gateway/payment/${row.id}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </Link>
        </div>
      )}
      design={{
        animation: "orbs",
        primaryColor: "indigo",
        secondaryColor: "cyan",
        icon: CreditCard,
      }}
    />
  );
}
