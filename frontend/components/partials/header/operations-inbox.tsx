"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, HelpCircle, Inbox, Loader2 } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/config/sla";
import {
  OVERDUE_ICON,
  TONE_INK,
  TONE_SOLID,
  TONE_TILE,
  URGENCY_TONE,
  compareQueues,
  queueAgeHours,
  queueGlyph,
  queueUrgency,
} from "@/config/operations";
import { checkPermission } from "@/components/blocks/data-table/utils/permissions";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";

/**
 * The operator's inbox: every queue's pending count, in the header.
 *
 * WHY THIS IS NOT A NAV SECTION. The queues were briefly grouped under an
 * "Operations" nav item, which made the top nav seven items wide and pushed the
 * whole control cluster right. More importantly it was the wrong shape:
 * Operations is not a category you browse, it is WORK WAITING ON YOU. A nav
 * label can only ever say "there is a page here"; a count says "there are three
 * withdrawals and one is six days old", which is the entire question an operator
 * opens the admin to answer.
 *
 * So the queues keep their natural homes in the nav (Withdrawals under Finance,
 * Verification and Support under Users) — the nav is the TAXONOMY — and this is
 * the WORKFLOW view that cuts across it.
 *
 * WHY IT IS A PANEL AND NO LONGER A 320px LIST
 * --------------------------------------------
 * It was a single narrow column of label-and-number rows, which was adequate at
 * five queues and stopped being adequate the moment addons started contributing
 * their own: a platform running P2P, NFT, the gateway, the store, ICO, staking,
 * affiliates, copy trading, bots, forex and the knowledge base has up to
 * NINETEEN. Nineteen rows in a 320px column is a scroll, and a scroll in a
 * popover hides exactly the thing the popover exists to reveal.
 *
 * The panel is therefore two columns and ~44rem wide, and it is organised by
 * URGENCY rather than by section: everything that needs a decision is up top,
 * sorted worst-first, and the queues that are clear collapse into a single line
 * of pills at the bottom. That line is deliberately still present — "Deposits,
 * Transfers and P2P Offers are clear" is a real answer, and dropping those rows
 * entirely would leave an operator unsure whether the queue was empty or simply
 * not being counted.
 *
 * Every row carries its own ICON, from the shared map in `config/operations.ts`,
 * so the same glyph means the same queue here as on the queue's own page.
 *
 * THIS IS THE ONLY QUEUE SURFACE. The admin dashboard used to carry a `WorkBoard`
 * card that was a larger copy of this panel — same endpoint, same 60-second
 * timer, same per-queue anatomy out of the same maps — and it was removed rather
 * than kept in parallel. Two consequences for anyone changing this file:
 *
 *   - The pill row of CLEAR queues at the bottom is now load-bearing. It was
 *     already the only thing separating "this queue is empty" from "this queue
 *     is not counted"; it is now also the only place a quiet queue appears at
 *     all. Do not drop it to save space.
 *   - Coverage regressions here are no longer caught by a second surface. A
 *     queue missing from `/api/admin/operations/summary`, or gated off by a
 *     permission an operator legitimately holds, is now invisible platform-wide.
 *
 * Counts come from one aggregate request (`/api/admin/operations/summary`), and
 * the SLA thresholds behind the amber/red treatment are the same ones the
 * dashboard health card and the queues' own age columns use. The dashboard also
 * still reads that endpoint for its alert band, so a BREACHED queue is stated on
 * arrival without opening this panel.
 */

interface QueueSummary {
  key: string;
  label: string;
  href: string;
  permission: string;
  /** "core" is the five every install has; "addon" comes from an extension. */
  group?: "core" | "addon";
  extension?: string | null;
  count: number;
  breached: number;
  slaHours: number;
  oldestAt: string | null;
  unavailable?: boolean;
}

const POLL_MS = 60_000;

/** One queue, as a card in the panel's grid. */
function QueueRow({
  queue,
  onNavigate,
}: {
  queue: QueueSummary;
  onNavigate: () => void;
}) {
  const t = useTranslations("components");
  const urgency = queueUrgency(queue);
  const tone = URGENCY_TONE[urgency];
  const ageHours = queueAgeHours(queue);

  /* How much of the budget the OLDEST item has spent. Capped at 100: a bar
     reading "340%" is a worse signal than a full bar plus the age text, and an
     uncapped width would overflow its track. */
  const spent =
    queue.slaHours > 0 && queue.count > 0
      ? Math.min(100, (ageHours / queue.slaHours) * 100)
      : 0;

  return (
    <Link
      href={queue.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-border bg-card p-2.5",
        "transition-colors duration-200 hover:border-border-strong hover:bg-surface-2",
        "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-sm",
          TONE_TILE[tone],
          TONE_INK[tone]
        )}
      >
        {queueGlyph(queue.key, "h-4 w-4")}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{queue.label}</span>
          <span className="flex shrink-0 items-baseline gap-1.5">
            {queue.breached > 0 && queue.breached < queue.count && (
              <span
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-destructive-ink"
                title={`${queue.breached} of ${queue.count} past the ${formatDuration(queue.slaHours)} target`}
              >
                <OVERDUE_ICON className="h-3 w-3" />
                {queue.breached}
              </span>
            )}
            <span
              className={cn(
                "font-mono text-base font-semibold leading-none tabular-nums",
                queue.unavailable ? "text-subtle-foreground" : TONE_INK[tone]
              )}
            >
              {queue.unavailable ? "—" : queue.count}
            </span>
          </span>
        </span>

        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {queue.unavailable
            ? t("could_not_be_read")
            : `oldest ${formatDuration(ageHours)} · ${formatDuration(queue.slaHours)} target`}
        </span>

        {/* The track always draws so the cards line up; only the fill varies. */}
        <span className="mt-1.5 block h-0.5 w-full overflow-hidden rounded-sm bg-surface-3">
          <span
            className={cn("block h-full rounded-sm", TONE_SOLID[tone])}
            style={{ width: `${spent}%` }}
          />
        </span>
      </span>
    </Link>
  );
}

export function OperationsInbox({ className }: { className?: string }) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const user = useUserStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  /*
   * FETCHING IS DRIVEN BY A NONCE, NOT BY CALLING A LOADER.
   *
   * Everything that wants fresh counts — the 60-second poll, and opening the
   * panel — bumps `nonce` from a CALLBACK, and the one effect below turns a
   * change in `nonce` into a request. Nothing writes state synchronously inside
   * an effect body, which is what `react-hooks/set-state-in-effect` asks for,
   * and it is also the honest shape: a poll is an external system reporting
   * back, not a render deriving a value.
   *
   * A consequence worth stating: there is no "loading" flag raised on the way
   * IN. `loaded` marks the first pass only, so the spinner shows until the
   * first answer and never again — a 60-second poll flashing a spinner over a
   * panel the operator is reading is noise, and the counts update in place.
   */
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => setNonce((n) => n + 1), POLL_MS);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await $fetch({
        url: "/api/admin/operations/summary",
        silent: true,
      });
      // A poll that lands after unmount, or after a newer one, must not write.
      if (cancelled) return;
      if (!error && data) {
        setQueues(Array.isArray(data.queues) ? data.queues : []);
      }
      /* Set even on failure: the panel has to stop saying "Counting…" or a
         backend outage leaves it spinning forever with no way to tell. The last
         good counts stay on screen, which is the right thing to keep showing. */
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, nonce]);

  const { active, clear, total, breached, permittedCount } = useMemo(() => {
    // Same gate the nav uses: a queue the operator cannot open is not shown,
    // and its count is not folded into the badge.
    const permitted = queues.filter((q) => checkPermission(user, q.permission));
    return {
      /* "Needs a decision" is anything with work in it OR anything the server
         could not read — an unreadable queue is not a clear queue, and putting
         it in the pill row at the bottom would say it was. */
      active: permitted
        .filter((q) => q.count > 0 || q.unavailable)
        .sort(compareQueues),
      clear: permitted
        .filter((q) => q.count === 0 && !q.unavailable)
        .sort((a, b) => a.label.localeCompare(b.label)),
      total: permitted.reduce((s, q) => s + q.count, 0),
      breached: permitted.reduce((s, q) => s + q.breached, 0),
      permittedCount: permitted.length,
    };
  }, [queues, user]);

  if (!user) return null;
  if (loaded && permittedCount === 0) return null;

  const label = total > 99 ? "99+" : String(total);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Refresh on open, so a decision made seconds ago is reflected rather
        // than whatever the last poll happened to catch.
        if (next) setNonce((n) => n + 1);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                total > 0
                  ? t("operations_items_waiting", { total: String(total) })
                  : t("operations_nothing_waiting")
              }
              // The header control tile, copied verbatim from its neighbours
              // (NotificationBell, ThemeToggle, the wallet button).
              className={cn(
                "relative rounded-xl border transition-all duration-200",
                "text-muted-foreground hover:text-foreground border-border hover:border-border-strong hover:bg-muted",
                className
              )}
            >
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <AnimatePresence>
                {total > 0 && (
                  <m.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1"
                  >
                    {/* Width grows with the digits — a fixed square clips
                        "99+". Red only when something is past its target;
                        otherwise this is information, not an alarm. */}
                    <Badge
                      variant={breached > 0 ? "destructive" : "default"}
                      className={cn(
                        "h-5 min-w-5 px-1 py-0 flex items-center justify-center text-[10px] leading-none font-bold tabular-nums rounded-full border-2 border-background",
                        breached === 0 && "bg-primary text-primary-foreground"
                      )}
                    >
                      {label}
                    </Badge>
                  </m.div>
                )}
              </AnimatePresence>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {total > 0
            ? `${total} waiting${breached > 0 ? t("overdue", { breached: String(breached) }) : ""}`
            : tCommon("nothing_waiting")}
        </TooltipContent>
      </Tooltip>

      {/*
        `min()` rather than a fixed width so the panel never exceeds the
        viewport on a narrow window — a 44rem popover anchored to the right of a
        390px screen would otherwise render mostly off-canvas. The grid drops to
        one column below `sm` for the same reason.
      */}
      <PopoverContent
        align="end"
        className="w-[min(92vw,44rem)] max-h-[min(78vh,40rem)] overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-popover px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              Operations
              {!loaded && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {!loaded
                ? `${t("counting")}…`
                : total > 0
                  ? `${total} waiting on a decision${breached > 0 ? t("overdue", { breached: String(breached) }) : ""}`
                  : t("nothing_waiting_on_a_decision")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {breached > 0 && (
              <Badge tone="destructive" appearance="soft" className="tabular-nums">
                {breached} overdue
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
              <Link href="/admin" onClick={() => setOpen(false)}>
                Dashboard
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-3">
          {active.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {active.map((queue) => (
                <QueueRow
                  key={queue.key}
                  queue={queue}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          ) : (
            loaded && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-medium">{t("every_queue_is_clear")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("nothing_is_waiting_on_a_decision_right_now")}
                  </p>
                </div>
              </div>
            )
          )}

          {/*
            The clear queues stay visible as pills. Removing them would save
            space and cost the operator the ability to tell "this queue is
            empty" from "this queue is not being counted" — which is the whole
            value of an inbox that claims to cover everything.
          */}
          {clear.length > 0 && active.length > 0 && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
                <CheckCircle2 className="h-3 w-3 text-success" />
                Clear
              </p>
              <div className="flex flex-wrap gap-1.5">
                {clear.map((queue) => (
                  <Link
                    key={queue.key}
                    href={queue.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {queueGlyph(queue.key, "h-3 w-3")}
                    {queue.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {active.some((q) => q.unavailable) && (
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <HelpCircle className="mt-px h-3 w-3 shrink-0" />
              {t("a_dash_means_the_queue_could")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default OperationsInbox;
