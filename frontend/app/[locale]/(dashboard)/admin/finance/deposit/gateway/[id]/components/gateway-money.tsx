"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Calculator,
  Coins,
  Globe,
  Info,
  Percent,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loadable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type MoneyFieldKey = "fixedFee" | "percentageFee" | "minAmount" | "maxAmount";

interface MoneyFieldSpec {
  key: MoneyFieldKey;
  label: string;
  help: string;
  suffix: "percent" | "currency";
}

const FIELDS: MoneyFieldSpec[] = [
  {
    key: "fixedFee",
    label: "Fixed fee",
    help: "Charged on every deposit, in the deposit currency.",
    suffix: "currency",
  },
  {
    key: "percentageFee",
    label: "Percentage fee",
    help: "Charged on the deposit amount, before the fixed fee is added.",
    suffix: "percent",
  },
  {
    key: "minAmount",
    label: "Minimum amount",
    help: "Deposits below this are rejected before the vendor is called.",
    suffix: "currency",
  },
  {
    key: "maxAmount",
    label: "Maximum amount",
    help: "Leave at 0 for no upper limit.",
    suffix: "currency",
  },
];

const isMap = (value: unknown): value is Record<string, number> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Fees and limits, which this table stores as EITHER a scalar or a per-currency
 * map in the same JSON column.
 *
 * Both shapes are real and both are in the seed data, so the editor makes the
 * choice explicit rather than inferring it from whatever happens to be stored.
 * The worked example at the bottom exists because the two fees compose in an
 * order that is not obvious — percentage on the gross, then the fixed fee on
 * top — and getting it backwards is a silent mis-charge on every deposit.
 */
export function GatewayMoney({
  gateway,
  loading = false,
  onChange,
}: {
  /** Null until the row arrives. */
  gateway: any;
  loading?: boolean;
  onChange: (field: string, value: any) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  /*
   * Like the details tab, this one has almost nothing to skeleton: two cards,
   * four labelled fields and a preview panel, all literals. What waits is the
   * VALUES and the currency list — and an empty currency list already renders
   * the single-value shape, which is the correct pending form.
   *
   * `?? {}` for the same reason as the details tab: one empty object at the top
   * beats an optional chain on every field.
   */
  const row = gateway ?? {};
  const currencies: string[] = Array.isArray(row.currencies)
    ? row.currencies
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Percent className="h-4 w-4 text-muted-foreground" />
            {tCommon("platform_fees")}
          </CardTitle>
          <CardDescription>
            {t("charged_by_this_platform_on_top")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {FIELDS.slice(0, 2).map((field) => (
            <MoneyField
              key={field.key}
              field={field}
              value={row[field.key]}
              currencies={currencies}
              loading={loading}
              onChange={onChange}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
            {tCommon("transaction_limits")}
          </CardTitle>
          <CardDescription>
            {t("enforced_before_the_vendor_is_called")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {FIELDS.slice(2).map((field) => (
            <MoneyField
              key={field.key}
              field={field}
              value={row[field.key]}
              currencies={currencies}
              loading={loading}
              onChange={onChange}
            />
          ))}
        </CardContent>
      </Card>

      <FeePreview gateway={row} currencies={currencies} loading={loading} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function MoneyField({
  field,
  value,
  currencies,
  loading,
  onChange,
}: {
  field: MoneyFieldSpec;
  value: unknown;
  currencies: string[];
  /*
   * Writable controls are disabled until the row lands, for the same reason as
   * the details tab: the parent seeds `formData` FROM the response, so a fee
   * typed before it arrives is silently overwritten by `setFormData(parsed)`.
   * A disabled number input is the same 36px box, so nothing moves.
   */
  loading: boolean;
  onChange: (field: string, value: any) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const perCurrency = isMap(value);
  const canSplit = currencies.length > 1;

  const toGlobal = () => {
    if (!isMap(value)) return;
    const first = Object.values(value)[0];
    onChange(field.key, asNumber(first));
  };

  const toPerCurrency = () => {
    if (isMap(value)) return;
    const base = asNumber(value);
    onChange(
      field.key,
      Object.fromEntries(currencies.map((currency) => [currency, base]))
    );
  };

  const missing = isMap(value)
    ? currencies.filter((currency) => !(currency in value))
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-sm">{field.label}</Label>
          <p className="text-xs text-muted-foreground">{field.help}</p>
        </div>

        {canSplit && (
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
            <Button
              type="button"
              size="xs"
              variant={perCurrency ? "ghost" : "soft"}
              tone={perCurrency ? "neutral" : "primary"}
              onClick={toGlobal}
              disabled={loading}
              aria-pressed={!perCurrency}
            >
              <Globe className="h-3 w-3" />
              {t("one_value")}
            </Button>
            <Button
              type="button"
              size="xs"
              variant={perCurrency ? "soft" : "ghost"}
              tone={perCurrency ? "primary" : "neutral"}
              onClick={toPerCurrency}
              disabled={loading}
              aria-pressed={perCurrency}
            >
              <Coins className="h-3 w-3" />
              {t("per_currency")}
            </Button>
          </div>
        )}
      </div>

      {isMap(value) ? (
        <div className="space-y-2">
          {/*
            Capped and scrollable past a dozen rows.

            TransFi carries 24 currencies, and four of these fields on one tab
            is 96 number inputs — uncapped, the "what a customer would pay"
            panel lands about four screens below the control that changes it, so
            the one piece of feedback the editor has is never on screen with the
            edit. The cap only engages where it is needed; a two-currency
            gateway is unaffected.
          */}
          <div
            className={cn(
              "grid gap-2 sm:grid-cols-2",
              Object.keys(value).length > 12 &&
                "max-h-72 overflow-y-auto rounded-md border border-border p-2"
            )}
          >
            {Object.entries(value).map(([currency, amount]) => (
              <div key={currency} className="flex items-center gap-2">
                <Badge
                  tone="neutral"
                  appearance="soft"
                  className="w-14 shrink-0 justify-center font-mono"
                >
                  {currency}
                </Badge>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount === null || amount === undefined ? "" : String(amount)}
                  onChange={(event) =>
                    onChange(field.key, {
                      ...value,
                      [currency]: asNumber(event.target.value),
                    })
                  }
                  disabled={loading}
                  className="font-mono tabular-nums"
                  aria-label={t("for", { label: String(field.label), currency: String(currency) })}
                />
                <span className="w-4 shrink-0 text-xs text-muted-foreground">
                  {field.suffix === "percent" ? "%" : ""}
                </span>
                <Button
                  type="button"
                  size="2xs"
                  variant="ghost"
                  tone="destructive"
                  aria-label={t("remove_the_override", { currency: String(currency) })}
                  onClick={() => {
                    const next = { ...value };
                    delete next[currency];
                    onChange(field.key, next);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {missing.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("no_value_for")}:
                </span>
                {missing.map((currency) => (
                  <Button
                    key={currency}
                    type="button"
                    size="2xs"
                    variant="outline"
                    onClick={() =>
                      onChange(field.key, { ...value, [currency]: 0 })
                    }
                  >
                    <Plus className="h-3 w-3" />
                    {currency}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("a_currency_with_no_entry_resolves")}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(event) =>
              onChange(field.key, asNumber(event.target.value))
            }
            disabled={loading}
            placeholder="0.00"
            className="max-w-48 font-mono tabular-nums"
            aria-label={field.label}
          />
          <span className="text-sm text-muted-foreground">
            {field.suffix === "percent" ? "%" : t("in_the_deposit_currency")}
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The same arithmetic the deposit route runs, shown live.
 *
 * `(amount × percentage) / 100 + fixed` is the order in the backend, and it is
 * not visible anywhere else in the admin. The negative-credit warning is not
 * hypothetical: a fixed fee larger than the minimum deposit is expressible in
 * this form, and nothing downstream rejects it.
 */
function FeePreview({
  gateway,
  currencies,
  loading,
}: {
  gateway: any;
  currencies: string[];
  /**
   * MONEY, SO THIS ONE IS NOT ABOUT PIXELS.
   *
   * Every figure in this panel is derived by `asNumber`, which returns 0 for
   * anything unparseable — so on an empty row the panel is not blank, it is a
   * complete, confident, wrong quote: "Customer pays 100.00, percentage — 0%,
   * fixed fee 0.00, credited to wallet 100.00", i.e. this gateway is free.
   * It then silently becomes "credited 96.60" when the real 2.9% + 0.30
   * arrives. Nothing in the panel said the first answer was provisional.
   *
   * A wrong number that looks settled is worse than no number, so the four
   * cells wait and the threshold warnings below them stay suppressed until the
   * inputs they judge are real.
   */
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [picked, setPicked] = useState<string | null>(null);
  const [amount, setAmount] = useState("100");

  const active =
    picked && currencies.includes(picked)
      ? picked
      : (currencies[0] ?? picked ?? "USD");

  const result = useMemo(() => {
    const scoped = (value: unknown): number =>
      isMap(value) ? asNumber(value[active]) : asNumber(value);

    const gross = asNumber(amount);
    const percentage = scoped(gateway.percentageFee);
    const fixed = scoped(gateway.fixedFee);
    const min = scoped(gateway.minAmount);
    const max = scoped(gateway.maxAmount);
    const fee = (gross * percentage) / 100 + fixed;

    return {
      gross,
      percentage,
      fixed,
      percentagePart: (gross * percentage) / 100,
      credited: gross - fee,
      belowMin: min > 0 && gross < min,
      aboveMax: max > 0 && gross > max,
      min,
      max,
      /* The deposit at which the fee eats the whole amount. */
      breakEven: percentage < 100 ? fixed / (1 - percentage / 100) : Infinity,
    };
  }, [
    amount,
    active,
    gateway.percentageFee,
    gateway.fixedFee,
    gateway.minAmount,
    gateway.maxAmount,
  ]);

  const money = (value: number) =>
    Number.isFinite(value)
      ? value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";

  /* A deduction of nothing is not "−0.00" — the minus sign implies something
     was taken. Zero-fee gateways are the common case here (TransFi defaults
     every currency to 0), so this is most of what the panel renders. */
  const deduction = (value: number) => (value > 0 ? `−${money(value)}` : money(0));

  /**
   * SHADOWED BRANCH — three threshold warnings that would be judging zeroes.
   *
   * `belowMin`/`aboveMax` are already guarded by `min > 0` / `max > 0`, so
   * they happen to stay quiet on an empty row. What the gate really buys is
   * the general case: this box gives ADVICE ("set the USD minimum above
   * 0.31") computed from the four fee fields, and it must not give it out of
   * values it does not have yet. It is also the one node in this panel that
   * changes the card's height, so suppressing it while pending and revealing
   * it on arrival would grow the card — which is why it is gated on `loading`
   * rather than on the figures alone, and why the name says which of the two
   * this is.
   */
  const showThresholdWarnings =
    !loading && (result.belowMin || result.aboveMax || result.credited < 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          {t("what_a_customer_would_pay")}
        </CardTitle>
        <CardDescription>
          {t("recomputed_from_the_values_above_as")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="preview-amount" className="text-xs">
              {tCommon("deposit_amount")}
            </Label>
            {/* NOT disabled while loading: `amount` is local scratch state
                this page owns, not a field seeded from the response, so
                nothing overwrites it. Typing here during the fetch is fine —
                the quote below simply stays pending until the fees land. */}
            <Input
              id="preview-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-36 font-mono tabular-nums"
            />
          </div>
          {currencies.length > 0 && (
            <div className="min-w-0 flex-1 space-y-1">
              <Label className="text-xs">Currency</Label>
              <div className="flex flex-wrap gap-1">
                {currencies.slice(0, 12).map((code) => (
                  <Button
                    key={code}
                    type="button"
                    size="2xs"
                    variant={code === active ? "soft" : "outline"}
                    tone={code === active ? "primary" : "neutral"}
                    className="font-mono"
                    onClick={() => setPicked(code)}
                  >
                    {code}
                  </Button>
                ))}
                {currencies.length > 12 && (
                  <Badge
                    tone="neutral"
                    appearance="soft"
                    className="self-center"
                  >
                    +{currencies.length - 12} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* The four-cell grid, its labels and its hairlines are chrome and
            render in both states; only the figures wait. The percentage LABEL
            carries a figure too (`Percentage — 2.9%`), so it waits with them —
            a label reading "Percentage — 0%" beside a pending amount would be
            the same false statement moved one line up. */}
        <dl className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
          <PreviewCell
            label={t("customer_pays", { active: String(active) })}
            value={money(result.gross)}
            loading={loading}
          />
          <PreviewCell
            label="Percentage"
            labelSuffix={
              <Loadable loading={loading} placeholder="0.0">
                {result.percentage}
              </Loadable>
            }
            value={deduction(result.percentagePart)}
            loading={loading}
          />
          <PreviewCell
            label={tCommon("fixed_fee")}
            value={deduction(result.fixed)}
            loading={loading}
          />
          <PreviewCell
            label={t("credited_to_wallet")}
            value={money(result.credited)}
            loading={loading}
            emphasis
          />
        </dl>

        {/*
          The advice box. See `showThresholdWarnings` above for why it is gated
          on `!loading` and why that is the fix rather than the defect.
        */}
        {showThresholdWarnings && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="space-y-1">
              {result.belowMin && (
                <p>
                  This deposit would be rejected — it is below the{" "}
                  <span className="font-mono">{money(result.min)}</span> {active}{" "}
                  minimum.
                </p>
              )}
              {result.aboveMax && (
                <p>
                  This deposit would be rejected — it is above the{" "}
                  <span className="font-mono">{money(result.max)}</span> {active}{" "}
                  maximum.
                </p>
              )}
              {result.credited < 0 && (
                <p className="font-medium">
                  The fee is larger than the deposit, so the customer would be
                  credited a negative amount. Set the {active} minimum above{" "}
                  <span className="font-mono">{money(result.breakEven)}</span>.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewCell({
  label,
  labelSuffix,
  value,
  loading,
  emphasis,
}: {
  label: string;
  /**
   * The part of the LABEL that is itself a figure — "Percentage — 2.9%".
   *
   * Separate from `label` because the two halves resolve at different times:
   * the word is a literal and renders immediately, the rate comes from the row.
   * Concatenating them would make the whole label wait, and the column heading
   * disappearing is a bigger movement than the number under it.
   */
  labelSuffix?: React.ReactNode;
  value: string;
  loading: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-card p-3">
      <dt className="text-xs text-muted-foreground">
        {label}
        {labelSuffix !== undefined && <> — {labelSuffix}%</>}
      </dt>
      {/* The figure waits; the box does not. `Loadable` measures itself from
          this `<dd>`, so the emphasised cell reserves its larger line height
          and the row does not resize when the values land. */}
      <dd
        className={cn(
          "font-mono tabular-nums",
          emphasis ? "text-lg font-semibold" : "text-sm"
        )}
      >
        <Loadable loading={loading} placeholder="0.00">
          {value}
        </Loadable>
      </dd>
    </div>
  );
}
