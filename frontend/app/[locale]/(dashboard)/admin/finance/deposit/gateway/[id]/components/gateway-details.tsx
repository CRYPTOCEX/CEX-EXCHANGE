"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Coins,
  Hash,
  ImageIcon,
  Plus,
  Search,
  Type,
  X,
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
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loadable } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import $fetch from "@/lib/api";
import { cn } from "@/lib/utils";

import { CopyableValue } from "./copy-field";
import { useTranslations } from "next-intl";

interface CurrencyOption {
  id: string;
  name: string;
}

/**
 * Everything about the gateway that lives in the database rather than in .env.
 *
 * The identity block is read-only and says so with a reason, because two of its
 * fields are load-bearing: `alias` is the join between this row and the handler
 * under `api/finance/deposit/fiat/`, and `name` carries a unique index. The
 * previous form disabled both inputs but still sent them on every save, so a
 * hand-edited request could rename the row out of its own integration.
 */
export function GatewayDetails({
  gateway,
  loading = false,
  onChange,
}: {
  /** Null until the row arrives — see `row` below. */
  gateway: any;
  loading?: boolean;
  onChange: (field: string, value: any) => void;
}) {
  /**
   * A FORM HAS ALMOST NOTHING TO SKELETON, and that is why this tab no longer
   * has a look-alike.
   *
   * The parent used to swap this whole component for a generic `PanelSkeleton`
   * of two grey cards. There are three cards here, and every piece of them —
   * the headers, the icons, the descriptions, the field labels, the required
   * asterisks, the help text, the 160px logo dropzone, the `min-h-9` chip
   * strip — is a literal in this file, knowable before any request. An
   * `<Input>` is the same 36px box empty or full, and a `<Textarea rows={4}>`
   * is the same 96px box. So the pending layout IS this layout; only four
   * strings and a chip list are unknown.
   *
   * `?? {}` rather than `?.` throughout: an optional chain would spread
   * `undefined` into every field individually and each one would then have to
   * be read as "no value" by code that cannot tell that from "empty". One
   * empty object at the top says it once.
   */
  const row = gateway ?? {};

  return (
    <div className="space-y-4">
      <PresentationCard gateway={row} loading={loading} onChange={onChange} />
      <CurrenciesCard gateway={row} loading={loading} onChange={onChange} />
      <IdentityCard gateway={row} loading={loading} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function PresentationCard({
  gateway,
  loading,
  onChange,
}: {
  gateway: any;
  loading: boolean;
  onChange: (field: string, value: any) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Type className="h-4 w-4 text-muted-foreground" />
          {t("how_customers_see_it")}
        </CardTitle>
        <CardDescription>
          {t("the_title_and_logo_shown_on")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="title">
              {tCommon("display_title")} <span className="text-destructive">*</span>
            </Label>
            {/* `disabled={loading}` on every writable control in this file is
                not decoration. The parent seeds `formData` from the response,
                so anything typed before it lands is silently overwritten by
                `setFormData(parsed)` — the operator watches their own text
                vanish. The box is the same 36px either way. */}
            <Input
              id="title"
              value={gateway.title || ""}
              disabled={loading}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder={t("shown_on_the_deposit_method_picker")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={gateway.description || ""}
              disabled={loading}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder={t("what_this_gateway_is_for_and_who_should_use_it")}
              rows={4}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Logo
          </Label>
          <ImageUpload
            onChange={(file) => onChange("imageFile", file)}
            value={gateway.imageFile || gateway.image || null}
            title={`200 ${tCommon('100px_works_best')}`}
            size="sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("replaces_the_bundled_logo_a_transparent")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Which currencies this gateway is offered for.
 *
 * The list is bounded by the FIAT currencies enabled on the platform, not by a
 * hardcoded roll-call of every ISO code. The previous form rendered 160 buttons
 * covering every currency in the world next to a warning that adding one the
 * platform does not have "may cause issues" — which put the operator in charge
 * of a constraint the server already knows. Offering only real options removes
 * the warning instead of printing it.
 *
 * A currency already stored on the row but no longer enabled is still shown,
 * flagged, and removable. Hiding it would make the row unfixable from here.
 */
function CurrenciesCard({
  gateway,
  loading,
  onChange,
}: {
  gateway: any;
  loading: boolean;
  onChange: (field: string, value: any) => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [options, setOptions] = useState<CurrencyOption[] | null>(null);
  const [optionsError, setOptionsError] = useState(false);
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await $fetch<CurrencyOption[]>({
        url: "/api/admin/finance/currency/options",
        params: { type: "FIAT" },
        silent: true,
      });
      if (cancelled) return;
      /*
       * A 403 here is legitimate — listing currencies is its own permission —
       * so the picker degrades to a free-text field rather than reporting a
       * failure the operator cannot act on.
       */
      if (error || !Array.isArray(data)) {
        setOptionsError(true);
        setOptions([]);
        return;
      }
      setOptions(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected: string[] = Array.isArray(gateway.currencies)
    ? gateway.currencies
    : [];

  const enabled = useMemo(
    () => new Set((options ?? []).map((option) => option.id)),
    [options]
  );

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (options ?? [])
      .filter((option) => !selected.includes(option.id))
      .filter(
        (option) =>
          !needle ||
          option.id.toLowerCase().includes(needle) ||
          option.name.toLowerCase().includes(needle)
      );
  }, [options, selected, query]);

  const add = (code: string) => {
    const normalised = code.trim().toUpperCase();
    if (!normalised || selected.includes(normalised)) return;
    onChange("currencies", [...selected, normalised]);
    setManual("");
  };

  const remove = (code: string) => {
    onChange(
      "currencies",
      selected.filter((entry) => entry !== code)
    );
  };

  const orphans = selected.filter(
    (code) => options !== null && !optionsError && !enabled.has(code)
  );

  /**
   * SHADOWED BRANCH — the confident-zero case, in words instead of digits.
   *
   * `selected.length === 0` prints "None selected — this gateway will not
   * appear on the deposit form." Under the old parent that only ever ran on a
   * loaded row. Rendered during the fetch it is a definite operational claim
   * about a gateway that may have twenty-four currencies configured, and it is
   * the kind an operator acts on.
   *
   * The chip strip is `min-h-9`, so this sentence and the chips that replace it
   * occupy the same 36px either way — the fix here is purely about what the
   * page SAYS, not about what it measures.
   */
  const showNoCurrencies = !loading && selected.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4 text-muted-foreground" />
          {t("supported_currencies")}
          <Badge tone="neutral" appearance="soft" className="font-mono">
            <Loadable loading={loading} placeholder="00">
              {selected.length}
            </Loadable>
          </Badge>
        </CardTitle>
        <CardDescription>
          A customer can only deposit through this gateway in a currency listed
          here <em>and</em> accepted by the vendor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex min-h-9 flex-wrap gap-1.5">
          {showNoCurrencies ? (
            <p className="text-sm text-muted-foreground">
              {t("none_selected_this_gateway_will_not")}
            </p>
          ) : (
            selected.map((code) => {
              const orphan = orphans.includes(code);
              return (
                <span
                  key={code}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs",
                    orphan
                      ? "border-warning/40 bg-warning/10 text-warning-ink"
                      : "border-border bg-surface-3"
                  )}
                >
                  {orphan && <AlertTriangle className="h-3 w-3" aria-hidden />}
                  {code}
                  <button
                    type="button"
                    onClick={() => remove(code)}
                    aria-label={t("remove", { code: String(code) })}
                    className="rounded-sm text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {orphans.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>
              <span className="font-medium">
                {orphans.join(", ")} {orphans.length === 1 ? "is" : "are"} not
                enabled on this platform.
              </span>{" "}
              A deposit in {orphans.length === 1 ? "it" : "them"} fails when the
              wallet currency is looked up. Either enable{" "}
              {orphans.length === 1 ? "it" : "them"} under Finance → Currencies,
              or remove {orphans.length === 1 ? "it" : "them"} here.
            </p>
          </div>
        )}

        {optionsError ? (
          <div className="space-y-2">
            <Label htmlFor="currency-manual">{t("add_a_currency")}</Label>
            <div className="flex gap-2">
              <Input
                id="currency-manual"
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    add(manual);
                  }
                }}
                placeholder="USD"
                maxLength={4}
                className="w-32 font-mono uppercase"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => add(manual)}
                disabled={!manual.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The platform currency list could not be read — it needs the{" "}
              <code className="font-mono">{t("view_fiat_currency")}</code> permission.
              Codes typed here are not checked against it.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                disabled={loading}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("add_a_currency_the_platform_has_enabled")}
                className="pl-9"
                aria-label={t("search_currencies_to_add")}
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-md border border-border">
              {options === null ? (
                <p className="p-3 text-sm text-muted-foreground">{tCommon("loading")}…</p>
              ) : available.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  {selected.length && (options?.length ?? 0) === selected.length
                    ? t("every_enabled_currency_is_already_selected")
                    : t("no_enabled_currency_matches_that_search")}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {available.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => add(option.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-mono text-xs">{option.id}</span>
                        <span className="truncate text-muted-foreground">
                          {option.name.replace(/^.*?>\s*/, "")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

function IdentityCard({
  gateway,
  loading,
}: {
  gateway: any;
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4 text-muted-foreground" />
          Identity
        </CardTitle>
        <CardDescription>
          {t("fixed_by_the_install")} <code className="font-mono">alias</code> is what
          maps this row to its payment handler, so changing it would silently
          detach the gateway from its integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <ReadOnlyValue
          label={t("internal_name")}
          value={gateway.name}
          placeholder={t("gateway_name")}
          loading={loading}
        />
        <ReadOnlyValue
          label="Alias"
          value={gateway.alias}
          placeholder="alias"
          loading={loading}
          mono
        />
        <ReadOnlyValue
          label="Type"
          value={gateway.type}
          placeholder="FIAT"
          loading={loading}
        />
        <ReadOnlyValue
          label="Version"
          value={gateway.version}
          placeholder="0.0.1"
          loading={loading}
          mono
        />
        <div className="sm:col-span-2">
          <CopyableValue label={t("gateway_id")} value={String(gateway.id ?? "")} />
        </div>
      </CardContent>
    </Card>
  );
}

function ReadOnlyValue({
  label,
  value,
  placeholder,
  loading,
  mono,
}: {
  label: string;
  value: unknown;
  /** Sized from a REAL example of this field, not from a row of blocks. */
  placeholder: string;
  loading: boolean;
  mono?: boolean;
}) {
  const text =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {/* The LABEL is a literal and renders immediately; only the value waits.
          `Loadable` measures itself from this `<p>`, so the pending box is the
          real line height rather than a guessed one. */}
      <p className={cn("text-sm", mono && "font-mono")}>
        <Loadable loading={loading} placeholder={placeholder}>
          {text}
        </Loadable>
      </p>
    </div>
  );
}

/**
 * Is this tab's content shippable?
 *
 * The save button gates on it, so it lives beside the fields it describes
 * rather than being re-derived in the client — the previous page checked title
 * and description in its submit handler and left the currency list unchecked,
 * so a gateway could be saved into the one state that hides it from the deposit
 * form entirely.
 */
export function detailsComplete(gateway: any): boolean {
  return Boolean(
    gateway?.title?.trim() &&
      gateway?.description?.trim() &&
      Array.isArray(gateway?.currencies) &&
      gateway.currencies.length > 0
  );
}
