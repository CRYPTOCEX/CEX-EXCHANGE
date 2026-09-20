"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CornerDownLeft,
  ExternalLink,
  Gauge,
  History,
  Inbox,
  Loader2,
  Pin,
  PinOff,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { RichText } from "@/components/support/rich-text";
import { CoreMark, type CoreState } from "./core-mark";
import {
  applyPinnedAttribute,
  clearSessionId,
  fetchSession,
  readPinned,
  readSessionId,
  writePinned,
  writeSessionId,
  type AdminSessionRow as SessionRow,
  type AdminTurn as Turn,
} from "./session-store";
import { OPENERS_FOR } from "./openers";

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
 * The operator's assistant, on the right of every admin screen.
 *
 * ---------------------------------------------------------------------------
 * MOUNTED ABOVE THE ROUTER, LIKE THE CUSTOMER RAIL AND FOR A SHARPER REASON
 * ---------------------------------------------------------------------------
 * An admin procedure carries somebody across four or five screens — gateways,
 * then currencies, then methods, then the log — and every one of those is a full
 * navigation that unmounts whatever drew the last card. So this lives beside
 * `GuidanceHost` in `[locale]/layout.tsx`, above the router, and never remounts.
 *
 * It cannot live in an admin layout, and not for want of trying: `/admin/crm/*`
 * is under the `(dashboard)` route group and `/admin/ai/support/*` is under
 * `(ext)`. Those are separate layout trees, so a rail mounted in either one
 * would unmount the moment a procedure stepped between them — which is exactly
 * what `launch_the_customer_assistant` does on every step.
 *
 * ---------------------------------------------------------------------------
 * IT READS THE SERVER, IT DOES NOT REMEMBER
 * ---------------------------------------------------------------------------
 * Every approval card is drawn from `console/pending`, never from the response
 * that proposed it. The customer-side pane learned this the expensive way: it
 * rendered the blob written onto a message at proposal time, which is a
 * photograph of step 0 that nothing ever updates, and ended up announcing "step
 * 1 of 3, in progress" beside a card that had reconciled and said "all done".
 *
 * Here that failure would be worse, because the thing being announced is an
 * administrative write. So there is one source for what is outstanding, it is
 * the server, and asking a question refreshes it rather than patching it.
 *
 * ---------------------------------------------------------------------------
 * THE ASSISTANT PROPOSES; THE ADMINISTRATOR APPROVES
 * ---------------------------------------------------------------------------
 * Nothing on this panel executes anything. `Approve` is a PUT to a route that
 * re-derives the required permission from the live catalogue, checks it against
 * the caller's own role, and writes their id onto the audit row before the
 * runner is called. The safety sentence on each card is a backend constant — the
 * model chose a key from an enum and wrote nothing the reader is asked to agree
 * to.
 */

/** Slow. Every state change the administrator causes refreshes directly. */
const POLL_MS = 90_000;

/**
 * The one width at which pinning is honoured, declared once.
 *
 * ---------------------------------------------------------------------------
 * IT MUST MATCH THE STYLESHEET, AND MATCHING IT IS THE WHOLE POINT
 * ---------------------------------------------------------------------------
 * The CSS declines to reserve a gutter below this width; this component
 * declines to hide the close button below it. If the two ever disagreed the
 * result is the worst state this feature can be in — a panel covering a small
 * screen, no gutter behind it, and neither a close button (hidden because it
 * believes it is docked) nor a pin toggle (hidden because there is no room) to
 * put it away. That is a console an administrator cannot use and cannot escape.
 *
 * `xl`, because the panel is 26rem: on a 1024px screen that leaves roughly
 * 600px for an admin table, and on a tablet it leaves nothing worth having.
 */
const PIN_QUERY = "(min-width: 1280px)";

/**
 * The panel's box, shared by the real thing and by the skeleton that stands in
 * for it.
 *
 * Shared deliberately: the skeleton exists to occupy exactly the space the panel
 * is about to occupy, and the instant the two geometries are written out
 * separately they start to differ by a few pixels — which is a jump at the one
 * moment the whole point was to avoid one.
 */
const RAIL_FRAME =
  "fixed inset-y-0 end-0 flex w-[var(--assistant-rail-width)] flex-col";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * The gutter has to be written before the browser paints — an effect that runs
 * after paint is a full-width frame on every client-side arrival at `/admin`.
 * But `useLayoutEffect` warns when React renders on the server, and this
 * component is server-rendered inside the locale layout. Swapping the hook is
 * the standard way to say "layout-critical on the client, irrelevant on the
 * server", which is exactly true here: there is no layout to mutate during SSR.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PendingAction {
  id: string;
  actionKey: string;
  label: string;
  description: string;
  safety: string;
  permission: string;
  pace: "quick" | "slow";
}

interface PendingStep extends PendingAction {
  index: number;
  stepKey: string;
  route: string | null;
}

interface ProcedureStep {
  index: number;
  stepKey: string;
  label: string;
  description: string;
  kind: "navigate" | "action";
  state: "done" | "current" | "upcoming";
}

interface PendingProcedure {
  workflowId: string;
  procedureKey: string;
  title: string;
  totalSteps: number;
  state: string;
  steps: ProcedureStep[];
  step: PendingStep | null;
}

/**
 * The Live Inbox, as a depth rather than as a list.
 *
 * `null` when this administrator does not hold `view.support.ticket` — which is
 * NOT the same as an empty queue, and the two must not render the same. A zero
 * is a claim about the platform; absence is "not yours to know".
 */
interface InboxSummary {
  open: number;
  waiting: number;
  mine: number;
  screen: string;
  title: string;
}

/** A screen the rail may offer. Null when the caller could not open it. */
interface ScreenLink {
  screen: string;
  title: string;
}

interface Answer {
  /** The conversation this answer belongs to. Absent on a demo. */
  sessionId?: string;
  answer: string;
  grounded: boolean;
  /** Set on a demo install, where no provider is reached. See `demo-notice.ts`. */
  demo?: boolean;
  trialUrl?: string;
  screen?: { url: string; label: string };
  sources: Array<{ title: string; url: string }>;
}

const CSS = `
/* The panel arrives from its own edge. Transform only — a width or right
   animation would relayout the admin page behind it on every frame. */
@keyframes aia-in {
  from { transform: translateX(1.5rem); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
.aia-panel { animation: aia-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both; }

/* Each card lands just after the one above it. The stagger is what makes a
   three-card answer read as arriving rather than appearing. */
@keyframes aia-rise {
  from { transform: translateY(0.5rem); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
.aia-rise {
  /* The resting state IS the base, so a delayed card cannot paint at full
     opacity for the frames before its delay elapses. */
  opacity: 0;
  animation: aia-rise 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
.aia-d1 { animation-delay: 60ms; }
.aia-d2 { animation-delay: 120ms; }

/* The launcher's attention ring — only drawn when something is waiting. */
@keyframes aia-ping {
  0%   { transform: scale(1); opacity: 0.55; }
  70%  { transform: scale(1.7); opacity: 0; }
  100% { transform: scale(1.7); opacity: 0; }
}
.aia-ping { opacity: 0; animation: aia-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite; }

/* The progress bar's fill. Width, not height — it used to animate the height of
   a rail behind the step markers, which is the layout this replaced. */
.aia-thread { transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1); }

@media (prefers-reduced-motion: reduce) {
  .aia-panel, .aia-rise { animation: none; opacity: 1; transform: none; }
  .aia-ping { animation: none; opacity: 0; }
  .aia-thread { transition: none; }
}
`;

export default function AdminAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  /*
   * The addon's own namespace, and every sub-component below calls it again
   * rather than being handed a `t`. The key extractor reads `useTranslations`
   * calls per module to decide which keys a route loads; a `t` arriving as a
   * prop is invisible to it, and the keys would be pruned out of the built
   * chunk — an English rail in production and no way to see it in dev.
   *
   * `rail.*` for this panel, and the handbook's key where the STRING is already
   * the handbook's — the two surfaces are one assistant and translating "Past
   * conversations" twice is how they start disagreeing.
   */
  const t = useTranslations("ext_admin_ai_support");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  /*
   * PINNED IS READ SYNCHRONOUSLY, IN THE INITIALISER.
   *
   * Not in a `useEffect`. The boot script has already put the gutter on the page
   * before the first paint, so a component that started closed and opened itself
   * one effect later would paint a 26rem hole beside the admin screen for a
   * frame — the layout shift, moved rather than removed.
   *
   * The lazy initialiser runs during render, which on the server is never: it is
   * guarded because `localStorage` does not exist there, and the server's answer
   * is the honest one anyway — it cannot know this browser's preference.
   */
  const [prefersPinned, setPrefersPinned] = useState(() =>
    typeof window === "undefined" ? false : readPinned()
  );

  /*
   * IS THERE ROOM TO HONOUR IT, and this is tracked rather than assumed.
   *
   * The stylesheet already declines to reserve a gutter below this width. That
   * alone was NOT enough and left a genuinely stuck panel: the component still
   * believed it was pinned, so it hid the close button — and the pin toggle is
   * itself hidden at these widths — leaving a 26rem panel covering a phone
   * screen with no control on it that puts it away.
   *
   * So the same breakpoint decides BOTH, from one place, and it is live: a
   * window dragged narrower has to release the panel, not wait for a reload.
   */
  const [hasRoom, setHasRoom] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(PIN_QUERY).matches
  );

  useEffect(() => {
    const query = window.matchMedia(PIN_QUERY);
    const sync = () => setHasRoom(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /*
   * The preference is KEPT and simply not applied — a narrow window must not
   * quietly forget a choice the administrator made on a monitor.
   */
  const pinned = prefersPinned && hasRoom;

  // Pinning means "keep it beside me", so a pinned rail is an open one.
  const [open, setOpen] = useState(pinned);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  /*
   * THE CONVERSATION, not the last answer.
   *
   * This was a single `result` that every new question overwrote — so the
   * assistant could only ever show one exchange, and asking a follow-up
   * destroyed the answer you were following up on. Both were paid for.
   */
  const [turns, setTurns] = useState<Turn[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [procedure, setProcedure] = useState<PendingProcedure | null>(null);
  /*
   * The desk, as the rail sees it. Both come from the same poll that carries the
   * approval cards — one request, because a second endpoint on its own timer is
   * a second thing that can be stale while the first is fresh.
   */
  const [inbox, setInbox] = useState<InboxSummary | null>(null);
  const [overview, setOverview] = useState<ScreenLink | null>(null);
  /*
   * Whether the assistant is switched on for this install. `null` means "not
   * asked yet", which is NOT the same as off — rendering the launcher during
   * that gap and then removing it is a flash of a control that does not exist.
   */
  const [live, setLive] = useState<boolean | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const adminId = user?.id ? String(user.id) : null;
  const signedIn = Boolean(adminId);

  /*
   * ---------------------------------------------------------------------------
   * THE TRANSCRIPT BELONGS TO AN ADMINISTRATOR, NOT TO THIS BROWSER TAB
   * ---------------------------------------------------------------------------
   * This panel is mounted in the locale layout, above the router, and never
   * remounts on navigation — which is the whole reason a procedure can carry
   * somebody across five screens. It also means nothing here is torn down when
   * somebody signs out: `logout()` is a client-side `router.push("/")`, so no
   * document load happens, `turns` and `sessionId` survive it, and the
   * `return null` below only stops DRAWING them.
   *
   * So administrator A signed out, administrator B signed in on the same
   * machine, navigated to /admin, and the rail re-rendered A's questions and
   * A's answers verbatim — answers composed under A's permissions, about
   * queues and screens B may hold no key to.
   *
   * The server never corrected it and could not: every read is scoped by
   * `adminId` (`resolveSession`, `recentTurns`), so B's session id simply never
   * matched anything and nothing was ever fetched to overwrite what was on
   * screen. The resume effect below could not correct it either — it is guarded
   * on `!sessionId`, and A's id was still sitting in it.
   *
   * Identity is therefore watched directly, and a change in either direction
   * empties the panel. The sentinel starts `undefined` rather than null on
   * purpose: the user store hydrates asynchronously, so the first observation is
   * "nobody yet" and must not be mistaken for somebody signing out.
   */
  const lastAdminId = useRef<string | null | undefined>(undefined);
  /*
   * Declared HERE rather than beside the resume effect that owns it, because
   * the watcher below has to release it and a `useRef` cannot be read by an
   * effect declared above its `const`. See the resume effect for what it means.
   */
  const resumedFor = useRef<string | null>(null);
  useEffect(() => {
    const previous = lastAdminId.current;
    if (previous === adminId) return;
    lastAdminId.current = adminId;
    // First answer to "who is signed in?", not a change of who.
    if (previous === undefined) return;
    setTurns([]);
    setSessionId(null);
    setSessions(null);
    setError(null);
    setOutcome(null);
    setView("chat");
    /*
     * AND THE DESK, which is the same disclosure with a shorter half-life.
     *
     * `action`, `procedure`, `inbox` and `overview` are the previous
     * administrator's outstanding work and their queue depths. The poll does
     * correct them — it re-runs the moment `signedIn` flips back — but a round
     * trip later, and until it lands the panel would paint A's approval card,
     * A's procedure step and A's queue counts to B. The server refuses the
     * button (`console/action/[id]` matches `proposedTo: user.id`), so nothing
     * can be approved across identities; what is left is the reading, and the
     * reading is the whole finding.
     *
     * `live` is deliberately NOT reset: `null` means "not asked yet" and would
     * hide the launcher for a beat on every sign-in, and the poll answers it
     * before anything depends on it.
     */
    setAction(null);
    setProcedure(null);
    setInbox(null);
    setOverview(null);
    /*
     * AND THE HALF-TYPED QUESTION. It is the previous administrator's words,
     * sitting in the box under the next one's cursor — the same disclosure as
     * the transcript, just shorter, and it would be sent under B's identity the
     * moment they pressed Ask without reading it.
     */
    setQuestion("");
    /*
     * THE RESUME LATCH IS RELEASED, and this is not tidiness.
     *
     * `resumedFor` exists to stop a re-entry to /admin re-fetching over a
     * conversation in progress. Left set across a change of identity it also
     * blocks the legitimate case: the SAME administrator signs out and back in
     * — a shift change on one workstation, an expired session — the reset above
     * has just emptied the panel, and the latch then refuses to restore the
     * conversation their pointer still names. It exists on the server and is
     * paid for; the rail simply stopped being able to show it until a full
     * document load. Cleared here so the effect below resumes exactly once for
     * whoever is now signed in.
     */
    resumedFor.current = null;
  }, [adminId]);

  const loadPending = useCallback(async () => {
    const { data, error: err } = await $fetch<{
      enabled?: boolean;
      action: PendingAction | null;
      procedure: PendingProcedure | null;
      inbox: InboxSummary | null;
      overview: ScreenLink | null;
    }>({
      url: "/api/admin/ai/support/console/pending",
      silent: true,
    });
    /*
     * An error here is the honest answer to "is this available", and it is the
     * common one: a role without `access.ai.support` gets a 403 on every poll.
     * Treated as off rather than retried, so the launcher never appears for
     * somebody who cannot open the panel behind it.
     */
    if (err || !data) {
      setLive(false);
      return;
    }
    /*
     * SWITCHED OFF IS ALSO AN ANSWER, and it used to be indistinguishable from
     * "on, nothing waiting" — so an operator who had never enabled the assistant
     * still got the launcher and the Ask box, and every question came back "the
     * admin assistant is switched off". `!== false` rather than a bare read so a
     * backend that predates the field degrades to the old behaviour instead of
     * hiding a working rail.
     */
    if (data.enabled === false) {
      setLive(false);
      return;
    }
    setLive(true);
    setAction(data.action ?? null);
    setProcedure(data.procedure ?? null);
    setInbox(data.inbox ?? null);
    setOverview(data.overview ?? null);
  }, []);

  const extensions = useConfigStore((state) => state.extensions);
  const hasAiSupport =
    Array.isArray(extensions) && extensions.includes(AI_SUPPORT_EXTENSION);

  useEffect(() => {
    if (!onAdmin || !signedIn || !hasAiSupport) {
      setLive(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void loadPending();
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [onAdmin, signedIn, hasAiSupport, loadPending]);

  /*
   * THE GUTTER FOLLOWS THE PANEL, and every one of these conditions has been a
   * bug in some product's docked sidebar.
   *
   * Reserve the width only when there is genuinely a panel occupying it: pinned,
   * open, on an admin screen, signed in, and the assistant actually switched on.
   * Miss any one and the page is permanently indented beside nothing — and the
   * worst version is `live`, because the boot script cannot know whether the
   * operator has the feature enabled, so an install that turned the assistant
   * off would paint every admin screen 26rem narrow until this corrected it.
   *
   * The cleanup runs on unmount and before every re-run, which is what releases
   * the gutter when an administrator navigates off `/admin` — the rail stays
   * mounted above the router, so nothing else would.
   */
  useIsomorphicLayoutEffect(() => {
    /*
     * BEFORE THE PAINT, AND WITHOUT WAITING FOR THE POLL.
     *
     * ------------------------------------------------------------------------
     * THE BOOT SCRIPT ONLY RUNS ON A DOCUMENT LOAD
     * ------------------------------------------------------------------------
     * That is the whole remaining shift, and it is why two previous fixes did
     * not land. The blocking script in `<head>` reserves the gutter before the
     * first paint of a HARD load — but a Next App Router navigation does not
     * reload the document, so arriving at `/admin` from anywhere else runs no
     * script at all. Signing in does exactly that: the login screen navigates
     * client-side, which is precisely the path the shift was reported on.
     *
     * Waiting for `live` made it worse, because the poll is a round trip. The
     * page painted full width, sat there for a few hundred milliseconds, and
     * then narrowed — and `body` transitions `padding-inline-end`, so it slid.
     *
     * So the gutter is now applied on the SAME terms the boot script uses: this
     * administrator's saved preference, on an admin screen, wide enough to
     * honour it. Optimistic on purpose, and symmetrical with the hard-load path
     * — the poll's job is to CORRECT it, not to authorise it.
     *
     * `useLayoutEffect` rather than `useEffect`: this is a DOM mutation that has
     * to be in the same frame as the render that caused it. An effect runs after
     * paint, which is one full-width frame on every client-side arrival.
     */

    // Left the admin area — release it, whatever the preference.
    if (!onAdmin) {
      applyPinnedAttribute(false);
      return;
    }

    /*
     * The poll has answered and the assistant is off (or refused). This is the
     * one thing the boot script cannot know, so it is the one correction worth
     * making — an install with the feature disabled must not keep a 26rem hole.
     */
    if (live === false) {
      applyPinnedAttribute(false);
      return;
    }

    /*
     * Still settling. NOT a reason to remove anything: the user store hydrates
     * asynchronously, so `signedIn` is false for a frame on a hard load, and
     * acting on that would strip the gutter the boot script just set — the
     * previous version of this bug. Somebody genuinely signed out is redirected
     * off `/admin`, which the first branch handles.
     */
    if (!signedIn) return;

    applyPinnedAttribute(pinned && open);
  }, [pinned, open, onAdmin, signedIn, live]);

  /*
   * THERE IS DELIBERATELY NO UNMOUNT CLEANUP, and adding one back reintroduces
   * the reload shift.
   *
   * `useEffect(() => () => applyPinnedAttribute(false), [])` looks like tidy
   * housekeeping and is a bug: `reactStrictMode` is on, so in development React
   * mounts, runs cleanups, and mounts again. That cleanup therefore fires
   * milliseconds after the first mount and STRIPS the gutter the boot script put
   * there before the first paint. The second mount does not put it back, because
   * the poll has not answered yet and the effect above correctly holds while
   * `live` is null.
   *
   * The result is the page painting narrow, snapping to full width, then sliding
   * back when the poll lands — and `body` has a transition on
   * `padding-inline-end`, so it is a visible slide rather than a jump. That is
   * exactly the "content starts full width then moves into position" this was
   * supposed to have fixed.
   *
   * Nothing is leaked by omitting it. The effect above releases the gutter the
   * moment any condition stops holding — including `onAdmin` going false, which
   * is what a navigation away from /admin looks like — and this component is
   * mounted above the router, so a genuine unmount only happens on a document
   * load, where the boot script decides again from scratch.
   */

    const openers = useMemo(() => OPENERS_FOR(pathname), [pathname]);

  /** Read one conversation back from the server and show it. */
  const loadSession = useCallback(async (id: string) => {
    setRestoring(true);
    const session = await fetchSession(id, (url) => $fetch({ url, silent: true }));
    setRestoring(false);

    if (!session) {
      /*
       * Deleted, expired, or belonging to somebody else — all 404, and all mean
       * the same thing here. Clear it and start fresh rather than showing an
       * error about a conversation the reader may not remember having.
       */
      clearSessionId();
      setSessionId(null);
      setTurns([]);
      return;
    }

    setSessionId(session.id);
    setTurns(session.turns);
    setView("chat");
  }, []);

  /*
   * RESUME ON MOUNT. This is the whole point of the persistence: the rail is
   * above the router so it survives navigation, and this is what makes it
   * survive a RELOAD and a new tab as well.
   */
  useEffect(() => {
    if (!onAdmin || !adminId) return;
    /*
     * ONCE PER ADMINISTRATOR, tracked in a ref rather than by reading
     * `sessionId`.
     *
     * The old guard was `if (stored && !sessionId)`, which is a stale closure
     * on exactly the wrong occasion: when a second administrator signs in, the
     * effect above has queued `setSessionId(null)` but this effect still sees
     * the previous administrator's id in the render it closed over, so it
     * either skips the resume forever or — before that reset existed — kept
     * their transcript on screen. A ref is read at call time and is not
     * confusable with somebody else's conversation.
     *
     * It also keeps the original property: navigating off /admin and back
     * re-runs this effect and must not re-fetch over a conversation in
     * progress.
     *
     * The latch is keyed by id AND released by the identity watcher above, so
     * the same administrator signing out and back in resumes again rather than
     * being left staring at the panel the watcher just emptied.
     */
    if (resumedFor.current === adminId) return;
    resumedFor.current = adminId;
    // WHO is asking, so a pointer left by the previous occupant of this
    // workstation is dropped rather than followed. See `readSessionId`.
    const stored = readSessionId(adminId);
    if (stored) void loadSession(stored);
  }, [onAdmin, adminId, loadSession]);

  const loadSessions = useCallback(async () => {
    const { data } = await $fetch<{ sessions: SessionRow[] }>({
      url: "/api/admin/ai/support/console/session",
      silent: true,
    });
    setSessions(data?.sessions ?? []);
  }, []);

  /**
   * Leave this conversation and begin one with no history.
   *
   * -------------------------------------------------------------------------
   * IT ONLY DROPS THE POINTER — THE CONVERSATION IS NOT DESTROYED
   * -------------------------------------------------------------------------
   * Every turn is already on the server and the history list is how you get back
   * to it. That is the whole reason this control is safe to press: the previous
   * conversation was paid for, and starting a new one must not be a way to lose
   * it. Deleting is a separate, explicit act with its own button.
   *
   * `outcome` is cleared too. It reports the result of an approval, and leaving
   * it behind would put "the knowledge index was rebuilt" at the top of an empty
   * conversation that did nothing.
   */
  const startNew = async () => {
    clearSessionId();
    setSessionId(null);
    setTurns([]);
    setError(null);
    setOutcome(null);
    setView("chat");

    /*
     * AND THE CARD, which is why this was reported as a button that does
     * nothing.
     *
     * An approval card and a procedure are drawn from `console/pending`, not
     * from the transcript — so clearing the conversation left them sitting
     * exactly where they were, occupying the whole panel. On the commonest
     * screen for pressing this (a procedure in flight, no transcript yet) the
     * visible result of "new conversation" was no change at all.
     *
     * Dismissing is the safe direction: it runs nothing, and the server only
     * honours it for a row still PROPOSED, so it can never withdraw something
     * already approved. Without it the card would simply return on the next
     * poll, which is worse than not clearing it — it would look like the panel
     * had undone the administrator.
     */
    const outstanding = procedure?.step?.id || action?.id;
    if (outstanding) {
      setProcedure(null);
      setAction(null);
      await $fetch({
        url: `/api/admin/ai/support/console/action/${outstanding}`,
        method: "DELETE",
        silent: true,
      });
      // Re-read rather than trust the optimistic clear above: the server is
      // what decides whether anything is outstanding, here as everywhere else.
      await loadPending();
    }
  };

  /**
   * Pin the panel beside the page, or let it float over it again.
   *
   * Persisted immediately rather than on unmount: an administrator who pins it
   * and then closes the tab has expressed a preference, and losing it would
   * make the control feel like it did not work.
   */
  const togglePin = () => {
    const next = !pinned;
    setPrefersPinned(next);
    writePinned(next);
    // Pinning implies opening — there is no such thing as a pinned panel that
    // is not there.
    if (next) setOpen(true);
  };

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    setView("chat");
    setQuestion("");

    const { data, error: err } = await $fetch<Answer>({
      url: "/api/admin/ai/support/console",
      method: "POST",
      body: {
        question: trimmed,
        // Continue this conversation. An unknown or foreign id starts a new one
        // server-side rather than erroring — see `resolveSession`.
        ...(sessionId ? { sessionId } : {}),
        // The screen they are standing on. Advisory — the backend validates it
        // against the catalogue and drops it unless they could open it.
        screen: pathname,
      },
      silent: true,
    });

    setBusy(false);
    if (err || !data) {
      setError(String(err || tCommon("rail.failed")));
      // The question goes back in the box. Losing what they typed on top of not
      // getting an answer is the wrong way to fail.
      setQuestion(trimmed);
      return;
    }

    /*
     * APPENDED, never replacing. The previous exchange stays on screen because
     * it was paid for and because a follow-up is unreadable without the thing it
     * follows.
     */
    setTurns((current) => [
      ...current,
      {
        question: trimmed,
        answer: data.answer,
        grounded: data.grounded,
        demo: data.demo,
        trialUrl: data.trialUrl,
        screen: data.screen ?? null,
        sources: data.sources ?? [],
      },
    ]);

    if (data.sessionId) {
      setSessionId(data.sessionId);
      // One string, so a reload resumes — tagged with whose it is, so the next
      // administrator at this workstation does not resume it. See
      // `session-store.ts`.
      writeSessionId(data.sessionId, adminId);
    }

    // The proposal cards are drawn from the server, never from this response.
    await loadPending();
    // The newest exchange is at the BOTTOM now that this is a transcript.
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({
        top: bodyRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const approve = async (id: string, route?: string | null) => {
    if (approving) return;
    setApproving(id);
    const { data, error: err } = await $fetch<{ message: string; state: string }>({
      url: `/api/admin/ai/support/console/action/${id}`,
      method: "PUT",
      silent: true,
    });
    setApproving(null);
    setOutcome(err ? String(err) : String(data?.message || ""));

    /*
     * Re-read rather than patch from the response. The panel draws every step's
     * state and the procedure's own status, and reconstructing those from a
     * partial response is how the two would drift.
     */
    await loadPending();

    /*
     * Navigation LAST, after the approval is recorded and the new state is in
     * hand. Pushing first would leave the request in flight while the page
     * changes, and the step would look complete while nothing had been written.
     */
    if (!err && route) router.push(route as any);
  };

  if (!onAdmin || !signedIn) return null;

  /*
   * STILL ASKING — AND WHEN PINNED, SOMETHING HAS TO STAND IN THE GUTTER.
   *
   * The boot script reserved 26rem before the first paint, which is what makes a
   * pinned reload arrive already-narrow. Rendering nothing until the poll answers
   * therefore leaves a 26rem hole beside the admin screen for as long as that
   * request takes — reported as "a black screen on that part, then it loads".
   *
   * Unpinned there is no hole to fill: the launcher is a floating button over a
   * page that owns its whole width, so nothing is missing until it appears.
   */
  if (live === null) return pinned ? <RailSkeleton /> : null;

  if (live === false) return null;

  const waiting = Boolean(action || procedure?.step);
  const state: CoreState = busy
    ? "thinking"
    : waiting
      ? "waiting"
      : procedure && !procedure.step
        ? "done"
        : "idle";

  // ---- collapsed ---------------------------------------------------------
  if (!open) {
    return (
      <div className="fixed bottom-4 end-4 z-[var(--z-tour-rail)]">
        <style>{CSS}</style>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("rail.open_the_assistant")}
          className={cn(
            "border-border-strong bg-popover relative flex size-12 items-center justify-center rounded-full border",
            "hover:bg-accent transition-colors",
            waiting ? "text-warning" : "text-primary"
          )}
        >
          {waiting ? (
            <span
              aria-hidden
              className="aia-ping border-warning absolute inset-0 rounded-full border"
            />
          ) : null}
          <CoreMark state={state} className="size-8" />
        </button>
      </div>
    );
  }

  // ---- open --------------------------------------------------------------
  return (
    <aside
      aria-label={t("rail.assistant_landmark")}
      /* The hook the pinned layout addresses — `top` comes from the stylesheet
         so it can read `--header-height`, which a chrome variant overrides at
         runtime. See the pinned-rail block in globals.css. */
      data-assistant-rail=""
      className={cn(
        RAIL_FRAME,
        /*
         * DOCKED SITS LOW, FLOATING SITS HIGH. Pinned, the page and the navbar
         * have both narrowed to the same gutter, so there is nothing left in
         * this column for the panel to cover and no reason for it to outrank
         * anything — a dropdown that overflowed would win, which is correct.
         * Floating, it has no gutter and must cover whatever it lands on.
         */
        pinned ? "z-[var(--z-rail-docked)]" : "z-[var(--z-tour-rail)]",
        pinned
          ? /*
             * DOCKED: A COLUMN OF THE PAGE, SO IT PAINTS NO SURFACE OF ITS OWN.
             *
             * `bg-transparent`, and this is the fix for "it does not follow the
             * background of the page behind it". Every earlier attempt gave the
             * panel a colour — `bg-popover`, then `bg-background` — and any
             * colour is a rectangle: admin grounds carry a gradient and a ruled
             * grid, so a flat fill beside one is visibly a patch laid over the
             * page no matter how close the hue.
             *
             * The gutter is `padding` on <body> rather than a margin precisely
             * so the page's own ground still paints the full width underneath.
             * Painting nothing here lets that ground through, grid and gradient
             * included, and the column becomes part of the page instead of a
             * thing sitting on it. One hairline on the inline-start edge is the
             * only separation it needs.
             *
             * No entrance animation: it was already there — on a reload, before
             * React ran — so sliding it in would animate furniture, on every
             * admin navigation.
             */
            "border-border bg-transparent border-s"
          : /*
             * FLOATING: depth from the SURFACE RAMP plus a strong border, never
             * from a shadow. This covers arbitrary admin screens, and a shadow
             * on a page-level surface is ratchet debt — on a dark ground it also
             * degrades to nothing, so the elevation you asked for is not there.
             */
            "aia-panel border-border-strong bg-popover border-s"
      )}
    >
      <style>{CSS}</style>

      {/*
        `--header-height` PLUS ONE, and the extra pixel is the whole point.
        --------------------------------------------------------------------
        Pinned, this row sits directly beside the navbar at the same top edge,
        so the two are read as one strip across the screen — and a step in the
        middle of that strip is visible at any size. First it was 56px of
        padding against a 64px bar. Then it was `h-header`, which measured
        64px against the bar's 65 and was reported as "1px or less".

        The bar is an OUTER element carrying the border around an INNER row of
        `h-header`, so its border adds outside: 64 + 1 = 65 when scrolled. This
        is one element, and Tailwind is border-box, so `h-header` + `border-b`
        puts the border INSIDE the 64 — 63px of content and a total that lands a
        pixel short of the bar.

        Declaring the total instead makes the content box exactly `h-header` and
        the border the 65th pixel, which is the bar's geometry arrived at from
        the other direction. Measured: both bottoms at 65.000.

        The border stays at REST too, where the bar has none. That is not an
        inconsistency: at rest the bar draws no edge at all, so there is nothing
        for a hairline to disagree with — and this panel's own transcript scrolls
        independently of the page, so without it that content slides under an
        undivided header whenever the page happens to be at the top.

        `data-rail-header` is how the stylesheet gives it the bar's scrolled
        surface; see the pinned-rail block in globals.css.
      */}
      <header
        data-rail-header=""
        className="border-border flex h-[calc(var(--header-height)+1px)] items-center gap-2.5 border-b px-4"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center",
            waiting ? "text-warning" : "text-primary"
          )}
        >
          <CoreMark state={state} className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{tCommon("assistant")}</p>
          <p className="text-subtle-foreground truncate font-mono text-[10px] tracking-wider uppercase">
            {busy
              ? tCommon("working")
              : waiting
                ? t("rail.status_waiting")
                : tExt("ready")}
          </p>
        </div>
        {/*
          NEW CONVERSATION — ALWAYS, AND THE CONDITION WAS THE BUG.
          -------------------------------------------------------------------
          Twice reported as missing, and twice it really was. First it was
          icon-only: a bare `+` at sixteen pixels between the status line and a
          history icon, which an administrator had to guess meant "start
          another" rather than "add something to this one".

          Then it was labelled — and still absent, because it was rendered only
          when there was "something to leave". Standing on a procedure card with
          no transcript, which is one of the commonest states this panel is in,
          `turns` is empty and `sessionId` is null, so the button vanished at
          exactly the moment somebody wanted to change the subject.

          The reasoning behind the condition — a control that does nothing
          teaches people to ignore it — was sound and answered the wrong
          question. It is not a no-op there: it clears the outcome, leaves the
          history view and puts the panel back to a fresh prompt. And a control
          people cannot find teaches them the product cannot do it, which is a
          worse lesson than a button that occasionally has little to undo.
        */}
        <Button
          variant="ghost"
          size="2xs"
          iconOnly
          onClick={() => void startNew()}
          aria-label={t("rail.start_new_conversation")}
          title={tCommon("new_conversation_rail")}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
        {/*
          Pin is hidden below the breakpoint where the CSS honours it. Offering
          a toggle that provably does nothing on the screen you are holding is
          worse than not offering it — see the media query in globals.css.
        */}
        <Button
          variant="ghost"
          size="2xs"
          iconOnly
          onClick={togglePin}
          aria-pressed={pinned}
          aria-label={pinned ? t("rail.unpin") : t("rail.pin")}
          title={pinned ? t("rail.unpin_hint") : t("rail.pin_hint")}
          className={cn("hidden xl:inline-flex", pinned && "text-primary")}
        >
          {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="2xs"
          iconOnly
          onClick={() => {
            const next = view === "history" ? "chat" : "history";
            setView(next);
            if (next === "history") void loadSessions();
          }}
          aria-label={t("handbook.past_conversations")}
          title={t("handbook.past_conversations")}
          className={view === "history" ? "text-primary" : undefined}
        >
          <History className="size-4" />
        </Button>
        {/*
          NO CLOSE BUTTON WHILE PINNED.
          -------------------------------------------------------------------
          Pinned, the panel is part of the page: it holds a gutter the layout is
          drawn around. Closing it from here would collapse that gutter and
          reflow every admin screen, while leaving the preference set — so the
          next reload would reserve the width again and reopen. A control whose
          effect the next page load silently undoes is not a close button.

          Unpin is the way out, and it is right there. That also makes the two
          states honest about themselves: floating, it can be dismissed; docked,
          it is furniture, and you move furniture rather than closing it.
        */}
        {!pinned ? (
          <Button
            variant="ghost"
            size="2xs"
            iconOnly
            onClick={() => setOpen(false)}
            aria-label={t("rail.close")}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </header>

      <Workbench
        inbox={inbox}
        overview={overview}
        onOpen={(url) => router.push(url as any)}
      />

      {view === "history" ? (
        <HistoryList
          sessions={sessions}
          currentId={sessionId}
          onStartNew={startNew}
          onOpen={loadSession}
          onDelete={async (id) => {
            await $fetch({
              url: `/api/admin/ai/support/console/session/${id}`,
              method: "DELETE",
              silent: true,
            });
            if (id === sessionId) startNew();
            await loadSessions();
          }}
        />
      ) : (
      <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
        {restoring ? <Thinking /> : null}

        {/*
          THE TRANSCRIPT, oldest first.
          -------------------------------------------------------------------
          Every exchange stays. This panel used to render one `result` that the
          next question overwrote — so a follow-up destroyed the answer it was
          following up on, and both had been paid for.
        */}
        {turns.map((turn, i) => (
          <Exchange
            key={i}
            turn={turn}
            onOpenScreen={(url) => router.push(url as any)}
          />
        ))}

        {/* A procedure outranks everything: it is the thing in flight. */}
        {procedure ? (
          <ProcedureCard
            procedure={procedure}
            approving={approving}
            onApprove={approve}
          />
        ) : null}

        {action ? (
          <ApprovalCard
            action={action}
            busy={approving === action.id}
            onApprove={() => approve(action.id)}
          />
        ) : null}

        {outcome ? (
          <Card padding="sm" variant="muted" className="aia-rise">
            <p className="text-xs leading-relaxed">{outcome}</p>
          </Card>
        ) : null}

        {error ? (
          <Card padding="sm" tone="destructive" className="aia-rise">
            <p className="text-destructive text-xs leading-relaxed">{error}</p>
          </Card>
        ) : null}

        {busy ? <Thinking /> : null}

        {/*
          The openers are CONTEXTUAL to the screen behind the panel, and they
          cost nothing — no model call, no request. An empty box gives an
          administrator no way to tell whether this knows about the screen they
          are standing on or only about the assistant addon it lives in.
        */}
        {!turns.length && !busy && !restoring && !procedure && !action ? (
          <div className="space-y-2">
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              {openers.heading}
            </p>
            {openers.questions.map((opener) => (
              <button
                key={opener}
                type="button"
                onClick={() => ask(opener)}
                className="border-border hover:bg-accent/60 w-full rounded-lg border px-2.5 py-2 text-start text-xs leading-relaxed transition-colors"
              >
                {opener}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      )}

      <div className="border-border border-t px-4 py-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(question);
            }
          }}
          placeholder={t("rail.placeholder")}
          rows={2}
          maxLength={1000}
          className="resize-none border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          {/*
            WHAT IT IS, not where the text came from.
            -----------------------------------------------------------------
            This said "Answers from your operator documentation." Accurate, and
            it described the least interesting thing the assistant does while
            omitting all three of the others — it reads live queues, it opens
            the right screen, it runs procedures. A reader who only sees that
            sentence concludes they are looking at a search box over a manual,
            which is a worse product than the one they have.
          */}
          <p className="text-subtle-foreground text-[10px]">
            {t("rail.footnote")}
          </p>
          <Button
            size="2xs"
            disabled={busy || !question.trim()}
            onClick={() => ask(question)}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <CornerDownLeft className="size-3" aria-hidden />
            )}
            {tCommon("ask")}
          </Button>
        </div>
      </div>
    </aside>
  );
}

/**
 * What stands in the gutter while the panel is still finding out what to draw.
 *
 * ---------------------------------------------------------------------------
 * IT IS THE SHAPE OF THE PANEL, NOT A SPINNER
 * ---------------------------------------------------------------------------
 * A spinner in a 26rem column says "something is coming" and gives no idea what
 * size or shape, so the arrival is still a jump. These blocks sit exactly where
 * the header row, the desk strip and the first opener will be, which is what
 * makes the swap read as the same thing becoming legible rather than as one
 * thing replacing another.
 *
 * NO ENTRANCE ANIMATION AND NO PULSE. Both are the same mistake in different
 * clothes: a skeleton draws at REST, because it is standing in for content that
 * is about to appear in that exact position — so any offset it animates from IS
 * a slide, and any pulse is motion in a column the reader is trying to look past.
 * The rail's own `aia-panel` entrance is deliberately not applied here either;
 * a pinned panel was already there before React ran.
 *
 * `aria-hidden` with a live label on the wrapper: a screen reader should be told
 * "loading" once, not read out six meaningless boxes.
 */
function RailSkeleton() {
  const t = useTranslations("ext_admin_ai_support");
  return (
    <aside
      aria-label={t("rail.loading")}
      aria-busy="true"
      data-assistant-rail=""
      /* The docked frame exactly — same width variable, same edge, same
         transparent ground, same hairline. See `RAIL_FRAME`. */
      className={cn(
        RAIL_FRAME,
        "z-[var(--z-rail-docked)] border-border bg-transparent border-s"
      )}
    >
      <div aria-hidden className="contents">
        {/* Header row: mark, then two lines of title. The real header's exact
            height, border included — the swap from skeleton to panel must not
            move the strip's edge by even the pixel this whole note is about. */}
        <div
          data-rail-header=""
          className="border-border flex h-[calc(var(--header-height)+1px)] items-center gap-2.5 border-b px-4"
        >
          <span className="bg-muted size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="bg-muted block h-3 w-24 rounded-full" />
            <span className="bg-muted/60 block h-2 w-16 rounded-full" />
          </div>
        </div>

        {/* The desk strip. */}
        <div className="border-border flex items-stretch gap-1.5 border-b px-4 py-2">
          <span className="border-border h-9 flex-1 rounded-lg border" />
          <span className="border-border h-9 w-24 shrink-0 rounded-lg border" />
        </div>

        {/* Where the openers land. */}
        <div className="flex-1 space-y-2 px-4 py-3.5">
          <span className="bg-muted/60 mb-1 block h-2 w-20 rounded-full" />
          <span className="border-border block h-9 w-full rounded-lg border" />
          <span className="border-border block h-9 w-full rounded-lg border" />
          <span className="border-border block h-9 w-full rounded-lg border" />
        </div>

        {/* The ask box. */}
        <div className="border-border border-t px-4 py-3">
          <span className="bg-muted/60 block h-3 w-40 rounded-full" />
        </div>
      </div>
    </aside>
  );
}

/**
 * The desk, one row, above everything.
 *
 * ---------------------------------------------------------------------------
 * THE ASSISTANT KNOWS WHAT IS WAITING — SO IT SHOULD SAY SO WITHOUT BEING ASKED
 * ---------------------------------------------------------------------------
 * `operations_queue` could already answer "how many conversations are waiting",
 * and answering it cost a model call, several seconds and real money. A number
 * an administrator wants on every screen should not be behind a paid question,
 * and it arrives on a poll this panel was already making.
 *
 * ---------------------------------------------------------------------------
 * EITHER HALF CAN BE ABSENT, AND ABSENT IS NOT ZERO
 * ---------------------------------------------------------------------------
 * The two destinations are gated on different keys — `view.support.ticket` for
 * the inbox, `access.ai.support` for the overview — and the server sends only
 * the ones this administrator may open. A desk agent with tickets but no
 * assistant access gets one button; the whole strip disappears when they may
 * open neither, rather than offering a button to a screen that then refuses.
 *
 * That is also why an inbox nobody may read is `null` and not `{open: 0}`: a
 * zero would be a claim about the platform, made to somebody who is not
 * entitled to it and who would have no way to tell it was fabricated.
 */
function Workbench({
  inbox,
  overview,
  onOpen,
}: {
  inbox: InboxSummary | null;
  overview: ScreenLink | null;
  onOpen: (url: string) => void;
}) {
  const t = useTranslations("ext_admin_ai_support");
  const tCommon = useTranslations("common");
  if (!inbox && !overview) return null;

  /*
   * WAITING outranks OPEN, and they are different questions. `open` is the
   * queue's depth — what the screen lists. `waiting` is the subset where a
   * customer has asked for a person, or a colleague is mid-way through: work
   * with a promise running against it. A calm strip shows the depth; the moment
   * somebody is waiting, that is the number the eye should land on.
   */
  const urgent = Boolean(inbox && inbox.waiting > 0);

  return (
    <nav
      aria-label={tCommon("support_desk")}
      className="border-border flex items-stretch gap-1.5 border-b px-4 py-2"
    >
      {inbox ? (
        <button
          type="button"
          onClick={() => onOpen(inbox.screen)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-start transition-colors",
            urgent
              ? "border-warning/40 bg-warning/10 hover:bg-warning/20"
              : "border-border hover:bg-accent/60"
          )}
        >
          <Inbox
            aria-hidden
            className={cn(
              "size-3.5 shrink-0",
              urgent ? "text-warning-ink" : "text-muted-foreground"
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11px] font-medium">
              {/* The inbox screen's own name, already keyed for the console —
                  the rail must not invent a second label for one destination. */}
              {t("live_inbox")}
            </span>
            {urgent ? (
              /* ICU, not "{n} " + a sentence. The count is inside the message so
                 a translator can put it where their language puts it — and so
                 the singular is a plural CATEGORY rather than an English `s`
                 that Slavic and Arabic have no rule for. */
              <span className="text-warning-ink block truncate text-[10px]">
                {t("rail.n_waiting_for_a_person", { count: inbox.waiting })}
              </span>
            ) : null}
          </span>
          {/*
            Tabular figures. This number changes under the reader on a poll, and
            proportional digits make it jump sideways when 9 becomes 10 — which
            reads as the whole strip twitching.
          */}
          <span
            className={cn(
              "shrink-0 font-mono text-[11px] tabular-nums",
              urgent ? "text-warning-ink font-semibold" : "text-muted-foreground"
            )}
          >
            {inbox.open}
          </span>
          <ChevronRight
            aria-hidden
            className="text-subtle-foreground size-3 shrink-0"
          />
        </button>
      ) : null}

      {overview ? (
        <button
          type="button"
          onClick={() => onOpen(overview.screen)}
          title={overview.title}
          className={cn(
            "border-border hover:bg-accent/60 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors",
            // Shrinks first. When both are present the queue depth is the thing
            // worth the width; this one still reads at its label's own size.
            "shrink-0"
          )}
        >
          <Gauge aria-hidden className="text-muted-foreground size-3.5" />
          <span className="text-[11px] font-medium">{tCommon("overview")}</span>
        </button>
      ) : null}
    </nav>
  );
}

/**
 * One question and the answer to it.
 *
 * The question is drawn as a quiet header rather than as a chat bubble. A rail
 * this narrow cannot afford two speech plates, and the administrator does not
 * need reminding at length what they typed — they need to be able to tell where
 * one exchange ends and the next begins while scrolling back through six of
 * them.
 */
function Exchange({
  turn,
  onOpenScreen,
}: {
  turn: Turn;
  onOpenScreen: (url: string) => void;
}) {
  const t = useTranslations("ext_admin_ai_support");
  return (
    <div className="aia-rise space-y-2.5">
      <p className="text-muted-foreground border-border border-b pb-1.5 text-[11px] font-medium">
        {turn.question}
      </p>

      {/*
        RichText, not `whitespace-pre-wrap`. The most useful answer this
        assistant gives — "what is waiting for me" — is a table, and a model
        writes one whether or not anything can draw it. Rendered as plain text it
        arrived as its own source: pipes, dashes and all.
      */}
      <RichText className="text-sm">{turn.answer}</RichText>

      {turn.demo ? (
        <a
          href={turn.trialUrl || "https://mashdiv.com/ai"}
          target="_blank"
          rel="noreferrer"
          /* `text-primary-ink`, not `text-primary`. A 10% tint under the tone's
             own hue at text-xs fails AA — the ink token mixes the tone with the
             foreground so it stays legible on its own chip. */
          className="border-primary/40 bg-primary/10 text-primary-ink hover:bg-primary/20 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {t("handbook.trial_cta")}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : null}

      {turn.screen ? (
        <Button
          size="sm"
          className="w-full"
          onClick={() => onOpenScreen(turn.screen!.url)}
        >
          <ArrowUpRight className="size-3.5" aria-hidden />
          {turn.screen.label}
        </Button>
      ) : null}

      {turn.sources.length ? (
        <div className="border-border border-t pt-2.5">
          {/*
            "Checked against", not "Sources".
            -----------------------------------------------------------------
            Same list, and the heading changes what a reader concludes from it.
            "Sources" reads as an admission — *this is a search box, here is what
            it found* — which is the opposite of true and the opposite of what
            the citations are for. They are a VERIFICATION: an operator about to
            change a setting on a live exchange can see the answer was grounded
            rather than invented.
          */}
          <p className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-wider uppercase">
            {t("handbook.checked_against")}
          </p>
          <ul className="space-y-1">
            {turn.sources.slice(0, 5).map((source, i) => (
              <li key={`${source.url}-${i}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-start gap-1.5 text-[11px] transition-colors"
                >
                  <span className="text-subtle-foreground shrink-0 font-mono tabular-nums">
                    [{i + 1}]
                  </span>
                  <span className="underline-offset-2 hover:underline">
                    {source.title}
                  </span>
                  <ExternalLink className="mt-0.5 size-2.5 shrink-0" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Past conversations.
 *
 * ---------------------------------------------------------------------------
 * THE COST IS ON EVERY ROW, AND IT IS THE POINT
 * ---------------------------------------------------------------------------
 * These answers were billed. Showing what each conversation cost is what turns
 * a history list from a convenience into the reason the feature exists: an
 * operator can see that reopening the one they already paid for is free, and
 * asking it again is not.
 */
function HistoryList({
  sessions,
  currentId,
  onStartNew,
  onOpen,
  onDelete,
}: {
  sessions: SessionRow[] | null;
  currentId: string | null;
  onStartNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("ext_admin_ai_support");
  const tCommon = useTranslations("common");
  /*
   * THE SECOND WAY OUT, and it is here because this is where people look.
   * -------------------------------------------------------------------------
   * Somebody who wants a different conversation opens the list of conversations
   * — so "start a fresh one" belongs at the top of that list, not only as a
   * control in the header they were trying to get away from. Rendered above
   * every branch below, including the empty one, so it is never the case that
   * opening history is a dead end.
   */
  const newButton = (
    <Button variant="outline" size="2xs" className="w-full" onClick={onStartNew}>
      <Plus className="size-3.5" aria-hidden />
      {tCommon("new_conversation_rail")}
    </Button>
  );

  if (sessions === null) {
    return (
      <div className="flex-1 space-y-3 px-4 py-3.5">
        {newButton}
        <Thinking />
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="flex-1 space-y-3 px-4 py-3.5">
        {newButton}
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("handbook.no_conversations")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3.5">
      {newButton}
      {sessions.map((session) => (
        <Card
          key={session.id}
          padding="sm"
          variant={session.id === currentId ? "default" : "muted"}
          className="aia-rise flex items-start gap-2"
        >
          <button
            type="button"
            onClick={() => onOpen(session.id)}
            className="min-w-0 flex-1 text-start"
          >
            <span className="block truncate text-xs font-medium">
              {session.title}
            </span>
            <span className="text-subtle-foreground mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px]">
              {/* ICU, because "question" + "s" is not a plural in most of the
                  ninety locales this ships in — several have a category for 2,
                  for 3-4 and for 11+, and none of them is an English suffix. */}
              <span>{t("rail.n_questions", { count: session.turnCount })}</span>
              {/*
                Four decimals. A single admin question costs fractions of a
                cent, and two would round most conversations to $0.00 — which
                reads as free and is the one impression this column exists to
                correct.
              */}
              {session.costUsd > 0 ? <span>${session.costUsd.toFixed(4)}</span> : null}
              {session.screen ? (
                <span className="truncate">{session.screen}</span>
              ) : null}
            </span>
          </button>
          <Button
            variant="ghost"
            size="2xs"
            iconOnly
            onClick={() => onDelete(session.id)}
            aria-label={t("rail.delete_conversation")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </Card>
      ))}
    </div>
  );
}

/**
 * The waiting state, drawn rather than spelled.
 *
 * Three bars that fill in sequence. It says the same thing a spinner says and
 * says it in the panel's own vocabulary — and unlike a spinner it occupies the
 * space the answer is about to take, so the panel does not jump when it arrives.
 */
function Thinking() {
  const t = useTranslations("ext_admin_ai_support");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-2 py-1" role="status" aria-label={tCommon("working")}>
      <span className="bg-muted block h-2.5 w-4/5 rounded-full" />
      <span className="bg-muted block h-2.5 w-full rounded-full" />
      <span className="bg-muted block h-2.5 w-3/5 rounded-full" />
    </div>
  );
}

/**
 * One action, waiting for approval.
 *
 * Everything on this card except the button label is a backend constant. That is
 * the whole safety argument for the feature: the administrator is approving a
 * sentence the catalogue wrote, not one the model did.
 */
function ApprovalCard({
  action,
  busy,
  onApprove,
}: {
  action: PendingAction;
  busy: boolean;
  onApprove: () => void;
}) {
  const t = useTranslations("ext_admin_ai_support");
  const tCommon = useTranslations("common");
  return (
    <Card padding="sm" tone="warning" className="aia-rise space-y-2.5">
      <div className="flex items-start gap-2">
        <ShieldCheck className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">{action.label}</p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            {action.description}
          </p>
        </div>
      </div>

      {/* The blast radius, on the card. An administrator approving something
          they did not initiate is deciding under time pressure, and a cautious
          reader who cannot tell whether it is destructive will either refuse a
          safe action or approve it while unsure. */}
      <p className="text-subtle-foreground border-border border-t pt-2 text-[11px] leading-relaxed">
        {action.safety}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="text-subtle-foreground font-mono text-[10px]">
          {action.pace === "slow" ? t("rail.pace_slow") : t("rail.pace_quick")}
        </span>
        <Button size="2xs" onClick={onApprove} disabled={busy}>
          {busy ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <Check className="size-3" aria-hidden />
          )}
          {tCommon("approve")}
        </Button>
      </div>
    </Card>
  );
}

/**
 * A procedure, with the whole sequence visible.
 *
 * Every step, not just the current one. An administrator partway through wants
 * to see what they have done and what is coming — the difference between a
 * procedure and a series of surprises — and on the admin side the ORDER is
 * usually the part they did not know.
 */
function ProcedureCard({
  procedure,
  approving,
  onApprove,
}: {
  procedure: PendingProcedure;
  approving: string | null;
  onApprove: (id: string, route?: string | null) => void;
}) {
  const t = useTranslations("ext_admin_ai_support");
  const done = procedure.steps.filter((s) => s.state === "done").length;
  const step = procedure.step;
  const total = procedure.totalSteps || procedure.steps.length || 1;

  return (
    <Card padding="sm" className="aia-rise space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-xs font-semibold">{procedure.title}</p>
          <span className="text-subtle-foreground shrink-0 font-mono text-[10px] tabular-nums">
            {/*
              `done + 1` is "the one being worked on", which is right while one
              IS and off the end the moment none is. A finished procedure has
              every step done, so this must not read "step 5 of 4".
            */}
            {step ? done + 1 : done}/{total}
          </span>
        </div>
        {/* One bar, so progress is legible before the eye has read the list. */}
        <div className="bg-muted h-0.5 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "aia-thread h-full rounded-full",
              step ? "bg-primary" : "bg-success"
            )}
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      </div>

      {/*
        THE CONNECTOR IS LAID OUT, NOT POSITIONED.
        --------------------------------------------------------------------
        This was two absolutely-positioned spans behind the markers, with the
        filled one's height set to `done/total` as a percentage of the list.
        Three things were wrong with that and all three were visible: the
        percentage is of the LIST's height, so it lands mid-label rather than on
        a marker; the line ran THROUGH each marker instead of between them; and
        the last step got a tail below it going nowhere.

        Each step now owns the segment BELOW its own marker, in a flex column
        that centres it under the marker by construction. No magic offset, and
        it stays correct if the marker size or the row spacing changes.
      */}
      <ol>
        {procedure.steps.map((entry, i) => {
          const last = i === procedure.steps.length - 1;
          return (
            <li key={entry.index} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold",
                    entry.state === "done" && "bg-success/20 text-success",
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
                {!last ? (
                  <span
                    aria-hidden
                    className={cn(
                      "w-px flex-1",
                      entry.state === "done" ? "bg-success/40" : "bg-border"
                    )}
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  "min-w-0 flex-1 text-[11px] leading-relaxed",
                  last ? "pb-0" : "pb-2.5",
                  entry.state === "current"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                {entry.label}
              </span>
            </li>
          );
        })}
      </ol>

      {step ? (
        <div className="border-border space-y-2 border-t pt-2.5">
          <p className="text-[11px] leading-relaxed">{step.description}</p>
          <p className="text-subtle-foreground text-[11px] leading-relaxed">
            {step.safety}
          </p>
          <Button
            size="2xs"
            className="w-full"
            disabled={approving === step.id}
            onClick={() => onApprove(step.id, step.route)}
          >
            {approving === step.id ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : step.route ? (
              <ArrowUpRight className="size-3" aria-hidden />
            ) : (
              <Check className="size-3" aria-hidden />
            )}
            {step.label}
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground border-border flex items-center gap-1.5 border-t pt-2.5 text-[11px]">
          <Sparkles className="text-success size-3" aria-hidden />
          {t("rail.procedure_finished")}
        </p>
      )}
    </Card>
  );
}
