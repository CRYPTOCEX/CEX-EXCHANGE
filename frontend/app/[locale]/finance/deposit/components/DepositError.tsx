"use client";

import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { fadeInUp } from "./deposit-helpers";
import { GlassPanel } from "../../_components/finance-ui";

interface DepositErrorProps {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function DepositError({ error, onRetry, onCancel }: DepositErrorProps) {
  const t = useTranslations("common");

  return (
    <div className="mx-auto w-full max-w-xl">
      <m.div {...fadeInUp}>
        <GlassPanel className="text-center">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive shadow-lg shadow-destructive/30">
            <AlertTriangle className="h-10 w-10 text-destructive-foreground" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">
            {t("deposit_failed")}
          </h1>
          <p className="mt-2 text-sm text-subtle-foreground">{error}</p>

          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={onCancel} className="h-11 gap-1.5">
              <X className="h-4 w-4" />
              {t("cancel")}
            </Button>
            <Button
              onClick={onRetry}
              className="h-11 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
            >
              <RefreshCw className="h-4 w-4" />
              {t("try_again")}
            </Button>
          </div>
        </GlassPanel>
      </m.div>
    </div>
  );
}
