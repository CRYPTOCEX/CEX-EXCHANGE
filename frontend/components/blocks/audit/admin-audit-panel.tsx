"use client";

import { useMemo } from "react";
import { ScrollText, ShieldAlert } from "lucide-react";

import {
  ActivityTimeline,
  type TimelineEvent,
  type TimelineEventType,
} from "@/components/ui/activity-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuditFeed } from "./use-audit-feed";
import { useTranslations } from "next-intl";

/**
 * "Who touched this record, when, and why" — on the record itself.
 *
 * `admin_audit_log` is written by the request pipeline on every admin mutation
 * (`handler/Routes.ts`). The trail already had a global page; what an operator
 * handling an escalation needs is the trail for THE RECORD IN FRONT OF THEM,
 * without going to another screen and filtering by an id they have to copy.
 *
 * ONE SEMANTIC THAT IS EASY TO GET BACKWARDS: on this table `userId` is the
 * ADMIN WHO ACTED and `targetId` is the record acted upon. A customer's record
 * page wants `targetId` — filtering by `userId` would show what that customer
 * did as an admin, which for a customer is nothing at all, and the panel would
 * look empty rather than wrong.
 */

interface AdminAuditPanelProps {
  /** The record this trail is about (user id, transaction id, …). */
  targetId?: string;
  /** Use ONLY to show what a given ADMIN did. See the note above. */
  actorId?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  perPage?: number;
}

interface AuditRow {
  id: string;
  userId?: string | null;
  module?: string;
  title?: string;
  method?: string;
  path?: string;
  targetId?: string | null;
  status?: "SUCCESS" | "ERROR";
  reason?: string | null;
  error?: string | null;
  durationMs?: number | null;
  requestId?: string | null;
  ip?: string | null;
  steps?: unknown;
  createdAt: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatar?: string | null;
  } | null;
}

/**
 * The verb, from the HTTP method, with failure taking precedence.
 *
 * A failed attempt is the single most interesting row in an audit trail — it is
 * what a dispute turns on — so it is never painted as the success it wasn't.
 */
function eventType(row: AuditRow): TimelineEventType {
  if (row.status === "ERROR") return "rejected";
  switch ((row.method || "").toUpperCase()) {
    case "POST":
      return "created";
    case "DELETE":
      return "deleted";
    case "PUT":
    case "PATCH":
      return "updated";
    default:
      return "custom";
  }
}

function actorName(row: AuditRow): string {
  const name = [row.user?.firstName, row.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  // `userId` is nullable by design: installer and cron routes act with no
  // session. "System" is the honest label, not an empty avatar.
  return name || row.user?.email || "System";
}

export function AdminAuditPanel({
  targetId,
  actorId,
  title = "Admin actions",
  description = "Every administrative change to this record, newest first.",
  emptyMessage = "No administrative action has been recorded against this record.",
  perPage = 10,
}: AdminAuditPanelProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const { rows, isLoading, error, hasMore, total, loadMore } =
    useAuditFeed<AuditRow>({
      endpoint: "/api/admin/system/audit",
      filter: { targetId, userId: actorId },
      perPage,
    });

  const events = useMemo<TimelineEvent[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        type: eventType(row),
        title: row.title || `${row.method} ${row.path}`,
        // The reason the operator typed is the point of the row. An error
        // message stands in when the attempt failed and there is no reason.
        description: row.reason || row.error || undefined,
        timestamp: row.createdAt,
        badge: row.module || undefined,
        important: row.status === "ERROR",
        user: {
          name: actorName(row),
          avatar: row.user?.avatar || undefined,
        },
        details: {
          ...(row.method && row.path ? { Request: `${row.method} ${row.path}` } : {}),
          ...(row.ip ? { IP: row.ip } : {}),
          ...(typeof row.durationMs === "number"
            ? { Duration: `${row.durationMs} ms` }
            : {}),
          ...(row.requestId ? { "Request ID": row.requestId } : {}),
          ...(row.status ? { Result: row.status } : {}),
        },
      })),
    [rows]
  );

  if (error) {
    // Almost always a missing `access.admin.audit`. Say which, rather than
    // showing an empty trail that reads as "nothing ever happened here".
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-6">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning-ink mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {t("the_audit_trail_could_not_be_loaded")}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * The FIRST page, still in flight — as distinct from `isLoading`, which is
   * also true while "Load more" fetches page four.
   *
   * There used to be an `if (isLoading && rows.length === 0) return <Card>` here
   * holding three `<Skeleton className="h-16 w-full"/>`. Two things were wrong
   * with it. The 64px box is a guess at a row that measures ~113px once its
   * title, badge, description line and 24px avatar row are laid out — so three
   * of them settled the card by roughly 150px. And it withheld the timeline's
   * whole header: a 40px icon tile, `title` and `description`, all of which are
   * props THIS component's caller already has, plus its own defaults right
   * above. None of that needed the request.
   *
   * `ActivityTimeline` now takes `loading` and keeps its own frame, so the swap
   * is gone and the card is the same card in both states.
   */
  const isFirstPageLoading = isLoading && rows.length === 0;

  return (
    <div className="space-y-3">
      <ActivityTimeline
        events={events}
        loading={isFirstPageLoading}
        /* Matches the three rows the old skeleton reserved, and `perPage` is
           usually 10 — so this deliberately under-promises rather than drawing
           ten pending rows for a record that has two. A list has no knowable
           length; the container is what is being reserved. */
        pendingRows={3}
        title={title}
        titleIcon={ScrollText}
        description={description}
        emptyMessage={emptyMessage}
      />
      {hasMore && (
        <div className="flex justify-center">
          {/* `loading` on the Button rather than a hand-rolled `<Loader2>`: it
              draws its own `size-4` spinner and sets `aria-busy`, and it folds
              `loading` into `disabled` so that no longer has to be said twice.
              The label still changes, which is right — "Load more (23 older)"
              is a different statement from "Loading…" — and the button is
              centred in a full-width row, so the width change moves nothing. */}
          <Button variant="outline" onClick={loadMore} loading={isLoading}>
            {isLoading ? `${tCommon("loading")}…` : `Load more (${total - rows.length} older)`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default AdminAuditPanel;
