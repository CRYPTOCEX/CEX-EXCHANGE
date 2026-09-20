"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  User,
  TrendingUp,
  DollarSign,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Edit,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loadable } from "@/components/ui/skeleton";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { $fetch } from "@/lib/api";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: any;
  newValue: any;
  metadata: any;
  userId: string;
  adminId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  admin?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditLogPage() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  /*
    "No audit logs — no events match your filters" is a statement about the
    filter set, and it becomes true for the whole of every request now that the
    timeline renders during load. Named so the `!loading` half is visibly part
    of the guard and not something to tidy away.
  */
  const showNoLogs = !loading && logs.length === 0;

  /*
    The timeline items to paint. FOUR, not the request's `limit: 20`: an audit
    card is ~150px, so four fills the viewport below the filter bar and twenty
    would reserve ~3000px of pulsing placeholder — the mirror image of the
    defect being fixed, overshooting instead of undershooting. Reserving the
    container and the first screenful is what SKELETONS.md asks for; the count
    settling below the fold costs nothing a user can see.
  */
  const logRows: (AuditLog | null)[] = loading
    ? [null, null, null, null]
    : logs;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (selectedAction && selectedAction !== "ALL")
        params.action = selectedAction;
      if (selectedEntityType && selectedEntityType !== "ALL")
        params.entityType = selectedEntityType;
      if (searchQuery && searchQuery.trim()) params.entityId = searchQuery;

      const response = await $fetch({
        url: "/api/admin/copy-trading/audit",
        method: "GET",
        params,
        silentSuccess: true,
      });

      setLogs(response.data?.items || []);
      setTotalPages(response.data?.pagination?.totalPages || 1);
      setTotal(response.data?.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, selectedAction, selectedEntityType, searchQuery]);

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "LEADER":
        return Shield;
      case "FOLLOWER":
      case "copyTradingFollower":
        return User;
      case "TRADE":
      case "copyTradingTrade":
        return TrendingUp;
      case "TRANSACTION":
        return DollarSign;
      case "SETTING":
      case "SETTINGS":
        return Settings;
      case "ALLOCATION":
        return DollarSign;
      default:
        return Shield;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "APPROVE":
      case "ACTIVATE":
      case "TRADE_OPEN":
      case "TRADE_CREATED":
        return CheckCircle2;
      case "REJECT":
      case "DELETE":
      case "TRADE_CANCELLED":
        return XCircle;
      case "SUSPEND":
      case "REVERSE":
      case "DAILY_LOSS_LIMIT_REACHED":
      case "STOP_LOSS_TRIGGERED":
        return AlertTriangle;
      case "START":
      case "RESUME":
      case "ADMIN_RESUME":
        return Play;
      case "RECALCULATE":
      case "RECALCULATE_STATS":
        return RefreshCw;
      case "UPDATE":
      case "ADMIN_UPDATE":
      case "LIMITS_UPDATED":
        return Edit;
      case "CREATE":
      case "ALLOCATE":
      case "FOLLOW":
        return Plus;
      case "ORDER_FILLED":
      case "TRADE_CLOSED":
      case "TRADE_CLOSE":
      case "TAKE_PROFIT_TRIGGERED":
        return TrendingUp;
      case "PROFIT_DISTRIBUTED":
        return DollarSign;
      case "PAUSE":
      case "ADMIN_FORCE_STOP":
      case "UNFOLLOW":
      case "DEALLOCATE":
        return XCircle;
      case "DAILY_LIMITS_RESET":
        return RefreshCw;
      default:
        return Edit;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "APPROVE":
      case "ACTIVATE":
      case "START":
      case "RESUME":
      case "ADMIN_RESUME":
      case "TRADE_OPEN":
      case "TRADE_CREATED":
      case "TAKE_PROFIT_TRIGGERED":
      case "PROFIT_DISTRIBUTED":
        return "text-success-ink bg-success/10 border-success/20";
      case "REJECT":
      case "DELETE":
      case "TRADE_CANCELLED":
      case "PAUSE":
      case "ADMIN_FORCE_STOP":
      case "UNFOLLOW":
      case "DEALLOCATE":
        return "text-destructive-ink bg-destructive/10 border-destructive/20";
      case "SUSPEND":
      case "REVERSE":
      case "DAILY_LOSS_LIMIT_REACHED":
      case "STOP_LOSS_TRIGGERED":
        return "text-warning-ink bg-warning/10 border-warning/20";
      case "UPDATE":
      case "RECALCULATE":
      case "RECALCULATE_STATS":
      case "ADMIN_UPDATE":
      case "LIMITS_UPDATED":
      case "ORDER_FILLED":
      case "TRADE_CLOSED":
      case "TRADE_CLOSE":
      case "DAILY_LIMITS_RESET":
        return "text-primary-ink bg-primary/10 border-primary/20";
      case "CREATE":
      case "ALLOCATE":
      case "FOLLOW":
        return "text-primary-ink bg-primary/10 border-primary/20";
      default:
        return "text-subtle-foreground bg-muted/10 border-border/20";
    }
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case "LEADER":
        return "bg-primary/10 text-primary-ink border-primary/20";
      case "FOLLOWER":
      case "copyTradingFollower":
        return "bg-primary/10 text-primary-ink border-primary/20";
      case "TRADE":
      case "copyTradingTrade":
        return "bg-success/10 text-success-ink border-success/20";
      case "TRANSACTION":
        return "bg-warning/10 text-warning-ink border-warning/20";
      case "SETTING":
      case "SETTINGS":
        return "bg-primary/10 text-primary-ink border-primary/20";
      case "ALLOCATION":
        return "bg-primary/10 text-primary-ink border-primary/20";
      default:
        return "bg-muted/10 text-muted-foreground border-border/20";
    }
  };

  const formatChanges = (oldValue: any, newValue: any) => {
    if (!oldValue && !newValue) return null;

    const changes: { field: string; old: any; new: any }[] = [];
    const allKeys = new Set([
      ...Object.keys(oldValue || {}),
      ...Object.keys(newValue || {}),
    ]);

    allKeys.forEach((key) => {
      if (JSON.stringify(oldValue?.[key]) !== JSON.stringify(newValue?.[key])) {
        changes.push({
          field: key,
          old: oldValue?.[key],
          new: newValue?.[key],
        });
      }
    });

    return changes;
  };

  return (
    /*
      ONE GROUND, NO SECOND NAVBAR.

      Was `min-h-screen bg-background` carrying a full-bleed
      `border-b bg-card/80 dark:bg-surface-2/80 backdrop-blur-xl sticky top-0
      z-10` band. Three separate problems, one shape:

        1. Flat. Every DataTable page in this addon sits on `WorkspaceGround`
           (the hero draws its own), so the one bespoke console in the same nav
           read as a different, emptier product. It is on the same ground now —
           see components/layout/workspace-ground.tsx.
        2. The band was a second navbar. Full-bleed, bordered and tinted,
           directly under a full-bleed bordered admin nav. It holds this page's
           OWN title and filters, so it belongs in the content column, not in
           the chrome.
        3. The sticky never worked. `site-header.tsx:212` is `fixed top-0 z-50`;
           this was `z-10` at `top-0`, so on scroll the title and the whole
           filter row slid underneath the admin nav rather than pinning below
           it.

      `pt-header-clear` replaces the literal `pt-20`: it is `--header-height`
      + 2rem, so it still clears a navbar variant that is not the default 4rem
      (`lib/chrome/variants.ts` overrides the height at runtime).
    */
    <div className="min-h-screen">
      <WorkspaceGround />
      {/* Title and filters — in the content column, on the ground. */}
      <div className="container mx-auto px-6 pt-header-clear pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary-ink">
              {t("audit_log")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("view_admin_actions_and_system_events")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {total} {t("total_events")}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_by_entity_id")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={selectedEntityType}
            onValueChange={setSelectedEntityType}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t("entity_type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tCommon("all")}</SelectItem>
              <SelectItem value="LEADER">Leader</SelectItem>
              <SelectItem value="FOLLOWER">Follower</SelectItem>
              <SelectItem value="copyTradingFollower">Follower (Legacy)</SelectItem>
              <SelectItem value="TRADE">Trade</SelectItem>
              <SelectItem value="copyTradingTrade">Trade (Legacy)</SelectItem>
              <SelectItem value="TRANSACTION">Transaction</SelectItem>
              <SelectItem value="ALLOCATION">Allocation</SelectItem>
              <SelectItem value="SETTINGS">Settings</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={tCommon("action")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tCommon("all")}</SelectItem>
              <SelectItem value="APPROVE">Approve</SelectItem>
              <SelectItem value="REJECT">Reject</SelectItem>
              <SelectItem value="SUSPEND">Suspend</SelectItem>
              <SelectItem value="ACTIVATE">Activate</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="FOLLOW">Follow</SelectItem>
              <SelectItem value="UNFOLLOW">Unfollow</SelectItem>
              <SelectItem value="PAUSE">Pause</SelectItem>
              <SelectItem value="RESUME">Resume</SelectItem>
              <SelectItem value="ALLOCATE">Allocate</SelectItem>
              <SelectItem value="DEALLOCATE">Deallocate</SelectItem>
              <SelectItem value="TRADE_CREATED">{t("trade_created")}</SelectItem>
              <SelectItem value="TRADE_CANCELLED">{t("trade_cancelled")}</SelectItem>
              <SelectItem value="TRADE_CLOSED">{t("trade_closed")}</SelectItem>
              <SelectItem value="ORDER_FILLED">{t("order_filled")}</SelectItem>
              <SelectItem value="PROFIT_DISTRIBUTED">{t("profit_distributed")}</SelectItem>
              <SelectItem value="DAILY_LOSS_LIMIT_REACHED">{tCommon("daily_loss_limit")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-6 py-8">
        {/*
          FULL-VIEWPORT SWAP, and the worst kind: a 48px ring in a `py-20` box
          — about 200px — stood in for a timeline of twenty ~150px cards, so
          the page went from roughly 200px to roughly 3000px in one frame and
          the pagination bar below travelled the whole distance.

          The timeline renders through the load now. Its rail, the 24px dots,
          the card frames, the 28px action-icon wells and the expand control
          are all chrome and paint immediately; only each event's words wait.
          A `null` entry IS a pending item, so this stays one list.
        */}
        {showNoLogs ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Shield className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t("no_audit_logs")}
              </h3>
              <p className="text-sm text-subtle-foreground">
                {t("no_events_match_your_filters")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-linear-to-b from-primary/20 via-primary/20 to-transparent" />

            {/* Timeline items */}
            <div className="space-y-6">
              {logRows.map((log, index) => {
                const pending = log === null;
                // `getEntityIcon`/`getActionIcon` fall through to a default for
                // an unrecognised string, so "" is a safe neutral mark while
                // pending rather than a guessed action.
                const EntityIcon = getEntityIcon(log?.entityType ?? "");
                const ActionIcon = getActionIcon(log?.action ?? "");
                const changes = log
                  ? formatChanges(log.oldValue, log.newValue)
                  : null;
                const isExpanded = !pending && expandedLog === log.id;

                /*
                  Named predicates rather than `!pending &&` inline in the JSX.
                  This is the resolution `scan-skeleton-debt.js` documents for
                  its `hidden-while-loading` rule: the rule cannot tell a
                  withheld row from a value that has nothing to say yet, and
                  will not guess from markup, so the NAME carries the
                  distinction. Each says what it gates and why it costs no
                  height.
                */
                // The "just happened" ping, and the 14px action mark inside a
                // fixed 28px well — neither contributes a layout box.
                const showRecencyPing = !pending;
                const showActionMark = !pending;
                const showEntityMark = !pending;
                // Genuinely optional and the LAST row of the card, so its
                // arrival grows the card downward and displaces nothing inside
                // it. Most events have no affected user, so guessing it would
                // mean removing a row from most cards.
                // Bound as a VALUE rather than a boolean predicate: a boolean
                // carries no narrowing back to `log.user`, so the block below
                // would need three separate `!` assertions — three separate
                // places to get it wrong.
                const affectedUser = pending ? null : log.user ?? null;

                return (
                  <div
                    key={log?.id ?? `pending-${index}`}
                    className="relative pl-20"
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-5 top-6 w-6 h-6 rounded-full border-4 border-border ${
                        getActionColor(log?.action ?? "").split(" ")[1]
                      }`}
                    >
                      {/* The ping says "this just happened". Suppressed while
                          pending — there is no event yet for it to be about. */}
                      {showRecencyPing && (
                        <div className="absolute inset-0 animate-ping opacity-20 rounded-full bg-current" />
                      )}
                    </div>

                    {/* Card */}
                    <Card className="group overflow-hidden transition-colors duration-300">
                      <CardContent className="p-0">
                        {/* Header */}
                        <div
                          className={`p-6 ${
                            pending ? "cursor-default" : "cursor-pointer"
                          }`}
                          onClick={() =>
                            log && setExpandedLog(isExpanded ? null : log.id)
                          }
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Action Icon */}
                              {/* The 28px well keeps its border and background
                                  in both states; only the 14px mark inside it
                                  changes, and a fixed-size grid cell is not
                                  sized by its contents. */}
                              <span
                                className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm border ${getActionColor(
                                  log?.action ?? ""
                                )}`}
                              >
                                {showActionMark && <ActionIcon className="h-3.5 w-3.5" />}
                              </span>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    <Loadable
                                      loading={pending}
                                      placeholder={t("profit_distributed")}
                                    >
                                      {log?.action
                                        ? log.action.replace(/_/g, " ")
                                        : pending
                                        ? null
                                        : t("unknown_action")}
                                    </Loadable>
                                  </h3>
                                  <Badge
                                    className={`border ${getEntityTypeColor(
                                      log?.entityType ?? ""
                                    )}`}
                                    variant="outline"
                                  >
                                    {showEntityMark && (
                                      <EntityIcon className="h-3 w-3 mr-1" />
                                    )}
                                    <Loadable
                                      loading={pending}
                                      placeholder="follower"
                                    >
                                      {pending
                                        ? null
                                        : log.entityType || tCommon("unknown")}
                                    </Loadable>
                                  </Badge>
                                </div>

                                {/*
                                  The admin and IP rows are DATA-conditional —
                                  a system-generated event has no admin, and
                                  `ipAddress` can be empty — but the timestamp
                                  is on EVERY log, so the meta line always has
                                  at least one item and therefore always has its
                                  height. Reserving admin and IP too keeps the
                                  line's most common composition, which is why
                                  they render as pending rather than being
                                  withheld: a log that turns out to have neither
                                  loses items from a line that does not change
                                  height, while withholding them and then adding
                                  them can wrap the line and grow the card.
                                */}
                                <div className="flex items-center gap-4 text-sm text-subtle-foreground flex-wrap">
                                  {(pending || log.admin) && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5" />
                                      <span>
                                        <Loadable
                                          loading={pending}
                                          placeholder={tCommon("firstname_lastname")}
                                        >
                                          {pending
                                            ? null
                                            : `${log.admin!.firstName} ${log.admin!.lastName}`}
                                        </Loadable>
                                      </span>
                                    </div>
                                  )}
                                  {(pending || log.ipAddress) && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="font-mono">
                                        <Loadable
                                          loading={pending}
                                          placeholder="192.168.100.100"
                                        >
                                          {pending ? null : log.ipAddress}
                                        </Loadable>
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>
                                      <Loadable
                                        loading={pending}
                                        placeholder={t("jan_01_2026_at_00_00")}
                                      >
                                        {pending
                                          ? null
                                          : format(
                                              new Date(log.createdAt),
                                              "MMM dd, yyyy 'at' HH:mm"
                                            )}
                                      </Loadable>
                                    </span>
                                  </div>
                                </div>

                                {/* Genuinely optional — most events have no
                                    affected user — and it is the LAST row of
                                    the card, so its arrival grows the card
                                    downward instead of displacing anything
                                    inside it. Guessing it for every stand-in
                                    would mean removing a row from most cards. */}
                                {affectedUser && (
                                  <div className="mt-3 flex items-center gap-2 text-sm">
                                    <span className="text-subtle-foreground">
                                      {t("affected_user")}:
                                    </span>
                                    <span className="font-medium text-muted-foreground">
                                      {affectedUser.firstName}{" "}
                                      {affectedUser.lastName}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ({affectedUser.email})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expand button — renders in both states so the
                                header's right edge does not move; disabled
                                while there is no detail to expand. */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              disabled={pending}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Details. `log &&` is what narrows the type
                            here — `isExpanded` already implies it (it is
                            `!pending && …`) but that is a fact about the flag,
                            not something the compiler can follow back to
                            `log`. Naming it is cheaper and clearer than a
                            non-null assertion on every read below. */}
                        {log && isExpanded && (
                          <div className="border-t border-border bg-muted/50 dark:bg-surface-2/50 p-6 space-y-4">
                            {/* Entity ID */}
                            <div>
                              <label className="text-xs font-medium text-subtle-foreground uppercase tracking-wider">
                                {t("entity_id")}
                              </label>
                              <p className="mt-1 font-mono text-sm text-muted-foreground">
                                {log.entityId}
                              </p>
                            </div>

                            {/* Changes */}
                            {changes && changes.length > 0 && (
                              <div>
                                <label className="text-xs font-medium text-subtle-foreground uppercase tracking-wider">
                                  {t("changes")}
                                </label>
                                <div className="mt-2 space-y-2">
                                  {changes.map((change, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-4 p-3 rounded-lg bg-card border border-border"
                                    >
                                      <div className="flex-1">
                                        <span className="text-xs font-medium text-subtle-foreground uppercase">
                                          {change.field}
                                        </span>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="px-2 py-1 text-sm bg-destructive/10 text-destructive-ink rounded">
                                            {change.old !== undefined &&
                                            change.old !== null
                                              ? JSON.stringify(change.old)
                                              : "—"}
                                          </code>
                                          <span className="text-muted-foreground">
                                            →
                                          </span>
                                          <code className="px-2 py-1 text-sm bg-success/10 text-success-ink rounded">
                                            {change.new !== undefined &&
                                            change.new !== null
                                              ? JSON.stringify(change.new)
                                              : "—"}
                                          </code>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Metadata */}
                            {log.metadata &&
                              Object.keys(log.metadata).length > 0 && (
                                <div>
                                  <label className="text-xs font-medium text-subtle-foreground uppercase tracking-wider">
                                    {tCommon("metadata")}
                                  </label>
                                  <pre className="mt-2 p-4 bg-card border border-border rounded-lg text-xs overflow-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}

                            {/* User Agent */}
                            {log.userAgent && (
                              <div>
                                <label className="text-xs font-medium text-subtle-foreground uppercase tracking-wider">
                                  {tCommon("user_agent")}
                                </label>
                                <p className="mt-1 text-xs text-muted-foreground font-mono">
                                  {log.userAgent}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {tCommon("previous")}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={i}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              {tCommon("next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
