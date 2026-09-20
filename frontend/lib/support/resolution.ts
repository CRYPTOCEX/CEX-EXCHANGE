/**
 * The conversation, read as a resolution rather than as a transcript.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS DERIVED AND NOT FETCHED
 * ---------------------------------------------------------------------------
 * Everything the resolution pane shows already arrives with the ticket. A
 * cited document is `citation` on the message that used it; a suggested
 * destination is `action`; a walkthrough is `steps`; an offer to act is
 * `operation`. The pane is a second READING of the same payload, not a second
 * request — so it costs nothing, it cannot disagree with the thread, and it
 * works on a ticket that was opened before the pane existed.
 *
 * An aggregate endpoint would be an optimisation. It is deliberately not a
 * prerequisite: the moment the pane needs its own fetch, it can be empty while
 * the thread is full, which is the one state the floor exists to prevent.
 *
 * ---------------------------------------------------------------------------
 * NO REACT IN THIS FILE
 * ---------------------------------------------------------------------------
 * Same rule as `lib/support/messages.ts` and for the same reason: importing a
 * component drags `next-intl` and the UI kit into anything that touches the
 * parser, and the e2e tree cannot typecheck those. See `lib/support/types.ts`.
 */

import type {
  SupportAction,
  SupportCitation,
  SupportOperation,
  SupportStep,
  SupportWorkflow,
} from "./types";
import type { SupportThreadMessage } from "./messages";

/** A cited document, lifted out of the bubble that referenced it. */
export interface ResolutionSource {
  /** Dedupe identity. Stable across refetches — see `sourceKey`. */
  key: string;
  title?: string;
  url?: string;
  /**
   * The passage the answer actually rested on.
   *
   * In the bubble this was only ever a `title=` tooltip, i.e. invisible to
   * touch, invisible to a screen reader that does not announce titles, and
   * invisible to anyone who did not happen to hover a 10px chip. It is the most
   * useful field on the citation and it has never been shown.
   */
  quote?: string;
  /** Which assistant reply cited it, 1-based, for "cited in reply 2". */
  reply: number;
  /** The citing message's timestamp. */
  time: string;
}

/** Somewhere the assistant pointed the customer. */
export interface ResolutionAction {
  key: string;
  label: string;
  url: string;
  reply: number;
  time: string;
}

/** A numbered how-to the assistant wrote out. */
export interface ResolutionWalkthrough {
  key: string;
  title?: string;
  steps: SupportStep[];
  reply: number;
  time: string;
}

/** Per-message counts, so a bubble can render one strip instead of eight chips. */
export interface MessageReferences {
  sources: number;
  actions: number;
  /**
   * The source keys THIS message cited, so opening the strip can mark the cards
   * it belongs to.
   *
   * Counts alone are not enough: a message citing the second and fourth card
   * would otherwise just say "2 sources" and drop the reader at the top of an
   * undifferentiated list. Keys, not indices — the list dedupes, so position is
   * not stable across a refetch.
   */
  sourceKeys: string[];
}

export interface ResolutionModel {
  sources: ResolutionSource[];
  actions: ResolutionAction[];
  walkthroughs: ResolutionWalkthrough[];
  /** Offers to act. NOT deduped and NOT lifted — see `EMPTY` below. */
  operations: SupportOperation[];
  /**
   * Processes the assistant started in this ticket, newest last.
   *
   * -------------------------------------------------------------------------
   * THE PANE MODELLED EVERYTHING EXCEPT THE THING THAT WAS RUNNING
   * -------------------------------------------------------------------------
   * A message carries `operations` AND `workflow`, and this builder read only
   * the first. So a ticket with a live three-step process — visibly running in
   * the transcript, with a step card and a counter — produced `actionCount()`
   * of zero, which hid the Actions tab entirely. The pane offered "Sources" and
   * "Ticket" and had nothing to say about the one thing actually in flight.
   *
   * Held as the whole workflow rather than flattened into `actions`, because
   * what the pane reports is STATE — which process, how far through — and not
   * another button. The step's own control stays in the transcript for the same
   * reason the operations do: consent belongs beside the sentence that asked
   * for it.
   */
  processes: SupportWorkflow[];
  /** Keyed by `SupportThreadMessage.id`. */
  byMessage: Record<string, MessageReferences>;
  /** True when there is nothing above the floor — drives the tab bar. */
  isEmpty: boolean;
}

export const EMPTY_RESOLUTION: ResolutionModel = {
  sources: [],
  actions: [],
  walkthroughs: [],
  operations: [],
  processes: [],
  byMessage: {},
  isEmpty: true,
};

/**
 * Identity for a cited document.
 *
 * `sourceId` first: it is the retrieval corpus's own id and is the only field
 * guaranteed stable across a re-index. A URL is next because two chunks of one
 * article share it and the customer does not want the same article twice. The
 * title is a last resort, and an untitled, unlinked, id-less citation falls
 * back to its quote so that two genuinely different passages do not collapse
 * into one card.
 */
export function sourceKey(citation: SupportCitation): string {
  return (
    citation.sourceId ||
    citation.url ||
    citation.title ||
    citation.quote ||
    ""
  ).trim();
}

function actionKey(action: SupportAction): string {
  return [action.url || "", action.label || ""].join(" | ").trim();
}

/**
 * Is this message one the ASSISTANT wrote?
 *
 * `ai` is also true on the handover notice, which is a system row and cites
 * nothing — but it costs nothing to exclude it here and it keeps the reply
 * numbering honest: "cited in reply 2" must count answers, not notices.
 */
function isAssistantReply(message: SupportThreadMessage): boolean {
  return Boolean(message.ai) && !message.system;
}

/**
 * Read a thread into the pane's model.
 *
 * Order is CHRONOLOGICAL, not by relevance. The customer is reconstructing what
 * happened, and a list that reorders itself as the conversation grows cannot be
 * pointed at ("the second one" stops meaning anything).
 *
 * Deduplication keeps the EARLIEST occurrence, so the reply number attached to
 * a card is the reply that introduced it. A later re-citation does not move the
 * card or renumber it — it would otherwise appear to jump down the pane when
 * the assistant repeats itself.
 */
export function readResolution(
  messages: SupportThreadMessage[]
): ResolutionModel {
  const sources: ResolutionSource[] = [];
  const actions: ResolutionAction[] = [];
  const walkthroughs: ResolutionWalkthrough[] = [];
  const operations: SupportOperation[] = [];
  const processes: SupportWorkflow[] = [];
  const byMessage: Record<string, MessageReferences> = {};

  const seenSource = new Set<string>();
  const seenAction = new Set<string>();
  let reply = 0;

  for (const message of messages) {
    if (message.system) continue;
    if (isAssistantReply(message)) reply += 1;

    const messageSourceKeys: string[] = [];
    let messageActions = 0;

    for (const citation of message.citations ?? []) {
      const key = sourceKey(citation);
      if (!key) continue;
      if (!messageSourceKeys.includes(key)) messageSourceKeys.push(key);
      if (seenSource.has(key)) continue;
      seenSource.add(key);
      sources.push({
        key,
        title: citation.title,
        url: citation.url,
        quote: citation.quote,
        reply,
        time: message.time,
      });
    }

    for (const action of message.actions ?? []) {
      if (!action?.url || !action?.label) continue;
      const key = actionKey(action);
      messageActions += 1;
      if (seenAction.has(key)) continue;
      seenAction.add(key);
      actions.push({
        key,
        label: action.label,
        url: action.url,
        reply,
        time: message.time,
      });
    }

    if (message.steps?.steps?.length) {
      walkthroughs.push({
        key: message.id,
        title: message.steps.title,
        steps: message.steps.steps,
        reply,
        time: message.time,
      });
    }

    /*
     * Offers to act are NOT lifted into the pane and NOT deduped.
     *
     * A `SupportOperation` is a proposal in state PROPOSED whose button is the
     * only trigger there is. Consent has to be given next to the sentence that
     * asked for it — moving the control away from its explanation, or showing
     * one proposal twice, is exactly the failure the operation allowlist exists
     * to prevent. They are counted here so the pane can say how many are
     * outstanding, and they stay rendered in the bubble.
     */
    for (const operation of message.operations ?? []) {
      if (operation?.id) operations.push(operation);
    }

    /*
     * The process, which used to be read by nothing on this side.
     *
     * Deduped on `workflowId`: a process that advances writes a new card, and
     * without this a three-step process would report itself three times.
     */
    const process = message.workflow;
    if (process && !processes.some((p) => p.workflowId === process.workflowId)) {
      processes.push(process);
    }

    if (messageSourceKeys.length || messageActions) {
      byMessage[message.id] = {
        sources: messageSourceKeys.length,
        actions: messageActions,
        sourceKeys: messageSourceKeys,
      };
    }
  }

  return {
    sources,
    actions,
    walkthroughs,
    operations,
    processes,
    byMessage,
    isEmpty:
      sources.length === 0 &&
      actions.length === 0 &&
      walkthroughs.length === 0 &&
      operations.length === 0 &&
      processes.length === 0,
  };
}

/**
 * The steps the assistant could not complete, flattened across walkthroughs.
 *
 * A blocked step is the one piece of a walkthrough that is genuinely a state of
 * the ACCOUNT rather than of the conversation ("needs verification"), so the
 * pane surfaces them together. Never as a button: a step whose route failed its
 * server-side pre-flight is text with a reason, and a dead control that looks
 * live is worse than no control.
 */
export function blockedSteps(
  model: ResolutionModel
): { key: string; text: string; blocked: string }[] {
  const out: { key: string; text: string; blocked: string }[] = [];
  for (const walkthrough of model.walkthroughs) {
    for (const step of walkthrough.steps) {
      if (step.blocked) {
        out.push({
          key: `${walkthrough.key}-${step.n}`,
          text: step.text,
          blocked: step.blocked,
        });
      }
    }
  }
  return out;
}

/**
 * How many things the pane is offering to do.
 *
 * Walkthrough steps that carry a destination count, because from the
 * customer's side "open the withdrawals page" is the same offer whether it
 * arrived as an action pill or as step 3 of a list.
 */
export function actionCount(model: ResolutionModel): number {
  let n = model.actions.length + model.operations.length + model.processes.length;
  for (const walkthrough of model.walkthroughs) {
    n += walkthrough.steps.filter((step) => step.url && !step.blocked).length;
  }
  return n;
}

/**
 * A source title, split into the trail and the thing it is actually called.
 *
 * ---------------------------------------------------------------------------
 * THE WHOLE CHAIN WAS BEING DRAWN AS THE LABEL
 * ---------------------------------------------------------------------------
 * A shipped-documentation citation has NO url — the link is stripped on purpose
 * before a customer sees it, because every doc-pack chunk carries a vendor
 * address. So the navigation trail lives in the title itself, as a `›` chain,
 * and everything that renders a citation was rendering the whole chain:
 *
 *   p2p › Help › Posting your own P2P offer › Nobody is taking my offer
 *
 * On the pane that was three levels of navigation at heading weight. On the
 * bubble's chip it is worse than that — the chip truncates at 12rem, so the
 * part that survived was `p2p › Help › Posting your own P2P…` and the part that
 * says what the document ANSWERS was the part cut off. The label carried the
 * least informative half of the string.
 *
 * Everything before the last `›` is the trail; the last segment is the name.
 *
 * ---------------------------------------------------------------------------
 * AND IT STRIPS THE `[N]` PREFIX, WHICH IS NOT PART OF ANY TITLE
 * ---------------------------------------------------------------------------
 * `providers/mashdiv.ts` numbers the documents it sends — `[1] …`, `[2] …` — so
 * the number survives into whatever prompt shape the gateway's engine builds.
 * The gateway echoes that title back on a native citation, and it was rendered
 * verbatim: an instruction to a model, shown to a customer.
 *
 * It is not even a trustworthy label. Measured on a real ticket, all thirteen
 * citations carried a number exactly one higher than the marker written in the
 * sentence they support. So it is removed rather than restyled — a number that
 * points at the wrong source is worse than no number.
 *
 * ---------------------------------------------------------------------------
 * WHY IT LIVES HERE AND NOT IN THE COMPONENT THAT DRAWS THE CARD
 * ---------------------------------------------------------------------------
 * Two surfaces render a citation: the resolution pane's card and the message
 * bubble's chip. This was a private function inside the pane, so the chip kept
 * printing the raw string — including the `[n]` prefix the pane exists to
 * remove. One rule, one file, no React (see the header note).
 */
export function splitSourceTitle(raw: string): {
  crumb: string | null;
  title: string;
} {
  const cleaned = String(raw || "")
    .replace(/^\s*\[\d{1,2}\]\s*/, "")
    .trim();
  const parts = cleaned
    .split("›")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return { crumb: null, title: cleaned };

  return {
    // The nearest two ancestors. The full chain starts at the product name,
    // which is the same on every card and so carries no information here.
    crumb: parts.slice(-3, -1).join(" · ").toUpperCase(),
    title: parts[parts.length - 1],
  };
}
