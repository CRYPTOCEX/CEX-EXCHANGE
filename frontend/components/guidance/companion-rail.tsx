"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Loader2,
  MessageSquare,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useGuidanceStore, type GuidanceStop } from "@/store/guidance";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import {
  catalogueText,
  workflowStepKey,
  workflowTitleKey,
} from "@/lib/support/catalogue-text";
import { onWorkflowChanged } from "@/lib/support/workflow-signal";

/**
 * The AI Support add-on gates this poller.
 *
 * `useConfigStore().extensions` is `CacheManager.getExtensions()` on the wire,
 * and that loader selects `where: { status: true }` — so the list is the add-ons
 * this install has ENABLED, not the ones the vendor sells. That distinction is
 * the whole point here: the extensions seeder ships a row for every product,
 * disabled, so an operator who bought nothing still has an AI Support row.
 *
 * Without this test the poller called a paid add-on's API on the first paint of
 * every admin page on every install, and the 403 that came back was turned into
 * a redirect to an activation page for a product nobody owned. The backend no
 * longer answers `licenseRequired` for a disabled add-on and `silent` calls no
 * longer redirect, but neither of those is a reason to keep making the call.
 */
const AI_SUPPORT_EXTENSION = "ai_support";


/**
 * The process, following the customer across the product.
 *
 * ---------------------------------------------------------------------------
 * THE GAP THIS FILLS
 * ---------------------------------------------------------------------------
 * A workflow already rendered as a card INSIDE the transcript. That card is
 * correct and stays — but it can only exist where the transcript exists, and
 * the whole design of a workflow is that its steps take the customer somewhere
 * else. `router.push("/user/kyc")` unmounted the conversation, the card, the
 * step description and the progress counter, all at once.
 *
 * So the answer to "does the customer watch the process happen, or does it all
 * occur invisibly?" was: they watch step one, then they are teleported to a
 * page with eleven controls on it and no indication that a process is running
 * at all. On `redo_verification` — where step one WITHDRAWS their pending
 * verification — that is worse than unhelpful.
 *
 * This rail is the missing half. It is mounted in the persistent layout, so it
 * survives every navigation the process makes, and it shows the whole shape:
 * what is done, what is outstanding, what is still to come, and one way back to
 * the conversation.
 *
 * ---------------------------------------------------------------------------
 * IT READS THE SERVER, IT DOES NOT REMEMBER
 * ---------------------------------------------------------------------------
 * Deliberately, and it is the opposite choice from `useGuidanceStore` sitting
 * next to it. A guide is ephemeral — asked for thirty seconds ago, gone on
 * reload, and that is correct. A workflow legitimately spans DAYS: "withdraw
 * your submission, then come back with the right documents" is a trip to find a
 * passport.
 *
 * Client state cannot hold that and neither can `localStorage`, because the
 * truth can change while the tab is closed — a step can expire, an operator can
 * withdraw permission for the whole process, a reviewer can approve the very
 * application step one was going to withdraw. So the rail asks
 * `operation/pending` what is actually outstanding, and renders that. A null
 * answer means the process has ended, which is also the truth.
 *
 * ---------------------------------------------------------------------------
 * WHY IT POLLS, AND WHY SLOWLY
 * ---------------------------------------------------------------------------
 * Every step transition already goes through this component, so the common case
 * needs no polling at all — confirming a step returns the next one. The poll
 * exists for the OTHER writers: the hourly sweep that expires a stale process,
 * an operator cancelling one from the console, and a second tab.
 *
 * None of those is urgent, so the interval is generous. It is also suspended
 * while the tab is hidden, because a support process left open in a background
 * tab overnight would otherwise be several hundred pointless requests.
 */

const POLL_MS = 60_000;

interface RailStep {
  index: number;
  /** The step's catalogue key, which is how its label is translated. */
  stepKey?: string;
  label: string;
  description: string;
  kind: "operation" | "navigate" | "guide";
  state: "done" | "current" | "upcoming";
}

interface RailWorkflow {
  workflowId: string;
  ticketId: string;
  /**
   * The catalogue key. `aiSupportWorkflow.workflow` has stored exactly this and
   * nothing else since the table shipped, so it is the row made honest rather
   * than new information — and with each step's key it addresses every constant
   * on this rail in `support_assistant`.
   */
  workflowKey?: string;
  title: string;
  totalSteps: number;
  steps: RailStep[];
  step: {
    id: string;
    index: number;
    stepKey?: string;
    label: string;
    description: string;
    route: string | null;
    guide: {
      key: string;
      title: string;
      native: string | null;
      stops: GuidanceStop[];
    } | null;
  } | null;
}

export default function CompanionRail() {
  const t = useTranslations("support_ticket");
  /*
   * The rail's own chrome is `support_ticket` — "step 2 of 3", "back to the
   * conversation". Every other word on this panel is a constant from
   * `workflows.ts`, which arrives in English regardless of the language the
   * conversation was held in. See `lib/support/catalogue-text.ts` for why
   * translating a constant does not make it model-authored.
   */
  const ta = useTranslations("support_assistant");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const requestGuidance = useGuidanceStore((state) => state.request);
  const user = useUserStore((state) => state.user);

  const [workflow, setWorkflow] = useState<RailWorkflow | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  /* Dismissing hides the rail for this process, not forever — reopening it is
     one message to the assistant, and a rail that cannot be got rid of on a
     page the customer is trying to read is a rail they resent. */
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    /* No ticketId: "anything outstanding for me, anywhere". That is the whole
       reason the parameter became optional — see the endpoint. */
    const { data } = await $fetch<{ workflow?: RailWorkflow | null }>({
      url: "/api/ai/support/operation/pending",
      silent: true,
    });
    setWorkflow(data?.workflow ?? null);
  }, []);

  const extensions = useConfigStore((state) => state.extensions);
  const hasAiSupport =
    Array.isArray(extensions) && extensions.includes(AI_SUPPORT_EXTENSION);

  useEffect(() => {
    // Signed-out visitors have no outstanding process by definition, and asking
    // would be a 401 on every public page load.
    if (!user?.id || !hasAiSupport) {
      setWorkflow(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void load();
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    /*
     * THE FIX FOR "THE CARD DOES NOT SHOW".
     *
     * This component is above the router and never remounts, so before this
     * subscription the poll was its ONLY refresh — and a process is almost
     * always younger than one interval when its first step navigates. The
     * transcript would confirm a step, push the route, and the rail would still
     * be holding the `null` it read before the process existed.
     *
     * Not `visibilitychange`'s guard: this fires because something the customer
     * just did changed the process, so it must run even on the tick that a
     * hidden tab would skip. See `lib/support/workflow-signal.ts`.
     */
    const unsubscribe = onWorkflowChanged(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      unsubscribe();
    };
  }, [user?.id, hasAiSupport, load]);

  const step = workflow?.step ?? null;

  /*
   * Where the live-chat launcher also lives. See the class list below.
   *
   * A prefix rather than a component talking to a component, because the two are
   * in different branches of the tree with no ancestor below the app root —
   * this rail is in the root layout precisely so it survives navigation, and the
   * launcher is in `support/layout.tsx`. A route is the only fact they share.
   */
  const onSupportRoute = pathname === "/support" || pathname.startsWith("/support/");

  /*
   * Offer the walkthrough as soon as the customer is standing on its page.
   *
   * Not automatically RUN it — arriving somewhere and having the screen dim
   * without asking is startling, and a customer who navigated here themselves
   * may already know what they are doing. The rail's button is the consent, and
   * pressing it is one click on a control that is already in front of them.
   */
  const guideReady =
    step?.guide && step.route
      ? pathname === step.route || pathname.startsWith(`${step.route}/`)
      : false;

  const confirm = async () => {
    if (!step || busy) return;
    const confirmed = step;
    setBusy(true);
    const { data, error } = await $fetch<{
      message: string;
      state?: string;
      workflow?: { step?: RailWorkflow["step"] } | null;
    }>({
      url: `/api/ai/support/operation/${step.id}`,
      method: "PUT",
      silent: true,
    });
    setBusy(false);

    if (error || !data) {
      setOutcome(String(error || t("operation_failed")));
      return;
    }
    /*
     * The step's `done` sentence, but only where that is provably the sentence
     * the server just sent.
     *
     * A step with a `route` runs the SYNTHETIC runner in `workflows.ts`, whose
     * success message is `step.done || step.description` and nothing else — so a
     * COMPLETED outcome there is a catalogue constant and can be looked up. An
     * `operation` step's message is composed at run time by its runner from
     * account state this rail cannot see, so it passes through untouched.
     *
     * Guarded on the state as well: a routed step that FAILS returns a refusal,
     * and substituting the `done` text there would report a success that did not
     * happen.
     */
    setOutcome(
      data.state === "COMPLETED" && confirmed.route
        ? catalogueText(
            ta,
            workflowStepKey(workflow?.workflowKey, confirmed.stepKey, "done"),
            data.message
          )
        : data.message
    );

    /*
     * Re-read rather than patch from the response.
     *
     * The confirm route returns the next step, which is enough to advance a
     * card — but the rail also draws every step's state and the process's own
     * status, and reconstructing those from a partial response is how the two
     * would drift. One extra request per step transition is not a cost worth
     * optimising against correctness here.
     */
    await load();

    /*
     * Navigation LAST, after the confirmation is recorded and the new state is
     * in hand. Pushing first would leave the request in flight while the page
     * unmounts, and the step would look complete to the customer while nothing
     * had been written — the one state this feature exists to make impossible.
     */
    if (step.route) router.push(step.route as any);
  };

  const startGuide = () => {
    if (!step?.guide || !step.route) return;
    requestGuidance({
      key: step.guide.key,
      title: step.guide.title,
      route: step.route,
      stops: step.guide.stops,
      native: step.guide.native,
    });
  };

  if (!workflow || hiddenFor === workflow.workflowId) return null;

  const done = workflow.steps.filter((entry) => entry.state === "done").length;
  const title = catalogueText(
    ta,
    workflowTitleKey(workflow.workflowKey),
    workflow.title
  );

  return (
    <aside
      aria-label={title}
      className={cn(
        // Bottom-right rather than a true side rail: this sits above product
        // pages that already own their full width, and a column inserted beside
        // them would reflow every one. z-[var(--z-tour-rail)] keeps it UNDER the walkthrough
        // scrim at 998 — a rail drawn over its own spotlight would be the one
        // bright thing on a dimmed screen, pointing at nothing.
        "fixed end-4 z-[var(--z-tour-rail)] w-[min(20rem,calc(100vw-2rem))]",
        /*
         * IT SHARES THIS CORNER WITH THE LIVE-CHAT LAUNCHER, and it was winning.
         *
         * `support/layout.tsx` renders that launcher at `fixed end-4 bottom-4
         * z-50`. This rail is `z-[var(--z-tour-rail)]` — 997 — so it does not
         * get hidden BY the bubble, which is the natural guess; it covers the
         * bubble completely. And it does so on exactly the routes where it is
         * most likely to be showing, because `/support` is where a process is
         * started, so a customer running one lost the "talk to a person" button
         * for as long as it ran.
         *
         * Lifted clear of it there, and only there — an unconditional offset
         * would leave the rail floating off the bottom edge on every product
         * page, where nothing else occupies the corner.
         */
        onSupportRoute ? "bottom-20" : "bottom-4",
        // Depth from the SURFACE RAMP, not from a shadow. R3: a shadow on a
        // page-level surface is ratchet debt, and this panel floats over
        // arbitrary product pages — the popover ground plus a strong border
        // separates it from whatever is behind without adding elevation the
        // design system does not own.
        "border-border-strong bg-popover rounded-xl border"
      )}
    >
      <div className="border-border flex items-center gap-2 border-b px-3 py-2">
        <Sparkles className="text-primary size-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{title}</p>
          <p className="text-subtle-foreground font-mono text-[10px] tabular-nums">
            {/*
              `done + 1` is "the one being worked on", which is right while one
              IS — and off the end the moment none is. A finished process has
              every step done, so this read "Step 4 of 3" the first time the
              endpoint started returning completed work. There is no fourth
              step; there is a third, and it is finished.
            */}
            {t("step_n_of_m", {
              n: workflow.step ? done + 1 : done,
              m: workflow.totalSteps,
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="2xs"
          iconOnly
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? tCommon("expand") : tCommon("collapse")}
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", collapsed && "rotate-180")}
          />
        </Button>
        <Button
          variant="ghost"
          size="2xs"
          iconOnly
          onClick={() => setHiddenFor(workflow.workflowId)}
          aria-label={tCommon("close")}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {!collapsed ? (
        <div className="space-y-3 p-3">
          {/* Every step, not just this one. A customer partway through wants to
              see what they have already done and what is still coming — the
              difference between a process and a series of surprises. */}
          <ol className="space-y-1.5">
            {workflow.steps.map((entry) => (
              <li key={entry.index} className="flex items-start gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                    entry.state === "done" && "bg-success/15 text-success",
                    entry.state === "current" &&
                      "bg-primary text-primary-foreground",
                    entry.state === "upcoming" && "bg-muted text-muted-foreground"
                  )}
                >
                  {entry.state === "done" ? (
                    <Check className="size-2.5" />
                  ) : (
                    entry.index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[11px] leading-relaxed",
                    entry.state === "current"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {catalogueText(
                    ta,
                    workflowStepKey(workflow.workflowKey, entry.stepKey, "label"),
                    entry.label
                  )}
                </span>
              </li>
            ))}
          </ol>

          {outcome ? (
            <p className="text-muted-foreground border-border border-t pt-2.5 text-[11px] leading-relaxed">
              {outcome}
            </p>
          ) : null}

          {step ? (
            <div className="border-border space-y-2 border-t pt-2.5">
              <p className="text-xs leading-relaxed">
                {catalogueText(
                  ta,
                  workflowStepKey(workflow.workflowKey, step.stepKey, "description"),
                  step.description
                )}
              </p>

              {/* Once the customer is standing on the page, the useful button
                  changes from "take me there" to "show me". Both are offered
                  rather than swapped, because arriving is not the same as
                  having confirmed the step. */}
              {guideReady ? (
                <Button size="2xs" onClick={startGuide} className="w-full">
                  <Sparkles className="size-3" aria-hidden />
                  {t("show_me_how")}
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="2xs"
                onClick={confirm}
                disabled={busy}
                className="w-full"
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
                  workflowStepKey(workflow.workflowKey, step.stepKey, "label"),
                  step.label
                )}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground border-border border-t pt-2.5 text-[11px]">
              {t("process_finished")}
            </p>
          )}

          {/* The way back. On a customer three pages deep into a process this is
              the most useful control here, and nothing outside the transcript
              could offer it until the endpoint started returning the ticket. */}
          <Button
            variant="link"
            size="2xs"
            onClick={() => router.push(`/support/ticket/${workflow.ticketId}` as any)}
            className="text-muted-foreground hover:text-foreground w-full no-underline hover:no-underline"
          >
            <MessageSquare className="size-3" aria-hidden />
            {t("back_to_the_conversation")}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
