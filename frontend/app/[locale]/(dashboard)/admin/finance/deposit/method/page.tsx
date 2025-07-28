"use client";
import { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { MethodModal } from "./components/method-modal";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function DepositMethodPage() {
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedMethodId(null);
    setIsModalOpen(false);
  };

  const handleMethodUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/finance/deposit/method"
        model="depositMethod"
        permissions={{
          access: "access.deposit.method",
          view: "view.deposit.method",
          create: "create.deposit.method",
          edit: "edit.deposit.method",
          delete: "delete.deposit.method",
        }}
        pageSize={10}
        canCreate={true}
        canEdit={false}
        canDelete={true}
        canView={true}
        title="Deposit Methods"
        itemTitle="Deposit Method"
        columns={columns}
        expandedButtons={(row) => {
          return (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleViewMethod(row.id)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          );
        }}
      />
      
      <MethodModal
        methodId={selectedMethodId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onMethodUpdated={handleMethodUpdated}
      />
    </>
  );
}
