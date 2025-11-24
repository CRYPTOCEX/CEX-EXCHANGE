"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart } from "lucide-react";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { toast } from "sonner";

// Lazy load WalletProvider only when modal opens
const WalletProvider = dynamic(() => import("@/context/wallet"), {
  ssr: false,
});

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftName: string;
  price: string;
  currency: string;
  onPurchase: () => Promise<void>;
  isPurchasing: boolean;
}

function PurchaseModalContent({
  nftName,
  price,
  currency,
  onPurchase,
  isPurchasing,
  onClose,
}: Omit<PurchaseModalProps, "isOpen">) {
  const handlePurchase = async () => {
    try {
      await onPurchase();
      onClose();
    } catch (error) {
      // Error handling is done in the purchase function
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Purchase NFT</DialogTitle>
        <DialogDescription>
          Confirm your purchase of {nftName}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold">
              {price} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Marketplace Fee</span>
            <span>Calculated on-chain</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Royalty Fee</span>
            <span>Calculated on-chain</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          You'll be prompted to approve this transaction in your wallet. The total cost including fees will be shown in the wallet prompt.
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPurchasing}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={isPurchasing}>
            {isPurchasing ? (
              <>
                <LoadingSpinner />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Confirm Purchase
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export default function PurchaseModal(props: PurchaseModalProps) {
  const { isOpen, ...contentProps } = props;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={props.onClose}>
      <WalletProvider cookies="">
        <PurchaseModalContent {...contentProps} />
      </WalletProvider>
    </Dialog>
  );
}
