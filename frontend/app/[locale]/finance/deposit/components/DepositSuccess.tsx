"use client";

import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Plus, Wallet, FileText, Info, ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { fadeInUp, scaleIn, copyToClipboard } from "./deposit-helpers";
import { toast } from "sonner";
import { GlassPanel, SectionTitle } from "../../_components/finance-ui";
import { cn } from "@/lib/utils";

interface DepositSuccessProps {
  deposit: any;
  selectedCurrency: string;
  selectedWalletType: { value: string; label: string } | null;
  onReset: () => void;
}

export function DepositSuccess({
  deposit,
  selectedCurrency,
  selectedWalletType,
  onReset,
}: DepositSuccessProps) {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const router = useRouter();

  const walletTypeValue = selectedWalletType?.value;
  const walletTypeLabel = selectedWalletType?.label || walletTypeValue;
  const depositCurrency = deposit.currency?.toUpperCase() || selectedCurrency;
  // Ecosystem deposits credit the ECO wallet — shown as "Eco"/"Funding" in the
  // UI and NOT the Spot wallet. Users trading CCXT spot markets often read the
  // 0 spot balance as "my deposit never arrived", so spell out where the funds
  // are and how to move them.
  const isEcoDeposit = walletTypeValue === "ECO";
  const walletHref =
    walletTypeValue && depositCurrency
      ? `/finance/wallet/${walletTypeValue}/${depositCurrency}`
      : "/finance/wallet";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <m.div {...fadeInUp} className="text-center">
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success shadow-lg shadow-success/30">
          <div className="absolute inset-0 animate-ping rounded-full bg-success/30" />
          <CheckCircle2 className="relative h-10 w-10 text-success-foreground" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-foreground">
          {t("deposit_successful")}
        </h1>
        <p className="mt-2 text-sm text-subtle-foreground">
          {t("your_deposit_has_been_added_to_your_account")}
        </p>
      </m.div>

      <m.div {...scaleIn}>
        <GlassPanel>
          <SectionTitle icon={FileText} title={t("deposit_details")} hint={t("receipt_and_transaction_info")} />

          <div className="space-y-2">
            <Row label={t("amount")}>
              <span className="font-bold text-up">
                +{deposit.amount} {deposit.currency?.toUpperCase() || selectedCurrency}
              </span>
            </Row>
            {deposit.fee && Number(deposit.fee) > 0 && (
              <Row label={t("fee")}>
                <span className="text-warning">
                  {deposit.fee} {deposit.currency?.toUpperCase() || selectedCurrency}
                </span>
              </Row>
            )}
            <Row label={t("method")}>{deposit.method}</Row>
            <Row label={t("wallet")}>{selectedWalletType?.label}</Row>
            <Row label={t("status")}>
              <StatusBadge status={deposit.status} />
            </Row>
            {deposit.balance && (
              <Row label={t("new_balance")}>
                <span className="font-bold tabular-nums text-up">
                  {deposit.balance} {deposit.currency?.toUpperCase() || selectedCurrency}
                </span>
              </Row>
            )}
            {deposit.transactionHash && (
              <Row label={t("transaction_hash")}>
                <CopyValue value={deposit.transactionHash} />
              </Row>
            )}
            {deposit.blockNumber && (
              <Row label={tExtAdmin("block_number")}>
                <span className="font-mono tabular-nums">{deposit.blockNumber}</span>
              </Row>
            )}
            {deposit.from && (
              <Row label={t("from")}>
                <CopyValue value={deposit.from} short />
              </Row>
            )}
            {deposit.to && (
              <Row label={t("to")}>
                <CopyValue value={deposit.to} short />
              </Row>
            )}
          </div>

          {isEcoDeposit && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  These funds are in your{" "}
                  <span className="font-semibold">{walletTypeLabel}</span> (Eco) wallet.
                  To trade them on a standard Spot market, transfer them to your Spot
                  wallet first.
                </p>
                <button
                  onClick={() => router.push("/finance/transfer")}
                  className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline text-primary"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {t("transfer_to_spot")}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(walletHref)}
              className="h-11 flex-1 gap-1.5"
            >
              <Wallet className="h-4 w-4" />
              {t("view_wallet")}
            </Button>
            <Button
              onClick={onReset}
              className="h-11 flex-1 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              {t("make_another_deposit")}
            </Button>
          </div>
        </GlassPanel>
      </m.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm">
      <span className="text-xs font-medium text-subtle-foreground">{label}</span>
      <div className="text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    COMPLETED: "border-success/30 bg-success/10 text-up",
    PENDING: "border-warning/30 bg-warning/10 text-warning-ink",
    FAILED: "border-destructive/30 bg-destructive/10 text-down",
  };
  const cls = map[status] || "border-border/30 bg-muted/10 text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", cls)}>
      {status}
    </span>
  );
}

function CopyValue({ value, short }: { value: string; short?: boolean }) {
  const display = short ? `${value.slice(0, 8)}…${value.slice(-6)}` : `${value.slice(0, 16)}…`;
  return (
    <div className="flex items-center gap-1.5">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs bg-muted text-muted-foreground">
        {display}
      </code>
      <button
        onClick={() => copyToClipboard(value, toast)}
        className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-card text-subtle-foreground hover:bg-muted"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}
