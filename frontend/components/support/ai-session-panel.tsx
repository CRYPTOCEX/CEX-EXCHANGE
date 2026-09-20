"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The customer's view of the AI's state, and their way out of it.
 *
 * The DISCLOSURE and the THINKING indicator moved into `SupportThread`, where
 * they belong: a notice about who is writing has to sit next to the writing, and
 * the composer is below every message in the thread. What is left here is the
 * status line and the escape hatch, which genuinely do belong beside the box the
 * customer types into.
 *
 * `Talk to a person` is deliberately visible for as long as there is somewhere
 * to go — a customer who cannot find the way out of an automated conversation
 * does not conclude the product is clever. It disappears the moment the request
 * lands, because a DISABLED "Talk to a person" sitting beside the words
 * "Waiting for a person" is two controls saying one thing, one of them dead.
 */

/**
 * States in which the assistant holds the conversation.
 *
 * Mirrors `AI_HOLDS` in `backend/src/api/(ext)/ai/support/utils/participation.ts`.
 * Used only to apply a handover frame optimistically; the following `refresh()`
 * is the authority and overwrites whatever this decides.
 */
const AI_HOLDS = ["AI_ACTIVE", "AWAITING_USER"];

export interface AiSessionState {
  active: boolean;
  state: string | null;
  label: string | null;
  /** The AI may take part in THIS conversation — channel toggle included. */
  enabled: boolean;
  /** Which surface this ticket is, as the backend classified it. */
  channel?: "TICKET" | "LIVE";
  /**
   * The AI posts directly rather than drafting for a human.
   *
   * False in COPILOT, where every word the customer reads was sent by a person
   * — so no assistant is disclosed and no thinking indicator is promised.
   */
  autonomous?: boolean;
  waitingForHuman?: boolean;
  humanActive?: boolean;
  turnCount?: number;
  persona: { name: string; avatar: string | null; disclosure: string } | null;
}

export function useAiSession(ticketId: string | null | undefined) {
  const [session, setSession] = useState<AiSessionState | null>(null);
  const [thinking, setThinking] = useState(false);
  /**
   * The approved answer, one frame ahead of the message.
   *
   * NO LONGER A TOKEN STREAM, and the comment here used to say the opposite:
   * "deltas are raw model output that has not been through the post-filter, so
   * a refund promise or an invented URL can appear here and be absent from what
   * actually arrives". That was an accurate description of a real defect —
   * `ai.delta` goes out on the CUSTOMER's channel, and the post-filters cannot
   * run until the response completes, so the customer was shown text the
   * product was about to withhold from them.
   *
   * The engine now holds every token and emits ONE `ai.delta` carrying the
   * finished, filtered answer (`createHeldAnswer`). A withheld answer produces
   * no frame at all, and a copilot draft creates no sink. So this is still a
   * preview rather than the message — the authoritative text is the `reply`
   * frame and this is cleared the moment one lands — but it can no longer show
   * anything the customer is not entitled to see.
   */
  const [streamed, setStreamed] = useState("");
  /**
   * Which model pass the streamed text belongs to.
   *
   * A turn with tool calls runs the model more than once and only the LAST
   * pass survives into the message: the first pass is typically "let me check
   * that for you" before a tool runs. The server stamps each frame with a pass
   * number and this resets when it moves, so the customer never sees an
   * abandoned pass concatenated onto the real answer.
   */
  const passRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await $fetch<AiSessionState>({
      url: `/api/ai/support/session/${ticketId}`,
      silent: true,
    });
    if (data) setSession(data);
  }, [ticketId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Call from the surface's websocket handler.
   *
   * The `ai.*` frames exist because the customer needs to know the difference
   * between "thinking" and "nobody is coming". Every one of them ends the
   * indicator except `ai.status`, so a cancelled or failed generation cannot
   * leave it spinning.
   */
  const handleFrame = useCallback(
    (method: string, payload: any) => {
      switch (method) {
        case "ai.status":
          setThinking(payload?.state === "thinking");
          if (payload?.state === "thinking") {
            // A fresh generation. Any leftover preview belongs to the last one.
            passRef.current = 0;
            setStreamed("");
          }
          // `draft_ready` is COPILOT finishing a draft for a human to send. The
          // customer is told nothing — there is no message for them yet, and
          // there may never be one if the agent rewrites it.
          if (payload?.state === "draft_ready") setStreamed("");
          break;
        case "ai.delta": {
          const pass = Number(payload?.pass ?? 0);
          if (pass !== passRef.current) {
            passRef.current = pass;
            setStreamed(String(payload?.text ?? ""));
          } else {
            setStreamed((current) => current + String(payload?.text ?? ""));
          }
          // Deltas are proof of life, so they also hold the indicator open —
          // otherwise a long tool round between passes reads as a stall.
          setThinking(true);
          break;
        }
        case "ai.done":
        case "ai.cancelled":
          setThinking(false);
          // Cleared on `done` as well as `cancelled`: the real message arrives
          // in its own `reply` frame, and leaving the preview up would render
          // the answer twice for as long as the two raced.
          setStreamed("");
          break;
        case "ai.handover": {
          setThinking(false);
          setStreamed("");
          /*
           * APPLY THE FRAME, THEN RECONCILE — do not go dark in between.
           *
           * This frame is the moment the assistant stops, so clearing the
           * typing indicator here is right. Clearing it and then WAITING FOR A
           * ROUND TRIP to learn what to show instead is not: the customer sees
           * the indicator vanish and nothing take its place until the request
           * lands. On a saturated backend that gap was twelve seconds of an
           * empty conversation, which reads as the product giving up.
           *
           * The frame already carries the new state and its label, so the
           * status line can change in the same tick. `refresh()` still runs —
           * it is the authority, and it fills in everything the frame does not
           * carry — but the surface no longer depends on it to say anything.
           */
          const state = payload?.state ? String(payload.state) : null;
          if (state) {
            setSession((current) =>
              current
                ? {
                    ...current,
                    state,
                    label: payload?.label ?? current.label,
                    // Mirrors `resolveParticipation` on the server. Derived
                    // rather than assumed, and corrected by the refresh below
                    // if this client is wrong about it.
                    active:
                      current.enabled &&
                      current.autonomous !== false &&
                      AI_HOLDS.includes(state),
                    waitingForHuman: state === "HUMAN_REQUESTED",
                    humanActive: state === "HUMAN_ACTIVE",
                  }
                : current
            );
          }
          refresh();
          break;
        }
        case "reply":
          // A message arrived from anyone — the AI is no longer mid-answer.
          setThinking(false);
          setStreamed("");
          break;
      }
    },
    [refresh]
  );

  return { session, thinking, streamed, refresh, handleFrame };
}

/**
 * Is this panel about to print a status line naming who is coming?
 *
 * Exported because the THREAD needs to know: its acknowledgement footer exists
 * to answer "what happens next" when nothing else does, and it was printing a
 * second copy of this same sentence a few lines above it. Mirrors the render
 * conditions below exactly rather than re-deriving them — `enabled` included,
 * because a session can be in `HUMAN_REQUESTED` on an install where the AI has
 * since been switched off, and then this panel draws nothing at all.
 */
export function showsStatusLine(session: AiSessionState | null): boolean {
  return Boolean(
    session?.enabled && (session.waitingForHuman || session.humanActive)
  );
}

export function AiSessionPanel({
  ticketId,
  session,
  onRequested,
  className,
}: {
  ticketId: string;
  session: AiSessionState | null;
  onRequested?: () => void;
  className?: string;
}) {
  const t = useTranslations("support_ticket");
  const [requesting, setRequesting] = useState(false);

  if (!session?.enabled) return null;
  // Nothing to escape from and nothing to report.
  if (!session.active && !session.waitingForHuman && !session.humanActive) {
    return null;
  }

  const requestHuman = async () => {
    setRequesting(true);
    await $fetch({
      url: "/api/ai/support/human",
      method: "POST",
      body: { ticketId },
      successMessage: t("person_requested"),
    });
    setRequesting(false);
    onRequested?.();
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className
      )}
    >
      <span className="text-muted-foreground text-[11px]">
        {session.waitingForHuman || session.humanActive ? session.label : null}
      </span>
      {/* Offered while the assistant holds the conversation, and only then. Once
          the request has landed the status line to its left already says so —
          the button used to stay on screen, disabled, next to it. */}
      {session.active ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground h-7 gap-1.5 px-2 text-xs"
          disabled={requesting}
          onClick={requestHuman}
        >
          {requesting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <UserRound className="size-3" />
          )}
          {t("talk_to_a_person")}
        </Button>
      ) : null}
    </div>
  );
}
