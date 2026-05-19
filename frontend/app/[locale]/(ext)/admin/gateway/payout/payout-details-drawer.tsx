"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Wallet,
  Hash,
} from "lucide-react";
import $fetch from "@/lib/api";
import { useTranslations } from "next-intl";

interface PayoutDetails {
  id: string;
  payoutId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;
  walletType: string;
  status: string;
  paymentCount: number;
  refundCount: number;
  periodStart?: string;
  periodEnd?: string;
  processedAt?: string;
  createdAt: string;
  merchant?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PayoutDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payoutId: string | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  PROCESSING: "bg-blue-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
  CANCELLED: "bg-gray-500",
};

export default function PayoutDetailsDrawer({
  isOpen,
  onClose,
  payoutId,
}: PayoutDetailsDrawerProps) {
  const t = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [payout, setPayout] = useState<PayoutDetails | null>(null);

  useEffect(() => {
    if (isOpen && payoutId) {
      fetchPayoutDetails();
    }
  }, [isOpen, payoutId]);

  const fetchPayoutDetails = async () => {
    if (!payoutId) return;
    setLoading(true);

    const { data, error } = await $fetch({
      url: `/api/admin/gateway/payout/${payoutId}`,
      silent: true,
    });

    if (!error && data) {
      setPayout(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("payout_details")}</SheetTitle>
          <SheetDescription>
            {tExtAdmin("complete_information_about_this_payout")}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : payout ? (
          <div className="space-y-6 mt-6">
            {/* Header with status */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("payout_id")}</p>
                <p className="font-mono text-sm">{payout.payoutId || payout.id}</p>
              </div>
              <Badge className={`${statusColors[payout.status]} text-white`}>
                {payout.status}
              </Badge>
            </div>

            {/* Amount info */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(payout.grossAmount, payout.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fee</p>
                  <p className="text-lg font-medium text-muted-foreground">
                    {formatCurrency(payout.feeAmount, payout.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(payout.netAmount, payout.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Merchant info */}
            {payout.merchant && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Merchant
                </h4>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{payout.merchant.name}</p>
                  <p className="text-sm text-muted-foreground">{payout.merchant.email}</p>
                </div>
              </div>
            )}

            {/* Payout details */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("payout_details")}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    {tCommon("wallet_type")}
                  </span>
                  <span>{payout.walletType}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {tExtAdmin("payments_included")}
                  </span>
                  <span>{payout.paymentCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("refunds_deducted")}
                  </span>
                  <span>{payout.refundCount}</span>
                </div>
              </div>
            </div>

            {/* Period */}
            {(payout.periodStart || payout.periodEnd) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("payout_period")}
                </h4>
                <div className="space-y-2 text-sm">
                  {payout.periodStart && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Start</span>
                      <span>{formatDate(payout.periodStart)}</span>
                    </div>
                  )}
                  {payout.periodEnd && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">End</span>
                      <span>{formatDate(payout.periodEnd)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDate(payout.createdAt)}</span>
                </div>
                {payout.processedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Processed</span>
                    <span>{formatDate(payout.processedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{tExtAdmin("payout_not_found")}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
