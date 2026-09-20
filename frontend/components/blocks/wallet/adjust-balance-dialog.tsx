"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Plus, Minus } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * The one manual credit/debit control in the product.
 *
 * It was written inline in `admin/finance/wallet/page.tsx` and reachable only
 * from that table's row `⋯` menu. The wallet detail page needs the identical
 * control, and a second inline copy is how the three transaction detail clients
 * ended up as near-identical divergent copies of each other — the failure mode
 * `RecordAuditTab` was extracted to stop. One component, two mount points.
 *
 * WHAT THE SERVER DOES WITH EACH FIELD — the endpoint is
 * `POST /api/admin/finance/wallet/{id}/balance`, permission `edit.wallet`:
 *
 *   nonce        makes the POST idempotent. Generated ONCE PER DIALOG OPEN, so a
 *                network retry of the same submit is de-duplicated by the wallet
 *                service while two deliberate adjustments are NOT merged. Do not
 *                regenerate it per submit attempt — that is the whole point.
 *   description  the operator's reason, stored on the ledger row. Blank sends
 *                `undefined` so the server writes its own default sentence
 *                rather than an empty string.
 *   notifyUser   whether the wallet owner is emailed. Threaded, not decorative.
 *
 * Every write lands in `wallet_audit_log` with the balance either side of it,
 * which is what the Audit tab on the detail page reads back.
 */

export interface AdjustableWallet {
  id: string;
  currency?: string;
  type?: string;
  /** DECIMAL(30,18) — arrives as a STRING. Never compare it without `toNumber`. */
  balance?: string | number | null;
  user?: {
    firstName?: string;
    lastName?: string;
  } | null;
}

/**
 * `balance` is DECIMAL(30,18) and mysql2 returns every DECIMAL as a string.
 *
 * The original inline version guarded the over-debit case with
 * `typeof row.balance === "number"`, which is FALSE for every row the wallet
 * list endpoint serves (it declares no `numericFields`), so the guard never
 * fired and the operator learned the balance was too low from a 400 round trip
 * instead of from the form. Coerce, don't type-test.
 */
function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function generateNonce(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof (crypto as any).randomUUID === "function"
  ) {
    return (crypto as any).randomUUID();
  }
  // Fallback: time + random suffix. Good enough as a per-click uniqueness token
  // when crypto.randomUUID isn't available.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AdjustBalanceDialog({
  wallet,
  open,
  onOpenChange,
  onAdjusted,
}: {
  wallet: AdjustableWallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful adjustment — refetch whatever is on screen. */
  onAdjusted?: () => void | Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `size`, not `max-w-*`: the Dialog primitive owns its width above `sm`
          and an arbitrary max-width class is dead there. */}
      <DialogContent size="md">
        {/*
         * THE FORM IS A SEPARATE COMPONENT SO THAT OPENING THE DIALOG MOUNTS IT.
         *
         * `DialogContent` carries no `forceMount`, so Radix unmounts it on close
         * and mounts it again on open. That makes every field — including the
         * idempotency nonce — initialise from `useState` exactly once per open,
         * by construction. The alternative (one component, an effect that resets
         * on `open`) is the cascading-render pattern
         * `react-hooks/set-state-in-effect` rejects, and it makes the nonce's
         * "one per open" guarantee depend on an effect firing rather than on a
         * mount that cannot not happen.
         *
         * GATED ON `wallet` ONLY, NOT ON `open`. Radix keeps this subtree mounted
         * through the close animation; adding `open &&` would tear the
         * `DialogTitle` out mid-exit, and a `DialogContent` without one trips
         * Radix's accessibility warning every time the dialog is dismissed.
         */}
        {wallet ? (
          <AdjustBalanceForm
            wallet={wallet}
            onOpenChange={onOpenChange}
            onAdjusted={onAdjusted}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AdjustBalanceForm({
  wallet,
  onOpenChange,
  onAdjusted,
}: {
  wallet: AdjustableWallet;
  onOpenChange: (open: boolean) => void;
  onAdjusted?: () => void | Promise<void>;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const [type, setType] = useState<"ADD" | "SUBTRACT">("ADD");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /*
   * Lazy initialiser: `generateNonce` runs ONCE for this mount, i.e. once per
   * dialog open. A failed submit keeps it, so the retry is the same operation
   * to the server and is de-duplicated; a fresh open mints a new one, so two
   * deliberate adjustments are never merged.
   */
  const [nonce] = useState(generateNonce);

  const available = toNumber(wallet.balance);

  const handleSubmit = useCallback(async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error(t("amount_must_be_a_positive_number"));
      return;
    }
    if (type === "SUBTRACT" && amountNum > available) {
      toast.error(
        t("insufficient_balance_available", {
          balance: String(available),
          currency: String(wallet.currency ?? ""),
        })
      );
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/finance/wallet/${wallet.id}/balance`,
        method: "POST",
        body: {
          type,
          amount: amountNum,
          description: description || undefined,
          notifyUser: notify,
          nonce,
        },
      });

      // `$fetch` never throws and has already toasted the failure — a `catch`
      // here would be dead code. Bail out and leave the dialog open with the
      // operator's input, and the same nonce, intact.
      if (error) return;

      toast.success(
        `Wallet ${type === "ADD" ? "credited" : "debited"} by ${amountNum} ${wallet.currency ?? ""}`.trim()
      );
      onOpenChange(false);
      await onAdjusted?.();
    } finally {
      setSubmitting(false);
    }
  }, [
    wallet,
    amount,
    type,
    description,
    notify,
    nonce,
    available,
    onOpenChange,
    onAdjusted,
    t,
  ]);

  const ownerName =
    `${wallet.user?.firstName ?? ""} ${wallet.user?.lastName ?? ""}`.trim();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("adjust_wallet_balance")}</DialogTitle>
        <DialogDescription>
          {[
            ownerName,
            `${wallet.type ?? ""} ${wallet.currency ?? ""}`.trim(),
            `Balance: ${available}`,
          ]
            .filter(Boolean)
            .join(" — ")}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{tCommon("type")}</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as "ADD" | "SUBTRACT")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADD">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-success" />
                  Add (credit)
                </div>
              </SelectItem>
              <SelectItem value="SUBTRACT">
                <div className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-destructive" />
                  Subtract (debit)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjust-amount">{tCommon("amount")}</Label>
          <Input
            id="adjust-amount"
            type="number"
            step="0.00000001"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjust-description">
            {tCommon("description")} ({tCommon("optional")})
          </Label>
          <Textarea
            id="adjust-description"
            placeholder={`${t("reason_for_this_adjustment")}…`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label>{t("notify_user")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("send_an_email_about_this_adjustment")}
            </p>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          {tCommon("cancel")}
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !amount}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : type === "ADD" ? (
            <Plus className="mr-2 h-4 w-4" />
          ) : (
            <Minus className="mr-2 h-4 w-4" />
          )}
          {type === "ADD" ? t("add_balance") : t("subtract_balance")}
        </Button>
      </DialogFooter>
    </>
  );
}

export default AdjustBalanceDialog;
