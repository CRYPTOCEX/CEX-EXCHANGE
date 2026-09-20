"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { AiDisclosureNotice, AiTypingIndicator } from "./ai-badge";
import {
  firstAssistantIndex,
  type SupportThreadMessage,
} from "@/lib/support/messages";

/**
 * The scrolling conversation, shared by the ticket page and the chat widget.
 *
 * ---------------------------------------------------------------------------
 * THE THIRD COPY IS GONE
 * ---------------------------------------------------------------------------
 * `message-bubble.tsx` was written to end three copy-pasted renderers and only
 * ever replaced one of them (the admin console). The customer's ticket page and
 * the floating widget kept their own, which is how the AI badge, the citation
 * chips, the action buttons, the walkthrough steps and the feedback control all
 * ended up shipping on the operator's screen and on none of the customer's.
 * This component is the list around that bubble, so there is now one renderer
 * for a support conversation and adding to it cannot miss a surface.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE DISCLOSURE GOES, AND WHY IT IS NOT IN THE COMPOSER
 * ---------------------------------------------------------------------------
 * It used to render in the composer block, under the thread — i.e. below the AI
 * message it is disclosing, and still below it after twenty more messages had
 * pushed the notice out of view entirely. The rule it exists to satisfy asks for
 * disclosure AT FIRST INTERACTION (EU AI Act Art. 50(1)), so:
 *
 *   - if the thread already contains an AI reply, the notice sits immediately
 *     ABOVE the first one, where it is part of the history and stays there;
 *   - if the AI is active but has not spoken yet, it sits at the END, where it
 *     reads as "the next reply will come from an assistant".
 *
 * It is drawn as the interface speaking, never in the assistant's voice — a
 * disclosure delivered by the thing being disclosed is the framing the rule is
 * about.
 *
 * ---------------------------------------------------------------------------
 * AUTOSCROLL STICKS TO THE BOTTOM ONLY IF THE READER IS ALREADY THERE
 * ---------------------------------------------------------------------------
 * Both old surfaces scrolled to the bottom on every `messages` change,
 * unconditionally. Scrolling up to re-read what an agent told you and being
 * yanked back down by an unrelated arriving message is the single most
 * irritating thing a chat panel can do, and it is worse here than in a group
 * chat because the message that yanks you is frequently the AI's.
 */

/** Distance from the bottom, in px, still counted as "reading the latest". */
const STICK_THRESHOLD = 120;

/**
 * `useLayoutEffect` warns when a component is rendered on the server, and this
 * one is: it is a client component, and Next renders client components during
 * SSR. The layout timing only matters in a browser — there is no scroll
 * container to correct on the server — so fall back to `useEffect` there.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface SupportThreadProps {
  messages: SupportThreadMessage[];
  /** Which side the viewer authored. Customer surfaces are `client`. */
  own?: "client" | "agent";
  persona?: { name?: string; avatar?: string | null; disclosure?: string } | null;
  /** The AI is live in this conversation — drives disclosure placement. */
  aiActive?: boolean;
  /** Suppress the notice entirely (addon absent, or channel switched off). */
  disclosureEnabled?: boolean;
  thinking?: boolean;
  /** Live token preview from `ai.delta`. A PREVIEW, never the message. */
  streamed?: string;
  counterpartAvatar?: string | null;
  counterpartName?: string;
  /**
   * The conversation, passed through to the workflow card so it can ask the
   * server which step is actually outstanding instead of trusting the snapshot
   * persisted on the message. Without it a reload strands a customer mid-process.
   */
  ticketId?: string;
  allowFeedback?: boolean;
  loading?: boolean;
  /** Rendered when the thread is genuinely empty (not while loading). */
  empty?: ReactNode;
  /** Above the first message — a subject line, a system preamble. */
  lead?: ReactNode;
  /**
   * Below the last message: what happens next.
   *
   * The typing indicator only exists while the AI is generating. With no AI —
   * switched off, Copilot, or a human queue — a customer who sends a message
   * gets absolutely nothing back, which is indistinguishable from the product
   * being broken. This slot is where the surface says who is coming.
   */
  foot?: ReactNode;
  siteName?: string;
  className?: string;
  /**
   * Classes for the LIST inside the scroller.
   *
   * The scroller has to stay full-width so its scrollbar sits at the panel
   * edge; the reading column is centred separately. Bubbles cap at 42rem on
   * their own, but on a 2560px monitor an unbounded list leaves them adrift
   * against the left edge of a very wide pane.
   */
  contentClassName?: string;
  /** Vertical rhythm between bubbles. The widget is tighter than the page. */
  density?: "comfortable" | "compact";
  /**
   * How message furniture is presented — see `MessageBubble`.
   *
   * Passed straight through. The default keeps every existing surface on
   * today's inline chips; only a surface that has somewhere to hand references
   * off to should opt into `reference`.
   */
  decorations?: "inline" | "reference";
  /** Receives the message id and which pane tab the reader asked for. */
  onOpenReferences?: (
    messageId: string,
    target: "sources" | "actions"
  ) => void;
}

export function SupportThread({
  messages,
  own = "client",
  persona,
  aiActive = false,
  disclosureEnabled = true,
  thinking = false,
  streamed = "",
  counterpartAvatar,
  counterpartName,
  ticketId,
  allowFeedback = true,
  loading = false,
  empty,
  lead,
  foot,
  siteName,
  className,
  contentClassName,
  density = "comfortable",
  decorations = "inline",
  onOpenReferences,
}: SupportThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  // Record whether the reader was at the bottom BEFORE the DOM grows, then
  // restore that position after. `useLayoutEffect` so the correction happens in
  // the same frame as the paint and no jump is visible.
  useIsomorphicLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, thinking, streamed, loading]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      stickRef.current = distance < STICK_THRESHOLD;
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * The first message the ASSISTANT wrote, not the first AI-originated row.
   *
   * The handover chip carries `ai: true` too, so the old `m.ai === true` test
   * put the disclosure directly above "I've passed this to a member of the
   * team" on threads where the assistant had never spoken — announcing an
   * assistant and its departure in consecutive lines. See `firstAssistantIndex`.
   */
  const firstAiIndex = firstAssistantIndex(messages);
  const showDisclosure =
    disclosureEnabled && (firstAiIndex !== -1 || (aiActive && !!persona));
  const disclosureAtEnd = showDisclosure && firstAiIndex === -1;

  const gap = density === "compact" ? "space-y-3" : "space-y-5";

  return (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6",
        className
      )}
    >
      {lead}

      <div className={cn(gap, contentClassName)}>
        {loading
          ? [0, 1, 2].map((i) => <PendingBubble key={`pending-${i}`} mirrored={i === 1} />)
          : null}

        {!loading && messages.length === 0 && !aiActive ? empty : null}

        {messages.map((message, index) => (
          <div key={message.id}>
            {showDisclosure && index === firstAiIndex ? (
              <AiDisclosureNotice
                text={persona?.disclosure}
                siteName={siteName}
              />
            ) : null}
            <MessageBubble
              message={message}
              isOwn={message.type === own}
              counterpartAvatar={counterpartAvatar}
              counterpartName={counterpartName}
              /*
               * The persona picture, so an AI bubble never falls through to
               * `counterpartAvatar` — which is a human agent's photo on the
               * customer surface and the customer's on the admin one. Every
               * surface already passes `persona` for the disclosure notice, so
               * this reaches all of them without a new prop at the call sites.
               */
              personaAvatar={persona?.avatar}
              ticketId={ticketId}
              allowFeedback={allowFeedback}
              decorations={decorations}
              onOpenReferences={
                onOpenReferences
                  ? (target) => onOpenReferences(message.id, target)
                  : undefined
              }
              className={message.pending ? "opacity-70" : undefined}
            />
          </div>
        ))}

        {disclosureAtEnd ? (
          <AiDisclosureNotice text={persona?.disclosure} siteName={siteName} />
        ) : null}

        {loading ? null : foot}

        {/* The streamed preview REPLACES the typing indicator once there is
            something to read — two "it's working" affordances at once is noise.
            Rendered as plain text and not through the markdown renderer: a
            partial stream routinely holds an unclosed ** or half a link, and
            re-parsing it every frame both flickers and can briefly show markup
            the finished message never contains. */}
        {streamed ? (
          <div className="flex gap-2.5 ps-10">
            <p className="text-muted-foreground min-w-0 text-sm leading-relaxed whitespace-pre-wrap">
              {streamed}
              <span className="ms-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-current align-middle" />
            </p>
          </div>
        ) : thinking ? (
          <AiTypingIndicator name={persona?.name} className="ps-10" />
        ) : null}
      </div>
    </div>
  );
}

/**
 * A pending bubble in the REAL scroll container with the REAL rhythm.
 *
 * An empty panel under a "Conversation" heading reads as "this ticket has no
 * messages", which is a different and wrong statement — loading and empty are
 * separate states.
 */
function PendingBubble({ mirrored }: { mirrored?: boolean }) {
  return (
    <div className={cn("flex w-full gap-2.5", mirrored && "flex-row-reverse")}>
      <Skeleton className="mt-0.5 size-8 shrink-0 rounded-full" />
      <div
        className={cn(
          "flex min-w-0 max-w-[min(42rem,80%)] flex-col gap-1",
          mirrored ? "items-end" : "items-start"
        )}
      >
        <Skeleton className="h-3 w-28" />
        <Skeleton className={cn("h-16 rounded-2xl", mirrored ? "w-48" : "w-72")} />
      </div>
    </div>
  );
}
