"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/layout/page-shell";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useAiSupport } from "@/lib/support/use-ai-support";

import { SupportMasthead, RailStat } from "../components/masthead";

/**
 * Raising a conversation — a PAGE, not a dialog.
 *
 * ---------------------------------------------------------------------------
 * WHY THE MODAL WENT
 * ---------------------------------------------------------------------------
 * The form has four fields, one of which is the actual problem description, and
 * it lived in a `sm:max-w-[500px]` dialog with a 120px textarea. That is the
 * wrong container for the longest thing a customer will write on this platform:
 *
 *   - A modal cannot be linked to. Every "contact support" affordance elsewhere
 *     in the app had to send people to a list page and hope they found the
 *     button, and an empty state could not deep-link to the thing it was
 *     telling them to do.
 *   - Browser-back inside a modal leaves the page, discarding what they typed.
 *     A route makes back mean back.
 *   - On a phone a dialog with a keyboard open leaves roughly one visible line
 *     of the description field.
 *   - There was nowhere to put the two things that actually reduce ticket
 *     volume — pick the right priority, and know a chat may be faster — without
 *     making the modal taller than the viewport.
 *
 * ---------------------------------------------------------------------------
 * PRIORITY IS A RADIO GROUP, NOT A SELECT
 * ---------------------------------------------------------------------------
 * Self-declared priority converges on everything being HIGH, and the backend
 * knows it — `triageNewTicket` re-classifies the ticket precisely because this
 * field is customer-supplied (see `(ext)/ai/support/utils/trigger.ts`). A
 * collapsed select shows one option and hides the consequence of the other two;
 * three cards showing what each level MEANS is the cheapest honesty available
 * here, and it costs no extra request.
 */

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface Suggestion {
  question: string;
  answer: string;
  breadcrumb: string;
  sourceKind: string;
}

/**
 * Long enough that the customer has expressed an intent, short enough that the
 * answer appears while they are still deciding what to type rather than after
 * they have finished the whole form.
 */
const SUGGEST_DEBOUNCE_MS = 450;

export default function NewSupportTicketPage() {
  const t = useTranslations("common");
  const tTicket = useTranslations("support_ticket");
  const router = useRouter();
  const gate = useKycGate("support_ticket");
  const ai = useAiSupport();

  const [subject, setSubject] = useState("");
  const [importance, setImportance] = useState<Priority>("LOW");

  /*
   * The labels are built HERE, from literal `t("key")` calls.
   *
   * The i18n manifest generator scrapes literal calls out of the source, so a
   * key assembled at runtime — `t(option.value.toLowerCase())` — is silently
   * absent from the production bundle and renders as the raw key. Holding the
   * table in a module constant and interpolating into it is the same trap with
   * extra steps.
   */
  const priorities: Array<{ value: Priority; label: string; hint: string }> = [
    { value: "LOW", label: t("low"), hint: tTicket("low_general_inquiry") },
    {
      value: "MEDIUM",
      label: t("medium"),
      hint: tTicket("medium_affects_workflow"),
    },
    { value: "HIGH", label: t("high"), hint: tTicket("high_critical_issue") },
  ];
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0;

  /*
   * ---- the answer offered before the ticket exists -----------------------
   *
   * THE CHEAPEST TICKET IS THE ONE NOBODY FILES.
   *
   * As the subject line is typed, the direct-answer path runs against it and
   * the operator's own article is offered when it unmistakably answers the
   * question. No AI call is made — it is a search over an in-memory index plus
   * an identity check — so this can run on a keystroke without costing the
   * operator anything or making the form feel slow.
   *
   * The suggestion NEVER blocks the form, is never modal, and the create button
   * is never disabled or de-emphasised while it is on screen. A deflection
   * feature that makes filing harder is a complaints feature; the whole value
   * is in being right often enough to be worth reading, which is why the bar
   * for showing anything is the verbatim-answer bar and not something looser.
   */
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [resolved, setResolved] = useState(false);
  /*
   * A REF, not state, and that is not an optimisation.
   *
   * The id is only ever read inside event handlers — `submit` and the two
   * buttons — and never rendered. Holding it in state would re-render the whole
   * form on every debounced suggestion fetch while the customer is typing, for
   * a value nothing on screen depends on.
   */
  const suggestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ai.tickets || dismissed || resolved) return;

    const query = subject.trim();
    if (query.length < 12) {
      setSuggestion(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await $fetch<{
        id: string | null;
        suggestion: Suggestion | null;
      }>({
        url: `/api/ai/support/suggest?q=${encodeURIComponent(query)}`,
        silent: true,
      });
      if (cancelled) return;
      setSuggestion(data?.suggestion ?? null);
      suggestionIdRef.current = data?.id ?? null;
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [subject, ai.tickets, dismissed, resolved]);

  /** Fire-and-forget: an analytics write must never delay or fail the form. */
  const recordOutcome = (outcome: "RESOLVED" | "FILED") => {
    const id = suggestionIdRef.current;
    if (!id) return;
    void $fetch({
      url: `/api/ai/support/suggest/${id}`,
      method: "PUT",
      body: { outcome },
      silent: true,
    });
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    // Recorded BEFORE the ticket call, and deliberately not awaited. "We offered
    // and they filed anyway" is the signal that finds an article which looks
    // right to search and reads wrong to a person — nothing else in the system
    // can see that, because every machine-side score says the match was
    // excellent.
    if (suggestion) recordOutcome("FILED");
    setSubmitting(true);
    const { data, error } = await $fetch<{ id: string }>({
      url: "/api/user/support/ticket",
      method: "POST",
      body: {
        subject: subject.trim(),
        importance,
        message: message.trim(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
      successMessage: t("ticket_created"),
    });
    setSubmitting(false);

    // Straight into the conversation they just opened, not back to a list where
    // they have to find it. On failure the form keeps everything they typed.
    if (!error && data?.id) {
      router.push(`/support/ticket/${data.id}` as any);
    }
  };

  if (gate.state === "loading" || gate.state === "anonymous") return null;
  if (!gate.allowed) {
    return (
      <KycRequiredNotice
        feature="support_ticket"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }

  return (
    <PageShell
      width="default"
      rhythm="md"
      header={
        <SupportMasthead
          rail={
            <>
              <RailStat label={t("new_conversation_rail")} tone="ok" />
              {ai.tickets ? (
                <RailStat label={tTicket("assistant_answers_first")} tone="ok" />
              ) : null}
            </>
          }
          title={t("new_ticket")}
          description={tTicket("new_ticket_description")}
          actions={
            <Button asChild variant="outline">
              <Link href="/support">
                <ArrowLeft className="mr-2 size-4" />
                {t("back_to_support")}
              </Link>
            </Button>
          }
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- the form ------------------------------------------------ */}
        <Card padding="lg" className="space-y-6 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="subject">{t("subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={tTicket("brief_description_of_your_issue")}
              autoFocus
            />
          </div>

          {/* Directly under the subject field, because that is what produced
              it and the connection has to be obvious. Below the fold it would
              read as an unrelated help panel and be ignored. */}
          {suggestion && !dismissed ? (
            resolved ? (
              <Card
                variant="dashed"
                padding="lg"
                className="border-success/30 flex items-start gap-3"
              >
                <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0 space-y-2">
                  <p className="text-sm font-medium">{tTicket("suggestion_glad")}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/support">{t("back_to_support")}</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <Card tone="info" padding="lg" className="space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="text-info mt-0.5 size-4 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{suggestion.question}</p>
                    <p className="text-subtle-foreground mt-0.5 font-mono text-[10px] tracking-wider uppercase">
                      {suggestion.breadcrumb}
                    </p>
                  </div>
                </div>
                {/* The operator's own words, not a paraphrase. Nothing generated
                    it and nothing rewrote it. */}
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {suggestion.answer}
                </p>
                <div className="border-border flex flex-wrap items-center gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      recordOutcome("RESOLVED");
                      setResolved(true);
                    }}
                  >
                    <CheckCircle2 className="mr-2 size-3.5" />
                    {tTicket("suggestion_answered")}
                  </Button>
                  {/* Never de-emphasised. The form below is still fully usable
                      and this only closes the panel. */}
                  <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                    {tTicket("suggestion_not_it")}
                  </Button>
                </div>
              </Card>
            )
          ) : null}

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">{t("priority")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {priorities.map((option) => {
                const selected = importance === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setImportance(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "focus-visible:ring-ring/50 rounded-lg border px-3 py-2.5 text-start transition-colors focus-visible:ring-[3px] focus-visible:outline-hidden",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border-strong"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {/* The selected state is a filled ring AND a border
                          change — never colour alone, which is unreadable for
                          anyone who cannot separate the two hues. */}
                      <span
                        className={cn(
                          "grid size-3.5 shrink-0 place-items-center rounded-full border",
                          selected
                            ? "border-primary"
                            : "border-border-strong"
                        )}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="bg-primary size-1.5 rounded-full" />
                        ) : null}
                      </span>
                      <span className="text-sm font-medium">
                        {option.label}
                      </span>
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="message">{tTicket("what_happened")}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`${tTicket(
                "please_provide_details_about_your_issue"
              )}…`}
              className="min-h-56 resize-y"
            />
            <p className="text-subtle-foreground text-xs">
              {tTicket("attachments_after_note")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">{tTicket("tags_comma_separated")}</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={tTicket("e_g_billing_account_feature_request")}
            />
          </div>

          <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t pt-4">
            <Button asChild variant="ghost">
              <Link href="/support">{t("cancel")}</Link>
            </Button>
            <Button onClick={submit} disabled={!canSubmit || submitting}>
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {tTicket("create_ticket")}
            </Button>
          </div>
        </Card>

        {/* ---- the aside ------------------------------------------------
            Two things that genuinely change the outcome: what to include, and
            the fact that a chat may be faster. Neither fitted in the modal. */}
        <div className="space-y-4">
          <Card padding="lg" className="space-y-3">
            <h2 className="text-subtle-foreground font-mono text-[11px] tracking-wider uppercase">
              {tTicket("helps_us_answer_faster")}
            </h2>
            <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
              <li className="flex gap-2">
                <span className="bg-muted-foreground/40 mt-1.5 size-1 shrink-0 rounded-full" />
                {tTicket("tip_what_you_expected")}
              </li>
              <li className="flex gap-2">
                <span className="bg-muted-foreground/40 mt-1.5 size-1 shrink-0 rounded-full" />
                {tTicket("tip_ids")}
              </li>
              <li className="flex gap-2">
                <span className="bg-muted-foreground/40 mt-1.5 size-1 shrink-0 rounded-full" />
                {tTicket("tip_when")}
              </li>
            </ul>
          </Card>

          <Card padding="lg" className="space-y-3">
            <h2 className="text-subtle-foreground font-mono text-[11px] tracking-wider uppercase">
              {tTicket("in_a_hurry")}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {tTicket("live_chat_may_be_faster")}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("openLiveChat", { detail: {} })
                )
              }
            >
              <MessageCircle className="mr-2 size-4" />
              {t("start_live_chat")}
            </Button>
          </Card>

          {ai.tickets ? (
            <p className="text-muted-foreground border-border flex items-start gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs leading-relaxed">
              <Sparkles
                className="text-info mt-0.5 size-3.5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0">
                {tTicket("assistant_first_reply_note")}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
