"use client";

/**
 * THE SPOT DEPOSIT SCREEN, IN THREE MODES.
 *
 * Plan of record: `plans/done/SPOT-DEPOSIT-MODES.md`; build spec:
 * `plans/done/spot-deposit-modes-build.md`.
 *
 * WHAT CHANGED AND WHY. A spot wallet is custodied on the exchange, and the
 * platform holds ONE deposit address per (currency, network) — the same address
 * every customer is shown. Nothing on chain says who a transfer came from, so
 * attribution used to be "paste the hash, first claim wins". That is a hole:
 * the address is public, so anyone watching it could paste a stranger's hash
 * before the sender did, be credited for it, and leave the real depositor with
 * "Transaction already exists".
 *
 * A credit now needs an INTENT THAT PREDATES THE DEPOSIT, and this screen is
 * where the customer makes one. The admin's `spotDepositMode` decides what the
 * intent asks for:
 *
 *   hash_claim         amount -> the exchange's address -> paste the hash, as
 *                      before, except the hash is only ever credited against
 *                      the caller's OWN earlier declaration.
 *   amount_match       amount -> the exchange's address AND an exact figure to
 *                      send, unique among every open deposit on that network.
 *                      No hash: the amount is the identifier.
 *   ecosystem_custody  no amount at all -> the customer's OWN permanent
 *                      Ecosystem address. The platform sweeps whatever lands
 *                      there to the exchange and claims it itself.
 *
 * THE SETTING IS NOT THE ANSWER, THE INTENT IS. `spotDepositMode` is the
 * platform default; ecosystem custody is granted per (currency, network) by the
 * server and falls back to amount_match where it cannot apply (D2). So the
 * setting only shapes the FIRST step; every step after it reads the mode
 * stamped on the intent row.
 *
 * TWO SOCKETS, NOT ONE.
 *   - `/api/finance/deposit/spot` (unchanged) is keyed on a transaction HASH.
 *     It exists only after a hash claim, and it still drives the monitoring
 *     screen for modes A and B's fallback — including its new
 *     `{ status: 202, review }` frame, which means "held for a human, stop the
 *     spinner and say why".
 *   - `/api/finance/deposit/spot/intent` is keyed on the INTENT and carries the
 *     stages every mode walks: waiting -> received -> (moving -> on_exchange)
 *     -> credited, or review / failed / expired. Modes B and C have no hash at
 *     all, so this is the only thing that can tell them anything.
 *
 * THE 30-MINUTE COUNTDOWN IS NOW A HINT, NOT A CUT-OFF (D4). It used to expire
 * the screen and reset the store. An intent is OPEN for 60 minutes and is
 * matched for seven days, so tearing the screen down at 30 would be telling the
 * customer their deposit is gone while the server is still waiting for it. The
 * countdown now runs to the intent's own `sendBy` and, when it passes, says so
 * and leaves everything standing.
 */

import { useEffect, useMemo, useState } from "react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { Countdown } from "@/components/ui/countdown";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  Copy,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  Clock,
  ShieldAlert,
  ArrowDownToLine,
  QrCode,
  Wallet,
  Fuel,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";
import { useDepositStore } from "@/store/finance/deposit-store";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { wsManager, ConnectionStatus } from "@/services/ws-manager";
import {
  fadeInUp,
  extractAmountValue,
  copyToClipboard,
} from "./deposit-helpers";
import {
  GlassPanel,
  PageHeader,
  SectionTitle,
  CurrencyMark,
} from "../../_components/finance-ui";
import {
  SpotIntentStages,
  SpotDepositReviewNotice,
} from "./spot/SpotIntentStages";
import { SpotDeclareStep } from "./spot/SpotDeclareStep";
import {
  readSpotDepositMode,
  readSpotIntentStage,
  resolveSweepFee,
  trimDecimalString,
  type SpotDepositMode,
} from "./spot/intent-utils";

export function SpotDeposit() {
  const t = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const { user } = useUserStore();
  const { settings } = useConfigStore();

  const {
    step,
    selectedCurrency,
    selectedDepositMethod,
    depositAddress,
    transactionHash,
    transactionSent,
    loading,
    deposit,
    setStep,
    setDeposit,
    setTransactionHash,
    sendTransactionHash,
    reset,
    spotIntent,
    spotIntentFee,
    spotIntentLoading,
    spotIntentError,
    spotIntentNeedsAmount,
    spotIntentStage,
    spotIntentMessage,
    createSpotIntent,
    resumeSpotIntent,
    cancelSpotIntent,
    applySpotIntentFrame,
    clearSpotIntent,
  } = useDepositStore();

  /** The exchange's own spelling of the rail, and the only network id the API is given. */
  const networkId = selectedDepositMethod?.chain || selectedDepositMethod?.id || "";
  const settingMode = readSpotDepositMode(settings?.spotDepositMode);
  const intentId = spotIntent?.id ? String(spotIntent.id) : "";
  /** The intent's own mode wins over the setting: D2's fallback is decided server-side. */
  const mode: SpotDepositMode = spotIntent?.mode
    ? readSpotDepositMode(spotIntent.mode)
    : settingMode;
  const stage = readSpotIntentStage(spotIntentStage || spotIntent?.stage);

  const [reviewNotice, setReviewNotice] = useState<{ message?: string; reason?: string } | null>(
    null
  );
  const [sendByPassed, setSendByPassed] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // ── The caller's intent for THIS (currency, network), resumed on arrival ──
  //
  // A reload, a tab restored an hour later, or simply stepping back to the
  // network list and returning must not ask the server for a second address:
  // the intent already exists, and the POST route would hand back the same row
  // anyway. Fetching the list is also what CLEARS a stale intent when the
  // customer switches network.
  useEffect(() => {
    if (!selectedCurrency || !networkId) return;
    setReviewNotice(null);
    void resumeSpotIntent();
  }, [selectedCurrency, networkId]);

  // A fresh intent gets a fresh send-by. Without this, replacing an EXPIRED
  // intent on the same network would inherit the old one's "time has passed".
  useEffect(() => {
    setSendByPassed(false);
  }, [intentId]);

  // ── The intent stream: every stage, in every mode ────────────────────────
  useEffect(() => {
    if (!intentId || !user?.id) return;

    const intentConnectionId = "spot-deposit-intent";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const isDev = process.env.NODE_ENV === "development";
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
    const host = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
    const intentWsUrl = `${protocol}//${host}/api/finance/deposit/spot/intent?userId=${user.id}`;

    wsManager.connect(intentWsUrl, intentConnectionId);

    const handleFrame = (data: any) => {
      if (!data || String(data.intentId ?? "") !== intentId) return;
      applySpotIntentFrame(data);

      const nextStage = readSpotIntentStage(data.stage);
      if (nextStage === "credited") {
        toast.success(data.message || t("deposit_confirmed"), {
          id: `spot-intent-credited-${intentId}`,
        });
        setDeposit({
          confirmed: true,
          status: data?.transaction?.status || "COMPLETED",
          id: data?.transaction?.id,
          amount: data?.transaction?.amount ?? data?.amount,
          currency: selectedCurrency,
          method: selectedDepositMethod?.chain || selectedDepositMethod?.id || "SPOT",
          fee: data?.transaction?.fee || 0,
          transactionHash: data?.txid || transactionHash,
          chain: networkId,
        });
      } else if (nextStage === "failed") {
        toast.error(data.message || t("deposit_failed"), {
          id: `spot-intent-failed-${intentId}`,
        });
      }
    };

    wsManager.subscribe("intent", handleFrame, intentConnectionId);

    // The payload IS the subscription key the broker matches byte-for-byte, and
    // `action: "SUBSCRIBE"` is what registers the client at all — a frame
    // without it is parsed, ignored, and nothing is ever delivered.
    const handleStatus = (status: ConnectionStatus) => {
      if (status === ConnectionStatus.CONNECTED) {
        wsManager.sendMessage({ action: "SUBSCRIBE", payload: { intentId } }, intentConnectionId);
      }
    };
    wsManager.addStatusListener(handleStatus, intentConnectionId);
    if (wsManager.getStatus(intentConnectionId) === ConnectionStatus.CONNECTED) {
      wsManager.sendMessage({ action: "SUBSCRIBE", payload: { intentId } }, intentConnectionId);
    }

    return () => {
      wsManager.unsubscribe("intent", handleFrame, intentConnectionId);
      wsManager.removeStatusListener(handleStatus, intentConnectionId);
      wsManager.close(intentConnectionId);
    };
  }, [intentId, user?.id, selectedCurrency, networkId]);

  // ── The hash verification stream, unchanged apart from the review frame ──
  useEffect(() => {
    if (
      transactionSent &&
      transactionHash &&
      user?.id &&
      selectedCurrency &&
      selectedDepositMethod
    ) {
      const verificationConnectionId = "spot-deposit";
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const isDev = process.env.NODE_ENV === "development";
      const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
      const host = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
      const verificationWsUrl = `${protocol}//${host}/api/finance/deposit/spot?userId=${user.id}`;

      wsManager.connect(verificationWsUrl, verificationConnectionId);

      const handleUpdate = (data: any) => {
        switch (data?.status) {
          case 200:
          case 201: {
            toast.success(data.message || t("deposit_confirmed"));
            setDeposit({
              confirmed: true,
              status: data?.transaction?.status || "COMPLETED",
              id: data?.transaction?.id,
              amount: data?.transaction?.amount,
              currency: data?.currency || selectedCurrency,
              method: data?.method || "Wallet Transfer",
              fee: data?.transaction?.fee || 0,
              balance: data?.balance,
              transactionHash,
              chain: data?.chain,
            });
            break;
          }
          // 202: the deposit was found on the exchange but did not satisfy the
          // intent it was claimed against (amount, window, sender, or no intent
          // at all), so it is PENDING for the admin door rather than credited.
          // Nothing is lost and nothing is credited blind — but the spinner has
          // to stop, because no further frame is coming.
          case 202: {
            setReviewNotice({ message: data?.message, reason: data?.review });
            toast.warning(data?.message || t("spot_deposit_under_review"));
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

      wsManager.subscribe("verification", handleUpdate, verificationConnectionId);

      const handleStatus = (status: ConnectionStatus) => {
        if (status === ConnectionStatus.CONNECTED) {
          wsManager.sendMessage(
            { action: "SUBSCRIBE", payload: { trx: transactionHash } },
            verificationConnectionId
          );
        }
      };
      wsManager.addStatusListener(handleStatus, verificationConnectionId);

      return () => {
        wsManager.unsubscribe("verification", handleUpdate, verificationConnectionId);
        wsManager.removeStatusListener(handleStatus, verificationConnectionId);
        wsManager.close(verificationConnectionId);
      };
    }
  }, [transactionSent, transactionHash, user?.id, selectedCurrency, selectedDepositMethod]);

  // Leaving mid-flight loses nothing on the server — the intent and the
  // verification schedule are rows, not tabs — but the customer does not know
  // that, so warn while something is genuinely in motion.
  const inFlight =
    transactionSent || stage === "received" || stage === "moving" || stage === "on_exchange";
  useEffect(() => {
    if (inFlight && !deposit?.confirmed) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Your deposit is being processed. Are you sure you want to leave?";
        return e.returnValue;
      };
      const handlePopState = (e: PopStateEvent) => {
        if (!confirm(t("your_deposit_is_being_processed_are"))) {
          e.preventDefault();
          window.history.pushState(null, "", window.location.href);
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("popstate", handlePopState);
      window.history.pushState(null, "", window.location.href);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [inFlight, deposit?.confirmed]);

  const sendBySeconds = useMemo(() => {
    const sendBy = spotIntent?.sendBy ? Date.parse(String(spotIntent.sendBy)) : NaN;
    if (!Number.isFinite(sendBy)) return 0;
    return Math.max(0, Math.floor((sendBy - Date.now()) / 1000));
  }, [spotIntent?.sendBy]);

  const handleCreateIntent = async (amount: string | null) => {
    const result = await createSpotIntent(amount);
    if (!result.success && result.error && !result.needsAmount) {
      toast.error(result.error);
    }
  };

  const handleCancelIntent = async () => {
    setCancelling(true);
    const ok = await cancelSpotIntent();
    setCancelling(false);
    if (ok) toast.success(t("spot_deposit_cancelled"));
  };

  // ─────────────────────────── Step 5: monitoring ──────────────────────────
  if (step === 5 && transactionSent) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <m.div {...fadeInUp}>
          <GlassPanel padded={false} className="overflow-hidden">
            <div className="relative overflow-hidden p-6 text-center">
              <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                <Clock className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {t("monitoring_your_deposit")}
              </h2>
              <p className="mt-2 text-sm text-subtle-foreground">
                {t("were_monitoring_the_your_transaction")}
              </p>
            </div>

            <div className="space-y-3 px-6 pb-6">
              <Row label={t("transaction_hash")}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {transactionHash.slice(0, 12)}…{transactionHash.slice(-6)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(transactionHash, toast)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-subtle-foreground hover:bg-muted"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Row>
              <Row label={t("currency")}>{selectedCurrency}</Row>
              <Row label={t("network")}>
                {selectedDepositMethod?.chain || selectedDepositMethod?.id}
              </Row>
              <Row label={t("status")}>
                <Badge variant="outline" className="border-warning/50 text-warning">
                  {reviewNotice ? t("spot_deposit_stage_review") : t("pending_confirmation")}
                </Badge>
              </Row>

              {reviewNotice ? (
                <div className="my-6">
                  <SpotDepositReviewNotice
                    message={reviewNotice.message}
                    reason={reviewNotice.reason}
                  />
                </div>
              ) : (
                <div className="my-6 flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                  <p className="text-sm font-medium text-muted-foreground">{t("please_wait")}</p>
                </div>
              )}

              {intentId && !reviewNotice && (
                <SpotIntentStages mode={mode} stage={stage} message={spotIntentMessage} />
              )}

              <div className="pt-2">
                <Button variant="outline" onClick={reset} className="h-[calc(2.75rem*var(--control-height-scale))] w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("new_deposit")}
                </Button>
              </div>
            </div>
          </GlassPanel>
        </m.div>
      </div>
    );
  }

  if (step !== 4 || !depositAddress) return null;

  const networkLabel = spotIntent?.network || depositAddress?.network || networkId;
  const minimum = extractAmountValue(
    selectedDepositMethod?.limits?.deposit?.min,
    selectedCurrency
  );

  // ─────────────────────── Step 4a: declare the deposit ────────────────────
  if (!intentId) {
    return (
      <div className="space-y-5">
        <PageHeader
          icon={ArrowDownToLine}
          eyebrow="Deposit"
          title={t("send_1", { selectedCurrency: String(selectedCurrency) })}
          description={`Use the ${networkLabel} network to fund your Spot wallet.`}
          actions={
            <Button variant="ghost" onClick={() => setStep(3)} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              {t("back_to_networks")}
            </Button>
          }
        />
        <SpotDeclareStep
          mode={settingMode}
          currency={String(selectedCurrency)}
          network={String(networkLabel)}
          minimum={minimum > 0 ? minimum : null}
          needsAmount={spotIntentNeedsAmount}
          fellBackFromCustody={settingMode === "ecosystem_custody"}
          loading={spotIntentLoading}
          error={spotIntentError}
          onSubmit={handleCreateIntent}
          onBack={() => setStep(3)}
        />
      </div>
    );
  }

  // ───────────────────── Step 4b: the address for this intent ──────────────
  const addr = spotIntent?.address || depositAddress?.address || depositAddress;

  /*
   * DESTINATION TAG / MEMO.
   *
   * On XRP, XLM, EOS, ATOM, HBAR, TON and BNB-on-BEP2 the address alone does
   * not identify the recipient — the exchange holds one address for everyone
   * and routes by the tag. A deposit sent without it lands in the operator's
   * omnibus wallet with nothing to attribute it to, and recovering it is a
   * manual exchange-side process that often simply fails.
   *
   * The intent carries the tag it was created with, so under ecosystem custody
   * — where the address shown is the customer's OWN and no tag applies — the
   * exchange's tag is not shown by accident. The store's copy is the fallback
   * for the other two modes.
   *
   * Deliberately keyed on the value being PRESENT rather than on a currency
   * list: whether a tag is needed is the exchange's answer, not ours, and a
   * hard-coded ticker list is exactly what goes stale.
   */
  const destinationTag =
    spotIntent?.tag ||
    (mode === "ecosystem_custody" ? null : depositAddress?.tag || depositAddress?.memo);
  const destinationTagLabel = spotIntent?.tag || depositAddress?.tag ? "Destination tag" : "Memo";

  /** True once the 30-minute hint has run out — on the clock, or on arrival. */
  const sendByOver = sendByPassed || sendBySeconds <= 0;
  const expectedAmount = trimDecimalString(spotIntent?.expectedAmount);
  const declaredAmount = trimDecimalString(spotIntent?.declaredAmount);
  const sweepFee = resolveSweepFee(spotIntentFee, spotIntent);
  const showHashField = mode === "hash_claim" || mode === "amount_match";
  const canCancel = stage === "waiting" && !transactionSent;
  const finished = stage === "expired" || stage === "failed";

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ArrowDownToLine}
        eyebrow="Deposit"
        title={t("send_1", { selectedCurrency: String(selectedCurrency) })}
        description={`Use the address below to send ${selectedCurrency} on the ${networkLabel} network.`}
        actions={
          <Button
            variant="ghost"
            onClick={() => setStep(3)}
            disabled={transactionSent}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back_to_networks")}
          </Button>
        }
      />

      <m.div {...fadeInUp}>
        <SpotIntentStages mode={mode} stage={stage} message={spotIntentMessage} />
      </m.div>

      {mode === "amount_match" && expectedAmount && (
        <m.div {...fadeInUp}>
          <GlassPanel className="border-primary/30">
            <SectionTitle
              icon={Wallet}
              title={t("spot_deposit_send_exactly")}
              hint={t("spot_deposit_send_exactly_hint")}
            />
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <code className="flex-1 break-all font-mono text-2xl font-bold text-foreground">
                {expectedAmount} {selectedCurrency}
              </code>
              <button
                onClick={() => copyToClipboard(expectedAmount, toast)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </GlassPanel>
        </m.div>
      )}

      <m.div {...fadeInUp}>
        <GlassPanel>
          <SectionTitle
            icon={QrCode}
            title={
              mode === "ecosystem_custody"
                ? t("spot_deposit_your_own_address")
                : t("deposit_address")
            }
            hint={`${t("network")}: ${networkLabel}`}
          />

          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-card p-4">
              {/* DELIBERATE literals — see EcoDeposit.tsx. A QR is machine-read
                  optics, not interface colour; tinting it costs scan reliability. */}
              <div className="rounded-lg bg-card p-2">
                <QRCodeCanvas
                  value={String(addr)}
                  size={196}
                  level="M"
                  includeMargin
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
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
                  <code className="flex-1 break-all font-mono text-xs text-muted-foreground">
                    {addr}
                  </code>
                  <button
                    onClick={() => copyToClipboard(String(addr), toast)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                {mode === "ecosystem_custody" && (
                  <p className="mt-1.5 text-xs text-subtle-foreground">
                    {t("spot_deposit_your_own_address_hint")}
                  </p>
                )}
              </div>

              {destinationTag && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-destructive">
                    {destinationTagLabel} — required
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                    <code className="flex-1 break-all font-mono text-xs text-foreground">
                      {destinationTag}
                    </code>
                    <button
                      onClick={() => copyToClipboard(String(destinationTag), toast)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive text-destructive-foreground shadow hover:bg-destructive"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-destructive">
                    Send this {destinationTagLabel.toLowerCase()} together with the address. A
                    deposit sent without it cannot be matched to your account automatically.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InfoCard label={t("network")} value={networkLabel} />
                {mode === "hash_claim" && declaredAmount && (
                  <InfoCard
                    label={t("spot_deposit_declared")}
                    value={
                      <MoneyFigure value={`${declaredAmount} ${selectedCurrency}`} />
                    }
                  />
                )}
                {depositAddress?.balance !== undefined && (
                  <InfoCard
                    label={t("current_balance")}
                    value={
                      <MoneyFigure value={`${depositAddress.balance} ${selectedCurrency}`} />
                    }
                  />
                )}
                <InfoCard
                  label={t("minimum")}
                  value={<MoneyFigure value={`${minimum} ${selectedCurrency}`} />}
                />
              </div>

              {sweepFee && (
                <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-card/60 p-3">
                  <Fuel className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {t("spot_deposit_sweep_fee")}: ~{sweepFee.amount}{" "}
                      {sweepFee.currency || selectedCurrency}
                    </div>
                    <p className="mt-0.5 text-xs text-subtle-foreground">
                      {t("spot_deposit_sweep_fee_hint")}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
                <div className="flex items-start gap-2 text-xs text-warning">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    Send only <strong>{selectedCurrency}</strong> on the{" "}
                    <strong>{networkLabel}</strong> network. Other tokens or networks may result in
                    permanent loss.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!sendByOver && stage === "waiting" && (
            <div className="mt-5">
              <SendByTimer seconds={sendBySeconds} onExpire={() => setSendByPassed(true)} />
            </div>
          )}

          {sendByOver && stage === "waiting" && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("spot_deposit_send_by_passed")}</span>
            </div>
          )}

          {(canCancel || finished) && (
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancelIntent}
                  loading={cancelling}
                  className="gap-1.5"
                >
                  {!cancelling && <X className="h-4 w-4" />}
                  {t("spot_deposit_cancel_request")}
                </Button>
              )}
              {finished && (
                <Button onClick={clearSpotIntent} className="gap-1.5">
                  <RefreshCw className="h-4 w-4" />
                  {t("spot_deposit_new_request")}
                </Button>
              )}
            </div>
          )}
        </GlassPanel>
      </m.div>

      {/* Tx hash — mandatory under hash_claim, the "I sent something else"
          fallback under amount_match, and absent under ecosystem custody, where
          the platform produces the hash itself and there is nothing to paste. */}
      {showHashField ? (
        mode === "hash_claim" ? (
          <m.div {...fadeInUp}>
            <GlassPanel className="border-destructive/20">
              <SectionTitle
                icon={AlertTriangle}
                title={t("transaction_hash_required")}
                hint={t("this_is_mandatory_for_all_spot_deposits")}
              />
              <HashClaimForm
                currency={String(selectedCurrency)}
                transactionHash={transactionHash}
                setTransactionHash={setTransactionHash}
                sendTransactionHash={sendTransactionHash}
                loading={loading}
                transactionSent={transactionSent}
                critical={tExtAdmin("critical")}
              />
            </GlassPanel>
          </m.div>
        ) : (
          <m.div {...fadeInUp}>
            <GlassPanel>
              <SectionTitle
                icon={CheckCircle2}
                title={t("spot_deposit_no_hash_needed")}
                hint={t("spot_deposit_no_hash_needed_amount")}
              />
              <details className="rounded-xl border border-border/70 bg-card/60 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                  {t("spot_deposit_hash_fallback")}
                </summary>
                <div className="mt-3">
                  <HashClaimForm
                    currency={String(selectedCurrency)}
                    transactionHash={transactionHash}
                    setTransactionHash={setTransactionHash}
                    sendTransactionHash={sendTransactionHash}
                    loading={loading}
                    transactionSent={transactionSent}
                  />
                </div>
              </details>
            </GlassPanel>
          </m.div>
        )
      ) : (
        <m.div {...fadeInUp}>
          <GlassPanel>
            <SectionTitle
              icon={CheckCircle2}
              title={t("spot_deposit_no_hash_needed")}
              hint={t("spot_deposit_no_hash_needed_custody")}
            />
          </GlassPanel>
        </m.div>
      )}
    </div>
  );
}

/**
 * The hash claim itself. One component for both places it appears — mandatory
 * under hash_claim, folded away under amount_match — so the two can never drift
 * into asking for the same thing in two different ways.
 */
function HashClaimForm({
  currency,
  transactionHash,
  setTransactionHash,
  sendTransactionHash,
  loading,
  transactionSent,
  critical,
}: {
  currency: string;
  transactionHash: string;
  setTransactionHash: (hash: string) => void;
  sendTransactionHash: () => Promise<void>;
  loading: boolean;
  transactionSent: boolean;
  critical?: string;
}) {
  const t = useTranslations("common");
  return (
    <div className="space-y-3">
      {critical && (
        <p className="text-sm text-muted-foreground">
          <strong>{critical}</strong> {t("your_deposit_will_transaction_hash")}
        </p>
      )}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
          {t("transaction_hash")} <span className="text-down">*</span>
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            placeholder="0x..."
            className="h-[calc(2.75rem*var(--control-height-scale))] flex-1 font-mono text-sm"
            disabled={loading || transactionSent}
          />
          <Button
            onClick={sendTransactionHash}
            disabled={!transactionHash || loading || transactionSent}
            className="h-[calc(2.75rem*var(--control-height-scale))] bg-success text-success-foreground shadow-md shadow-success/20"
          >
            {loading ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                {t("submitting")}
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </div>
      </div>

      <details className="rounded-xl border border-border/70 bg-card/60 p-3 text-xs">
        <summary className="cursor-pointer font-semibold text-muted-foreground">
          {t("how_to_find_your_transaction_hash")}:
        </summary>
        <ul className="mt-2 ml-4 list-disc space-y-1 text-subtle-foreground">
          <li>{t("check_your_wallets_transaction_history")}</li>
          <li>
            {t("look_for_the_recent")} {currency} {t("transaction")}
          </li>
          <li>Copy the transaction hash (starts with 0x...)</li>
          <li>{t("paste_it_in_the_field_above")}</li>
        </ul>
      </details>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm">
      <span className="text-subtle-foreground">{label}</span>
      <span className="font-semibold text-foreground">{children}</span>
    </div>
  );
}

function InfoCard({ label, value, tone }: { label: string; value: any; tone?: "amber" }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold ${tone === "amber" ? "text-warning" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * The send-by hint. Its expiry no longer tears the screen down (D4): the intent
 * is OPEN for 60 minutes and matched for seven days, so all that happens when
 * this reaches zero is that the panel says the suggested time has passed.
 */
function SendByTimer({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const tCommon = useTranslations("common");
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
            {tCommon("spot_deposit_send_by")}
          </div>
          <Countdown
            initialTimeInSeconds={seconds}
            onExpire={onExpire}
            className="mt-1 font-mono text-3xl font-bold text-primary"
          />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Clock className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
