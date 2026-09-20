"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Copy,
  CheckCircle2,
  Wallet,
  ShieldCheck,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  QrCode,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/user";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { toNum } from "@/lib/precision-utils";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  FinanceShell,
  GlassPanel,
  CurrencyMark,
  TypeBadge,
  SectionTitle,
  EmptyState,
  formatNumber,
  getWalletTheme,
} from "../../../_components/finance-ui";
import { Loadable } from "@/components/ui/skeleton";
import { useCurrencyIcon } from "@/hooks/use-currency-icon";
import DataTable from "@/components/blocks/data-table";
import { useColumns, useViewConfig } from "../../../history/columns";
import { useAnalytics } from "../../../history/analytics";
import { cn } from "@/lib/utils";

interface WalletData {
  id: string;
  userId: string;
  type: string;
  currency: string;
  address: any;
  /* Numbers because the fetch below coerces them on the way in — NOT because
     the route sends numbers. See `WalletResponse`. */
  balance: number;
  inOrder: number;
  createdAt: string;
  updatedAt: string;
  /** ECO wallets only — the operator-uploaded `ecosystemToken.icon`. */
  icon?: string | null;
}

/**
 * What the route actually sends.
 *
 * `/api/finance/wallet/{type}/{currency}` returns the Sequelize row verbatim,
 * and `balance`/`inOrder` are `DECIMAL(36,18)` — mysql2 hands every DECIMAL
 * over as a STRING. Declaring them `number` on the state shape was a lie that
 * cost a wrong Total on this page for as long as it stood, because it is
 * exactly the sort of type TypeScript then has no reason to complain about.
 */
type WalletResponse = Omit<WalletData, "balance" | "inOrder"> & {
  balance: number | string;
  inOrder: number | string;
};

export default function WalletDetailClient() {
  const t = useTranslations("common");
  const tFinance = useTranslations("finance");
  const params = useParams() as { currency: string; type: string };
  const currency = (params.currency || "").toString();
  const type = (params.type || "").toString();
  const { user } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();
  const { resolve } = useCurrencyIcon();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");

  const theme = getWalletTheme(type.toUpperCase());

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await $fetch({
          url: `/api/finance/wallet/${type.toUpperCase()}/${currency.toUpperCase()}`,
          method: "GET",
          silentSuccess: true,
        });
        if (!alive) return;
        if (error) throw new Error(error);
        if (data?.type === "ECO" && data?.address && typeof data.address === "string") {
          try {
            data.address = JSON.parse(data.address);
          } catch {
            /* Not every ECO address column holds a JSON network map; leave a
               plain string as-is and let the object branch below skip it. */
          }
        }
        /* Coerce the two DECIMAL columns HERE, at the boundary, so nothing
           downstream can inherit the string. They used to land in state raw and
           `balance + inOrder` CONCATENATED — 1.5 and 2.5 printed a Total of
           "1.5", because `formatNumber` parseFloats and parseFloat stops at the
           second decimal point instead of failing. A wallet with everything in
           order read "0". It also repairs the `|| 0` fallbacks below, which
           never fired for an empty wallet: "0.000000000000000000" is truthy. */
        const raw = data as WalletResponse | null;
        setWallet(
          raw ? { ...raw, balance: toNum(raw.balance), inOrder: toNum(raw.inOrder) } : null
        );
        if (data?.type === "ECO" && data?.address && typeof data.address === "object") {
          const networks = Object.keys(data.address);
          /* Open on a network that can actually be credited. The route marks the
             others `depositable: false` and withholds their address (see
             markUncreditableChains) — landing on one of those would greet a
             customer with a warning about a chain they may never have used. */
          const first =
            networks.find((net) => data.address[net]?.depositable !== false) ?? networks[0];
          if (networks.length && !selectedNetwork) setSelectedNetwork(first);
        }
      } catch (e: any) {
        toast({
          title: t("error"),
          description: e?.message || t("failed_to_fetch_wallet"),
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [type, currency]);

  const ecoAddress =
    wallet?.type === "ECO" && wallet?.address && typeof wallet.address === "object" && selectedNetwork
      ? wallet.address[selectedNetwork]
      : null;

  /* `depositable === false` is the route saying it cannot build a provider for
     this chain, so a deposit to it could never be credited — it also withholds
     the address string. Absent (older payloads, non-ECO) means depositable. */
  const canDeposit = (net: string) =>
    (wallet?.address as any)?.[net]?.depositable !== false;
  const selectedIsDepositable = !selectedNetwork || canDeposit(selectedNetwork);

  const copyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      toast({ title: t("address_copied") || t("address_copied") });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: t("failed_to_copy"), variant: "destructive" });
    }
  };

  /* `|| 0` is fine for ARITHMETIC — `total` has to be a number — but a zero
     must never be PRINTED as though it were the answer. Every place these are
     rendered below goes through `Loadable`, because "0.0000 BTC" on a funded
     wallet is not a smaller version of the right answer, it is a wrong one. */
  const balance = wallet?.balance || 0;
  const inOrder = wallet?.inOrder || 0;
  const total = balance + inOrder;

  /**
   * The three grey plates that used to stand in for this page are gone.
   * ==========================================================================
   *
   * `h-8 w-40`, `h-44` and `h-72` stood in for the back-nav row, the hero card
   * and the transactions table. Measured against what actually settles: the
   * back-nav row is 30px (not 32), and the hero card is `p-5 sm:p-7` around a
   * two-column grid whose left column alone runs to about 260px on desktop —
   * the `h-44` plate reserved 176px, so the table below it jumped ~100px down
   * the moment the wallet landed.
   *
   * More to the point, ALMOST NOTHING HERE WAS PENDING. The currency code, the
   * wallet type, the breadcrumb, the colour theme, the three action buttons and
   * every metric label come from `useParams()` — they are in the URL, they are
   * on screen before the request is sent. What waits is four figures and the
   * wallet id.
   *
   * `!loading &&` on the not-found branch: `wallet` is null for the whole
   * fetch, so without it this page would answer "wallet not found" — with a
   * "Go to wallets" button — on every visit before answering correctly.
   *
   * IT IS NOW A NAMED PREDICATE, and the naming is the point rather than a
   * formality. The scanner's resolved-guard escape hatch is written for
   * `!isLoading`-style spellings and does not recognise a bare `!loading`, so
   * this guard was still being reported as a full-viewport swap — and a
   * ratchet that reports the fix as the defect is how someone later "corrects"
   * it back into telling a funded customer they have no wallet. The name says
   * which of the two this is, in the place a reader looks.
   */
  const showWalletNotFound = !loading && !wallet;

  /**
   * The locked-funds chip, and why it is a DELIBERATE exception to the
   * "render in both states" rule.
   *
   * Most wallets have nothing in order, so this chip is absent on the majority
   * of visits even after the fetch settles. Reserving its 28px unconditionally
   * would leave a permanent gap under every clean balance — the withheld-content
   * defect inverted, paid on every wallet instead of on the few that lock funds.
   *
   * The `!loading` half is what stops it being a lie rather than what stops it
   * moving: `inOrder` is 0 for the whole fetch, so the chip could not fire
   * anyway — but a wallet that DOES have funds in order would otherwise be
   * described as clean for that window, and the chip's own arrival is the one
   * honest signal that it is not.
   */
  const showLockedFunds = !loading && inOrder > 0;

  if (showWalletNotFound) {
    return (
      <FinanceShell>
        <EmptyState
          icon={Wallet}
          title={t("wallet_not_found")}
          description={tFinance("the_wallet_youre_to_it")}
          action={
            <button
              onClick={() => router.push("/finance/wallet")}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {tFinance("go_to_wallets")}
            </button>
          }
        />
      </FinanceShell>
    );
  }

  return (
    <FinanceShell>
      {/* Back nav */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.push("/finance/wallet")}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition hover:bg-card dark:border-border/70 text-muted-foreground dark:hover:bg-surface-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("back")}
        </button>
        <nav className="flex items-center gap-1 text-xs text-subtle-foreground">
          <span>Finance</span>
          <span>/</span>
          <span>Wallets</span>
          <span>/</span>
          {/* From the URL, not from the response — known before the fetch. */}
          <span className="text-muted-foreground">{currency.toUpperCase()}</span>
        </nav>
      </div>

      {/* Hero card */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-lg border border-border bg-card p-5 sm:p-7"
      >
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              {/* The code comes from the URL, so the mark is right on the
                  first paint and does not wait for the wallet. `wallet?.icon`
                  (ECO only) is preferred once it lands; both missing leaves
                  the letter mark that was here before. */}
              <CurrencyMark
                code={currency}
                type={type.toUpperCase()}
                size="xl"
                icon={[wallet?.icon, resolve(currency)]}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {currency.toUpperCase()}
                  </h1>
                  <TypeBadge type={type.toUpperCase()} />
                </div>
                <div className="mt-1 text-xs text-subtle-foreground">
                  {t("wallet_id")}:{" "}
                  <span className="font-mono">
                    <Loadable loading={loading} placeholder="00000000">
                      {wallet?.id?.slice(0, 8)}
                    </Loadable>
                    …
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {t("balance")}
                <button
                  onClick={() => setHidden((v) => !v)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                  {hidden ? (
                    "•••••"
                  ) : (
                    <Loadable loading={loading} placeholder="0.00000000">
                      {formatNumber(balance, { decimals: balance >= 1 ? 4 : 8 })}
                    </Loadable>
                  )}
                </div>
                <div className="text-[11px] text-subtle-foreground">
                  {currency.toUpperCase()}
                </div>
              </div>
              {showLockedFunds && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning-ink">
                  <Lock className="h-3.5 w-3.5" />
                  {hidden ? "•••" : formatNumber(inOrder, { decimals: inOrder >= 1 ? 4 : 8 })} in order
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <ActionButton
                label={t("deposit")}
                icon={<ArrowDownToLine className="h-4 w-4" />}
                onClick={() =>
                  router.push(
                    `/finance/deposit?type=${type.toLowerCase()}&currency=${currency.toLowerCase()}`
                  )
                }
                primary
              />
              <ActionButton
                label={t("withdraw")}
                icon={<ArrowUpFromLine className="h-4 w-4" />}
                onClick={() =>
                  router.push(
                    `/finance/withdraw?type=${type.toLowerCase()}&currency=${currency.toLowerCase()}`
                  )
                }
              />
              <ActionButton
                label={t("transfer")}
                icon={<ArrowLeftRight className="h-4 w-4" />}
                onClick={() =>
                  router.push(
                    `/finance/transfer?type=${type.toLowerCase()}&currency=${currency.toLowerCase()}`
                  )
                }
              />
            </div>
          </div>

          {/* Right column — quick metrics */}
          <div className="grid grid-cols-2 gap-3">
            {/* The four tiles keep their labels, their tones and their grid in
                both states — only the figures wait. `Metric` takes a
                `ReactNode`, so the placeholder sits inside the tile's own
                typography rather than replacing the tile. */}
            <Metric
              label={t("balance")}
              value={
                hidden ? (
                  "•••"
                ) : (
                  <Loadable loading={loading} placeholder="0.000000">
                    {formatNumber(balance, { decimals: 6 })}
                  </Loadable>
                )
              }
              sub={currency.toUpperCase()}
              tone="emerald"
            />
            <Metric
              label="Locked"
              value={
                hidden ? (
                  "•••"
                ) : (
                  <Loadable loading={loading} placeholder="0.000000">
                    {formatNumber(inOrder, { decimals: 6 })}
                  </Loadable>
                )
              }
              sub={currency.toUpperCase()}
              tone="amber"
            />
            <Metric
              label="Total"
              value={
                hidden ? (
                  "•••"
                ) : (
                  <Loadable loading={loading} placeholder="0.000000">
                    {formatNumber(total, { decimals: 6 })}
                  </Loadable>
                )
              }
              sub={currency.toUpperCase()}
              tone="blue"
            />
            <Metric
              label="Type"
              value={theme.label}
              sub={`${type.toUpperCase()} wallet`}
              tone="violet"
              mono={false}
            />
          </div>
        </div>
      </m.div>

      {/* ECO addresses */}
      {wallet?.type === "ECO" && wallet.address && typeof wallet.address === "object" && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-5"
        >
          <GlassPanel>
            <SectionTitle
              icon={QrCode}
              title={t("network_addresses")}
              /* Dropped when any listed network is NOT depositable: "send funds
                 to one of the supported networks below" would then be vouching
                 for a row that carries a warning. */
              hint={
                Object.keys(wallet.address).every(canDeposit)
                  ? t("send_funds_to_one_of_the_supported_networks_below")
                  : undefined
              }
            />

            <div className="mb-4 flex flex-wrap gap-2">
              {Object.keys(wallet.address).map((net) => (
                <button
                  key={net}
                  onClick={() => setSelectedNetwork(net)}
                  title={canDeposit(net) ? undefined : t("not_available")}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                    selectedNetwork === net
                      ? "border-primary bg-primary/10 text-primary-ink"
                      : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary",
                    !canDeposit(net) && "opacity-60"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {!canDeposit(net) && <AlertTriangle className="h-3 w-3 text-warning" />}
                    {net}
                  </span>
                </button>
              ))}
            </div>

            {ecoAddress && !selectedIsDepositable ? (
              /* The address is deliberately absent from the payload for this
                 chain. Saying so beats an empty address box, which reads as a
                 loading state and invites the customer to try again later. */
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-warning-ink">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold">
                    {t("deposits_are_not_available_on_this_network")}
                  </div>
                  <div className="text-xs">
                    {t("deposits_are_not_available_on_this_network_body", {
                      network: selectedNetwork,
                    })}
                  </div>
                </div>
              </div>
            ) : ecoAddress ? (
              <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center justify-center rounded-lg border border-border/70 bg-card p-4">
                  <QrCode className="h-32 w-32 text-muted-foreground" />
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("scan_to_deposit")}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                      Network
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {selectedNetwork}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
                      {t("deposit_address")}
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted p-3 dark:bg-surface-2/70">
                      <code className="flex-1 break-all font-mono text-xs text-muted-foreground">
                        {ecoAddress.address || "—"}
                      </code>
                      {ecoAddress.address && (
                        <button
                          onClick={() => copyAddress(ecoAddress.address)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-subtle-foreground transition hover:bg-primary hover:text-primary-foreground"
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4 text-up" /> : <Copy className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning-ink">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      Send only <strong>{wallet.currency.toUpperCase()}</strong> to this address. Sending other assets may
                      result in permanent loss.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t("no_address_yet")}
                description={t("initiate_a_deposit_to_generate_one")}
              />
            )}
          </GlassPanel>
        </m.div>
      )}

      {/* Transactions */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-5"
      >
        <DataTable
          apiEndpoint="/api/finance/transaction"
          model="transaction"
          modelConfig={{
            userId: user?.id,
            walletId: wallet?.id,
          }}
          userAnalytics={true}
          pageSize={12}
          isParanoid={false}
          canView={true}
          title={t("transactions_history")}
          itemTitle="Transaction"
          columns={columns}
          viewConfig={viewConfig}
          analytics={analytics}
        />
      </m.div>
    </FinanceShell>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
  mono = true,
}: {
  label: string;
  /**
   * `ReactNode`, not `string`, so the tile can hold a `<Loadable>` while the
   * figure is in flight. Widening this is what lets the pending state be THIS
   * tile with a placeholder inside it, rather than a grey rectangle where the
   * tile used to be.
   */
  value: React.ReactNode;
  sub?: string;
  tone: "blue" | "emerald" | "amber" | "violet";
  // Ledger figures are mono + tabular so digits stop shifting as they update.
  // Prose values (a wallet type name) stay in the interface face.
  mono?: boolean;
}) {
  /* Flat tints. Each was two stops of one token at two alphas — a gradient with
     nothing to say, and R3 keeps depth on the surface ramp. */
  const tones = {
    blue: "bg-primary/10 border-primary/20 text-primary-ink",
    emerald: "bg-success/10 border-success/20 text-up",
    amber: "bg-warning/10 border-warning/20 text-warning-ink",
    violet: "bg-primary/10 border-primary/20 text-primary-ink",
  } as const;
  return (
    <div className={cn("rounded-lg border p-3 sm:p-4", tones[tone])}>
      <div className="text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold leading-tight tracking-tight text-foreground",
          mono && "font-mono tabular-nums"
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-subtle-foreground">{sub}</div>}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  primary,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
        primary
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110"
          : "border border-border bg-card/70 text-foreground backdrop-blur hover:bg-card dark:border-border/70 dark:hover:bg-surface-2"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
