"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  FlaskConical,
  Globe,
  Info,
  KeyRound,
  Link2,
  ListOrdered,
  Radio,
  ShieldCheck,
  Terminal,
  Webhook,
  XCircle,
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
import $fetch from "@/lib/api";
import { cn } from "@/lib/utils";

import { CopyButton, CopyableValue } from "./copy-field";
import type {
  CredentialState,
  CredentialTestResult,
  GatewayDetailResponse,
  GatewayGotcha,
} from "../../types";
import { useTranslations } from "next-intl";

const GOTCHA_STYLE = {
  danger: {
    icon: AlertTriangle,
    card: "destructive" as const,
    ink: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    card: "warning" as const,
    ink: "text-warning",
  },
  info: { icon: Info, card: "info" as const, ink: "text-info" },
};

const TEST_RESULT_STYLE = {
  valid: {
    icon: CheckCircle2,
    ink: "text-success",
    frame: "border-success/40 bg-success/10",
    title: "Credentials accepted",
  },
  invalid: {
    icon: XCircle,
    ink: "text-destructive",
    frame: "border-destructive/40 bg-destructive/10",
    title: "Credentials rejected",
  },
  unknown: {
    icon: CircleHelp,
    ink: "text-warning",
    frame: "border-warning/40 bg-warning/10",
    title: "Could not tell",
  },
  unsupported: {
    icon: Info,
    ink: "text-info",
    frame: "border-info/40 bg-info/10",
    title: "Checked what can be checked",
  },
};

/**
 * Everything an operator needs to make this gateway take a payment, in the
 * order they need it.
 *
 * The order is deliberate and is the whole design: verdict, then the test that
 * can change the verdict, then the values the test needs, then the URLs that
 * have to leave this page, then the walkthrough, then the traps. Reference
 * material — pricing, regions, links — is last, because it is the only part
 * that is not blocking anyone.
 */
export function SetupGuide({
  gatewayId,
  detail,
  loading = false,
  onRefresh,
}: {
  gatewayId: string;
  /**
   * Null until `/config` answers. It used to be required, which is why the
   * PARENT had to decide between this component and a look-alike skeleton —
   * two trees for one panel stack. Owning the pending state here means there
   * is one component, and the headers below are shared by both states rather
   * than transcribed into a copy that then drifts.
   */
  detail: GatewayDetailResponse | null;
  loading?: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const profile = detail?.profile ?? null;

  /**
   * SHADOWED BRANCH — and this one accuses the product of a missing feature.
   *
   * `if (!profile)` was written under a parent that only mounted this
   * component once `/config` had answered. Made pending-aware, the same test
   * is true for the whole round-trip, so a Stripe gateway would render "No
   * integration is bundled for this gateway" — with the warning tone, and with
   * `detail.unsupportedReason` (null) under it — for as long as the request
   * took, on a page whose entire job is telling an operator whether the
   * integration works.
   *
   * The named predicate is where the distinction gets stated: this is
   * "answered, and there is nothing", never "has not answered yet".
   */
  const showUnsupported = !loading && detail !== null && !profile;

  if (showUnsupported) {
    return (
      <Card tone="warning" padding="lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">{t("no_integration_is_bundled_for_this_gateway")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail?.unsupportedReason}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("its_title_fees_limits_and_currency")}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  /*
   * No profile to render from, for whatever reason. The condition is about the
   * DATA, not about a flag: `showUnsupported` above has already claimed the
   * "answered, and there is none" case, so everything left here is pending.
   */
  if (!detail || !profile) {
    return <PendingPanels />;
  }

  const { health } = detail;

  return (
    <div className="space-y-4">
      <ConnectionPanel
        gatewayId={gatewayId}
        detail={detail}
        onRefresh={onRefresh}
      />
      <CredentialsPanel credentials={health.credentials} />
      <EndpointsPanel detail={detail} />
      <StepsPanel steps={profile.steps} title={profile.title} />
      <GotchasPanel gotchas={profile.gotchas} />
      <ReferencePanel detail={detail} />
    </div>
  );
}

/**
 * The panel stack, waiting.
 *
 * WHY THIS ONE IS ALLOWED TO BE A SEPARATE FUNCTION, briefly: the six panels
 * above are driven by a per-vendor registry entry — Stripe declares four
 * credentials and eleven steps, PayPal three and eight, TransFi two and six —
 * so the number of rows inside each panel is genuinely unknowable before the
 * fetch and no faithful copy of the body exists to render. That is the
 * contract's list case: reserve the CONTAINER, accept that the count settles.
 *
 * What IS knowable is the stack itself: which panels there are, in what order,
 * with which icon and which heading. Five of the six headings are literal
 * strings in this file and the sixth ("Steps to connect X") differs only in
 * the vendor name. So this renders the real `Card` + `PanelHeader` — the same
 * components, not a transcription of them — and skeletons only the bodies. A
 * change to `PanelHeader`'s padding moves both states at once, which is the
 * property a hand-built copy cannot have.
 */
const PENDING_PANELS: {
  icon: typeof KeyRound;
  title: string;
  description: string;
  /** How many body rows to reserve — the median across the bundled vendors. */
  rows: number;
}[] = [
  {
    icon: ShieldCheck,
    title: "Connection",
    description:
      "Checks the credentials against the vendor. Nothing is saved and no payment is created.",
    rows: 3,
  },
  {
    icon: KeyRound,
    title: "Environment variables",
    description:
      "Read from the backend process. Values are never sent to this page — only whether each one is set.",
    rows: 3,
  },
  {
    icon: Link2,
    title: "URLs to give the vendor",
    description:
      "Derived from your public site URL. If they look wrong, APP_PUBLIC_URL is what sets them.",
    rows: 2,
  },
  {
    icon: ListOrdered,
    title: "Steps to connect",
    description: "In this order — several of these depend on the one before.",
    rows: 4,
  },
];

function PendingPanels() {
  return (
    <div className="space-y-4" aria-busy="true">
      {PENDING_PANELS.map((panel) => (
        <Card key={panel.title}>
          <PanelHeader
            icon={panel.icon}
            title={panel.title}
            description={panel.description}
          />
          <CardContent className="space-y-2">
            {Array.from({ length: panel.rows }, (_, row) => (
              <div
                key={row}
                className="h-9 animate-pulse rounded-md bg-surface-3"
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function PanelHeader({
  icon: Icon,
  title,
  description,
  right,
}: {
  icon: typeof KeyRound;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-3">
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-0.5">{description}</CardDescription>
            )}
          </div>
        </div>
        {right}
      </div>
    </CardHeader>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The verdict, and the one control that can change it.
 *
 * Testing BEFORE saving is the point. Every vendor here fails a bad credential
 * somewhere an operator is not looking — at a customer's checkout, or in
 * PayPal's case not at all until the buttons fail to render — so the only
 * moment a wrong key is cheap to find is while it is still on the clipboard.
 */
function ConnectionPanel({
  gatewayId,
  detail,
  onRefresh,
}: {
  gatewayId: string;
  detail: GatewayDetailResponse;
  onRefresh: () => void;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const { profile, health } = detail;
  const [values, setValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<CredentialTestResult | null>(null);

  /*
   * Which fields the form offers.
   *
   * For a probe-backed vendor it is exactly the keys the probe uses — offering
   * more would imply a check that is not performed. For a format-only vendor it
   * is every required key, because presence and shape is what that check reads.
   */
  const testable =
    profile!.test.mode === "live-probe"
      ? profile!.test.credentials
      : profile!.credentials.filter((c) => c.required).map((c) => c.key);

  const envSnippet = useMemo(() => {
    const lines: string[] = [];
    for (const credential of profile!.credentials) {
      const typed = values[credential.key]?.trim();
      const state = health.credentials.find((c) => c.key === credential.key);
      if (typed) {
        lines.push(`${credential.key}="${typed}"`);
      } else if (
        (credential.required || credential.inboundRequired) &&
        !state?.set
      ) {
        // Emit the empty required key so the block an operator pastes is the
        // complete one, rather than one they then have to remember to extend.
        // `inboundRequired` counts: leaving a webhook secret out of the block
        // is how a gateway ends up taking payments it cannot confirm.
        lines.push(`${credential.key}=""`);
      } else if (
        credential.kind === "url" &&
        credential.suggestedPath &&
        !state?.set
      ) {
        lines.push(`${credential.key}="${credential.suggestedPath}"`);
      }
    }
    return lines.join("\n");
  }, [values, profile, health.credentials]);

  const runTest = async () => {
    setTesting(true);
    setResult(null);

    const credentials: Record<string, string> = {};
    for (const key of testable) {
      const value = values[key]?.trim();
      if (value) credentials[key] = value;
    }

    const { data, error } = await $fetch<CredentialTestResult>({
      url: `/api/admin/finance/deposit/gateway/${gatewayId}/test`,
      method: "POST",
      body: { credentials },
      silent: true,
    });

    setTesting(false);
    if (error || !data) {
      setResult({
        status: "unknown",
        message:
          typeof error === "string" ? error : t("the_test_could_not_be_run"),
      });
      return;
    }
    setResult(data);
  };

  const style = result ? TEST_RESULT_STYLE[result.status] : null;
  const ResultIcon = style?.icon;

  return (
    <Card>
      <PanelHeader
        icon={ShieldCheck}
        title="Connection"
        description={
          profile!.test.mode === "live-probe"
            ? t("checks_the_credentials_against_the_vendor")
            : t("this_vendor_has_no_read_only")
        }
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              tone={health.credentialsComplete ? "success" : "warning"}
              appearance="soft"
            >
              {health.credentialsComplete ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <KeyRound className="h-3 w-3" />
              )}
              {health.credentialsComplete
                ? t("all_credentials_present")
                : t("missing", { length: health.missingRequired.length })}
            </Badge>
            {health.mode !== "unknown" && (
              <Badge
                tone={health.mode === "live" ? "info" : "neutral"}
                appearance="outline"
              >
                {health.mode === "live" ? (
                  <Radio className="h-3 w-3" />
                ) : (
                  <FlaskConical className="h-3 w-3" />
                )}
                {health.mode === "live" ? tCommon("live") : tCommon("test")}
              </Badge>
            )}
          </div>
        }
      />
      <CardContent className="space-y-4">
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {profile!.modeNote}
          </span>
        </p>

        <div className="space-y-3">
          <p className="text-xs font-medium">
            {t("paste_a_value_to_test_it")}
          </p>

          {testable.map((key) => {
            const credential = profile!.credentials.find((c) => c.key === key);
            const state = health.credentials.find((c) => c.key === key);
            const secret = credential?.kind === "secret";
            return (
              <div key={key} className="space-y-1">
                <Label
                  htmlFor={`test-${key}`}
                  className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground"
                >
                  {key}
                  {state?.set ? (
                    <Badge tone="success" appearance="soft" className="text-[9px]">
                      set
                    </Badge>
                  ) : (
                    <Badge tone="warning" appearance="soft" className="text-[9px]">
                      {tCommon("not_set")}
                    </Badge>
                  )}
                  {state?.prefix && (
                    <span className="font-mono text-[10px]">
                      {state.prefix}…
                    </span>
                  )}
                </Label>
                <Input
                  id={`test-${key}`}
                  type={secret ? "password" : "text"}
                  autoComplete="off"
                  value={values[key] ?? ""}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  /*
                    "Leave blank" WINS over the example when the value is
                    already set. The other order renders TransFi's MID field as
                    a grey `TIDD20_NA_NA` next to a green "set" chip, which
                    reads as the configured value rather than as a hint — and
                    the operator then types over a field they did not need to
                    touch.
                  */
                  placeholder={
                    state?.set
                      ? t("leave_blank_to_keep_the_current_value")
                      : credential?.example || t("paste_the_value")
                  }
                  className="font-mono text-xs"
                />
                {credential?.why && (
                  <p className="text-[11px] text-muted-foreground">
                    {credential.why}
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runTest}
              loading={testing}
              disabled={testing}
            >
              {!testing && <ShieldCheck className="h-3.5 w-3.5" />}
              {profile!.test.mode === "live-probe"
                ? tCommon("test_connection")
                : t("check_values")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={testing}
            >
              {t("re_read_environment")}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {profile!.test.note}
          </p>
        </div>

        {result && style && ResultIcon && (
          <div className="space-y-3">
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border p-3 text-sm",
                style.frame
              )}
            >
              <ResultIcon className={cn("mt-0.5 h-4 w-4 shrink-0", style.ink)} />
              <div className="min-w-0">
                <p className="font-medium">
                  {style.title}
                  {result.environment && (
                    <>
                      {" — "}
                      <span className="font-normal">
                        {result.environment === "live" ? "live" : "test"}{" "}
                        environment
                      </span>
                    </>
                  )}
                </p>
                <p className="text-muted-foreground">{result.message}</p>
              </div>
            </div>

            {envSnippet && result.status !== "invalid" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium">
                    <Terminal className="h-3.5 w-3.5" />
                    Add to <code className="font-mono">.env</code>, then restart
                    the backend
                  </p>
                  <CopyButton value={envSnippet} label="Copy" />
                </div>
                <pre className="overflow-x-auto rounded-md border border-border bg-surface-3 p-3 font-mono text-[11px]">
                  {envSnippet}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

function CredentialsPanel({ credentials }: { credentials: CredentialState[] }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const required = credentials.filter((c) => c.required);
  /*
   * THREE GROUPS, BECAUSE TWO OF THEM MADE THE HEADING LIE.
   *
   * "Optional — the gateway works without these" is true of a sandbox flag and
   * a URL override. It was also being said about Klarna's, Authorize.Net's,
   * PayFast's and TransFi's webhook secrets, whose absence makes the
   * confirmation webhook refuse every delivery — the gateway takes the payment
   * and cannot credit it. They are not optional; they are required by the other
   * leg, and `inboundRequired` is the registry saying so.
   */
  const inboundOnly = credentials.filter((c) => !c.required && c.inboundRequired);
  const optional = credentials.filter((c) => !c.required && !c.inboundRequired);

  return (
    <Card>
      <PanelHeader
        icon={KeyRound}
        title={tCommon("environment_contract")}
        description={t("read_from_the_backend_process_values")}
      />
      <CardContent className="space-y-4">
        <CredentialList
          heading={`Required — ${required.length} value${required.length === 1 ? "" : "s"}`}
          credentials={required}
        />
        {inboundOnly.length > 0 && (
          <CredentialList
            heading={`Required to confirm a payment — ${inboundOnly.length} value${
              inboundOnly.length === 1 ? "" : "s"
            } the webhook refuses to run without`}
            credentials={inboundOnly}
          />
        )}
        {optional.length > 0 && (
          <CredentialList
            heading={t("optional_the_gateway_works_without_these")}
            credentials={optional}
            dashed
          />
        )}
      </CardContent>
    </Card>
  );
}

function CredentialList({
  heading,
  credentials,
  dashed,
}: {
  heading: string;
  credentials: CredentialState[];
  dashed?: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{heading}</p>
      {credentials.map((credential) => (
        <div
          key={credential.key}
          /* `bg-surface-3`, not `bg-card`: this row sits INSIDE a card, and a
             card-on-card has no elevation step to read against (R3). It is also
             what the card-shell gate asks for — a bare `bg-card` carrying a
             radius other than `rounded-lg` is drift by definition. */
          className={cn(
            "rounded-md border bg-surface-3 px-3 py-2",
            dashed ? "border-dashed border-border" : "border-border"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {credential.set ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
            ) : credential.required || credential.inboundRequired ? (
              // Unset and load-bearing on EITHER leg. An unset webhook secret
              // drew the neutral "this one is optional" glyph, which is the
              // same claim the group heading used to make.
              <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            ) : (
              <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <code className="font-mono text-[11px]">{credential.key}</code>
            {credential.prefix && (
              <Badge
                tone={
                  credential.prefix.toLowerCase().includes("live")
                    ? "info"
                    : "neutral"
                }
                appearance="soft"
                className="text-[9px]"
              >
                {credential.prefix}
              </Badge>
            )}
            {credential.value && (
              <code className="truncate font-mono text-[10px] text-muted-foreground">
                {credential.value}
              </code>
            )}
            <span className="ml-auto flex items-center gap-1">
              {!credential.set && (
                <span className="text-[10px] text-muted-foreground">
                  {tCommon("not_set")}
                </span>
              )}
              <CopyButton
                value={credential.key}
                size="2xs"
                variant="ghost"
                label={undefined}
              />
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {credential.label} — {credential.why}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The two URLs that have to leave this page and be pasted somewhere else.
 *
 * They are derived from the public site URL rather than stored, which is why
 * they were previously nowhere in the admin at all: an operator had to read the
 * integration source to learn the webhook path. A wrong or unset webhook is the
 * single most common cause of "the customer paid and the wallet was not
 * credited", so it leads.
 */
function EndpointsPanel({ detail }: { detail: GatewayDetailResponse }) {
  const t = useTranslations("dashboard_admin");
  const { profile, health } = detail;

  return (
    <Card>
      <PanelHeader
        icon={Link2}
        title={t("urls_to_give_the_vendor")}
        description={t("derived_from_your_public_site_url")}
      />
      <CardContent className="space-y-4">
        {/*
          THE DOOR IS CONFIGURED AND BOLTED.

          Pasting the URL into the vendor's dashboard is only half of it: four
          of these integrations refuse their own delivery outright when the
          signing secret is unset — the customer is charged, the webhook answers
          5xx and the wallet is never credited from it. That key is `required:
          false` in the registry because the gateway can still TAKE a payment
          without it, so nothing else on this page marks it, and it sits in the
          credential list looking optional. It is named here, beside the URL it
          belongs to, because this is the panel an operator is on when they set
          the webhook up.
        */}
        {health.inboundComplete === false && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-medium">
                This webhook will refuse every delivery
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {health.missingInbound.join(", ")}{" "}
                {health.missingInbound.length === 1 ? "is" : "are"} unset, and
                the handler will not run without{" "}
                {health.missingInbound.length === 1 ? "it" : "them"}. Deposits
                complete at the vendor and are not credited here until{" "}
                {health.missingInbound.length === 1 ? "it is" : "they are"} set
                and the backend restarted.
              </p>
            </div>
          </div>
        )}

        {health.webhookUrl ? (
          <div className="space-y-2">
            <CopyableValue
              label={t("webhook_callback_url")}
              value={health.webhookUrl}
              hint={profile!.webhookNote}
            />
            {profile!.webhookEvents && profile!.webhookEvents.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {t("subscribe_to")}:
                </span>
                {profile!.webhookEvents.map((event) => (
                  <Badge
                    key={event}
                    tone="neutral"
                    appearance="soft"
                    className="font-mono text-[10px]"
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Webhook className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium text-foreground">
                {t("no_webhook_to_configure")}
              </span>{" "}
              {profile!.webhookNote}
            </p>
          </div>
        )}

        <CopyableValue
          label={t("return_url_where_the_customer_lands_after_paying")}
          value={health.returnUrl}
        />

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Both are built from{" "}
            <code className="font-mono">APP_PUBLIC_URL</code>, currently{" "}
            <code className="font-mono">{health.publicUrl}</code>. A vendor
            cannot reach <code className="font-mono">localhost</code>, so on a
            development machine the webhook half of every gateway is inert and
            deposits are confirmed only by the customer&apos;s return.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

function StepsPanel({ steps, title }: { steps: string[]; title: string }) {
  const t = useTranslations("dashboard_admin");
  return (
    <Card>
      <PanelHeader
        icon={ListOrdered}
        title={t("set_up_1", { title: String(title) })}
        description={t("in_this_order_several_of_these")}
      />
      <CardContent>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface-3 font-mono text-[10px] tabular-nums">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

function GotchasPanel({ gotchas }: { gotchas: GatewayGotcha[] }) {
  const t = useTranslations("dashboard_admin");
  if (!gotchas.length) return null;

  return (
    <Card>
      <PanelHeader
        icon={AlertTriangle}
        title={t("what_goes_wrong_with_this_one")}
        description={t("vendor_specific_failures_that_look_like")}
      />
      <CardContent className="space-y-2.5">
        {gotchas.map((gotcha) => {
          const style = GOTCHA_STYLE[gotcha.level];
          const Icon = style.icon;
          return (
            <Card
              key={gotcha.title}
              variant="muted"
              tone={style.card}
              padding="md"
            >
              <div className="flex items-start gap-2.5">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.ink)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{gotcha.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {gotcha.body}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------ */

const LINK_LABELS: Array<{
  key: "signup" | "dashboard" | "apiKeys" | "webhooks" | "docs";
  label: string;
  icon: typeof ExternalLink;
}> = [
  { key: "signup", label: "Create an account", icon: ArrowUpRight },
  { key: "dashboard", label: "Vendor dashboard", icon: ExternalLink },
  { key: "apiKeys", label: "Get the keys", icon: KeyRound },
  { key: "webhooks", label: "Webhook settings", icon: Webhook },
  { key: "docs", label: "API documentation", icon: BookOpen },
];

function ReferencePanel({ detail }: { detail: GatewayDetailResponse }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const profile = detail.profile!;

  const facts: Array<{ label: string; value: string }> = [
    { label: t("where_it_works"), value: profile.regions },
    { label: tCommon("settlement"), value: profile.settlement },
    { label: t("vendor_pricing"), value: profile.pricing },
    { label: t("checkout_style"), value: profile.integrationNote },
  ];

  const links = LINK_LABELS.filter((entry) => profile.links[entry.key]);

  return (
    <Card>
      <PanelHeader
        icon={Info}
        title={t("about", { title: String(profile.title) })}
        description={profile.summary}
      />
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-medium text-muted-foreground">
                {fact.label}
              </dt>
              <dd className="text-sm">{fact.value}</dd>
            </div>
          ))}
        </dl>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {links.map((entry) => {
              const Icon = entry.icon;
              return (
                <Button key={entry.key} asChild size="sm" variant="outline">
                  <a
                    href={profile.links[entry.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {entry.label}
                  </a>
                </Button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {t("vendor_pricing_is_the_published_list")}
        </p>
      </CardContent>
    </Card>
  );
}
