import type {
  SupportAction,
  SupportBubbleMessage,
  SupportCitation,
  SupportGuide,
  SupportOperation,
  SupportStep,
  SupportWorkflow,
} from "./types";

/**
 * One reader for `supportTicket.messages`, shared by every customer surface.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS: THE AI'S ANSWER WAS ARRIVING STRIPPED
 * ---------------------------------------------------------------------------
 * The ticket page and the live-chat widget each had their own inline mapping of
 * the raw message array, and both of them projected it onto a four-field local
 * shape:
 *
 *     { id, content, sender, timestamp }        // ticket page
 *     { id, content, sender, timestamp, ... }   // live chat
 *
 * Everything the AI support addon writes onto a message — `ai`, `turnId`,
 * `citations`, `actions`, `steps`, `key`, `system` — was dropped at that line.
 * The engine persists all of it (see `engine.ts`, the `aiMessage` literal), the
 * admin console renders all of it, and the CUSTOMER, who is the person the
 * citations and the action buttons were generated for, saw a plain grey bubble.
 *
 * The `ai` flag is the one that is not merely a lost feature. It is the
 * discriminator `AiBadge` is driven from, and it is a disclosure requirement
 * (EU AI Act Art. 50(1); see `components/support/ai-badge.tsx`). Dropping it
 * meant an AI-authored reply was indistinguishable from a human agent's on the
 * customer's own screen. The ticket page even asked
 * `messages.some((m) => m.ai === true)` to decide whether the one-time notice
 * had already been shown — against objects whose mapping had just discarded
 * `ai`, so that test was a constant `false`.
 *
 * ---------------------------------------------------------------------------
 * THE COLUMN HAS THREE ON-DISK SHAPES
 * ---------------------------------------------------------------------------
 * A real JSON array, a JSON string, and a double-encoded JSON string left by
 * older writers. `backend/src/utils/support/messages.ts` centralises this on the
 * server for exactly the same reason; this is its client-side twin, and the two
 * must agree about what a message IS.
 */

/** A thread message plus the fields the client needs and the wire does not carry. */
export interface SupportThreadMessage extends SupportBubbleMessage {
  /**
   * Stable React key.
   *
   * Prefers the server's `key`, which is the only identifier that survives a
   * refetch — array position is explicitly NOT stable (the 2026-08 repair
   * seeder rewrote existing rows), so keying on the index would re-mount every
   * bubble below an insertion.
   */
  id: string;
  /** Locally added, not yet confirmed by the server. */
  pending?: boolean;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) && value.length ? (value as T[]) : undefined;
}

/**
 * Normalises whatever the column, the REST payload or a websocket frame is
 * holding into an array of raw message objects.
 */
export function readSupportMessages(raw: unknown): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      // Double-encoded: the parse yielded another string.
      if (typeof parsed === "string") {
        const inner = JSON.parse(parsed);
        return Array.isArray(inner) ? inner : [];
      }
      return [];
    } catch {
      return [];
    }
  }

  return [];
}

let fallbackKeySeed = 0;

/**
 * Projects one raw message onto the bubble contract, losing nothing.
 *
 * `type` is derived from the message's own `type` first and only falls back to
 * the legacy `sender` field. It is never inferred from a NAME: an operator who
 * calls their persona "Sarah" must not be able to change how a message is
 * classified by doing so.
 */
export function toThreadMessage(raw: any, index = 0): SupportThreadMessage {
  const type: "client" | "agent" =
    raw?.type === "client" || raw?.type === "agent"
      ? raw.type
      : raw?.sender === "user" || raw?.sender === "client"
        ? "client"
        : "agent";

  const text = asString(raw?.text ?? raw?.content);
  const time = asString(raw?.time ?? raw?.timestamp) || new Date().toISOString();

  // A message with no server `key` is either legacy or optimistic. Time+index
  // is stable across re-renders of the SAME array, which is all a React key has
  // to be; the seed only breaks ties between two legacy messages written in the
  // same millisecond.
  // `msg-`, not `m-`: the design ratchet reads `` `m-${…}` `` as a runtime-built
  // margin utility (`m` is in its prefix list) and flags the file. The prefix
  // is arbitrary, so pick one that cannot be mistaken for a class.
  const id =
    asString(raw?.key) ||
    asString(raw?.id) ||
    `msg-${time}-${index}-${(fallbackKeySeed += 1)}`;

  return {
    id,
    key: raw?.key ? asString(raw.key) : undefined,
    type,
    text,
    time,
    senderName: raw?.senderName ? asString(raw.senderName) : undefined,
    // `imageUrl` is the live-chat widget's historical name for the same field.
    attachment: raw?.attachment || raw?.imageUrl || undefined,
    system: raw?.system === true,
    // Strictly `=== true`. A truthy string would make every message an AI
    // message, and this flag drives a legally required badge.
    ai: raw?.ai === true,
    turnId: raw?.turnId ? asString(raw.turnId) : undefined,
    citations: asArray<SupportCitation>(raw?.citations),
    actions: asArray<SupportAction>(raw?.actions),
    steps:
      raw?.steps && Array.isArray(raw.steps?.steps)
        ? (raw.steps as { title?: string; steps: SupportStep[] })
        : undefined,
    /*
     * ---------------------------------------------------------------------
     * `operations` WAS NOT HERE, AND THE BUTTON THEREFORE NEVER APPEARED
     * ---------------------------------------------------------------------
     * The confirmed-actions feature persists `operations` on the message and
     * `message-bubble.tsx` renders a card for each — but every CUSTOMER surface
     * builds its messages through this mapper, and this mapper dropped the
     * field. So the assistant could write a proposal row, tell the customer it
     * could resend their verification email, and the control to accept it did
     * not exist on the page they were reading.
     *
     * The admin inbox has its own mapper and did not lose it, which is why this
     * survived: the capability demonstrably worked on the one screen a developer
     * would check it on.
     *
     * The type already allowed both fields. A mapper that silently drops a field
     * its own return type declares is the quietest failure in this file.
     */
    operations: asArray<SupportOperation>(raw?.operations),
    workflow:
      raw?.workflow && typeof raw.workflow === "object"
        ? (raw.workflow as SupportWorkflow)
        : undefined,
    /*
     * ---------------------------------------------------------------------
     * `guide` WAS THE SECOND FIELD THIS MAPPER LOST, IN THE SAME WAY
     * ---------------------------------------------------------------------
     * Read the `operations` note directly above: this is that defect again,
     * one field along, and it had exactly the same consequence.
     *
     * The engine builds a walkthrough offer onto the message and persists it
     * (`engine.ts`, `...(guide ? { guide } : {})` on the `aiMessage` literal),
     * and `message-bubble.tsx` renders `message.guide ? <GuideCard/>` — the
     * "Show me how" button that puts `request()` into the guidance store and
     * navigates. Every customer surface builds its messages through THIS
     * mapper, and this mapper did not carry `guide`, so `message.guide` was
     * permanently undefined on the customer's own screen.
     *
     * Which means the entire walkthrough feature was unreachable in the
     * product: the catalogue, the anchors on seventy pages, the overlay and
     * the store all worked, and there was no control anywhere that could
     * start one. Nothing could see it — `SupportBubbleMessage` already
     * declared the field, so tsc was satisfied; the backend tests grade the
     * tool; the anchor gate reads source files, not a running page.
     *
     * `e2e/ui/guidance/walkthrough.pw.mjs` is what found it, by trying to
     * press the button.
     */
    guide:
      raw?.guide && typeof raw.guide === "object"
        ? (raw.guide as SupportGuide)
        : undefined,
    agentProfile: raw?.agentProfile || undefined,
  };
}

/** The whole thread, in order. */
export function toThread(raw: unknown): SupportThreadMessage[] {
  return readSupportMessages(raw).map((message, index) =>
    toThreadMessage(message, index)
  );
}

/** A locally-echoed customer message, shown before the server confirms it. */
export function optimisticMessage(
  text: string,
  userId?: string,
  attachment?: string
): SupportThreadMessage {
  return {
    id: `pending-${Date.now()}-${(fallbackKeySeed += 1)}`,
    type: "client",
    text,
    time: new Date().toISOString(),
    userId,
    ...(attachment ? { attachment } : {}),
    pending: true,
  };
}

/** How long an optimistic echo may still be claimed by a server message. */
const OPTIMISTIC_WINDOW_MS = 30_000;

/**
 * Merges one server message into the thread.
 *
 * Three cases, in this order:
 *
 *   1. We already hold this exact message (same server `key`) — a refetch and a
 *      websocket frame racing. Update in place; do NOT append.
 *   2. It is the confirmation of something we echoed optimistically — replace
 *      the echo, so the customer's own message does not appear twice.
 *   3. New — append.
 *
 * The optimistic match is on `key` where the caller knew it, and otherwise on
 * (type, text, recency). The old inline version used a 10-second window with no
 * key check at all, which loses to a slow round trip on a bad connection: the
 * echo stayed, the confirmation appended, and the customer saw their sentence
 * twice with no way to tell which one was real.
 */
export function mergeMessage(
  thread: SupportThreadMessage[],
  incoming: SupportThreadMessage
): SupportThreadMessage[] {
  if (incoming.key) {
    const existing = thread.findIndex((m) => m.key === incoming.key);
    if (existing !== -1) {
      const next = [...thread];
      next[existing] = incoming;
      return next;
    }
  }

  const incomingTime = new Date(incoming.time).getTime();
  const optimistic = thread.findIndex(
    (m) =>
      m.pending &&
      m.type === incoming.type &&
      m.text.trim() === incoming.text.trim() &&
      Math.abs(new Date(m.time).getTime() - incomingTime) < OPTIMISTIC_WINDOW_MS
  );

  if (optimistic !== -1) {
    const next = [...thread];
    next[optimistic] = incoming;
    return next;
  }

  return [...thread, incoming];
}

/** Drops a message we echoed and the server then refused. */
export function dropMessage(
  thread: SupportThreadMessage[],
  id: string
): SupportThreadMessage[] {
  return thread.filter((m) => m.id !== id);
}

/**
 * True once an AI-authored message already exists in the thread.
 *
 * Suppresses the one-time disclosure notice, which belongs ABOVE the first AI
 * reply and nowhere else.
 */
export function hasAiMessage(thread: SupportThreadMessage[]): boolean {
  return thread.some((m) => m.ai === true);
}

/**
 * Where the assistant first SPOKE — system chips do not count.
 *
 * ---------------------------------------------------------------------------
 * WHY `ai === true` ALONE WAS THE WRONG TEST
 * ---------------------------------------------------------------------------
 * The handover chip the engine posts on escalation carries `ai: true` as well
 * as `system: true`, because it is AI-originated. Anchoring the disclosure to
 * the first `ai === true` row therefore drew
 *
 *     "You're chatting with an AI assistant from this platform…"
 *     "I've passed this to a member of the team."
 *
 * as two consecutive notices, in that order, on a thread where the assistant
 * had never written a word. A disclosure is owed for an interaction that
 * happened; announcing one immediately before announcing that it is over reads
 * as the interface contradicting itself, which is precisely the confusion the
 * rule exists to prevent.
 *
 * `system` rows are the INTERFACE speaking, and the interface does not need to
 * disclose itself. Returns -1 when the assistant has not spoken.
 */
export function firstAssistantIndex(thread: SupportThreadMessage[]): number {
  return thread.findIndex((m) => m.ai === true && m.system !== true);
}

/**
 * Does the transcript already state what happens next?
 *
 * True when the most recent message from the desk's side is a system chip — a
 * handover notice, a closure reason. Messages the customer sent afterwards do
 * not clear it: the promise stands until somebody answers it.
 */
export function endsWithSystemNotice(thread: SupportThreadMessage[]): boolean {
  for (let index = thread.length - 1; index >= 0; index -= 1) {
    if (thread[index].type === "client") continue;
    return thread[index].system === true;
  }
  // Nothing from the desk at all, so nothing has been promised.
  return false;
}

export interface AcknowledgementInput {
  thread: SupportThreadMessage[];
  /** The conversation is over. */
  closed?: boolean;
  /** An assistant holds this conversation and will answer. */
  aiActive?: boolean;
  /** An assistant is generating right now — the typing indicator is up. */
  aiThinking?: boolean;
  /**
   * The surface already carries a live status line saying who is coming
   * (`showsStatusLine` in `components/support/ai-session-panel.tsx`).
   */
  statusShown?: boolean;
}

/**
 * Should the thread print "we've got your message, someone will reply"?
 *
 * ---------------------------------------------------------------------------
 * EXACTLY ONE SURFACE MAY ANSWER "WHAT HAPPENS NEXT"
 * ---------------------------------------------------------------------------
 * There are three things that can answer it — the handover chip in the
 * transcript, the status line beside the composer, and this acknowledgement —
 * and every one of them was written independently, so a customer whose
 * conversation had been escalated got all three at once:
 *
 *     [chip]   I've passed this to a member of the team — they'll reply here.
 *     [foot]   We've got your message — a member of the team will reply here.
 *     [status] Waiting for a person                      [Talk to a person]
 *
 * Three sentences, one fact, and the repetition reads as a system that has lost
 * track of itself rather than as reassurance. This is the acknowledgement's
 * turn to speak only when the other two are silent.
 *
 * Shared rather than derived per surface for the reason the whole module
 * exists: the ticket page and the widget each had their own version of this
 * condition, and two copies is how they drift.
 */
export function shouldAcknowledge(input: AcknowledgementInput): boolean {
  const { thread, closed, aiActive, aiThinking, statusShown } = input;

  if (closed || aiActive || aiThinking || statusShown) return false;
  if (endsWithSystemNotice(thread)) return false;

  const last = thread[thread.length - 1];
  return Boolean(last) && last.type === "client";
}

/** The first line of the thread, for a list preview. Skips system chips. */
export function threadPreview(raw: unknown): string {
  for (const message of readSupportMessages(raw)) {
    if (message?.system === true) continue;
    const text = asString(message?.text ?? message?.content).trim();
    if (text) return text;
  }
  return "";
}
