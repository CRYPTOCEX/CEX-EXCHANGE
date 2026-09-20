"use client";

import { useCallback, useEffect, useState } from "react";
import { m } from "framer-motion";
import $fetch from "@/lib/api";
import { HeroSection } from "@/components/ui/hero-section";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  Bell,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Info,
  KeyRound,
  MessageSquare,
  RefreshCw,
  Scale,
  ShieldCheck,
  Signal,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

type ProviderId = "twilio" | "msg91";

interface SmsProvider {
  id: ProviderId;
  title: string;
  description: string;
  active: boolean;
  configured: boolean;
  /** Does a bad credential fail at send time, or silently succeed? */
  failsLoudly: boolean;
  coverage: string;
  cost: string;
  setupEffort: string;
  bestFor: string;
  dltIndia: string;
  requiredCredentials: string[];
  missingCredentials: string[];
  optionalCredentials: Array<{ key: string; why: string; set: boolean }>;
  testableCredentials: string[];
  setup: { signupUrl: string; consoleUrl: string; steps: string[] };
}

interface SmsConfig {
  otpProvider: ProviderId;
  selection: "explicit" | "default";
  otpConfigured: boolean;
  otpConfigError: string | null;
  baseProvider: ProviderId;
  baseConfigured: boolean;
  baseConfigError: string | null;
  providers: SmsProvider[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function GlassCard({
  children,
  className,
  gradient,
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}) {
  return (
    <m.div
      variants={itemVariants}
      /*
       * SELF-ORCHESTRATING ON PURPOSE — do not drop these to bare `variants`.
       * A motion child carrying only `variants` inherits its parent's label
       * through MotionContext, which works when it mounts WITH the parent and
       * fails silently when it mounts after the parent's `animate` has run: it
       * picks up `initial="hidden"` and never receives `visible`, rendering at
       * full height with opacity 0. Every card here sits behind the config
       * fetch, i.e. mounts on loading true -> false, which is exactly that case.
       */
      initial="hidden"
      animate="visible"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/10 bg-card/50 backdrop-blur-xl",
        "shadow-[0_8px_32px_hsl(var(--shadow)/0.12)] dark:shadow-[0_8px_32px_hsl(var(--shadow)/0.3)]",
        className
      )}
    >
      {gradient && <div className={cn("absolute inset-0 opacity-5", gradient)} />}
      <div className="relative z-10">{children}</div>
    </m.div>
  );
}

export default function SmsProvidersPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await $fetch<SmsConfig>({
      url: "/api/admin/system/notification/sms/provider",
      silent: true,
    });
    if (error) {
      setLoadError(
        typeof error === "string" ? error : "Failed to load SMS configuration"
      );
    } else {
      setLoadError(null);
      setConfig(data ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const providers = config?.providers ?? [];
  const otpProvider = providers.find((p) => p.active);

  return (
    <div className="min-h-screen">
      <HeroSection
        badge={{
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          text: "SMS Delivery",
        }}
        title={t("sms_providers")}
        description={t("choose_which_provider_delivers_one_time")}
        stats={[
          { icon: ShieldCheck, label: t("one_time_codes"), value: otpProvider?.title ?? "—" },
          { icon: Signal, label: t("codes_deliverable"), value: config?.otpConfigured ? "Yes" : "No" },
          { icon: Bell, label: tCommon("notifications"), value: "Twilio" },
          { icon: KeyRound, label: t("notifications_ok"), value: config?.baseConfigured ? "Yes" : "No" },
        ]}
      />

      <div className="container mx-auto py-8 space-y-6">
        <m.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/*
            The pending state is the real cards with their strings withheld.

            `h-40` and two `h-96` were the whole layout expressed as three
            numbers: 160px for a routing panel whose height is a header plus a
            body, and 384px for provider cards that grow with the number of
            credential rows a provider declares. Neither number is derived from
            anything, and neither carried the `GlassCard` surface — the border,
            the `backdrop-blur-xl` fill and the corner treatment appeared only
            once the fetch returned, so the section changed material as well as
            size.

            `GlassCard` is this file's own shell and needs no data, so it is
            what the pending state uses. Only the titles and descriptions are
            unknown.
          */}
          {loading ? (
            <div className="space-y-6">
              <GlassCard gradient="bg-info/10">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-info/10 shrink-0" />
                    <div>
                      <CardTitle>
                        <SkeletonText placeholder={t("message_routing")} />
                      </CardTitle>
                      <CardDescription>
                        <SkeletonText placeholder={t("which_provider_sends_which_kind_of_message")} />
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </GlassCard>
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <GlassCard key={i} className="flex flex-col">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle>
                            <SkeletonText placeholder={t("provider_name")} />
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <SkeletonText placeholder={t("what_this_provider_is_used_for_on_this_platform")} />
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      {[0, 1, 2].map((row) => (
                        <p key={row} className="text-sm text-muted-foreground">
                          <SkeletonText placeholder="CREDENTIAL_KEY" />
                        </p>
                      ))}
                    </CardContent>
                  </GlassCard>
                ))}
              </div>
            </div>
          ) : loadError ? (
            <GlassCard>
              <CardContent className="py-10 text-center">
                <XCircle className="h-12 w-12 mx-auto mb-3 text-destructive opacity-60" />
                <p className="font-medium">{loadError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setLoading(true);
                    void refresh();
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </GlassCard>
          ) : config ? (
            <>
              <RoutingPanel config={config} otpProvider={otpProvider} />
              <ProviderComparison providers={providers} />
              <m.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid gap-6 md:grid-cols-2"
              >
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
                ))}
              </m.div>
            </>
          ) : null}
        </m.div>
      </div>
    </div>
  );
}

/**
 * What routes where, and why only half of it is switchable.
 *
 * The "notifications always use Twilio" half is stated rather than left to be
 * inferred from a missing control — an operator who expects one switch for all
 * SMS will otherwise read its absence as a bug.
 */
function RoutingPanel({
  config,
  otpProvider,
}: {
  config: SmsConfig;
  otpProvider?: SmsProvider;
}) {
  const t = useTranslations("dashboard_admin");
  return (
    <GlassCard gradient="bg-info/10">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
              <Signal className="h-5 w-5 text-info" />
            </div>
            <div>
              <CardTitle>{t("message_routing")}</CardTitle>
              <CardDescription>
                Set by <code className="font-mono">SMS_OTP_PROVIDER</code> in{" "}
                <code className="font-mono">.env</code>
              </CardDescription>
            </div>
          </div>
          <Badge variant={config.otpConfigured ? "default" : "destructive"}>
            {config.otpConfigured ? t("codes_deliverable") : t("codes_not_deliverable")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-info/30 bg-info/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-info" />
              {t("one_time_codes")}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {otpProvider?.title ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("login_and_2fa_phone_verification_withdrawal")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Bell className="h-3.5 w-3.5" />
              {t("everything_else")}
            </p>
            <p className="mt-1 text-lg font-semibold">Twilio</p>
            <p className="text-xs text-muted-foreground">
              {t("notification_sms_not_switchable")}
            </p>
          </div>
        </div>

        {config.otpConfigError && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <p>
              <strong className="text-foreground">
                {t("one_time_codes_cannot_be_sent")}
              </strong>{" "}
              {config.otpConfigError}
            </p>
          </div>
        )}

        {config.baseConfigError && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <p>
              <strong className="text-foreground">
                {t("notification_sms_cannot_be_sent")}
              </strong>{" "}
              {config.baseConfigError}
            </p>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            <strong className="text-foreground">
              {t("only_codes_are_switchable_by_design")}
            </strong>{" "}
            {t("msg91s_current_send_api_requires_a")}
          </p>
        </div>

        {config.otpProvider === "msg91" && (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <p>
              <strong className="text-foreground">
                {t("msg91_reports_success_even_when_it_cannot_deliver")}
              </strong>{" "}
              Its send endpoint returns{" "}
              <code className="font-mono">
                {t("type_success")}
              </code>{" "}
              with no authkey at all, so a wrong key produces no error and codes
              simply never arrive. Use{" "}
              <strong className="text-foreground">{t("test_credentials")}</strong>{" "}
              below &mdash; it probes an endpoint that genuinely validates the
              key.
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Changing <code className="font-mono">SMS_OTP_PROVIDER</code> requires a
          backend restart.
          {config.selection === "default" && (
            <>
              {" "}
              {t("it_is_currently_unset_so_codes_default_to_twilio")}
            </>
          )}
        </p>
      </CardContent>
    </GlassCard>
  );
}

/**
 * Side-by-side matrix for the OTP switch.
 *
 * "Fails loudly" leads because it is the most consequential difference: Twilio
 * rejects a bad credential at send time, MSG91 accepts everything and drops it
 * silently, which turns every other row into a guess.
 */
function ProviderComparison({ providers }: { providers: SmsProvider[] }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  if (providers.length === 0) return null;

  const rows: Array<{
    label: string;
    hint?: string;
    render: (p: SmsProvider) => React.ReactNode;
  }> = [
    {
      label: t("fails_loudly"),
      hint: t("whether_a_bad_credential_is_rejected"),
      render: (p) => <YesNo value={p.failsLoudly} />,
    },
    { label: t("coverage"), render: (p) => <span>{p.coverage}</span> },
    { label: tCommon("cost"), render: (p) => <span>{p.cost}</span> },
    { label: t("setup_effort"), render: (p) => <span>{p.setupEffort}</span> },
    { label: tCommon("best_for"), render: (p) => <span>{p.bestFor}</span> },
    { label: t("india_dlt"), render: (p) => <span>{p.dltIndia}</span> },
  ];

  return (
    <GlassCard>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5 text-info" />
          </div>
          <div>
            <CardTitle>{t("which_should_deliver_your_codes")}</CardTitle>
            <CardDescription>
              {t("costs_are_the_vendors_published_list")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 text-left font-medium text-muted-foreground w-44">
                  &nbsp;
                </th>
                {providers.map((p) => (
                  <th key={p.id} className="py-3 px-4 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.title}</span>
                      {p.active && (
                        <Badge variant="default" className="text-[10px]">
                          Codes
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{row.label}</p>
                    {row.hint && (
                      <p className="text-xs text-muted-foreground">{row.hint}</p>
                    )}
                  </td>
                  {providers.map((p) => (
                    <td key={p.id} className="py-3 px-4">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-info/20 bg-info/5 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-info" />
          <p>
            <strong className="text-foreground">
              {t("dlt_is_a_rule_about_the")}
            </strong>{" "}
            Sending to Indian numbers requires a registered Entity ID, header and
            content template on <em>both</em> providers. Switching away from
            MSG91 does not avoid it.
          </p>
        </div>
      </CardContent>
    </GlassCard>
  );
}

function YesNo({ value }: { value: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        value ? "text-success" : "text-destructive"
      )}
    >
      {value ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" />
      )}
      {value ? tCommon("yes") : tCommon("no")}
    </span>
  );
}

function ProviderCard({ provider }: { provider: SmsProvider }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return (
    <GlassCard className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {provider.title}
              {provider.active && <Badge variant="default">{t("sends_codes")}</Badge>}
            </CardTitle>
            <CardDescription className="mt-1">
              {provider.description}
            </CardDescription>
          </div>
          <Badge variant={provider.configured ? "outline" : "secondary"}>
            {provider.configured ? t("credentials_present") : tCommon("not_configured")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <CredentialList provider={provider} />
        <ProviderSetupPanel provider={provider} />
        {!provider.active && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              To send codes with {provider.title}, set{" "}
              <code className="font-mono">
                {t("sms_otp_provider")}{provider.id}&quot;
              </code>{" "}
              in <code className="font-mono">.env</code> and restart the backend.
            </p>
          </div>
        )}
      </CardContent>
    </GlassCard>
  );
}

function CredentialList({ provider }: { provider: SmsProvider }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const missing = new Set(provider.missingCredentials);
  const optional = provider.optionalCredentials ?? [];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Required &mdash; {provider.requiredCredentials.length} value
          {provider.requiredCredentials.length === 1 ? "" : "s"}
        </p>
        {provider.requiredCredentials.map((key) => {
          const isMissing = missing.has(key);
          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5"
            >
              {isMissing ? (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
              )}
              <code className="font-mono text-[11px]">{key}</code>
              {isMissing && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {tCommon("not_set")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Separated rather than mixed in: an optional value shown next to
          required ones reads as something you still have to go and get. */}
      {optional.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("optional_not_needed_to_send")}
          </p>
          {optional.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-dashed border-border bg-background/40 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <code className="font-mono text-[11px] text-muted-foreground">
                  {item.key}
                </code>
                {item.set && (
                  <Badge variant="outline" className="ml-auto text-[9px]">
                    set
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {item.why}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Setup guide plus a credential check that runs BEFORE anything is saved.
 *
 * Neither provider gives useful feedback later: MSG91's send path returns
 * success on a wrong key, and Twilio's first failure arrives as a runtime error
 * inside someone's login attempt. Validating here means an operator learns the
 * key is wrong while it is still on their clipboard.
 */
function ProviderSetupPanel({ provider }: { provider: SmsProvider }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; message?: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const testable = provider.testableCredentials ?? [];
  const filled = testable.filter((key) => values[key]?.trim());

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const credentials: Record<string, string> = {};
    for (const key of testable) {
      const value = values[key]?.trim();
      if (value) credentials[key] = value;
    }
    const { data, error } = await $fetch<{ valid: boolean; message?: string }>({
      url: "/api/admin/system/notification/sms/provider/test",
      method: "POST",
      body: { provider: provider.id, credentials },
      silent: true,
    });
    setTesting(false);
    if (error || !data) {
      setResult({
        valid: false,
        message: typeof error === "string" ? error : tCommon("the_test_could_not_be_run"),
      });
      return;
    }
    setResult(data);
  };

  const envSnippet = [
    `SMS_OTP_PROVIDER="${provider.id}"`,
    ...filled.map((key) => `${key}="${values[key].trim()}"`),
  ].join("\n");

  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(envSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked on an insecure origin */
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-medium">
          <BookOpen className="h-3.5 w-3.5" />
          {t("set_up")} {provider.title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <ol className="space-y-2">
            {provider.setup.steps.map((step, index) => (
              <li key={index} className="flex gap-2 text-xs text-muted-foreground">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-background text-[9px] font-semibold tabular-nums">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={provider.setup.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {tCommon("sign_up")}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={provider.setup.consoleUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {tCommon("get_the_key")}
              </a>
            </Button>
          </div>

          {testable.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium">{tCommon("test_it_before_you_save")}</p>
              <p className="text-xs text-muted-foreground">
                {t("checks_the_credential_against_the_vendor")}{" "}
                <code className="font-mono">.env</code>.
              </p>
              {testable.map((key) => (
                <div key={key} className="space-y-1">
                  <label
                    htmlFor={`${provider.id}-${key}`}
                    className="font-mono text-[10px] text-muted-foreground"
                  >
                    {key}
                  </label>
                  <input
                    id={`${provider.id}-${key}`}
                    type="password"
                    autoComplete="off"
                    value={values[key] ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    placeholder="Paste the value, or leave blank"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={runTest}
                loading={testing}
                disabled={testing}
              >
                {!testing && <ShieldCheck className="h-3.5 w-3.5" />}
                {t("test_credentials")}
              </Button>

              {result && (
                <div className="space-y-2">
                  <p
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-2 text-xs",
                      result.valid
                        ? "border-success/40 bg-success/10"
                        : "border-destructive/40 bg-destructive/10"
                    )}
                  >
                    {result.valid ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    {result.message ??
                      (result.valid
                        ? t("credentials_accepted")
                        : t("credentials_rejected"))}
                  </p>

                  {result.valid && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {tCommon("add_this_to_your_env_then_restart_the_backend")}:
                      </p>
                      <div className="flex items-start gap-2">
                        <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-background p-2 font-mono text-[10px]">
                          {envSnippet}
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyEnv}
                          className="shrink-0"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
