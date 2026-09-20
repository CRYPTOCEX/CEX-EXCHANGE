"use client";

/**
 * What the gateway accepts — rebuilt on the Obsidian landing kit.
 *
 * The three wallet tiles were `bg-card/80 dark:bg-surface-2/80` with a
 * `hover:shadow-lg`, i.e. a translucent plate plus a shadow standing in for
 * elevation (R3). They are `Panel`s now: opaque, one hairline, one rung.
 *
 * The wallet HUE stays, and deliberately. Fiat, crypto and ecosystem tokens are
 * categorical identity rather than state, which §4a of DESIGN-SYSTEM.md says
 * takes fixed slots on the validated chart ramp — deleting the colour would
 * make three peer tiles indistinguishable. The currency chips are the opposite
 * case and keep the note below.
 */

import { m, useReducedMotion } from "framer-motion";
import { Wallet, CreditCard, Coins, Globe } from "lucide-react";
import { Loadable } from "@/components/ui/skeleton";
import { Panel, Section, SectionHeading } from "@/components/landing";
import { useTranslations } from "next-intl";

interface SupportedPayments {
  fiat: string[];
  crypto: string[];
  walletTypes: string[];
}

interface SupportedCurrenciesSectionProps {
  payments: SupportedPayments;
  isLoading?: boolean;
}

/**
 * One chip for every currency, crypto or fiat.
 *
 * This was a per-coin colour map that could not have separated its entries:
 * BTC, BNB and DOGE shared amber, four coins shared the accent, and USDT took
 * `success` — which on the payments feed further down the page means a payment
 * settled. The chip prints the ticker, so identity was never colour's job here.
 */
function CurrencyChip({ currency, loading = false }: { currency: string; loading?: boolean }) {
  return (
    /*
      One chip, two states. This used to be paired with a `LoadingChip` that was
      a bare `h-[34px] w-[72px]` rectangle — a hand-measured guess at this
      element, with none of its border or padding, that would go stale the
      moment the chip's type size or padding changed. The placeholder now sits
      INSIDE the chip, so the chip's own box does the measuring.
    */
    <span className="inline-flex items-center rounded-lg border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-foreground transition-colors hover:border-border-strong">
      <Loadable loading={loading} placeholder="USDT">
        {currency}
      </Loadable>
    </span>
  );
}

const WALLET_CONFIG: Record<
  string,
  { icon: any; title: string; description: string; tile: string; ink: string }
> = {
  FIAT: {
    icon: CreditCard,
    title: "Fiat currency",
    description: "Traditional currencies like USD, EUR and GBP, settled to your bank.",
    tile: "bg-chart-1/10 border-chart-1/20",
    ink: "text-chart-1",
  },
  SPOT: {
    icon: Coins,
    title: "Cryptocurrency",
    description: "Major assets including BTC, ETH and USDT, priced at the moment of capture.",
    tile: "bg-chart-2/10 border-chart-2/20",
    ink: "text-chart-2",
  },
  ECO: {
    icon: Wallet,
    title: "Ecosystem tokens",
    description: "Platform-native tokens and assets, settled without leaving the platform.",
    tile: "bg-chart-3/10 border-chart-3/20",
    ink: "text-chart-3",
  },
};

/** Wallet types to reserve while the list is in flight — the three the platform
 *  can return, which is also what the old placeholder grid drew. */
const PENDING_WALLET_TYPES = ["FIAT", "SPOT", "ECO"];

function WalletTypeCard({
  type,
  index,
  loading = false,
}: {
  type: string;
  index: number;
  loading?: boolean;
}) {
  const t = useTranslations("ext_gateway");
  const prefersReducedMotion = useReducedMotion();
  const { icon: Icon, title, description, tile, ink } = WALLET_CONFIG[type] || WALLET_CONFIG.SPOT;

  return (
    <m.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
    >
      {/*
        The pending state is this card, not a copy of it. It used to be a
        `Panel` holding an `h-11 w-11` block and two bars (`h-5 w-32`, `h-4
        w-full`) — the last of which is the wrong shape twice over, since these
        descriptions run two lines, so the grid grew by a line per card when
        the data landed.

        The tile keeps its hue: which wallet types exist is unknown, but the
        three slots are fixed and their colour is identity, not data.
      */}
      <Panel hover className="h-full p-6">
        <span
          className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border ${tile}`}
        >
          <Icon className={`h-5 w-5 ${ink}`} />
        </span>
        <h3 className="text-lg font-semibold text-foreground">
          <Loadable loading={loading} placeholder="Cryptocurrency">
            {title}
          </Loadable>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <Loadable
            loading={loading}
            placeholder={t("major_assets_including_btc_eth_and")}
          >
            {description}
          </Loadable>
        </p>
      </Panel>
    </m.div>
  );
}

function ChipGroup({
  icon: Icon,
  title,
  items,
  isLoading,
  placeholderCount,
}: {
  icon: any;
  title: string;
  items: string[] | undefined;
  isLoading?: boolean;
  placeholderCount: number;
}) {
  if (!isLoading && !items?.length) return null;

  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {/* One chip component in both states; `placeholderCount` reserves the
            container, not an exact count. */}
        {isLoading
          ? Array.from({ length: placeholderCount }, (_, i) => (
              <CurrencyChip key={i} currency="" loading />
            ))
          : items?.map((currency) => <CurrencyChip key={currency} currency={currency} />)}
      </div>
    </div>
  );
}

export default function SupportedCurrenciesSection({
  payments,
  isLoading,
}: SupportedCurrenciesSectionProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const totalCurrencies = (payments?.fiat?.length || 0) + (payments?.crypto?.length || 0);
  const heading = `${tCommon("accept")} ${totalCurrencies}+ ${tCommon("currencies")}`;

  return (
    <Section bordered>
      <SectionHeading
        eyebrow={t("multi_currency_support")}
        eyebrowIcon={Globe}
        title={heading}
        highlight={`${totalCurrencies}+ ${tCommon("currencies")}`}
        subtitle={t("support_for_major_cryptocurrencies")}
      />

      <div className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(isLoading ? PENDING_WALLET_TYPES : payments?.walletTypes ?? []).map((type, index) => (
          <WalletTypeCard key={type} type={type} index={index} loading={!!isLoading} />
        ))}
      </div>

      <div className="space-y-8">
        <ChipGroup
          icon={Coins}
          title={tExt("cryptocurrencies")}
          items={payments?.crypto}
          isLoading={isLoading}
          placeholderCount={6}
        />
        <ChipGroup
          icon={CreditCard}
          title={t("fiat_currencies")}
          items={payments?.fiat}
          isLoading={isLoading}
          placeholderCount={5}
        />
      </div>
    </Section>
  );
}
