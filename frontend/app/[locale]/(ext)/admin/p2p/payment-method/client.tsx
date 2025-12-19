"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useTranslations } from "next-intl";

export default function P2PPaymentMethodClient() {
  const t = useTranslations("ext_admin");
  const [refreshKey, setRefreshKey] = useState(0);
  const columns = useColumns();
  const formConfig = useFormConfig();

  return (
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
      pageSize={12}
      canCreate={false} // We handle create with custom button
      canEdit={true}
      editLink="/admin/p2p/payment-method/[id]"
      canDelete={true}
      canView={true}
      title={t("p2p_payment_method_management")}
      description={t("configure_and_manage_p2p_payment_methods")}
      itemTitle="Payment Method"
      columns={columns}
      formConfig={formConfig}
      isParanoid={false}
      design={{
        animation: "orbs",
        primaryColor: 'blue',
        secondaryColor: 'violet',
        icon: CreditCard,
      }}
    />
  );
}
