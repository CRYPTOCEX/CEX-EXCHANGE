"use client";

import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fadeInUp } from "./deposit-helpers";
import { GlassPanel } from "../../_components/finance-ui";
import { X } from "lucide-react";

interface GatewayProcessingProps {
  gatewayName?: string | null;
  onCancel: () => void;
  variant?: "stripe" | "gateway";
}

export function GatewayProcessing({
  gatewayName,
  onCancel,
  variant = "gateway",
}: GatewayProcessingProps) {
  const t = useTranslations("common");

  const isStripe = variant === "stripe";
  const displayName = gatewayName
    ? gatewayName.charAt(0).toUpperCase() + gatewayName.slice(1)
    : t("payment");

  return (
    <div className="mx-auto w-full max-w-xl">
      <m.div {...fadeInUp}>
        <GlassPanel className="text-center">
          <div
            /* Both branches resolved to a flat `--primary` disc: one via two
               identical gradient stops, the other via a `` with
               no stops at all (which the browser drops) plus `bg-primary`. The
               ternary was distinguishing nothing. */
            className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30"
          >
            <div className="absolute inset-0 animate-ping rounded-full bg-current opacity-20" />
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-overlay-foreground/30 border-t-overlay-foreground" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">
            {isStripe ? `${t("processing_stripe_payment")}…` : `${t("processing_payment")}…`}
          </h1>
          <p className="mt-2 text-sm text-subtle-foreground">
            {t("please_complete_your_checkout_window")}
            <br />
            {t("do_not_close_this_page")}
          </p>

          <div
            className={`mt-5 rounded-xl border p-3 text-xs ${
              isStripe
                ? "border-primary/30 bg-primary/5 text-primary-ink"
                : "border-info/30 bg-info/10 text-primary"
            }`}
          >
            {t("until_the_payment_is_completed")}.
          </div>

          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              toast.info(t("payment_cancelled"));
            }}
            className="mt-5 gap-1.5"
          >
            <X className="h-4 w-4" />
            {t("cancel_payment")}
          </Button>
        </GlassPanel>
      </m.div>
    </div>
  );
}
