/**
 * "The customer's running process just changed."
 *
 * ---------------------------------------------------------------------------
 * THE RAIL WAS UP TO A MINUTE BEHIND, AND A MINUTE IS THE WHOLE INTERACTION
 * ---------------------------------------------------------------------------
 * `CompanionRail` is mounted above the router so it can outlive the navigations
 * a process makes — that is its entire reason for existing. The cost of living
 * up there is that it NEVER REMOUNTS, so an effect keyed on the route does not
 * re-run and the only thing that refreshed it was a 60-second poll.
 *
 * Which produced the reported symptom exactly. A customer asks a question, the
 * assistant proposes a process, they press the step's button in the transcript,
 * `router.push` takes them to the page — and the rail is still holding the
 * `null` its last poll returned, because the process did not exist then. It
 * appears somewhere in the following minute, on a page they have probably
 * already left. "The assistant card doesn't show a lot of the time" is that
 * race, and it is worst in the case that matters most: the very first step.
 *
 * A poll cannot be tightened into a fix here. The rail has to know at the
 * moment the transcript acts, and the transcript is in a subtree the rail
 * cannot see — different branches of the layout, no shared ancestor below the
 * app root.
 *
 * ---------------------------------------------------------------------------
 * WHY AN EVENT AND NOT A STORE
 * ---------------------------------------------------------------------------
 * Nothing is being shared. The rail already owns its state and re-reads it from
 * the server on purpose — see the note in `companion-rail.tsx` about a process
 * that legitimately spans days and a truth that changes while the tab is shut.
 * What is missing is only a NUDGE to re-read now, so a store holding a mirror of
 * the workflow would add a second copy of the state this design deliberately
 * refuses to keep on the client.
 *
 * The poll stays. It still covers the writers this cannot see: the hourly sweep
 * that expires a stale process, an operator cancelling one from the console, and
 * a second tab.
 */

const EVENT = "ai-support:workflow-changed";

/**
 * Call after anything that starts, advances or ends a process.
 *
 * Safe to call during render or on the server — `window` is guarded, so a
 * component that fires this in an effect needs no environment check of its own.
 */
export function notifyWorkflowChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Subscribe. Returns the unsubscribe, for an effect's cleanup. */
export function onWorkflowChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
