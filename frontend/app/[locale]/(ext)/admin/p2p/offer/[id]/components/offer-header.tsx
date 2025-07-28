"use client";

import { useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  CheckCircle,
  Edit,
  Flag,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface OfferHeaderProps {
  offerId: string;
  status: string;
  onAction: (type: "approve" | "reject" | "flag" | "disable") => void;
  onEdit: () => void;
}

export function OfferHeader({
  offerId,
  status,
  onAction,
  onEdit,
}: OfferHeaderProps) {
  const t = useTranslations("ext");
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" size="sm" onClick={handleBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("back_to_offers")}
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          {t("Edit")}
        </Button>
        {status === "pending" && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => onAction("approve")}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("Approve")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onAction("reject")}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t("Reject")}
            </Button>
          </>
        )}
        {status !== "flagged" && status !== "disabled" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onAction("flag")}
          >
            <Flag className="mr-2 h-4 w-4" />
            {t("Flag")}
          </Button>
        )}
        {status !== "disabled" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onAction("disable")}
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            {t("Disable")}
          </Button>
        )}
      </div>
    </div>
  );
}
