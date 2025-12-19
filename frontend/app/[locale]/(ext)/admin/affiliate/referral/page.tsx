"use client";
import { useState } from "react";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useFormConfig } from "./columns";
import { useAnalytics } from "./analytics";
import { AffiliateReferralModal } from "./components/affiliate-referral-modal";
import { Button } from "@/components/ui/button";
import { Eye, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AffiliateReferralPage() {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const columns = useColumns();
  const formConfig = useFormConfig();
  const analytics = useAnalytics();
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
        pageSize={12}
        canCreate
        canEdit
        canDelete
        canView={true}
        title={t("affiliate_referrals")}
        description={tExtAdmin("track_and_manage_user_referral_relationships")}
        itemTitle="Affiliate Referral"
        columns={columns}
        formConfig={formConfig}
        analytics={analytics}
        design={{
          animation: "orbs",
          primaryColor: "blue",
          secondaryColor: "amber",
          icon: UserPlus,
        }}
        expandedButtons={(row) => {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewAffiliate(row.id)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {t("view_details")}
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
