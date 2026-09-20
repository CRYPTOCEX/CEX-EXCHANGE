"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  BookOpen,
  Check,
  CheckCircle2,
  Loader2,
  Lock,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { $fetch } from "@/lib/api";
import { RichText } from "./rich-text";
import { AiBadge } from "./ai-badge";
import { sourceKey, splitSourceTitle } from "@/lib/support/resolution";
import { notifyWorkflowChanged } from "@/lib/support/workflow-signal";
import {
  catalogueText,
  guideTitleKey,
  operationKey as operationMessageKey,
  workflowStepKey,
  workflowTitleKey,
} from "@/lib/support/catalogue-text";
import { useGuidanceStore } from "@/store/guidance";
import type {
  SupportBubbleMessage,
  SupportGuide,
  SupportOperation,
  SupportWorkflow,
  SupportWorkflowStep,
} from "@/lib/support/types";

/**
 * The one support message bubble.
 *
 * There were three copy-pasted renderers — the customer's ticket page, the
 * floating live-chat widget, and the admin thread — with three different
 * bubbles, three different attachment handlers, and only ONE of them able to
 * render a system message at all. Anything added to one silently failed to
 * appear in the other two, which is precisely how an AI badge becomes a
 * compliance problem: shipped on one surface, absent on the others.
 *
 * `sender` is derived from the message's own `type`, never from a name string.
 */

/*
 * The message types live in `lib/support/types.ts`, which has no imports.
 *
 * They were declared here, and `lib/support/messages.ts` — pure data, no React
 * — imported them from this file, which meant importing a module that pulls in
 * next-intl, next/navigation and the UI kit. Re-exported so existing consumers
 * of this module are unaffected.
 */
export type {
  SupportAction,
  SupportBubbleMessage,
  SupportCitation,
  SupportStep,
  SupportWorkflow,
} from "@/lib/support/types";

export interface MessageBubbleProps {
  message: SupportBubbleMessage;
  /** True when the viewer authored it — mirrors the bubble to the end. */
  isOwn: boolean;
  /** Customer avatar, for the non-own side on the admin surface. */
  counterpartAvatar?: string | null;
  counterpartName?: string;
  /**
   * The assistant's configured picture, when the operator has set one.
   *
   * Separate from `counterpartAvatar` ON PURPOSE — see `avatarFor` below. An AI
   * message must never resolve to a human being's photograph.
   */
  personaAvatar?: string | null;
  /** Show 👍/👎 under AI answers. Off in the admin thread. */
  allowFeedback?: boolean;
  /**
   * The conversation this bubble belongs to.
   *
   * Only used by `WorkflowCard`, which asks the server what step is actually
   * outstanding rather than trusting the snapshot persisted on the message. A
   * surface that does not pass it still renders the snapshot — correct on the
   * turn it was written, stale after a reload.
   */
  ticketId?: string;
  /**
   * How the furniture around a message is presented.
   *
   * `inline` (default) is what all three surfaces have always done: citation
   * chips and action pills render under the bubble.
   *
   * `reference` collapses both into ONE strip that hands off to a surface which
   * has room for them — the ticket page's resolution pane, where a citation is
   * a card with its quote visible instead of a 10px chip whose only affordance
   * is a `title=` tooltip.
   *
   * A FOURTH AXIS, NOT A FORK. This file is the single renderer for three
   * surfaces, and citations, actions and the AI badge reaching all three is
   * compliance history rather than styling — a second copy is precisely how the
   * badge once shipped on the operator's screen and on none of the customer's.
   * The floating widget and the admin thread pass nothing and are unaffected.
   */
  decorations?: "inline" | "reference";
  /**
   * Open the pane on this message's references. Only called in `reference`
   * mode; without it the strip is not rendered at all, because a control that
   * hands off to nowhere is worse than the chips it replaced.
   */
  onOpenReferences?: (target: "sources" | "actions") => void;
  className?: string;
}

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Whose picture goes on this bubble.
 *
 * ---------------------------------------------------------------------------
 * THE ASSISTANT WORE A HUMAN AGENT'S FACE
 * ---------------------------------------------------------------------------
 * This used to be one expression:
 *
 *   message.agentProfile?.avatar || counterpartAvatar || undefined
 *
 * An AI message carries no `agentProfile` — nobody wrote it — so it fell
 * through to `counterpartAvatar`, which on the customer's ticket page is
 * `ticket.agent.avatar`: THE PHOTOGRAPH OF THE HUMAN SUPPORT AGENT ASSIGNED TO
 * THE TICKET. On the admin inbox the same fallback resolved to the CUSTOMER's
 * avatar. So the one surface where the difference between a person and a
 * program is the entire point drew them with the same face, and the AI badge —
 * eleven pixels of text next to a photo of a real employee — was the only thing
 * distinguishing them.
 *
 * The disclosure rules in `ai-badge.tsx` exist to stop exactly this. A badge
 * cannot do its job while the avatar is actively contradicting it.
 *
 * So the three authors are now three distinct visual identities, and the AI's
 * is derived only from AI sources:
 *
 *   AI     the operator's configured persona picture, or a bot glyph. NEVER a
 *          photograph belonging to a person, under any fallback.
 *   human  their own profile picture, then the surface's counterpart avatar,
 *          then their initials.
 *   system the interface — no avatar at all; it renders as a centred chip.
 */
function avatarFor(
  message: SupportBubbleMessage,
  personaAvatar?: string | null,
  counterpartAvatar?: string | null
): string | undefined {
  if (message.ai) return personaAvatar || undefined;
  return message.agentProfile?.avatar || counterpartAvatar || undefined;
}

export function MessageBubble({
  message,
  isOwn,
  counterpartAvatar,
  counterpartName,
  personaAvatar,
  allowFeedback = false,
  ticketId,
  decorations = "inline",
  onOpenReferences,
  className,
}: MessageBubbleProps) {
  const t = useTranslations("support_ticket");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [vote, setVote] = useState<boolean | null>(null);
  const [voting, setVoting] = useState(false);

  const referenced = decorations === "reference" && Boolean(onOpenReferences);

  /*
   * Counted with the SAME dedupe rule the pane uses (`sourceKey`), so a bubble
   * that says "2 sources" cannot sit beside a pane showing three cards for it.
   * Two rules here would make both numbers untrustworthy.
   */
  /*
   * ONE CHIP PER DOCUMENT, and the chip says what the document is called.
   *
   * Both halves were wrong, and a live ticket showed it: a four-passage answer
   * arrived with four citations carrying the IDENTICAL sourceId, url and title,
   * and this list rendered four identical chips reading
   *
   *   p2p › Help › Posting your own P2P…
   *
   * Four of them, each truncated at 12rem — so the row was four copies of the
   * least informative half of one string. The part that says what the document
   * ANSWERS ("Nobody is taking my offer") is the last segment, and it was the
   * part cut off.
   *
   * The retrieval layer citing several passages of one article is correct and
   * common; presenting them as several sources is not. `sourceKey` is the same
   * identity the pane and the count below already use, so a bubble on the admin
   * surface and a card on the customer's cannot disagree about how many
   * documents an answer rested on.
   */
  const chips: Array<{ key: string; label: string; title: string; url?: string }> = [];
  const seenChip = new Set<string>();
  for (const citation of message.citations ?? []) {
    // `sourceKey` already falls back through url, title and quote.
    const key = sourceKey(citation);
    if (!key || seenChip.has(key)) continue;
    seenChip.add(key);
    const full = citation.title || "";
    chips.push({
      key,
      label: splitSourceTitle(full).title,
      // The whole chain stays reachable on hover — it is the trail, and on a
      // chip there is nowhere to draw it.
      title: full || citation.quote || "",
      url: citation.url,
    });
  }

  const referenceCounts = {
    sources: chips.length,
    actions: (message.actions ?? []).filter((a) => a?.url && a?.label).length,
  };

  // ---- system notice ------------------------------------------------------
  // The interface speaking, not a participant: status changes, handover
  // notices and closure reasons.
  //
  // In `reference` mode this is a full-width LIFECYCLE RULE rather than a
  // centred pill, because on the ticket page the handover is a turning point in
  // the case — the moment the assistant stood down — and a small grey pill
  // floating mid-column reads as an aside. The pill stays everywhere else: the
  // floating widget is ~320px wide, where a rule with hairlines either side has
  // nowhere to go.
  if (message.system) {
    if (referenced) {
      return (
        <div className={cn("my-4 flex items-center gap-3 px-1", className)}>
          {/*
           * THE HAIRLINES SHRINK, THE SENTENCE WRAPS — never the other way
           * round.
           *
           * `shrink-0` on the text made the row's min-content width the width
           * of the whole unwrapped sentence. A short notice looked right; a
           * long one ("Fees depend on the currency and the network…") pushed
           * the thread column wider than the viewport and put a horizontal
           * scrollbar on the page, dragging the pane off-screen with it.
           *
           * So the text may shrink and wrap (`min-w-0`, capped so it stays a
           * readable measure) and the rules keep a 1rem floor so the notice
           * still reads as a lifecycle rule rather than as loose text.
           */}
          <span className="bg-border h-px w-4 shrink-0 grow" aria-hidden />
          <span className="text-muted-foreground min-w-0 max-w-md text-center text-[11px] leading-relaxed text-balance">
            {message.text}
          </span>
          <span className="bg-border h-px w-4 shrink-0 grow" aria-hidden />
        </div>
      );
    }
    return (
      <div className={cn("my-3 flex justify-center px-4", className)}>
        <div className="max-w-lg rounded-full border border-border bg-muted/50 px-3 py-1.5 text-center text-xs text-muted-foreground">
          {message.text}
        </div>
      </div>
    );
  }

  const isAi = Boolean(message.ai);

  /*
   * ---------------------------------------------------------------------------
   * THE ASSISTANT IS NEVER "YOU"
   * ---------------------------------------------------------------------------
   * The solid `bg-primary` plate means one thing: THIS SIDE WROTE IT. On the
   * customer's surfaces `own` is `client`, so the assistant never landed on it
   * and the `isAi` branch below did its job. The admin inbox passes
   * `isOwn={message.type !== "client"}` — every staff message, and the
   * assistant writes `type: "agent"` — so on the one screen whose entire
   * purpose is deciding whether to take a conversation over, the assistant and
   * the operator's colleague were painted in the same colour, and the `isAi`
   * branch was unreachable.
   *
   * That is the same collapse `avatarFor` above exists to prevent, one layer
   * out: an eleven-pixel badge is not enough to say "a program wrote this" when
   * the plate underneath it says "we did".
   *
   * It is also why the links were invisible. The assistant's answer is the only
   * message that contains links, citation markers and structure, and `bg-primary`
   * is the one plate this product's `text-primary` accent disappears into.
   * Splitting the FILL from the SIDE fixes both at once — the assistant keeps
   * its place on the staff side of the thread and gets its own identity back.
   */
  const filled = isOwn && !isAi;

  const name =
    message.senderName ||
    [message.agentProfile?.firstName, message.agentProfile?.lastName]
      .filter(Boolean)
      .join(" ") ||
    counterpartName ||
    (message.type === "client" ? tCommon("You") : tCommon("support"));

  const avatar = avatarFor(message, personaAvatar, counterpartAvatar);

  const submitVote = async (helpful: boolean) => {
    if (!message.turnId || voting) return;
    setVoting(true);
    // Optimistic: the vote is a low-stakes signal and a spinner on a thumb reads
    // as a broken button.
    setVote(helpful);
    const { error } = await $fetch({
      url: "/api/ai/support/feedback",
      method: "POST",
      body: { turnId: message.turnId, isHelpful: helpful },
      silent: true,
    });
    if (error) setVote(null);
    setVoting(false);
  };

  return (
    <div
      className={cn(
        "flex w-full gap-2.5",
        isOwn ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      <Avatar
        className={cn(
          "mt-0.5 size-8 shrink-0",
          isAi && "ring-1 ring-info/30"
        )}
      >
        {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
        {/*
         * A GLYPH FOR THE ASSISTANT, INITIALS FOR A PERSON.
         *
         * Initials are how this product draws human beings everywhere else, so
         * an unconfigured assistant fell back to a circled "A" — visually a
         * colleague whose name begins with A. The distinction the whole surface
         * is built around cannot rest on a hue.
         *
         * `aria-hidden` on the icon: the name and the AI badge beside the bubble
         * already carry the authorship for a screen reader, and a second
         * announcement of the same fact between every message is noise.
         */}
        <AvatarFallback
          className={cn(
            "text-[11px] font-medium",
            isAi && "bg-info/10 text-info"
          )}
        >
          {isAi ? <Bot className="size-4" aria-hidden /> : initials(name)}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "flex min-w-0 max-w-[min(42rem,80%)] flex-col gap-1",
          isOwn ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 px-0.5 text-[11px] text-muted-foreground",
            isOwn && "flex-row-reverse"
          )}
        >
          <span className="font-medium text-foreground/80">{name}</span>
          {isAi ? <AiBadge /> : null}
          <span aria-hidden>·</span>
          <time dateTime={message.time}>{formatTime(message.time)}</time>
        </div>

        <div
          className={cn(
            "w-full rounded-2xl px-3.5 py-2.5 text-sm",
            // The SIDE is still `isOwn` — the assistant sits with the staff.
            isOwn ? "rounded-br-md" : "rounded-bl-md",
            filled
              ? "bg-primary text-primary-foreground"
              : isAi
                ? "border border-info/20 bg-info/[0.06]"
                : "border border-border bg-card"
          )}
        >
          <RichText surface={filled ? "primary" : "default"}>
            {message.text}
          </RichText>

          {message.attachment ? (
            <a
              href={message.attachment}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-2 block overflow-hidden rounded-lg border",
                filled ? "border-primary-foreground/20" : "border-border"
              )}
            >
              {/* Uploads are image-only today; a broken src degrades to the alt
                  text rather than a browser icon. */}
              <img
                src={message.attachment}
                alt={t("attachment")}
                className="max-h-64 w-full object-cover"
                loading="lazy"
              />
            </a>
          ) : null}
        </div>

        {/* ---- numbered walkthrough ------------------------------------- */}
        {message.steps?.steps?.length ? (
          <div className="w-full rounded-xl border border-border bg-card/60 p-3">
            {message.steps.title ? (
              <p className="mb-2 text-xs font-semibold">{message.steps.title}</p>
            ) : null}
            <ol className="space-y-2">
              {message.steps.steps.map((step) => (
                <li key={step.n} className="flex gap-2.5 text-xs">
                  <span className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {step.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground/90">{step.text}</span>
                    {step.url ? (
                      <button
                        type="button"
                        onClick={() => router.push(step.url!)}
                        className="ms-1.5 inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {tCommon("open")}
                        <ArrowUpRight className="size-3" aria-hidden />
                      </button>
                    ) : null}
                    {/* A step whose route failed the server-side pre-flight
                        renders as TEXT with the prerequisite noted — never as a
                        dead button. */}
                    {step.blocked ? (
                      <span className="ms-1.5 inline-flex items-center gap-1 text-muted-foreground">
                        <Lock className="size-3" aria-hidden />
                        {step.blocked === "verification_required"
                          ? t("needs_verification")
                          : t("not_available")}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {/* ---- action buttons -------------------------------------------
            Every URL here was re-validated server-side against the route
            catalog before it was persisted. Navigation is client-side so the
            customer's session — and their place in the conversation — survives. */}
        {message.actions?.length && !referenced ? (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-full text-xs"
                onClick={() => router.push(action.url)}
              >
                {action.label}
                <ArrowUpRight className="size-3" aria-hidden />
              </Button>
            ))}
          </div>
        ) : null}

        {/* ---- something it offered to DO ---------------------------------
            NOT an action that has happened. The button is the only trigger
            there is: the model wrote a row in state PROPOSED and returned a
            description, and the operation runs — if it runs — through an
            ordinary authenticated route under the customer's own session.

            The label and the sentence are constants belonging to the operation,
            carried through from the backend allowlist. Nothing the model wrote
            appears here, because informed consent to a sentence the model
            composed would be consent to whatever an injected document wanted it
            to say. */}
        {message.operations?.length ? (
          <div className="space-y-1.5">
            {message.operations.map((operation) => (
              <ProposedOperation key={operation.id} operation={operation} />
            ))}
          </div>
        ) : null}

        {/* ---- a process, one step at a time -----------------------------
            The model started it and has no further part in it: confirming a
            step returns the NEXT one from the server, and this card replaces
            itself in place. So the whole process lives in one bubble instead of
            arriving as a new message per step. */}
        {message.workflow ? (
          <WorkflowCard workflow={message.workflow} ticketId={ticketId} />
        ) : null}

        {/* ---- a walkthrough on the customer's own screen -----------------
            The lightest card here: no id, no confirmation, no audit row,
            because a guide writes nothing. Pressing it stores the request and
            navigates; the host mounted in the layout starts the walkthrough
            once the destination has actually rendered, which is why this
            survives the navigation that unmounts this whole bubble. */}
        {message.guide ? <GuideCard guide={message.guide} /> : null}

        {/* ---- citations --------------------------------------------------
            Intersected server-side against the passages actually retrieved
            before being persisted, so a chip can never point at a document the
            model invented. */}
        {chips.length && !referenced ? (
          <div className="flex flex-wrap items-center gap-1">
            <BookOpen
              className="size-3 text-muted-foreground/70"
              aria-hidden
            />
            {chips.map((chip, i) =>
              chip.url ? (
                <a
                  key={chip.key}
                  href={chip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={chip.title || undefined}
                  className="inline-flex max-w-64 items-center gap-1 truncate rounded-full border border-border bg-muted/40 px-2 py-px text-[10px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <span className="truncate">
                    {chip.label || t("source", { n: i + 1 })}
                  </span>
                </a>
              ) : (
                <span
                  key={chip.key}
                  title={chip.title || undefined}
                  className="inline-flex max-w-64 items-center truncate rounded-full border border-border bg-muted/40 px-2 py-px text-[10px] text-muted-foreground"
                >
                  {chip.label || t("source", { n: i + 1 })}
                </span>
              )
            )}
          </div>
        ) : null}

        {/* ---- reference strip --------------------------------------------
            ONE control where there were up to eight chips and pills.

            It is a hand-off, not a summary: the pane has room to show a
            citation's `quote` — the passage the answer actually rested on,
            which in chip form was a `title=` tooltip and therefore invisible on
            every touch device the product ships to.

            The counts are PER MESSAGE and the pane's tab badges are PER TICKET,
            so the two legitimately differ on a thread where the assistant
            answered twice. That is why this says "in this reply". */}
        {referenced && (referenceCounts.sources || referenceCounts.actions) ? (
          <div className="flex items-center gap-2">
            <div className="border-border bg-card/60 inline-flex items-stretch overflow-hidden rounded-lg border">
              {referenceCounts.sources ? (
                <button
                  type="button"
                  onClick={() => onOpenReferences?.("sources")}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 px-2 py-1 text-[11px] transition-colors"
                >
                  <BookOpen className="size-3 shrink-0" aria-hidden />
                  {t("n_sources", { count: referenceCounts.sources })}
                </button>
              ) : null}
              {referenceCounts.sources && referenceCounts.actions ? (
                <span className="bg-border w-px" aria-hidden />
              ) : null}
              {referenceCounts.actions ? (
                <button
                  type="button"
                  onClick={() => onOpenReferences?.("actions")}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 px-2 py-1 text-[11px] transition-colors"
                >
                  <Zap className="size-3 shrink-0" aria-hidden />
                  {t("n_actions", { count: referenceCounts.actions })}
                </button>
              ) : null}
            </div>
            <span className="text-subtle-foreground text-[10px]">
              {t("in_this_reply")}
            </span>
          </div>
        ) : null}

        {/* ---- feedback ---------------------------------------------------- */}
        {allowFeedback && isAi && message.turnId ? (
          <div className="flex items-center gap-0.5">
            {vote === null ? (
              <>
                <button
                  type="button"
                  onClick={() => submitVote(true)}
                  aria-label={t("helpful")}
                  className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-success"
                >
                  <ThumbsUp className="size-3" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => submitVote(false)}
                  aria-label={t("not_helpful")}
                  className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-destructive"
                >
                  <ThumbsDown className="size-3" aria-hidden />
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                <Check className="size-3" aria-hidden />
                {t("thanks_for_feedback")}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * One offer, and the button that is the only way it ever runs.
 *
 * ---------------------------------------------------------------------------
 * THE SENTENCE ABOVE THE BUTTON IS A CONSTANT
 * ---------------------------------------------------------------------------
 * `description` belongs to the operation in the backend's allowlist and is
 * carried through untouched. The model chose WHICH operation and nothing else —
 * it did not write what the customer is agreeing to.
 *
 * That is the whole safety argument for the feature. If the model composed this
 * sentence, a prompt injection could describe one action while a different one
 * was queued, and the customer's informed consent would be consent to a fiction.
 *
 * Local state per card: the result replaces the button in place, because a
 * customer who pressed "resend the email" needs to know it was sent without
 * scrolling or waiting for a new message to arrive.
 */
/**
 * A process, drawn one step at a time.
 *
 * ---------------------------------------------------------------------------
 * THE CARD ADVANCES ITSELF; THE MODEL IS NOT ASKED
 * ---------------------------------------------------------------------------
 * Confirming a step PUTs to the same route a single offered action uses, and the
 * response carries the NEXT step — written server-side from a step list that
 * lives in code. So this component holds the current step in local state and
 * replaces it, rather than waiting for a new message to arrive.
 *
 * That matters for more than tidiness. A process legitimately spans days, and a
 * customer who confirms step 2 needs to see step 3 immediately rather than
 * discovering it after the assistant is next prompted — which, on a ticket
 * waiting for a human, might be never.
 *
 * Everything the customer reads is a CONSTANT belonging to the step definition.
 * The model chose which process; it did not write a word of what is being agreed
 * to. Same rule as `ProposedOperation`, and the same reason.
 *
 * A `route` step is a link, not a write. Pressing it records that the customer
 * went and then sends them to the product's own page, where the real controls
 * are — the assistant never fills a form on anybody's behalf.
 */
function WorkflowCard({
  workflow,
  ticketId,
}: {
  workflow: SupportWorkflow;
  ticketId?: string;
}) {
  const t = useTranslations("support_ticket");
  /*
   * The CHROME is `support_ticket`; the PAYLOAD is `support_assistant`. Two
   * namespaces because they have two authors — "Step 1 of 3" belongs to this
   * card, and everything else on it belongs to the backend catalogue. See
   * `lib/support/catalogue-text.ts` for why translating the payload leaves the
   * "the model authors none of this" property intact.
   */
  const ta = useTranslations("support_assistant");
  const router = useRouter();
  const [step, setStep] = useState<SupportWorkflowStep | null>(
    workflow.step ?? null
  );
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<OperationOutcome | null>(null);
  const [done, setDone] = useState(!workflow.step);
  /** Modal open, for a step whose `weight` is `"dialog"`. */
  const [confirming, setConfirming] = useState(false);
  const [total, setTotal] = useState(workflow.totalSteps ?? 0);
  /*
   * Held in state rather than read off the prop, because the prop is the blob
   * persisted on the message and the two later sources — the pending read below
   * and the confirm response — can both supply it. A transcript written before
   * the key was on the wire has no `workflowKey` at all, and picking it up from
   * a live response is what lets an old message still render translated.
   */
  const [workflowKey, setWorkflowKey] = useState<string | undefined>(
    workflow.workflowKey
  );

  /*
   * ---------------------------------------------------------------------------
   * THE PERSISTED BLOB IS THE FIRST PAINT, NOT THE TRUTH
   * ---------------------------------------------------------------------------
   * It is written onto the message exactly once, always with step index 0, and
   * nothing updates it — advancement lived only in the confirm response and in
   * this component's state. So a reload re-rendered step 1 of 2 holding the
   * step-0 row id, pressing it hit the terminal-state branch, and the card
   * marked itself done while the real outstanding step became unreachable.
   *
   * Which is the exact failure the feature exists to prevent: on
   * `redo_verification` the customer has already withdrawn their submission and
   * now has no route to "start again".
   *
   * So on mount the card asks the server what is actually outstanding. The blob
   * still paints immediately — it is correct for the turn it was written on and
   * avoids a spinner on the common path — and this supersedes it. A null answer
   * means the process has ended (finished, cancelled, expired), which is also
   * the truth and is rendered as such rather than as a live button.
   */
  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    (async () => {
      const { data } = await $fetch<{
        workflow?: {
          workflowKey?: string;
          totalSteps?: number;
          step?: SupportWorkflowStep | null;
        } | null;
      }>({
        url: `/api/ai/support/operation/pending?ticketId=${encodeURIComponent(ticketId)}`,
        silent: true,
      });
      if (cancelled || !data) return;
      const live = data.workflow ?? null;
      if (live?.step) {
        setStep(live.step);
        setDone(false);
        if (live.totalSteps) setTotal(live.totalSteps);
        if (live.workflowKey) setWorkflowKey(live.workflowKey);
      } else {
        // Nothing outstanding. Do not leave a button that cannot work.
        setStep(null);
        setDone(true);
      }
      /*
       * The rail lives above the router and cannot see this subtree, so opening
       * a ticket that already has a process running is the other half of the
       * "card does not show" report: the rail would not learn about it until its
       * next poll, up to a minute later. Fired on the reconcile rather than on
       * mount so it carries the SERVER's answer, including "this one has ended"
       * — which the rail needs just as much, to stop drawing it.
       */
      notifyWorkflowChanged();
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  /*
   * The step's `done` sentence, but only when that is provably what the server
   * just said.
   *
   * A step with a `route` is served by the SYNTHETIC runner in `workflows.ts`,
   * whose success message is `step.done || step.description` and nothing else —
   * so a COMPLETED outcome on a routed step is exactly a catalogue constant and
   * can be looked up by key. An `operation` step has no route and its message is
   * composed by the runner at run time ("Verification email sent.") from a state
   * this card cannot see; that is passed through untouched.
   *
   * Guarded on the STATE as much as on the route. A routed step that fails
   * returns a refusal — "That page is not available on your account right now" —
   * and substituting the `done` text there would tell the customer that a step
   * succeeded which did not.
   */
  const outcomeText = (
    confirmed: SupportWorkflowStep,
    state: string | undefined,
    message: string
  ): string => {
    if (state !== "COMPLETED" || !confirmed.route) return message;
    return catalogueText(
      ta,
      workflowStepKey(workflowKey, confirmed.stepKey, "done"),
      message
    );
  };

  const confirm = async () => {
    if (!step || busy) return;
    const confirmed = step;
    setBusy(true);
    const { data, error } = await $fetch<{
      message: string;
      state?: string;
      workflow?: {
        state?: string;
        workflowKey?: string;
        step?: SupportWorkflowStep | null;
      };
    }>({
      url: `/api/ai/support/operation/${step.id}`,
      method: "PUT",
      silent: true,
    });
    setBusy(false);

    if (error || !data) {
      /*
       * NOT `setDone(true)`. A failed PUT advances nothing — the step is still
       * outstanding server-side — and marking the process finished here was a
       * second lie on top of the green tick: on `redo_verification` it told a
       * customer whose submission was already withdrawn that the process had
       * ended, with no route back to "start again". Leave `step` standing so
       * the button below can be pressed again.
       */
      setOutcome({ ok: false, message: String(error || t("operation_failed")) });
      return;
    }

    if (data.workflow?.workflowKey) setWorkflowKey(data.workflow.workflowKey);
    /*
     * `data.state`, not "the request came back". `outcomeText` already refuses
     * to substitute the catalogue's `done` sentence unless the state is
     * COMPLETED, for exactly this reason; the icon now obeys the same fact
     * instead of asserting success over a refusal the customer is reading.
     */
    setOutcome({
      ok: data.state === "COMPLETED",
      message: outcomeText(confirmed, data.state, data.message),
    });
    /*
     * BEFORE the navigation below, not after. This component is about to be
     * unmounted by `router.push`; the rail is not, so it must be told while
     * there is still a component here to tell it.
     */
    notifyWorkflowChanged();
    const next = data.workflow?.step ?? null;
    if (next) {
      setStep(next);
    } else {
      setStep(null);
      setDone(true);
    }

    /*
     * Navigation happens AFTER the confirmation is recorded, not before.
     *
     * Pushing first would leave the request in flight while the page unmounts,
     * and the step would look complete to the customer while nothing had been
     * written — the one state this whole feature exists to make impossible.
     */
    if (step.route) router.push(step.route as any);
  };

  return (
    <div className="border-border bg-muted/30 w-full space-y-2 rounded-lg border px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold">
          {catalogueText(ta, workflowTitleKey(workflowKey), workflow.title)}
        </p>
        {step && total ? (
          <span className="text-subtle-foreground shrink-0 font-mono text-[10px] tabular-nums">
            {t("step_n_of_m", { n: step.index + 1, m: total })}
          </span>
        ) : null}
      </div>

      {outcome ? <OutcomeLine outcome={outcome} /> : null}

      {step ? (
        <>
          <p className="text-xs leading-relaxed">
            {catalogueText(
              ta,
              workflowStepKey(workflowKey, step.stepKey, "description"),
              step.description
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 rounded-full text-xs"
            disabled={busy}
            /*
             * A HEAVY STEP GETS THE MODAL TOO.
             *
             * `stepRunner` returns the SAME `OperationDefinition` object a
             * standalone offer resolves to, so `cancel_pending_kyc` is the same
             * write whether the customer met it on its own or as step 1 of
             * `redo_verification` — and `redo_verification` is exactly where they
             * meet it, mid-process, already in the rhythm of pressing Next.
             *
             * That rhythm is the reason this matters more here than on a lone
             * card: a process trains the customer that each button advances
             * things, and one of these buttons rejects their KYC application.
             *
             * Routed steps are always `"immediate"` — they write nothing.
             */
            onClick={() =>
              (step.weight ?? "dialog") === "dialog" && !step.route
                ? setConfirming(true)
                : confirm()
            }
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : step.route ? (
              <ArrowUpRight className="size-3" aria-hidden />
            ) : (
              <Check className="size-3" aria-hidden />
            )}
            {catalogueText(
              ta,
              workflowStepKey(workflowKey, step.stepKey, "label"),
              step.label
            )}
          </Button>

          {/* The same modal a standalone offer shows, restating the step's own
              constant. See `ProposedOperation` for why it repeats the sentence
              rather than summarising it. */}
          <Dialog
            open={confirming}
            onOpenChange={(next) => !busy && setConfirming(next)}
          >
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>{t("confirm_action_title")}</DialogTitle>
                <DialogDescription className="pt-1 leading-relaxed">
                  {catalogueText(
                    ta,
                    workflowStepKey(workflowKey, step.stepKey, "description"),
                    step.description
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  {t("confirm_action_cancel")}
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={busy}
                  onClick={() => {
                    setConfirming(false);
                    confirm();
                  }}
                >
                  {busy ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Check className="size-3.5" aria-hidden />
                  )}
                  {catalogueText(
                    ta,
                    workflowStepKey(workflowKey, step.stepKey, "label"),
                    step.label
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : done && !outcome ? (
        <p className="text-muted-foreground text-xs">{t("process_finished")}</p>
      ) : null}
    </div>
  );
}

/**
 * What came back from confirming a write, WITH the verdict attached.
 *
 * ---------------------------------------------------------------------------
 * A STRING CANNOT SAY WHETHER IT SUCCEEDED
 * ---------------------------------------------------------------------------
 * Both cards below used to keep the server's sentence in a bare `string` and
 * draw it under a green `CheckCircle2`, because `$fetch` resolves
 * `{ data, error }` and never throws — so `data?.message || String(error)`
 * collapsed the two outcomes into one variable the moment it was assigned, and
 * every later reader had lost the only fact that mattered.
 *
 * What that cost: a customer pressed "Resend verification email", the PUT
 * refused (410 expired, 403 no longer eligible) or the connection dropped, and
 * the card reported a green tick. The email was never sent. In
 * `ProposedOperation` it was worse than a wrong icon — the failure text
 * REPLACED the card, so the button that would have retried a still-valid offer
 * was gone from the tree and only a page reload brought it back.
 *
 * Keeping the verdict means the failure path can stay a failure: destructive
 * tone, and the control left standing.
 */
type OperationOutcome = {
  /**
   * True only on POSITIVE evidence of success — `state === "COMPLETED"`. Not
   * "a response arrived": the runner answers 200 with `state: "FAILED"` when
   * it refuses, which is exactly the case that used to draw the green tick.
   */
  ok: boolean;
  message: string;
  /**
   * The proposal row left PROPOSED, so pressing again can only return "This
   * has already been handled." False when the response never arrived at all —
   * the one case where the offer is still open and the button must survive.
   * Only `ProposedOperation` reads it; `WorkflowCard` keeps its step either
   * way because a workflow's own response tells it what is outstanding.
   */
  spent?: boolean;
};

/** The server's sentence under the icon its verdict actually earns. */
function OutcomeLine({ outcome }: { outcome: OperationOutcome }) {
  return (
    <div
      className="flex items-start gap-2"
      /* Announced, because on the failure path the card does not otherwise
         change shape — the button is deliberately still there — and a screen
         reader would report nothing at all after the press. */
      role="status"
    >
      {outcome.ok ? (
        <CheckCircle2 className="text-success mt-0.5 size-3.5 shrink-0" aria-hidden />
      ) : (
        <AlertCircle
          className="text-destructive mt-0.5 size-3.5 shrink-0"
          aria-hidden
        />
      )}
      <span
        className={cn(
          "text-xs leading-relaxed",
          outcome.ok ? "text-muted-foreground" : "text-destructive"
        )}
      >
        {outcome.message}
      </span>
    </div>
  );
}

function ProposedOperation({ operation }: { operation: SupportOperation }) {
  const t = useTranslations("support_ticket");
  // The chrome, and then the catalogue. See `WorkflowCard` for why they are two
  // namespaces and `lib/support/catalogue-text.ts` for why translating the
  // second one leaves the consent argument untouched.
  const ta = useTranslations("support_assistant");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<OperationOutcome | null>(null);

  /*
   * ABSENT MEANS `"dialog"`, and the direction of that default is the point.
   *
   * A transcript is readable forever, so this component renders cards persisted
   * long before `weight` was on the wire. Guessing `"immediate"` for those would
   * put whatever they are — including `cancel_pending_kyc`, which moves a
   * verification application to REJECTED — behind a single inline tap. Guessing
   * `"dialog"` costs one extra press on a historical card.
   */
  const heavy = (operation.weight ?? "dialog") === "dialog";

  const description = catalogueText(
    ta,
    operationMessageKey(operation.operationKey, "description"),
    operation.description
  );
  const label = catalogueText(
    ta,
    operationMessageKey(operation.operationKey, "label"),
    operation.label
  );

  async function confirm() {
    setBusy(true);
    /*
     * `state` is asked for because it is the VERDICT. A runner that refuses —
     * "That no longer applies to your account." — answers 200 with
     * `state: "FAILED"`, so a response arriving is not evidence that anything
     * happened; only `COMPLETED` is. Every return path in
     * `operation/[id]/index.put.ts` carries it.
     */
    const { data, error } = await $fetch<{ message: string; state?: string }>({
      url: `/api/ai/support/operation/${operation.id}`,
      method: "PUT",
      silent: true,
    });
    setBusy(false);
    setOpen(false);
    if (error || !data) {
      /*
       * The offer is very probably still PROPOSED on the server — a transport
       * drop wrote nothing, and a refusal (403 no longer eligible, 410 expired)
       * is the server telling this customer why, not a reason to take their
       * only control away. So the card stays whole and the button stays live;
       * the customer can read what went wrong and press it again.
       */
      setResult({
        ok: false,
        spent: false,
        message: String(error || t("operation_failed")),
      });
      return;
    }
    /*
     * The server's own message either way — it knows whether the KYC
     * application was approved in the meantime and this card does not. What
     * this card decides is only the ICON, and it decides it from `state`.
     */
    const ok = data.state === "COMPLETED";
    setResult({
      ok,
      spent: true,
      /*
       * THE FALLBACK FOLLOWS THE VERDICT TOO. Every 200 path in
       * `operation/[id]/index.put.ts` carries a sentence, but a runner that
       * returned `{ ok: false, message: "" }` would otherwise put "All done."
       * in destructive red beside a warning triangle — the same "the icon and
       * the words disagree" defect this whole type exists to end, just with the
       * halves swapped over.
       */
      message: data.message || (ok ? t("process_finished") : t("operation_failed")),
    });
  }

  /*
   * A CARD IS REPLACED ONCE THE OFFER IS SPENT, NOT ONCE IT SUCCEEDED.
   *
   * Any 200 means the row left PROPOSED — completed, failed, expired, or
   * confirmed under a competing press — and re-pressing it can only ever
   * return "This has already been handled.", so the description and button go.
   * A response that never arrived (`error`, no `data`) is the opposite case:
   * nothing was written, the offer is still open, and the button is the entire
   * recovery path. That branch keeps the card whole and renders below.
   */
  if (result?.spent) {
    return (
      <div className="border-border rounded-lg border border-dashed px-3 py-2">
        <OutcomeLine outcome={result} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border px-3 py-2.5",
        // A heavier action LOOKS heavier before it is pressed. The modal is the
        // guard; this is the warning that one is coming, so the second press is
        // expected rather than a surprise that trains people to click through.
        heavy
          ? "border-warning/40 bg-warning/5"
          : "border-border bg-muted/30"
      )}
    >
      <p className="text-xs leading-relaxed">{description}</p>
      {/* Above the button, not instead of it: the customer reads why it failed
          and then sees the control they press to try again. */}
      {result ? <OutcomeLine outcome={result} /> : null}
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 rounded-full text-xs"
        disabled={busy}
        onClick={() => (heavy ? setOpen(true) : confirm())}
      >
        {busy ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : (
          <Check className="size-3" aria-hidden />
        )}
        {label}
      </Button>

      {/* ---- the second, deliberate confirmation ------------------------
          Only for `weight: "dialog"`. See `OperationDefinition.weight`: these
          controls sit inline in a thread, under a paragraph the customer is
          mid-way through reading, on a phone, next to where their thumb already
          is. One tap is right for "send that email again" and wrong for
          "withdraw the verification submission you spent twenty minutes on".

          IT RESTATES THE SAME SENTENCE, deliberately. `description` is the
          operation's own constant and the entire informed-consent argument
          rests on the customer having read it; a second, differently-worded
          summary would be a second thing to keep in step with the runner, and
          the two disagreeing is precisely the failure the constant prevents.
          What the modal adds is not new words — it is that the customer had to
          mean it. */}
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t("confirm_action_title")}</DialogTitle>
            <DialogDescription className="pt-1 leading-relaxed">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t("confirm_action_cancel")}
            </Button>
            <Button size="sm" className="gap-1" disabled={busy} onClick={confirm}>
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )}
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * "Show me how" — the card that starts a walkthrough.
 *
 * ---------------------------------------------------------------------------
 * IT NAVIGATES AND THEN LETS GO
 * ---------------------------------------------------------------------------
 * The walkthrough cannot run here. Its whole purpose is to point at controls on
 * `/finance/withdraw`, and getting there unmounts this bubble, this transcript
 * and this entire route. So pressing the button does two things and neither of
 * them is "start a tour": it records the request in a store that lives above
 * the router, and it navigates.
 *
 * `GuidanceHost`, mounted in the locale layout, watches the path and starts the
 * walkthrough once the destination has painted. That indirection is not
 * incidental — it is the only arrangement in which a guide can outlive the
 * conversation that offered it.
 *
 * ---------------------------------------------------------------------------
 * NOTHING IS CONFIRMED, BECAUSE NOTHING HAPPENS
 * ---------------------------------------------------------------------------
 * No proposal id, no PUT, no audit row. `ProposedOperation` and `WorkflowCard`
 * both exist to obtain informed consent before an authenticated write; there is
 * no write here. The customer is being offered an explanation of a page they
 * can already open, and the button is a link with a side effect on a store.
 */
function GuideCard({ guide }: { guide: SupportGuide }) {
  const t = useTranslations("support_ticket");
  const ta = useTranslations("support_assistant");
  const router = useRouter();
  const request = useGuidanceStore((state) => state.request);

  return (
    <div className="border-border bg-muted/30 w-full space-y-2 rounded-lg border px-3 py-2.5">
      <p className="text-xs font-semibold">
        {catalogueText(ta, guideTitleKey(guide.key), guide.title)}
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed">
        {/* The count is the honest expectation-setter. "I'll show you" says
            nothing about whether this is fifteen seconds or five minutes. */}
        {guide.native
          ? t("guide_uses_the_pages_own_tour")
          : t("guide_n_stops", { n: guide.stops.length })}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 rounded-full text-xs"
        onClick={() => {
          request({
            key: guide.key,
            /* The ENGLISH constant, deliberately. The overlay that draws this
               walkthrough carries `key` too and looks the title up itself, so
               storing the resolved string here would fork the lookup between
               two entry points — this card and the companion rail — and only
               one of them would stay in step. The store holds the fallback; the
               renderer does the translating. */
            title: guide.title,
            /* The URL the TOOL resolved through the route catalog, not
               anything the model typed. `propose_action` has always worked
               this way and the reason is the same: a model-supplied
               destination in a customer's transcript is a link nobody
               checked. */
            route: guide.url,
            stops: guide.stops,
            native: guide.native ?? null,
          });
          router.push(guide.url as any);
        }}
      >
        <Sparkles className="size-3" aria-hidden />
        {t("show_me_how")}
      </Button>
    </div>
  );
}
