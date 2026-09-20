"use client";

/**
 * The unlock prompt.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * IT IS DRIVEN BY THE APPROVAL QUEUE, NOT BY A PARENT'S STATE.
 *
 * The thing that needs an unlock is usually not a component — it is the
 * EIP-1193 provider, called by wagmi, part-way through `eth_sendTransaction`,
 * with a promise waiting. So this dialog resolves a queue entry rather than
 * calling a callback, and the provider carries on where it left off. A user who
 * unlocks here does not have to press Swap a second time.
 *
 * ── THE PASSWORD FIELD IS NOT AUTOFILLABLE, AND THAT IS DELIBERATE ──────────
 * `autoComplete="off"` plus a name that is not "password". Browsers and
 * managers offer the ACCOUNT password here otherwise, and the two are
 * deliberately different secrets — see §6.2 of the plan. Offering the wrong one
 * teaches the user they are interchangeable, which is the misunderstanding the
 * separation exists to prevent.
 * ═════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { unlock } from "@/lib/web3-wallet";
import { WALLET_DIALOG_LAYER } from "./dialog-layer";

export function UnlockDialog({
  open,
  reason,
  onUnlocked,
  onCancel,
}: {
  open: boolean;
  reason: "sign" | "connect";
  onUnlocked: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("ext_dex");
  const tCommon = useTranslations("common");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Clear the password whenever the dialog opens or closes. Leaving it in state
     would keep a secret alive in the React tree for the rest of the session. */
  useEffect(() => {
    setPassword("");
    setError(null);
    if (open) {
      // A dialog that steals focus is annoying; one that does not, for a field
      // the user is required to fill, is worse.
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
      setPassword("");
      onUnlocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unlock_failed"));
      /* Keep the dialog open and the field focused: a wrong password is a typo
         far more often than it is the wrong password. */
      inputRef.current?.select();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent
        size="sm"
        className={WALLET_DIALOG_LAYER}
        data-testid="wallet-unlock-dialog"
      >
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <DialogTitle>{t("unlock_your_wallet")}</DialogTitle>
          <DialogDescription>
            {reason === "sign"
              ? t("unlock_to_sign_description")
              : t("unlock_to_connect_description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <Input
            ref={inputRef}
            type="password"
            /* Not "password": see the header. */
            name="wallet-unlock"
            autoComplete="off"
            placeholder={t("wallet_password")}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "wallet-unlock-error" : undefined}
          />

          {error ? (
            <p
              id="wallet-unlock-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {error}
            </p>
          ) : (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-subtle-foreground">
              <ShieldCheck className="mt-px size-3 shrink-0" />
              {t("password_never_leaves_this_device")}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={busy || !password}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {tCommon("unlock")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UnlockDialog;
