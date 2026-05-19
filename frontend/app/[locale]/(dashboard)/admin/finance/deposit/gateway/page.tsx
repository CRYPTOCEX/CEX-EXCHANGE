"use client";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DepositGatewayPage() {
  const t = useTranslations("dashboard_admin");
  const columns = useColumns();

  return (
    <>
      <DataTable
        apiEndpoint="/api/admin/finance/deposit/gateway"
        model="depositGateway"
        permissions={{
          access: "access.deposit.gateway",
          view: "view.deposit.gateway",
          create: "create.deposit.gateway",
          edit: "edit.deposit.gateway",
          delete: "delete.deposit.gateway",
        }}
        pageSize={12}
        canCreate={false}
        canEdit={false}
        canView
        viewLink="/admin/finance/deposit/gateway/[id]"
        canDelete={false}
        isParanoid={false}
        title={t("payment_gateway_management")}
        description={t("manage_deposit_payment_gateways_configure_fees")}
        itemTitle="Payment Gateway"
        columns={columns}
        design={{
          animation: "orbs",
          icon: CreditCard,
        }}
      />
    </>
  );
}
