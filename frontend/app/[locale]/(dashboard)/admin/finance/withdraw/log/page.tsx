"use client";

import { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "../../deposit/log/columns";
import { transactionAnalytics } from "../../transaction/analytics";
import { WithdrawModal } from "./components/withdraw-modal";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";

export default function WithdrawLogPage() {
  const t = useTranslations("dashboard");
  const [selectedWithdrawId, setSelectedWithdrawId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openWithdrawModal = (withdrawId: string) => {
    setSelectedWithdrawId(withdrawId);
    setIsModalOpen(true);
  };

  const closeWithdrawModal = () => {
    setSelectedWithdrawId(null);
    setIsModalOpen(false);
  };

  const handleWithdrawUpdated = () => {
    // Refresh the DataTable by updating the key
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/finance/withdraw/log"
        model="transaction"
        modelConfig={{
          type: "WITHDRAW",
        }}
        permissions={{
          access: "access.withdraw",
          view: "view.withdraw",
          create: "create.withdraw",
          edit: "edit.withdraw",
          delete: "delete.withdraw",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={false}
        canDelete={true}
        canView={true}
        title="Withdraw Log Management"
        itemTitle="Withdraw Log"
        columns={columns}
        analytics={transactionAnalytics}
        expandedButtons={(row) => {
          return (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => openWithdrawModal(row.id)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          );
        }}
      />

      <WithdrawModal
        withdrawId={selectedWithdrawId}
        isOpen={isModalOpen}
        onClose={closeWithdrawModal}
        onWithdrawUpdated={handleWithdrawUpdated}
      />
    </>
  );
}
