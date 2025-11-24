"use client";
import { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { columns } from "./columns";
import { mlmReferralAnalytics } from "./analytics";
import { AffiliateReferralModal } from "./components/affiliate-referral-modal";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function AffiliateReferralPage() {
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleViewAffiliate = (affiliateId: string) => {
    setSelectedAffiliateId(affiliateId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedAffiliateId(null);
    setIsModalOpen(false);
  };

  const handleAffiliateUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <>
      <DataTable
        key={refreshKey}
        apiEndpoint="/api/admin/affiliate/referral"
        model="mlmReferral"
        permissions={{
          access: "access.affiliate.referral",
          view: "view.affiliate.referral",
          create: "create.affiliate.referral",
          edit: "edit.affiliate.referral",
          delete: "delete.affiliate.referral",
        }}
        pageSize={10}
        canCreate
        canEdit
        canDelete
        canView={true}
        title="Affiliate Referrals"
        itemTitle="Referral"
        columns={columns}
        analytics={mlmReferralAnalytics}
        expandedButtons={(row) => {
          return (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleViewAffiliate(row.id)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
          );
        }}
      />
      
      <AffiliateReferralModal
        affiliateId={selectedAffiliateId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAffiliateUpdated={handleAffiliateUpdated}
      />
    </>
  );
}
