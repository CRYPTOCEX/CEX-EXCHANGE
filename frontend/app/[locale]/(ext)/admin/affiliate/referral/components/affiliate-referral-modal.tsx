"use client";

import React, { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import the existing detail client but use it in modal mode
import AffiliateDetailClient from "../[id]/client";

interface AffiliateReferralModalProps {
  affiliateId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAffiliateUpdated?: () => void;
}

export const AffiliateReferralModal: React.FC<AffiliateReferralModalProps> = ({
  affiliateId,
  isOpen,
  onClose,
  onAffiliateUpdated,
}) => {
  const t = useTranslations("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent 
        side="right" 
        className="w-[90vw] max-w-[90vw] min-w-[90vw] p-0 overflow-hidden sm:max-w-[90vw]"
        style={{ width: '90vw', maxWidth: '90vw', minWidth: '90vw' }}
      >
        <SheetHeader className="px-6 py-4 border-b bg-muted/30">
          <SheetTitle className="text-xl font-semibold">
            Affiliate Referral Details
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-0">
            {affiliateId ? (
              <AffiliateDetailClient 
                isModal={true}
                affiliateId={affiliateId}
                onClose={handleClose}
                onUpdated={onAffiliateUpdated}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">No affiliate selected</p>
                    <p className="text-sm text-muted-foreground">Please select an affiliate to view details</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};