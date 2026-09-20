"use client";

import { useEffect } from "react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  Copy,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  DollarSign,
  QrCode,
  ShieldAlert,
  ArrowDownToLine,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";
import { useDepositStore } from "@/store/finance/deposit-store";
import { useUserStore } from "@/store/user";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import {
  fadeInUp,
  extractAmountValue,
  copyToClipboard,
  getRequiredConfirmations,
  getBlockchainExplorerUrl,
  getEstimatedTime,
} from "./deposit-helpers";
import {
  GlassPanel,
  PageHeader,
  SectionTitle,
  CurrencyMark,
} from "../../_components/finance-ui";

/**
 * ECO deposits land on the user's OWN permanent address on every chain —
 * PERMIT, NO_PERMIT and native alike. There is no shared custodial contract to
 * lock per session any more, so there is no countdown, no "unlock" call on the
 * way out, and the client never tells the server which address it is watching:
 * the deposit socket resolves that from `{ currency, chain }` itself.
 */
export function EcoDeposit() {
  const t = useTranslations("common");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const { user } = useUserStore();

  const {
    step,
    selectedCurrency,
    selectedDepositMethod,
    depositAddress,
    deposit,
    setStep,
    setDeposit,
    reset,
  } = useDepositStore();

  useEffect(() => {
    if (depositAddress && user?.id && selectedCurrency && selectedDepositMethod) {
      const connectionId = "eco-deposit";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const isDev = process.env.NODE_ENV === "development";
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
      const host = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
      const wsUrl = `${protocol}//${host}/api/ecosystem/deposit?userId=${user.id}`;

      wsManager.connect(wsUrl, connectionId);

      const handleUpdate = (data: any) => {
        if (data?.type === "pending_confirmation" || data?.confirmations !== undefined) {
          const confirmations = data?.confirmations || 0;
          const required = data?.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain);
          const txHash = data?.transactionHash || data?.txHash || data?.hash;

          if (confirmations < required) {
            toast.info(
              <div>
                <div>{t("transaction_detected")}</div>
                <div className="mt-1 text-sm">
                  {t("confirmations")}: {confirmations}/{required}
                </div>
                {txHash && (
                  <a
                    href={getBlockchainExplorerUrl(selectedDepositMethod?.chain, txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    {t("view_on_blockchain")}
                  </a>
                )}
              </div>,
              { duration: 10000, id: `pending-tx-${txHash}` }
            );

            setDeposit({
              confirmed: false,
              status: "PENDING",
              id: data?.transaction?.id || txHash,
              amount: data?.transaction?.amount || data?.trx?.amount || data?.amount,
              currency: data?.currency || selectedCurrency,
              method: data?.method || selectedDepositMethod?.name || selectedDepositMethod?.chain,
              fee: data?.transaction?.fee || data?.trx?.fee || 0,
              balance: data?.balance || data?.wallet?.balance,
              transactionHash: txHash,
              confirmations,
              requiredConfirmations: required,
              blockNumber: data?.trx?.blockNumber || data?.blockNumber,
              from: data?.trx?.from || data?.from,
              to: data?.trx?.to || data?.to,
              chain: selectedDepositMethod?.chain,
            });
          }
          return;
        }

        switch (data?.status) {
          case 200:
          case 201: {
            // Confirmations can arrive from more than one backend path
            // (scanner broadcast + monitor re-broadcast) — dedup the toast.
            toast.success(data.message || t("deposit_confirmed"), {
              id: `deposit-confirmed-${data?.transactionId || data?.transaction?.id || data?.trx?.hash || "latest"}`,
            });
            setDeposit({
              confirmed: true,
              status: data?.transaction?.status || "COMPLETED",
              id: data?.transaction?.id,
              amount: data?.transaction?.amount || data?.trx?.amount,
              currency: data?.currency || selectedCurrency,
              method: data?.method || selectedDepositMethod?.name || selectedDepositMethod?.chain,
              fee: data?.transaction?.fee || data?.trx?.fee || 0,
              balance: data?.balance || data?.wallet?.balance,
              transactionHash: data?.transaction?.trxId || data?.trx?.hash,
              blockNumber: data?.trx?.blockNumber,
              gasUsed: data?.trx?.gasUsed,
              from: data?.trx?.from,
              to: data?.trx?.to,
              chain: selectedDepositMethod?.chain,
            });
            break;
          }
          case 400:
          case 401:
          case 403:
          case 404:
          case 500:
            toast.error(data.message || t("deposit_failed"));
            break;
        }
      };

      wsManager.subscribe("verification", handleUpdate, connectionId);

      const handleStatus = (status: ConnectionStatus) => {
        if (status === ConnectionStatus.CONNECTED) {
          wsManager.sendMessage(
            {
              action: "SUBSCRIBE",
              // The payload IS the subscription key (the broker matches it
              // byte-for-byte against the payload every deposit broadcast
              // carries: currency, chain AND the lowercased address), so the
              // wallet's own address must travel with it. The server never uses
              // it to decide what to watch — that is the wallet's address,
              // resolved server-side.
              payload: {
                currency: selectedCurrency,
                chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
                address: (typeof depositAddress === "string" ? depositAddress : depositAddress?.address)?.toLowerCase(),
              },
            },
            connectionId
          );
        }
      };
      wsManager.addStatusListener(handleStatus, connectionId);

      return () => {
        wsManager.sendMessage(
          {
            action: "UNSUBSCRIBE",
            payload: {
              currency: selectedCurrency,
              chain: selectedDepositMethod?.chain || selectedDepositMethod?.id,
              address: (typeof depositAddress === "string" ? depositAddress : depositAddress?.address)?.toLowerCase(),
            },
          },
          connectionId
        );
        wsManager.unsubscribe("verification", handleUpdate, connectionId);
        wsManager.removeStatusListener(handleStatus, connectionId);
      };
    }
  }, [depositAddress, user?.id, selectedCurrency, selectedDepositMethod]);

  if (step !== 4 || !depositAddress) return null;

  /**
   * ON-CHAIN CONFIRMATION STATE, NOT A FETCH.
   *
   * This was called `isPending`, which reads as "a request is in flight"
   * everywhere else in this codebase and is not what it means: the deposit
   * has been SEEN on chain and is accumulating confirmations. The two views
   * it chooses between are both fully-resolved states — "send to this
   * address" and "we can see your transaction" — so the swap below is a
   * state machine, not a loading swap, and the skeleton scanner was right
   * to be suspicious of the name and wrong about the code.
   *
   * Renamed rather than annotated because the name was the whole problem: a
   * reader scanning for pending-fetch handling finds this and has to read
   * three more lines to learn it is unrelated.
   */
  const isConfirming =
    deposit?.status === "PENDING" && deposit?.confirmations !== undefined;
  const addr = depositAddress?.address || depositAddress;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ArrowDownToLine}
        eyebrow="Deposit"
        title={isConfirming ? t("processing_1", { selectedCurrency: String(selectedCurrency) }) : t("send_1", { selectedCurrency: String(selectedCurrency) })}
        description={
          isConfirming
            ? t("your_transaction_has_been_detected_and")
            : `Send ${selectedCurrency} to the address below on the ${
                depositAddress?.network || selectedDepositMethod?.chain
              } network.`
        }
        actions={
          <Button variant="ghost" onClick={() => setStep(3)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" />
            {t("back_to_networks")}
          </Button>
        }
      />

      <m.div {...fadeInUp}>
        <GlassPanel>
          {isConfirming ? (
            <PendingTransactionView
              deposit={deposit}
              selectedCurrency={selectedCurrency}
              selectedDepositMethod={selectedDepositMethod}
              t={t}
              tExtAdmin={tExtAdmin}
            />
          ) : (
            <>
              <SectionTitle
                icon={QrCode}
                title={t("deposit_address")}
                hint={`Network: ${depositAddress?.network || selectedDepositMethod?.chain}`}
              />
              <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-card p-4">
                  {/* DELIBERATE literals — do not tokenize. A QR is machine-read
                      optics, not interface colour: scanners expect dark modules
                      on a light quiet zone, and inverting or tinting it costs
                      real scan reliability on a screen someone is pointing a
                      phone at to move money. The white plate around it is
                      `includeMargin`'s quiet zone, which is part of the symbol. */}
                  <div className="rounded-lg bg-card p-2">
                    <QRCodeCanvas value={addr} size={196} level="M" includeMargin bgColor="#FFFFFF" fgColor="#000000" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                    <CurrencyMark code={selectedCurrency} size="sm" />
                    {selectedCurrency}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                      {selectedCurrency} Address
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted p-3 dark:bg-surface-2/70">
                      <code className="flex-1 break-all font-mono text-xs text-muted-foreground">{addr}</code>
                      <button
                        onClick={() => copyToClipboard(addr, toast)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard label="Network" value={depositAddress?.network || selectedDepositMethod?.chain} />
                    {depositAddress?.balance !== undefined && (
                      <InfoCard
                        label={t("current_balance")}
                        value={<MoneyFigure value={`${depositAddress.balance} ${selectedCurrency}`} />}
                      />
                    )}
                    <InfoCard
                      label={tCommon("minimum")}
                      value={
                        <MoneyFigure
                          value={`${extractAmountValue(
                            selectedDepositMethod?.limits?.deposit?.min,
                            selectedCurrency
                          )} ${selectedCurrency}`}
                        />
                      }
                    />
                  </div>

                  <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
                    <div className="flex items-start gap-2 text-xs text-warning">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        Send only <strong>{selectedCurrency}</strong> on the{" "}
                        <strong>{depositAddress?.network || selectedDepositMethod?.chain}</strong> network. Other tokens
                        or networks may result in permanent loss.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setStep(3)} className="h-11 flex-1">
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t("back_to_networks")}
            </Button>
            <Button onClick={reset} className="h-11 flex-1 bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("new_deposit")}
            </Button>
          </div>
        </GlassPanel>
      </m.div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function PendingTransactionView({
  deposit,
  selectedCurrency,
  selectedDepositMethod,
  t,
  tExtAdmin,
}: any) {
  const tCommon = useTranslations("common");
  const required = deposit.requiredConfirmations || getRequiredConfirmations(selectedDepositMethod?.chain);
  const progress = Math.min(100, (deposit.confirmations / required) * 100);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning text-warning-foreground shadow-lg shadow-warning/30">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {tCommon("transaction_pending")}
            </h3>
            <p className="text-xs text-warning">
              {tCommon("waiting_for_blockchain_confirmations")}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-warning">Confirmations</span>
            <span className="font-mono text-sm font-bold text-foreground">
              {deposit.confirmations} / {required}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-warning/20">
            <m.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-warning"
            />
          </div>
          <p className="text-xs text-warning">
            {deposit.confirmations < required
              ? `Needs ${required - deposit.confirmations} more confirmations`
              : `${tCommon("processing_your_deposit")}…`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-up" />
          <h4 className="text-sm font-semibold text-foreground">
            {tCommon("transaction_details")}
          </h4>
        </div>
        <div className="space-y-2 text-sm">
          {deposit.transactionHash && (
            <DetailRow label={tCommon("transaction_hash")}>
              <div className="flex items-center gap-2">
                <span className="max-w-[180px] truncate font-mono text-xs">{deposit.transactionHash}</span>
                <button
                  onClick={() => copyToClipboard(deposit.transactionHash, toast)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-border bg-card text-subtle-foreground hover:bg-muted"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </DetailRow>
          )}
          <DetailRow label="Amount">
            <MoneyFigure value={`${deposit.amount ?? ""} ${selectedCurrency}`} />
          </DetailRow>
          <DetailRow label="Network">{deposit.chain || selectedDepositMethod?.chain}</DetailRow>
          {deposit.fee !== undefined && (
            <DetailRow label={tCommon("network_fee")}>
              <MoneyFigure value={`${deposit.fee} ${selectedCurrency}`} />
            </DetailRow>
          )}
        </div>
        {deposit.transactionHash && (
          <a
            href={getBlockchainExplorerUrl(deposit.chain || selectedDepositMethod?.chain, deposit.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-info/30 bg-info/10 px-4 py-2 text-xs font-semibold text-primary-ink transition hover:bg-primary/10 hover:text-primary-ink"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {tExtAdmin("view_on_blockchain_explorer")}
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="rounded-xl border border-info/20 bg-info/10 p-3">
        <div className="flex items-start gap-2 text-xs text-primary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">{tCommon("what_happens_next")}</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>
                {tCommon("your_transaction_is_being_verified_on_the")} {deposit.chain || selectedDepositMethod?.chain}
              </li>
              <li>
                {tCommon("once")} {required} {tCommon("confirmations_are_reached_your_funds_will")}
              </li>
              <li>
                {tCommon("this_usually_takes")} {getEstimatedTime(selectedDepositMethod?.chain)}
              </li>
              <li>{tCommon("you_can_safely_leave_this_page")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-subtle-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{children}</span>
    </div>
  );
}
