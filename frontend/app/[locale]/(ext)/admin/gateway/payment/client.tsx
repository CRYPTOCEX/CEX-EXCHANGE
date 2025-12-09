"use client";

import React from "react";
import { Eye } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { Button } from "@/components/ui/button";
import { columns } from "./columns";
import { useAdminGatewayMode } from "../context/admin-gateway-mode";
import { Link } from "@/i18n/routing";

export default function AdminPaymentsPage() {
  const { mode } = useAdminGatewayMode();

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
      pageSize={10}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      canView={true}
      title="Payments"
      itemTitle="Payment"
      columns={columns}
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
    />
  );
}
