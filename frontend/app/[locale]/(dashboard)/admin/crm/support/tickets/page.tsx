"use client";
import { useState, useEffect } from "react";
import { m } from "framer-motion";
import {
  MessageCircle,
  Clock,
  CheckCircle,
  Users,
  Zap,
  Star,
  Headphones,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Loadable } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import DataTable from "@/components/blocks/data-table";
import { useTableStore } from "@/components/blocks/data-table/store";
import type { BulkAction } from "@/components/blocks/data-table/types/table";
import { useUserStore } from "@/store/user";
import { useColumns, useViewConfig } from "../columns";
import { useAnalytics } from "../analytics";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

/**
 * Every ticket the desk has ever had — the archive, and the numbers over it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A SEPARATE ROUTE NOW
 * ---------------------------------------------------------------------------
 * This page used to BE `/admin/crm/support`. That route is now the desk console:
 * queue, conversation and case in one viewport, which is the shape the work
 * actually has — an operator answers tickets, they do not sort them.
 *
 * What a console cannot be is an archive. Search across the whole desk, filters
 * on every column, CSV export, bulk close / reopen / assign / delete, the
 * analytics tabs, and closed tickets going back a year are all things a table
 * does well and a queue cannot do at all. So the table did not lose anything; it
 * moved, and the console's bar links straight to it.
 *
 * The KPI strip stays here rather than on the console for the same reason it was
 * always slightly wrong there: `/stat` describes the WHOLE desk, and the console
 * shows a capped queue. Two numbers claiming to be the same thing is how a strip
 * starts lying.
 */

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

/** `0` is a measurement, `null`/absent is not — `|| 0` cannot tell them apart. */
function nullableNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Renders a first-response average in minutes as something a human reads.
 *
 * The desk that reported this page was showing `55263m` under the caption
 * "Lightning fast". The figure was not wrong — a first reply really had taken
 * 38 days — but minutes stop being a unit somewhere around an hour, and no
 * operator converts five digits in their head. Anything past a day is stated in
 * days, and the caption below the card is derived from the value instead of
 * being a fixed compliment.
 */
function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 60 * 24) {
    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes % 60);
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.round((minutes % (60 * 24)) / 60);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

/** The caption has to agree with the number above it. */
function responseTimeCaption(minutes: number | null): string {
  if (minutes === null) return "No responses recorded yet";
  if (minutes <= 15) return "Lightning fast";
  if (minutes <= 60) return "Within the hour";
  if (minutes <= 60 * 24) return "Same day";
  return "Slower than a day";
}

export default function AdminSupportTicketsPage() {
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const columns = useColumns();
  const viewConfig = useViewConfig();
  const analytics = useAnalytics();
  const currentUser = useUserStore((s) => s.user);

  /**
   * Queue contract point 4, and the three dead endpoints this queue owned.
   *
   * `PUT /ticket/status` and `PUT /ticket/{id}/assign` both existed with ZERO
   * callers, so the only bulk verb on a page of open tickets was Delete. Close
   * and Reopen route through the decision dialog, which makes the reason
   * mandatory and — since the endpoint appends it to the ticket's own thread —
   * the customer is told why their ticket was closed instead of it simply
   * vanishing.
   *
   * Assignment deliberately does NOT ask for a reason: handing work to a
   * colleague is not a decision the customer needs explaining, and a required
   * field there would be the noise that teaches operators to type "." to get
   * past it.
   */
  const bulkActions: BulkAction[] = [
    {
      key: "support-close",
      label: t("close_selected"),
      icon: CheckCircle,
      onClick: ({ ids }) =>
        useTableStore.getState().requestDecision({
          verb: "close",
          label: t("close"),
          ids,
          endpoint: "/api/admin/crm/support/ticket/status",
          body: { status: "CLOSED" },
          reasonRequired: true,
          description: t("the_reason_is_posted_into_each"),
        }),
    },
    {
      key: "support-reopen",
      label: t("reopen_selected"),
      icon: Activity,
      onClick: ({ ids }) =>
        useTableStore.getState().requestDecision({
          verb: "reopen",
          label: t("reopen"),
          ids,
          endpoint: "/api/admin/crm/support/ticket/status",
          body: { status: "OPEN" },
          reasonRequired: true,
          description: t("the_reason_is_posted_into_each"),
        }),
    },
    {
      key: "support-assign-me",
      label: t("assign_to_me"),
      icon: Users,
      onClick: async ({ ids, refresh, clearSelection }) => {
        if (!currentUser?.id) return;
        const { error } = await $fetch({
          url: "/api/admin/crm/support/ticket/assign",
          method: "PUT",
          body: { ids, agentId: currentUser.id },
        });
        if (!error) {
          await refresh();
          clearSelection();
        }
      },
    },
    {
      key: "support-unassign",
      label: t("unassign_selected"),
      icon: Users,
      variant: "destructive",
      onClick: async ({ ids, refresh, clearSelection }) => {
        const { error } = await $fetch({
          url: "/api/admin/crm/support/ticket/assign",
          method: "PUT",
          body: { ids, agentId: null },
        });
        if (!error) {
          await refresh();
          clearSelection();
        }
      },
    },
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number;
    open: number;
    pending: number;
    closed: number;
    unassigned: number;
    // Null is a real state here and not the same as zero: it means the desk has
    // never recorded a first response, or has never been rated. See below.
    avgResponseTime: number | null;
    satisfaction: number | null;
  }>({
    total: 0,
    open: 0,
    pending: 0,
    closed: 0,
    unassigned: 0,
    avgResponseTime: null,
    satisfaction: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: statsData } = await $fetch({
        url: "/api/admin/crm/support/stat",
        silent: true,
        errorMessage: t("failed_to_load_statistics"),
      });
      if (statsData) {
        setStats({
          total: statsData.total || 0,
          open: statsData.open || 0,
          pending: statsData.pending || 0,
          closed: statsData.closed || 0,
          unassigned: statsData.unassigned || 0,
          avgResponseTime: nullableNumber(statsData.avgResponseTime),
          satisfaction: nullableNumber(statsData.satisfaction),
        });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  /*
    THERE IS NO SECOND TREE.

    This page used to open with

      if (isLoading) { return <div className="min-h-[80vh] flex items-center
                              justify-center"> ...rotating ring... </div>; }

    and that single `if` was the worst loading defect on the route. Everything
    below it — the header band, the "System online" row, five stat cards, the
    ticket table's own frame — is CHROME the browser could have painted on the
    first byte, and none of it existed until `/stat` came back. The user got 80%
    of the viewport as an empty box with a ring in the middle, then the entire
    page arrived at once and reflowed under the pointer.

    Note what it was waiting for: `/api/admin/crm/support/stat`, seven counters.
    The DataTable underneath fetches SEPARATELY and owns its own pending state,
    so the spinner was holding the table hostage to a request the table does not
    need — the queue an operator came here to read could not render until an
    unrelated KPI endpoint replied.

    The fix is the whole layout, always, with `isLoading` handed to the five
    values that are genuinely unknown. `stats` is initialised to all-zeros, so
    the pending state is also the one moment those zeros must NOT be shown as
    figures: a support desk reading "0 unassigned" and "0 open" while the fetch
    is in flight is not a neutral placeholder, it is the good news.
  */

  const resolutionRate =
    stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;

  return (
    /* PageShell owns the frame (R0); the motion wrapper stays INSIDE it because
       it is not decoration — `containerVariants` is what staggers this page's
       children, and flattening it would silently stop every child's entrance. */
    <PageShell rhythm="none">
      <m.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Premium Header */}
        <m.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-surface-2 via-muted to-surface-2 p-6 md:p-8">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <m.div
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <m.div
                className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />
              {/* Grid pattern. This header is NOT a band: its ground is
                  `from-surface-2 via-muted to-surface-2`, a theme surface that is
                  near-white in light mode — so a white rule painted nothing there
                  and the panel only ever had its grid in dark mode. Ink at 0.1
                  keeps the dark-mode weight and finally shows in light. */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `linear-gradient(hsl(var(--foreground)/0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)/0.1) 1px, transparent 1px)`,
                  backgroundSize: "32px 32px",
                }}
              />
            </div>

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-4">
                <m.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <m.div
                    className="p-3 bg-primary rounded-xl shadow-lg shadow-primary/25"
                    whileHover={{ scale: 1.05, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Headphones className="h-7 w-7 text-primary-foreground" />
                  </m.div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {tDashboardAdmin("all_tickets")}
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mt-0.5">
                      {tDashboardAdmin(
                        "manage_customer_support_expert_assistance"
                      )}
                    </p>
                  </div>
                </m.div>

                {/* Quick stats row */}
                <m.div
                  className="flex flex-wrap items-center gap-4 md:gap-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <m.div
                      className="w-2 h-2 bg-success rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-sm font-medium text-success">
                      {tDashboardAdmin("system_online")}
                    </span>
                  </div>
                  {/* The icon, the unit and the caption are all knowable before
                      the fetch — only the figure is not, so only the figure gets
                      a placeholder, INSIDE the span that carries its weight. The
                      span is not removed and not resized: `SkeletonText` lays the
                      placeholder out with this element's own font metrics, so the
                      row's height is produced by the same text layout in both
                      states and "min avg response" does not slide sideways as the
                      number lands. */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="h-4 w-4 text-warning" />
                    {/* The unit moved INTO the value. It used to be a fixed
                        " min" after the figure, which is how this row came to
                        read "55263 min avg response" — the unit was a constant,
                        so it could not follow the magnitude. */}
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">
                        <Loadable loading={isLoading} placeholder="12m">
                          {formatResponseTime(stats.avgResponseTime)}
                        </Loadable>
                      </span>{" "}
                      {t("avg_response").toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">
                        <Loadable loading={isLoading} placeholder="4.8">
                          {stats.satisfaction === null
                            ? "—"
                            : stats.satisfaction.toFixed(1)}
                        </Loadable>
                      </span>{" "}
                      /5 Rating
                    </span>
                  </div>
                </m.div>
              </div>

              {/* The way back to the work.
                  This page is the archive; the console is where tickets get
                  answered, and an operator who lands here from a bookmark or a
                  bulk action needs one obvious door back to it. */}
              <m.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <Button asChild variant="outline">
                  <Link href="/admin/crm/support">
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                    {tDashboardAdmin("open_the_desk")}
                  </Link>
                </Button>
                <div className="relative hidden lg:block">
                  <m.div
                    className="absolute inset-0 bg-primary rounded-full blur-xl opacity-50"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <div className="relative flex items-center gap-2 px-4 py-2 bg-card/10 backdrop-blur-sm rounded-full border border-border">
                    <Activity className="h-4 w-4 text-success" />
                    {/* "Active" is the label and stays put; the count is the only
                        unknown. Reserving it matters more here than anywhere else
                        on the page: this pill is `rounded-full` and sized by its
                        content, so a bare `{0}` growing into `{1,204}` widens the
                        whole capsule and drags its right edge across the band. */}
                    <span className="text-sm font-medium text-foreground">
                      <Loadable loading={isLoading} placeholder="120">
                        {stats.open + stats.pending}
                      </Loadable>{" "}
                      Active
                    </span>
                  </div>
                </div>
              </m.div>
            </div>
          </div>
        </m.div>

        {/* Stats Grid */}
        <m.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          variants={containerVariants}
        >
          {/* Figures are pre-formatted strings: StatsCard's own numeric formatter
              is Intl `notation: "compact"`, which would render 12,483 tickets as
              "12K" — while this card's own description prints the exact total
              underneath it.

              `loading` goes to the CARD, not around the grid. StatsCard keeps its
              border, its label, its icon tile and its caption row while pending
              and swaps only the figure, so this row of five holds its exact
              height and its exact five cells from first paint. Wrapping the grid
              in a branch instead — which is what the deleted spinner effectively
              did — meant five bordered cards materialised out of nothing.

              The two captions that quote a figure drop the figure while pending.
              Both are derived from `stats`, which starts at zero, so leaving them
              in printed "0 all time" and "0% success rate" as though they were
              measured. The caption itself stays, so the row it sits on is present
              in both states and nothing below it moves. */}
          <StatsCard
            label={t("total_tickets")}
            value={stats.total.toLocaleString()}
            icon={MessageCircle}
            description={
              isLoading
                ? t("all_time")
                : `${stats.total.toLocaleString()} ${t("all_time")}`
            }
            loading={isLoading}
            {...statsCardColors.primary}
            index={0}
          />
          {/* This tile counted the PENDING status alone, and PENDING only holds a
              ticket until its customer says something — so the one card on the
              page whose job is "how much work is waiting" read 0 on a desk with
              unanswered conversations in it, which is the good news no matter how
              bad things are. It now counts what the queue opens on: every ticket
              whose last word came from the customer. */}
          <StatsCard
            label={t("awaiting_response")}
            value={(stats.pending + stats.open).toLocaleString()}
            icon={Clock}
            description={
              isLoading
                ? t("pending")
                : `${stats.pending.toLocaleString()} ${t("pending").toLowerCase()}`
            }
            loading={isLoading}
            {...statsCardColors.warning}
            index={1}
          />
          <StatsCard
            label={t("unassigned")}
            value={stats.unassigned.toLocaleString()}
            icon={Users}
            description={t("needs_attention")}
            loading={isLoading}
            {...statsCardColors.red}
            index={2}
          />
          <StatsCard
            label={t("resolved")}
            value={stats.closed.toLocaleString()}
            icon={CheckCircle}
            description={
              isLoading
                ? t("success_rate")
                : `${resolutionRate}% ${t("success_rate")}`
            }
            loading={isLoading}
            {...statsCardColors.success}
            index={3}
          />
          <StatsCard
            label={t("avg_response")}
            value={formatResponseTime(stats.avgResponseTime)}
            icon={Zap}
            description={responseTimeCaption(stats.avgResponseTime)}
            loading={isLoading}
            {...statsCardColors.primary}
            index={4}
          />
        </m.div>

        {/* Data Table */}
        <m.div variants={itemVariants} className="relative">
          {/* Deliberately no `title`/`description`: this page already states both
              in its own header above. Passing them again gave the page two <h1>s
              and two hero-shaped bands stacked — the R2 defect. The heading
              belongs to the page; the table is the body. */}
          <DataTable
            apiEndpoint="/api/admin/crm/support/ticket"
            model="supportTicket"
            permissions={{
              access: "access.support.ticket",
              view: "view.support.ticket",
              create: "create.support.ticket",
              edit: "edit.support.ticket",
              delete: "delete.support.ticket",
            }}
            pageSize={12}
            canCreate={false}
            canEdit={false}
            canDelete={true}
            canView={true}
            itemTitle="Support Ticket"
            columns={columns}
            viewConfig={viewConfig}
            analytics={analytics}
            isParanoid={false}
            viewLink="/admin/crm/support/[id]"
            // Opens on tickets waiting on US, oldest first, so the one that has
            // been waiting longest is the first row.
            //
            // This said `{ status: "PENDING" }`, and that single word was the bug
            // an operator reported as "the counters move but no ticket ever
            // appears". PENDING means *no agent has replied yet*, and a ticket
            // only stays there while the customer has said NOTHING: a live chat
            // goes PENDING -> OPEN on the customer's first message, a raised
            // ticket leaves PENDING as soon as they follow up. So the default
            // view excluded, by construction, every ticket that had a customer's
            // words in it — the entire set an agent exists to answer — while the
            // KPI strip above kept counting them.
            //
            // Waiting-on-us is two statuses, so it needs the `in` operator (which
            // the backend's operator map was missing entirely) and a multi-value
            // control (see the `filterType` on the status column). Both are now
            // present, and the filter panel opens showing these two ticked, so
            // the scope is visible and one click wide rather than invisible.
            initialSort={[{ id: "createdAt", desc: false }]}
            initialFilters={{
              status: { value: ["PENDING", "OPEN"], operator: "in" },
            }}
            bulkActions={bulkActions}
          />
        </m.div>
      </m.div>
    </PageShell>
  );
}
