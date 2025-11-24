"use client";
import { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { GatewayModal } from "./components/gateway-modal";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function DepositGatewayPage() {
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewGateway = (gatewayId: string) => {
    setSelectedGatewayId(gatewayId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedGatewayId(null);
    setIsModalOpen(false);
  };

  const handleGatewayUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/finance/deposit/gateway"
        model="depositGateway"
        permissions={{
          access: "access.deposit.gateway",
          view: "view.deposit.gateway",
          create: "create.deposit.gateway",
          edit: "edit.deposit.gateway",
          delete: "delete.deposit.gateway",
        }}
        pageSize={10}
        canCreate={false}
        canEdit={false}
        canDelete={false}
        canView={true}
        isParanoid={false}
        title="Payment Gateway Management"
        description="Manage deposit payment gateways, configure fees, limits, and supported currencies"
        itemTitle="Payment Gateway"
        columns={columns}
        expandedButtons={(row) => {
          return (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleViewGateway(row.id)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          );
        }}
      />
      
      <GatewayModal
        gatewayId={selectedGatewayId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onGatewayUpdated={handleGatewayUpdated}
      />
    </>
  );
}
