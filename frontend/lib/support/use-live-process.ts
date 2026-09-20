"use client";

import { useCallback, useEffect, useState } from "react";
import { $fetch } from "@/lib/api";
import { onWorkflowChanged } from "./workflow-signal";

/**
 * The process this ticket is actually running, read from the server.
 *
 * ---------------------------------------------------------------------------
 * THE BLOB ON THE MESSAGE IS A PHOTOGRAPH OF THE MOMENT IT WAS PROPOSED
 * ---------------------------------------------------------------------------
 * `message.workflow` is written onto the support message exactly once, always
 * with step index 0, and nothing updates it — advancement lives in the confirm
 * response and in the rows. `message-bubble.tsx` learned this the hard way and
 * reconciles against this endpoint on mount; its header says so at length.
 *
 * The resolution pane did not, so it rendered that photograph forever. The
 * result is two panels on one screen disagreeing about the same process: the
 * transcript card, reconciled, saying "All done."; the pane, three inches to
 * the right, saying "Step 1 of 3" and "in progress". Both from the same ticket,
 * both correct about the data they were reading.
 *
 * A second thing follows from the same cause and is worth naming separately:
 * the blob carries `step` and no `steps`. There is no array of them on it at
 * all, so a pane fed from the message CANNOT show what has been done and what
 * is still to come, however it is rendered. The endpoint returns every step
 * with a `done | current | upcoming` state, which is the shape that question
 * needs.
 *
 * ---------------------------------------------------------------------------
 * IT REFRESHES ON THE SIGNAL, NOT ON A TIMER
 * ---------------------------------------------------------------------------
 * The same `workflow-signal` the companion rail listens to. Confirming a step
 * anywhere — the transcript card, the rail — fires it, so the pane advances at
 * the moment the step does rather than at the next poll. Unlike the rail there
 * is no interval here: the pane only exists on the ticket page, where the
 * transcript is the thing that moves the process, and it is already on screen.
 */

export interface LiveProcessStep {
  index: number;
  stepKey?: string;
  label: string;
  description: string;
  kind: "operation" | "navigate" | "guide";
  state: "done" | "current" | "upcoming";
}

export interface LiveProcess {
  workflowId: string;
  workflowKey?: string;
  ticketId: string;
  title: string;
  totalSteps: number;
  state?: string;
  steps: LiveProcessStep[];
  /** Null when the process has finished — the receipt, not a control. */
  step: { index: number; label: string; description: string } | null;
}

export function useLiveProcess(ticketId: string | undefined): LiveProcess | null {
  const [process, setProcess] = useState<LiveProcess | null>(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    const { data } = await $fetch<{ workflow?: LiveProcess | null }>({
      url: `/api/ai/support/operation/pending?ticketId=${encodeURIComponent(ticketId)}`,
      silent: true,
    });
    setProcess(data?.workflow ?? null);
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) {
      setProcess(null);
      return;
    }
    void load();
    return onWorkflowChanged(() => {
      void load();
    });
  }, [ticketId, load]);

  return process;
}
