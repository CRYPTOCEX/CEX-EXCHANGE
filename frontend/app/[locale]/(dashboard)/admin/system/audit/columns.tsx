"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  AlertTriangle,
  Clock,
  Database,
  Layers,
  MessageSquareQuote,
  Network,
  Route,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

/**
 * WHO did WHAT, to WHICH record, and WHY.
 *
 * Column order is that question, left to right. Everything that does not help
 * answer it — requestId, ip, duration, the step trail — is `expandedOnly`, so
 * the default row stays readable at a glance and the forensics are one click
 * away rather than absent.
 */
export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return [
    {
      key: "createdAt",
      title: tCommon("date"),
      type: "date",
      sortable: true,
      filterable: true,
      render: { type: "date", format: "PPpp" },
      priority: 1,
    },
    {
      key: "user",
      title: tCommon("admin"),
      type: "compound",
      // Nothing on this table matters more than WHO, so it carries the avatar
      // and email rather than a bare uuid.
      //
      // `sortable: false` and no `primary.sortKey`, deliberately. A compound
      // column WITH a sortKey has its header replaced by the sort field's label
      // (`content/table-header.tsx:138-146`), so this would read "First Name"
      // instead of "Admin" — which is also why every user column in the product
      // does. Sorting an audit trail by the actor's first name is not a
      // workflow; filtering to one actor is, and that is still available.
      sortable: false,
      searchable: true,
      filterable: true,
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            // A row whose actor was deleted, or a system-triggered action, has
            // no user — say so instead of rendering an empty cell.
            fallback: "System",
          },
          secondary: { key: "email", title: tCommon("email") },
        },
      },
    },
    {
      key: "title",
      title: tCommon("action"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
    },
    {
      key: "module",
      title: t("module"),
      type: "text",
      sortable: true,
      filterable: true,
      priority: 2,
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      options: [
        { value: "SUCCESS", label: tCommon("success") },
        { value: "ERROR", label: tCommon("error") },
      ],
      sortable: true,
      filterable: true,
      priority: 1,
      render: {
        type: "badge",
        config: {
          withDot: true,
          variant: (value: string) =>
            value === "SUCCESS" ? "success" : "destructive",
        },
      },
    },
    {
      key: "reason",
      title: tCommon("reason"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: false,
      priority: 2,
    },
    {
      key: "targetId",
      title: tCommon("record"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: true,
      // The whole point of denormalising this column: paste an id here and get
      // every action that ever touched it.
      priority: 3,
    },
    {
      key: "path",
      title: tCommon("endpoint"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: true,
      expandedOnly: true,
    },
    {
      key: "method",
      title: tCommon("method"),
      type: "text",
      sortable: true,
      filterable: true,
      expandedOnly: true,
    },
    {
      key: "error",
      title: tCommon("error"),
      type: "text",
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "ip",
      title: tCommon("ip_address"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: true,
      expandedOnly: true,
    },
    {
      key: "durationMs",
      title: tCommon("duration"),
      type: "number",
      sortable: true,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "requestId",
      title: t("request_id"),
      type: "text",
      sortable: false,
      searchable: true,
      filterable: false,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * The row answers "who did what"; the dialog answers "and why, to which record,
 * from where". The header therefore leads with the ACTION and names the actor
 * underneath — the compound column is the table's primary, so it is already
 * excluded from the body and would otherwise be the only place the operator's
 * name appeared.
 *
 * Everything is grouped the way an incident is read: the stated reason first
 * (it is the only free text a human wrote), the failure if there was one, the
 * record touched, then the request forensics.
 * -------------------------------------------------------------------------- */

/** The person behind the entry, or the pipeline when nobody was signed in. */
function actorLabel(row: any): string {
  const name = [row?.user?.firstName, row?.user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const email = row?.user?.email;
  if (name && email) return `${name} · ${email}`;
  return name || email || "System — no signed-in administrator";
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) => row.title || t("administrative_action"),
      subtitle: (row) => actorLabel(row),

      badges: (row) => (
        <>
          <Badge
            tone={row.status === "SUCCESS" ? "success" : "destructive"}
            appearance="soft"
          >
            {row.status === "SUCCESS" ? tCommon("success") : tCommon("error")}
          </Badge>
          {row.method && (
            <Badge tone="neutral" appearance="soft" className="font-mono">
              {row.method}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: t("module"),
          icon: Layers,
          value: (row) => row.module || "—",
        },
        {
          label: tCommon("recorded"),
          icon: Clock,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "PPpp") : "—",
        },
        {
          label: tCommon("duration"),
          icon: Timer,
          value: (row) =>
            row.durationMs === null || row.durationMs === undefined
              ? "—"
              : `${row.durationMs} ms`,
        },
      ],

      sections: [
        {
          id: "reason",
          title: t("stated_reason"),
          description:
            t("free_text_the_administrator_supplied_with"),
          icon: MessageSquareQuote,
          columns: 1,
          fields: [
            {
              key: "reason",
              fullWidth: true,
              emptyText: t("no_reason_recorded_for_this_action"),
            },
          ],
        },
        {
          id: "failure",
          title: tCommon("failure"),
          icon: AlertTriangle,
          columns: 1,
          // A success row has nothing to say here, and an empty "Failure"
          // heading on every second entry reads like a missing value.
          condition: (row) => row.status === "ERROR" || Boolean(row.error),
          fields: [
            {
              key: "error",
              fullWidth: true,
              emptyText: t("failed_without_an_error_message"),
              render: (value) => (
                <span className="text-destructive break-words">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "target",
          title: t("record_affected"),
          description:
            t("paste_this_id_into_the_table"),
          icon: Database,
          columns: 1,
          fields: [
            {
              key: "targetId",
              copyable: true,
              emptyText: t("not_tied_to_a_single_record"),
            },
          ],
        },
        {
          id: "request",
          title: t("request"),
          icon: Route,
          columns: 2,
          fields: [
            { key: "path", fullWidth: true },
            { key: "ip", icon: Network },
            { key: "requestId", copyable: true },
          ],
        },
      ],
    }),
    []
  );
}
