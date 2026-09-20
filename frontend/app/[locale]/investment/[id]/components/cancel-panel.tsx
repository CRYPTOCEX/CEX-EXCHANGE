"use client";

/**
 * Cancel — the action that existed on the server and nowhere on the screen.
 *
 * `DELETE /api/finance/investment/:id?type=general` has been implemented,
 * transactional and audited since long before this rebuild: it refunds the
 * principal through `walletService.credit`, annotates the original debit rather
 * than destroying it, soft-deletes the row and emails the user. It had ZERO
 * callers anywhere in the frontend. Nobody using this product could exit a
 * position, at all, ever — the only way out was to wait for maturity and take
 * whatever the plan's `defaultResult` handed you.
 *
 * WHAT THE DIALOG HAS TO SAY
 * --------------------------
 * The refund is the PRINCIPAL. Not the principal plus accrued anything: there
 * is no accrual in this product — `investment.profit` is a figure written at
 * purchase time and only realised at settlement — so a cancellation forfeits
 * the entire outcome, whichever direction it was going to go.
 *
 * That cuts both ways and the copy says so: cancelling a plan that settles WIN
 * gives up a gain, and cancelling one that settles LOSS avoids a deduction. The
 * button is `destructive` on the first and `outline` on the second, because the
 * variant encodes RISK, not importance.
 */

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Money } from "../../components/kit/money";
import type { InvestmentView } from "../../components/kit/position";

interface CancelPanelProps {
  position: InvestmentView;
  cancelling: boolean;
  error: unknown;
  onCancel: () => Promise<void>;
}

export function CancelPanel({
  position,
  cancelling,
  error,
  onCancel,
}: CancelPanelProps) {
  const t = useTranslations("investment");
  const [open, setOpen] = useState(false);

  // Cancelling a LOSS plan is the low-risk direction — it avoids the deduction —
  // so it does not wear the destructive variant.
  const givesUpAGain = position.outcome?.sign === 1;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs font-medium text-foreground">
            {t("cancel_this_position")}
          </p>
          <p className="max-w-[64ch] text-[11px] leading-relaxed text-subtle-foreground">
            {t("cancel_returns_principal_note")}
          </p>
        </div>
        <Button
          variant={givesUpAGain ? "destructive" : "outline"}
          size="sm"
          onClick={() => setOpen(true)}
        >
          {t("cancel_investment")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{t("cancel_investment")}</DialogTitle>
            <DialogDescription>
              {givesUpAGain
                ? t("cancel_confirm_forfeits_gain")
                : position.outcome?.sign === -1
                  ? t("cancel_confirm_avoids_loss")
                  : t("cancel_confirm_neutral")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">
              {t("returns_to_wallet")}
            </span>
            <Money
              value={position.amount}
              currency={position.currency}
              size="base"
            />
          </div>

          {/* The failure is reported HERE, beside the button that caused it,
              and it persists. The old invest form's only error report was an
              alert that self-destructed after five seconds. */}
          {error != null && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-ink">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {String(error)}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={cancelling}
            >
              {t("keep_it_running")}
            </Button>
            <Button
              variant={givesUpAGain ? "destructive" : "default"}
              size="sm"
              loading={cancelling}
              onClick={async () => {
                await onCancel();
                setOpen(false);
              }}
            >
              {t("cancel_and_refund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
