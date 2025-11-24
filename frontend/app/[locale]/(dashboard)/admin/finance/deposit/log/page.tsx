"use client";

import { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { transactionAnalytics } from "../../transaction/analytics";
import { DepositModal } from "./components/deposit-modal";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

export default function DepositLogPage() {
  const t = useTranslations("dashboard");
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openDepositModal = (depositId: string) => {
    setSelectedDepositId(depositId);
    setIsModalOpen(true);
  };

  const closeDepositModal = () => {
    setSelectedDepositId(null);
    setIsModalOpen(false);
  };

  const handleDepositUpdated = () => {
    // Refresh the DataTable by updating the key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/finance/deposit/log"
        model="transaction"
        modelConfig={{
          type: "DEPOSIT",
        }}
        permissions={{
          access: "access.deposit",
          view: "view.deposit",
          create: "create.deposit",
          edit: "edit.deposit",
          delete: "delete.deposit",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={false}
        canDelete={true}
        canView={true}
        title="Deposit Log Management"
        itemTitle="Deposit Log"
        columns={columns}
        analytics={transactionAnalytics}
        expandedButtons={(row) => {
          return (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => openDepositModal(row.id)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          );
        }}
      />

      <DepositModal
        depositId={selectedDepositId}
        isOpen={isModalOpen}
        onClose={closeDepositModal}
        onDepositUpdated={handleDepositUpdated}
      />
    </>
  );
}
