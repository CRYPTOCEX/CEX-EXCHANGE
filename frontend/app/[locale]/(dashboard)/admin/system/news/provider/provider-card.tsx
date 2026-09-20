"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FlaskConical,
  KeyRound,
  Newspaper,
  Plus,
  Save,
  Tag,
  Trash2,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import $fetch from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { cn } from "@/lib/utils";
import {
  draftFrom,
  readFeeds,
  type NewsProvider,
  type ProviderDraft,
  type RssFeed,
} from "./types";

/**
 * One provider, with everything an operator can do to it.
 *
 * THREE ACTIONS, DELIBERATELY DISTINCT. Test asks the vendor a question and
 * writes nothing. Save writes settings and fetches nothing. The switch enables
 * or disables and is refused by the server if the provider could not actually
 * run. Collapsing any two of them would produce the failure this console exists
 * to remove — a provider that reads as configured and silently returns nothing.
 *
 * THE CARD NEVER DECIDES READINESS ITSELF. `ready`, `missingCredentials` and
 * `configProblem` all arrive from the server, which is the only side that can
 * see `process.env`. A client-side guess would be wrong on exactly the installs
 * that need it to be right.
 */

interface ProviderCardProps {
  provider: NewsProvider;
  /** Re-fetch the list. Called after anything that changes server state. */
  onChanged: () => void | Promise<void>;
}

type TestResult = { valid: boolean; message: string; sampled?: number };

function relativeTime(
  epochMs: number,
  t: ReturnType<typeof useTranslations>
): string {
  const seconds = Math.max(0, Math.round((Date.now() - epochMs) / 1000));
  if (seconds < 60) return t("just_now");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("n_minutes_ago", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("n_hours_ago", { count: hours });
  return t("n_days_ago", { count: Math.round(hours / 24) });
}

export function ProviderCard({ provider, onChanged }: ProviderCardProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  /*
   * The SAVED settings, serialised. This is both the identity of the server's
   * copy and the thing "has anything changed?" compares against, so it is
   * computed once per render rather than twice.
   */
  const savedKey = JSON.stringify(draftFrom(provider));

  const [draft, setDraft] = useState<ProviderDraft>(() => JSON.parse(savedKey));
  const [syncedKey, setSyncedKey] = useState(savedKey);

  /*
   * The credential is NOT part of the draft, because it is the one field whose
   * saved value the server will not tell us. `draft` exists to be compared
   * against what is stored; a field with nothing to compare against would make
   * that comparison permanently dirty.
   *
   * Empty box + `clearKey` false is therefore "leave whatever is saved alone",
   * which is the state this returns to after every successful save.
   */
  const [keyInput, setKeyInput] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  /*
   * Re-seed the draft when the SAVED provider changes — DURING RENDER, not from
   * an effect.
   *
   * This is React's documented "adjusting state when a prop changes" shape:
   * React re-runs the component immediately with the new state and never
   * commits the intermediate result, so there is no flash of the stale draft
   * and no second paint. Doing it in a `useEffect` would be the synchronous
   * cascading setState that `react-hooks/set-state-in-effect` exists to catch.
   *
   * Compared on the serialised VALUES rather than on object identity: a refetch
   * produces a new object every time, and comparing identity would throw away
   * an operator's half-typed feed URL on every refresh. Comparing values resets
   * the draft only when the server's copy actually moved — which is precisely
   * when the draft is stale.
   */
  if (syncedKey !== savedKey) {
    setSyncedKey(savedKey);
    setDraft(JSON.parse(savedKey));
  }

  const dirty =
    JSON.stringify(draft) !== savedKey || keyInput.trim().length > 0 || clearKey;
  const feedField = provider.configFields.find((field) => field.type === "feedList");
  const feeds = feedField ? readFeeds(draft.config) : [];

  const busy = saving || testing || toggling;

  async function save() {
    setSaving(true);
    setActionError(null);
    const { error } = await $fetch({
      url: `/api/admin/system/news/provider/${provider.id}`,
      method: "PUT",
      body: {
        categories: draft.categories,
        fetchLimit: draft.fetchLimit,
        retentionDays: draft.retentionDays,
        config: draft.config,
        // Omitted entirely unless the operator typed one or pressed Clear —
        // sending `""` would wipe a working stored key on every unrelated save.
        ...(clearKey
          ? { apiKey: null }
          : keyInput.trim()
            ? { apiKey: keyInput.trim() }
            : {}),
      },
      silent: true,
    });
    setSaving(false);
    if (error) {
      setActionError(typeof error === "string" ? error : t("could_not_save_these_settings"));
      return;
    }
    // The box is emptied on success, never on failure: a rejected key the
    // operator can still see is a key they can correct, and one that vanished
    // is one they have to find again.
    setKeyInput("");
    setClearKey(false);
    // The saved values decide `ready`, so the whole row is re-read rather than
    // patched locally — an added feed URL, or a credential, can turn "needs
    // configuration" into "ready", and only the server knows that.
    await onChanged();
  }

  async function test() {
    setTesting(true);
    setActionError(null);
    setTestResult(null);
    const { data, error } = await $fetch<TestResult>({
      url: `/api/admin/system/news/provider/${provider.id}/test`,
      method: "POST",
      // The DRAFT, not the saved row: the point of the button is to check a
      // feed URL — or a credential — BEFORE committing it. An empty box falls
      // through to whatever is already stored, which is what makes Test
      // meaningful on a provider configured through .env.
      body: {
        config: draft.config,
        ...(clearKey
          ? { apiKey: null }
          : keyInput.trim()
            ? { apiKey: keyInput.trim() }
            : {}),
      },
      silent: true,
    });
    setTesting(false);
    if (error || !data) {
      setActionError(typeof error === "string" ? error : t("the_test_could_not_be_run"));
      return;
    }
    setTestResult(data);
  }

  async function toggle(next: boolean) {
    setToggling(true);
    setActionError(null);
    const { error } = await $fetch({
      url: `/api/admin/system/news/provider/${provider.id}/status`,
      method: "PUT",
      body: { status: next },
      silent: true,
    });
    setToggling(false);
    if (error) {
      // The server refuses an enable it cannot honour and says why. Showing
      // that sentence verbatim is the whole value — it names the missing
      // variable or the missing feed.
      setActionError(typeof error === "string" ? error : t("could_not_change_this_provider"));
      return;
    }
    await onChanged();
  }

  function setFeeds(next: RssFeed[]) {
    setDraft((current) => ({
      ...current,
      config: { ...current.config, feeds: next },
    }));
  }

  return (
    <div className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-muted-foreground shrink-0" />
              {provider.title}
            </CardTitle>
            <CardDescription className="mt-1">{provider.description}</CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {provider.status ? tCommon("enabled") : tCommon("disabled")}
            </span>
            <Switch
              checked={provider.status}
              disabled={busy || (!provider.ready && !provider.status)}
              onCheckedChange={(next) => void toggle(next)}
              aria-label={provider.title}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3">
          <StatusChip provider={provider} />
          {provider.tagsSymbols ? (
            <Badge variant="outline" className="gap-1">
              <Tag className="h-3 w-3 text-success" />
              {t("tags_instruments")}
            </Badge>
          ) : null}
          {provider.assetScope ? (
            <Badge variant="muted">{provider.assetScope}</Badge>
          ) : null}
          <Badge variant="outline" className="gap-1">
            <Newspaper className="h-3 w-3 text-muted-foreground" />
            {t("n_stories_stored", { count: provider.storedStories })}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-5">
        <CredentialBlock
          provider={provider}
          keyInput={keyInput}
          setKeyInput={setKeyInput}
          clearKey={clearKey}
          setClearKey={setClearKey}
          busy={busy}
        />
        <LastSync provider={provider} />

        {/* ---------------- settings ---------------- */}
        <div className="space-y-4 rounded-lg border border-border/60 p-4">
          {provider.categoryLabel ? (
            <div className="space-y-2">
              <Label>{provider.categoryLabel}</Label>
              <TagInput
                value={draft.categories}
                onChange={(categories) =>
                  setDraft((current) => ({ ...current, categories }))
                }
                maxTags={25}
                disabled={busy}
                placeholder={
                  provider.categoryOptions.length > 0
                    ? provider.categoryOptions.slice(0, 4).join(", ")
                    : undefined
                }
              />
              {provider.categoryOptions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {provider.categoryOptions
                    .filter((option) => !draft.categories.includes(option))
                    .map((option) => (
                      <button
                        key={option}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            categories: [...current.categories, option],
                          }))
                        }
                        className="rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
                      >
                        + {option}
                      </button>
                    ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{provider.categoryHelp}</p>
            </div>
          ) : null}

          {provider.configFields.map((field) =>
            field.type === "select" ? (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Select
                  disabled={busy}
                  value={String(draft.config?.[field.key] ?? "__any")}
                  onValueChange={(value) =>
                    setDraft((current) => {
                      const config = { ...current.config };
                      // "Any" is the ABSENCE of the key, not a value called
                      // "any" — the server drops unrecognised keys and the
                      // vendor treats an empty parameter as a filter matching
                      // nothing.
                      if (value === "__any") delete config[field.key];
                      else config[field.key] = value;
                      return { ...current, config };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">{t("any_no_filter")}</SelectItem>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{field.help}</p>
              </div>
            ) : null
          )}

          {feedField ? (
            <div className="space-y-2">
              <Label>{feedField.label}</Label>
              <div className="space-y-2">
                {feeds.map((feed, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <Input
                      className="flex-1 min-w-[220px]"
                      value={feed.url}
                      disabled={busy}
                      placeholder="https://example.com/feed"
                      onChange={(event) => {
                        const next = [...feeds];
                        next[index] = { ...next[index], url: event.target.value };
                        setFeeds(next);
                      }}
                    />
                    <Input
                      className="w-40"
                      value={feed.category ?? ""}
                      disabled={busy}
                      placeholder={tCommon("category")}
                      onChange={(event) => {
                        const next = [...feeds];
                        next[index] = {
                          ...next[index],
                          category: event.target.value || undefined,
                        };
                        setFeeds(next);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      aria-label={tCommon("remove")}
                      onClick={() => setFeeds(feeds.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setFeeds([...feeds, { url: "" }])}
              >
                <Plus className="h-4 w-4" />
                {t("add_a_feed")}
              </Button>
              <p className="text-xs text-muted-foreground">{feedField.help}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`limit-${provider.id}`}>{t("stories_per_run")}</Label>
              <Input
                id={`limit-${provider.id}`}
                type="number"
                min={1}
                max={500}
                disabled={busy}
                value={draft.fetchLimit}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    fetchLimit: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`retention-${provider.id}`}>{t("keep_stories_for_days")}</Label>
              <Input
                id={`retention-${provider.id}`}
                type="number"
                min={1}
                max={3650}
                disabled={busy}
                value={draft.retentionDays}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    retentionDays: Number(event.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t("desk_authored_stories_are_never_pruned")}
              </p>
            </div>
          </div>
        </div>

        {/* ---------------- results ---------------- */}
        {actionError ? (
          <p className="flex items-start gap-2 text-sm">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            <span className="text-foreground">{actionError}</span>
          </p>
        ) : null}

        {testResult ? (
          <p className="flex items-start gap-2 text-sm">
            {testResult.valid ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
            ) : (
              <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
            )}
            <span className="text-foreground break-words">{testResult.message}</span>
          </p>
        ) : null}
      </CardContent>

      {/* ---------------- actions ---------------- */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-4">
        <Button variant="outline" size="sm" disabled={busy} onClick={() => void test()}>
          <FlaskConical className="h-4 w-4" />
          {testing ? `${tCommon("testing")}…` : tCommon("test")}
        </Button>
        <Button size="sm" disabled={busy || !dirty} onClick={() => void save()}>
          <Save className="h-4 w-4" />
          {saving ? `${tCommon("saving")}…` : t("save_settings")}
        </Button>
        {dirty ? (
          <span className="text-xs text-warning">{t("unsaved_changes")}</span>
        ) : null}

        <div className="ms-auto flex items-center gap-2">
          {provider.setup && provider.setup.steps.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSetup((open) => !open)}
            >
              <KeyRound className="h-4 w-4" />
              {t("setup_guide")}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showSetup && "rotate-180")}
              />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetail((open) => !open)}
          >
            {t("how_it_compares")}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showDetail && "rotate-180")}
            />
          </Button>
        </div>
      </div>

      {showSetup && provider.setup ? (
        <div className="border-t border-border/60 p-4 space-y-3">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {provider.setup.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {provider.setup.signupUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={provider.setup.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tCommon("sign_up")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            {provider.setup.consoleUrl &&
            provider.setup.consoleUrl !== provider.setup.signupUrl ? (
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={provider.setup.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("open_vendor_console")}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showDetail ? (
        <div className="border-t border-border/60 p-4 grid gap-3 sm:grid-cols-2 text-sm">
          <DetailRow label={tCommon("cost")} value={provider.cost} detail={provider.costDetail} />
          <DetailRow label={t("best_for")} value={provider.bestFor} />
          <DetailRow label={t("limitations")} value={provider.limitations} />
          <DetailRow label={t("redistribution")} value={provider.redistribution} />
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | null;
  detail?: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

/**
 * The one chip that says whether this provider can do anything.
 *
 * Four states, not two, because the fix for each is in a different place:
 * unimplemented is ours, a missing credential is in .env, a config problem is
 * on this page, and ready means press the switch.
 */
function StatusChip({ provider }: { provider: NewsProvider }) {
  const t = useTranslations("dashboard_admin");

  if (!provider.adapterAvailable) {
    return (
      <Badge variant="outline" className="gap-1">
        <XCircle className="h-3 w-3 text-destructive" />
        {t("adapter_unavailable")}
      </Badge>
    );
  }
  if (provider.missingCredentials.length > 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <KeyRound className="h-3 w-3 text-warning" />
        {t("needs_credentials")}
      </Badge>
    );
  }
  if (provider.configProblem) {
    return (
      <Badge variant="outline" className="gap-1">
        <AlertTriangle className="h-3 w-3 text-warning" />
        {t("needs_configuration")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <CheckCircle2 className="h-3 w-3 text-success" />
      {t("ready_to_run")}
    </Badge>
  );
}

/**
 * Where this provider's credential comes from, and the field that sets one.
 *
 * TWO DOORS, AND THE SCREEN SAYS WHICH ONE IS OPEN. A credential can be stored
 * on the row (typed here) or supplied by the environment, and the stored one
 * wins. An operator with a forgotten `.env` line and a freshly pasted key needs
 * to know which is actually being sent — that ambiguity is the whole reason
 * this states the source rather than just showing a tick.
 *
 * THE FIELD IS WRITE-ONLY. The server never returns a stored credential, so
 * there is nothing to prefill: an empty box over "a key is stored" means "leave
 * it alone", typing replaces it, and Clear removes it. Rendering dots to
 * simulate a value would imply the secret had been sent to the browser.
 */
function CredentialBlock({
  provider,
  keyInput,
  setKeyInput,
  clearKey,
  setClearKey,
  busy,
}: {
  provider: NewsProvider;
  keyInput: string;
  setKeyInput: (value: string) => void;
  clearKey: boolean;
  setClearKey: (value: boolean) => void;
  busy: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  if (provider.requiredCredentials.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        {t("no_credentials_needed")}
      </p>
    );
  }

  const envVar = provider.requiredCredentials[0];

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm">
        {provider.credentialSource === "none" ? (
          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        )}
        <span className="text-foreground">
          {provider.credentialSource === "stored"
            ? t("using_the_key_saved_here")
            : provider.credentialSource === "environment"
              ? t("using_the_key_from_the_environment")
              : t("no_credential_configured")}
        </span>
      </p>

      {/*
        Named even when it is not the source in use, because it is half the
        answer to "where do I put this?" — and when a stored key IS in use it
        is the thing an operator needs to know is being overridden.
      */}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <KeyRound className="h-3.5 w-3.5 shrink-0" />
        <code className="font-mono">{envVar}</code>
        <span>
          {provider.missingCredentials.includes(envVar)
            ? t("not_set_in_env")
            : provider.credentialSource === "stored"
              ? t("set_but_overridden_by_the_key_here")
              : t("set_in_env")}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="password"
          className="flex-1 min-w-[220px]"
          autoComplete="off"
          disabled={busy || clearKey}
          value={keyInput}
          onChange={(event) => setKeyInput(event.target.value)}
          placeholder={
            provider.hasStoredKey
              ? t("a_key_is_saved_type_to_replace_it")
              : t("paste_the_vendor_key")
          }
        />
        {provider.hasStoredKey && !clearKey ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              setKeyInput("");
              setClearKey(true);
            }}
          >
            {t("clear_saved_key")}
          </Button>
        ) : null}
        {clearKey ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setClearKey(false)}
          >
            {tCommon("cancel")}
          </Button>
        ) : null}
      </div>

      {clearKey ? (
        <p className="flex items-start gap-2 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
          <span className="text-foreground">
            {t("the_saved_key_will_be_removed_on_save")}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("stored_here_it_overrides_the_env_var")}
        </p>
      )}

      {provider.configProblem ? (
        <p className="flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
          <span className="text-foreground">{provider.configProblem}</span>
        </p>
      ) : null}
    </div>
  );
}

/** What happened the last time this provider ran, in a sentence. */
function LastSync({ provider }: { provider: NewsProvider }) {
  const t = useTranslations("dashboard_admin");

  if (!provider.lastSyncAt || !provider.lastSyncStatus) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0" />
        {t("has_not_run_yet")}
      </p>
    );
  }

  const icon =
    provider.lastSyncStatus === "OK" ? (
      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
    ) : provider.lastSyncStatus === "ERROR" ? (
      <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
    ) : (
      // EMPTY and SKIPPED are not failures. A vendor with nothing new is a
      // normal Sunday, and a skipped provider has already said why in the chip
      // above — colouring either one red would train an operator to ignore red.
      <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
    );

  return (
    <p className="flex items-start gap-2 text-sm">
      {icon}
      <span className="text-muted-foreground break-words">
        <span className="text-foreground">
          {relativeTime(provider.lastSyncAt, t)}
        </span>
        {" — "}
        {provider.lastSyncMessage}
      </span>
    </p>
  );
}
