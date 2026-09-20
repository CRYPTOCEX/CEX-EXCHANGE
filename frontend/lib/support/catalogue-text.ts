/**
 * A catalogue constant, in the customer's own language when there is one.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS EXISTS TO FIX
 * ---------------------------------------------------------------------------
 * The assistant's three catalogues — `guides.ts`, `workflows.ts`,
 * `operations.ts` — hold the text of every walkthrough stop, every process step
 * and every offered action. All of it is English, all of it is a backend
 * constant, and all of it was rendered verbatim on three CUSTOMER surfaces:
 * `components/support/message-bubble.tsx`, `components/guidance/guided-tour.tsx`
 * and `components/guidance/companion-rail.tsx`.
 *
 * Each of those already called `useTranslations`, but only for its own chrome —
 * "Step 1 of 4", "Show me how", "Next". The payload passed through untouched.
 * And `prompt.ts` instructs the model to answer in the customer's detected
 * language, so the failure is loud rather than cosmetic: a Spanish answer
 * arrives with an English button and an English tour card underneath it.
 *
 * ---------------------------------------------------------------------------
 * THE MODEL STILL AUTHORS NOTHING, WHICH IS WHY THIS IS SAFE
 * ---------------------------------------------------------------------------
 * Read the note above `OperationDefinition.description` before changing this.
 * Those strings are constants ON PURPOSE: if the model could author them, a
 * prompt injection could describe one action while another was queued, and the
 * customer's consent would be consent to a fiction.
 *
 * Nothing here weakens that. The model picks a catalogue KEY from a fixed enum
 * and nothing else. The key addresses BOTH sides of this function — the message
 * id and the English fallback — so there is no argument the model can supply
 * that reaches either. Translating a constant changes its language, not its
 * author.
 *
 * ---------------------------------------------------------------------------
 * THE FALLBACK IS REQUIRED, NOT DEFENSIVE
 * ---------------------------------------------------------------------------
 * The server's English constant stays on the wire and renders whenever the
 * locale has no entry for the key. That is what an upgrade needs: a 22nd guide
 * ships its catalogue entry before any locale has a message for it, and the
 * alternative to degrading to today's behaviour is rendering
 * `support_assistant.guides.x.title` at a customer.
 *
 * A MISSING key takes the same path, and that case is real rather than
 * theoretical — a transcript is readable forever, and messages persisted before
 * the keys were on the wire carry only the English.
 */

/**
 * The part of a translator this needs: callable, and able to say whether a key
 * exists. Structural rather than imported so this module keeps having no
 * imports — `lib/support/*` is depended on by the pure-data parser tests, and
 * `i18n/use-translations` is a `"use client"` React module.
 */
export interface CatalogueTranslator {
  (key: string): string;
  has: (key: string) => boolean;
}

export function catalogueText(
  t: CatalogueTranslator,
  key: string | null | undefined,
  fallback: string
): string {
  if (!key) return fallback;
  return t.has(key) ? t(key) : fallback;
}

/** `support_assistant.guides.<guideKey>.title` — without the namespace. */
export function guideTitleKey(guideKey?: string | null): string | null {
  return guideKey ? `guides.${guideKey}.title` : null;
}

/** One stop, addressed by its POSITION — stops carry no key of their own. */
export function guideStopKey(
  guideKey: string | null | undefined,
  index: number,
  part: "title" | "body" | "reveal"
): string | null {
  return guideKey ? `guides.${guideKey}.stops.${index}.${part}` : null;
}

export function workflowTitleKey(workflowKey?: string | null): string | null {
  return workflowKey ? `workflows.${workflowKey}.title` : null;
}

export function workflowStepKey(
  workflowKey: string | null | undefined,
  stepKey: string | null | undefined,
  part: "label" | "description" | "done"
): string | null {
  if (!workflowKey || !stepKey) return null;
  return `workflows.${workflowKey}.steps.${stepKey}.${part}`;
}

export function operationKey(
  key: string | null | undefined,
  part: "label" | "description"
): string | null {
  return key ? `operations.${key}.${part}` : null;
}
