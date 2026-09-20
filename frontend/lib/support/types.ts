/**
 * The shape of a support message on the wire.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE ARE NOT IN `message-bubble.tsx`
 * ---------------------------------------------------------------------------
 * They were, and the renderer is where they LOOK like they belong — but that
 * file is a React component: it imports `next-intl`, `next/navigation` and half
 * the UI kit. `lib/support/messages.ts` is pure data with no React in it, and
 * importing its types from the component dragged all of that into anything that
 * touched the parser.
 *
 * The e2e tree is where that surfaced: a unit suite for the parser could not be
 * typechecked, because `next-intl` is a local compat layer mapped through the
 * FRONTEND's tsconfig `paths` and the test tree does not have them. The suite
 * ran (vitest aliases it) and `tsc -p e2e` did not, which is the worst version
 * of that failure — green tests, red typecheck, in different commands.
 *
 * A type is not a component. This module has no imports at all, so anything may
 * depend on it.
 */

export interface SupportAction {
  label: string;
  url: string;
  tone?: string;
}

export interface SupportCitation {
  sourceId: string;
  url?: string;
  title?: string;
  quote?: string;
}

export interface SupportStep {
  n: number;
  text: string;
  url?: string;
  blocked?: string;
}

/**
 * Something the assistant offered to DO, which has not happened.
 *
 * The model wrote none of what the customer reads here: `label` and
 * `description` are constants belonging to the operation, carried through
 * untouched from the backend allowlist. That is the safety argument — informed
 * consent to a sentence the model composed would be consent to whatever an
 * injected document wanted it to say.
 *
 * Nothing runs until the customer presses the button, and it then runs through
 * an ordinary authenticated route under their own session.
 */
export interface SupportOperation {
  /** The proposal id. Confirming PUTs to it; there is no other trigger. */
  id: string;
  /**
   * The allowlist key, which is what makes the two strings below translatable.
   *
   * The model chose this key from a fixed enum and wrote none of what it
   * selects: it addresses BOTH the message id in `support_assistant` and the
   * English constant beside it. So translating the card changes the language and
   * nothing else about who authored the sentence.
   *
   * Optional because a transcript is readable forever and messages persisted
   * before this field existed carry only the English. Those still render — see
   * the fallback in `message-bubble.tsx`.
   */
  operationKey?: string;
  label: string;
  description: string;
  /**
   * Whether confirming costs one tap or a deliberate modal.
   *
   * A property of the operation, decided in `backend/.../utils/operations.ts`
   * and carried here by `operationPayload`. See that field's note for why the
   * axis exists: these controls sit inline in a chat thread, under a paragraph
   * the customer is mid-way through reading, and one tap is not proportionate to
   * "withdraw the verification submission you spent twenty minutes assembling".
   *
   * OPTIONAL, AND ABSENT MEANS `"dialog"`. A transcript is readable forever and
   * messages persisted before this shipped carry no weight at all. Guessing high
   * costs one extra tap on a historical card; guessing low puts a consequential
   * write behind a control the customer brushed. See `ProposedOperation`.
   */
  weight?: SupportOperationWeight;
}

/** @see SupportOperation.weight */
export type SupportOperationWeight = "immediate" | "dialog";

/**
 * One step of a process, and where the customer is in it.
 *
 * ---------------------------------------------------------------------------
 * THE MESSAGE CARRIES ONE STEP, NEVER THE PLAN
 * ---------------------------------------------------------------------------
 * The step list lives in the backend catalogue and the model never sees it. When
 * a step completes, the confirm route returns the NEXT one and the card replaces
 * itself in place — so this shape describes the outstanding step and how far
 * through the process it is, and nothing else.
 *
 * `title`, `label` and `description` are all constants belonging to the step
 * definition, for the same reason as `SupportOperation`: consent to a sentence
 * the model composed would be consent to whatever an injected document wanted it
 * to say.
 *
 * `step` is null once the process has finished or stopped — the card then shows
 * the outcome rather than a control.
 */
export interface SupportWorkflowStep {
  id: string;
  /** 0-based. With `totalSteps`, this is "step 2 of 3". */
  index: number;
  /**
   * The step's key within its workflow's catalogue entry.
   *
   * With the workflow's own key this addresses `support_assistant.workflows.
   * <workflowKey>.steps.<stepKey>`, which is how `label` and `description` reach
   * the customer in their own language. It is a constant off the step list in
   * code — on every step after the first, the model is not even in the request.
   *
   * Optional for the same reason as `SupportOperation.operationKey`: a message
   * persisted before this shipped carries only the English.
   */
  stepKey?: string;
  label: string;
  description: string;
  /**
   * Confirmation weight for THIS step. @see SupportOperation.weight
   *
   * A step of a process is an operation — `stepRunner` returns the same
   * definition object a standalone offer would — so a consequential step gets
   * the same modal wherever the customer meets it. A `navigate` or `guide` step
   * is always `"immediate"`: it writes nothing, and a modal over a navigation
   * would train the customer to dismiss modals.
   */
  weight?: SupportOperationWeight;
  /**
   * A page rather than a write.
   *
   * Not every step mutates: "now go and upload the corrected document" is a
   * step. It sends the customer to the product's own UI, which already carries
   * every check the platform has — which is why the assistant never fills a form
   * on anybody's behalf.
   */
  route?: string | null;
}

export interface SupportWorkflow {
  workflowId: string;
  /** The catalogue key. Selects the message id for `title` and for every step. */
  workflowKey?: string;
  title: string;
  totalSteps?: number;
  state?: "RUNNING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "FAILED";
  step: SupportWorkflowStep | null;
}

/**
 * A walkthrough the assistant is offering to run on the customer's screen.
 *
 * The lightest payload in this file, and deliberately: there is no id, because
 * there is no row. A guide writes nothing, so there is nothing to confirm and
 * nothing to audit — pressing the button opens a page the customer could
 * already open and highlights controls that are already on it.
 *
 * `stops` are constants off the backend catalogue. `native` names a tour the
 * destination page already ships, in which case `stops` is empty and the host
 * hands off to that page's own overlay instead of drawing one.
 */
export interface SupportGuide {
  key: string;
  title: string;
  /** Already resolved through the route catalog — never a model-supplied URL. */
  url: string;
  native?: string | null;
  stops: Array<{
    anchor: string;
    title: string;
    body: string;
    side?: "top" | "bottom" | "left" | "right" | "center";
    /**
     * What the customer must do for this control to appear.
     *
     * Only on pages that reveal themselves one rung at a time — deposit,
     * withdraw, verification. Rendered by the overlay ONLY while the anchor is
     * unresolved, so it disappears the moment the rung opens.
     */
    reveal?: string;
  }>;
}

export interface SupportBubbleMessage {
  key?: string;
  type: "client" | "agent";
  text: string;
  time: string;
  /** Author. Persisted on customer messages; absent on agent and system rows. */
  userId?: string;
  senderName?: string;
  attachment?: string;
  system?: boolean;
  /** The discriminator. Drives the badge; never inferred from a name. */
  ai?: boolean;
  turnId?: string;
  citations?: SupportCitation[];
  actions?: SupportAction[];
  steps?: { title?: string; steps: SupportStep[] };
  operations?: SupportOperation[];
  workflow?: SupportWorkflow;
  guide?: SupportGuide;
  agentProfile?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
  };
}
