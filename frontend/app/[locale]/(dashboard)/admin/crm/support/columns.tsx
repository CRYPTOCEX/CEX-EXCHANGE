"use client";
import React from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
  User,
  Inbox,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Mail,
  CalendarIcon,
  MessageSquare,
  Shield,
  Clock,
  Star,
  Paperclip,
  Tag,
  UserCog,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { statusTone, statusLabel } from "@/lib/status-tone";
import { cn } from "@/lib/utils";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";

export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("unique_identifier_for_the_support_ticket"),
      priority: 1,
      expandedOnly: true,
    },
    {
      key: "user",
      title: tCommon("customer"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_customer_who_created_the_ticket"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tCommon("users_first_name"), tCommon("users_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "agent",
      title: tCommon("assigned_agent"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: false,
      filterable: false,
      description: t("the_agent_assigned_to_this_ticket"),
      // This queue's decision IS assignment, and the page's own KPI tile
      // headlines "unassigned" — while the list could not express it per row.
      // Was `expandedOnly`, which also excludes it from the column-toggle menu,
      // so the operator could not opt back in.
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: t("agent_avatar"),
            description: t("agents_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [t("agents_first_name"), t("agents_last_name")],
            icon: User,
          },
          secondary: {
            key: "email",
            title: tCommon("email"),
            icon: Mail,
          },
        },
      },
    },
    {
      key: "subject",
      title: tCommon("subject"),
      type: "text",
      icon: Inbox,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("short_description_of_the_ticket"),
      priority: 1,
    },
    {
      key: "importance",
      title: tCommon("importance"),
      type: "select",
      icon: AlertTriangle,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("ticket_importance_level"),
      // These three declared NO priority, and the responsive cut is
      // `col.priority ?? 5` — so under 1024px a ticket's importance, status and
      // type all disappeared, which is most of what the row is for.
      priority: 1,
      render: {
        type: "badge",
        // LOW/MEDIUM/HIGH already matched the central table exactly; the local
        // copy was redundant. Hue now comes from lib/status-tone.ts.
        config: {
          withDot: true,
        },
      },
      options: [
        { value: "LOW", label: tCommon("low") },
        { value: "MEDIUM", label: tCommon("medium") },
        { value: "HIGH", label: tCommon("high") },
      ],
    },
    {
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("ticket_status"),
      priority: 1,
      // Triage here is never one status: "waiting on us" is PENDING *or* OPEN,
      // and that is what this queue opens on. A single-value select could not
      // express the default it was already being given, so the seeded filter had
      // no control to show it in — see select-filter.tsx.
      filterType: "multiselect",
      render: {
        type: "badge",
        config: {
          withDot: true,
          // Hue comes from lib/status-tone.ts. `domain` is set because OPEN is a
          // homonym: a live position platform-wide (success), but a ticket
          // WAITING FOR US here — the support domain maps it to info, and a
          // green chip would read as resolved.
          domain: "support",
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "OPEN", label: tCommon("open") },
        { value: "REPLIED", label: tCommon("replied") },
        { value: "CLOSED", label: tCommon("closed") },
      ],
    },
    {
      key: "type",
      title: tCommon("type"),
      type: "select",
      icon: Bell,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("ticket_type_live_chat_or_ticket"),
      priority: 3,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: string) => {
            switch (value.toUpperCase()) {
              case "LIVE":
                return "info";
              case "TICKET":
                return "muted";
              default:
                return "default";
            }
          },
        },
      },
      options: [
        { value: "LIVE", label: tCommon("live_chat") },
        { value: "TICKET", label: tCommon("ticket") },
      ],
    },
    {
      key: "messages",
      title: tCommon("messages"),
      type: "custom",
      icon: MessageSquare,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("conversation_messages"),
      render: {
        type: "custom",
        render: (value: any) => {
          if (!value || !Array.isArray(value)) {
            return <span>{t("no_messages")}</span>;
          }
          return (
            <span>
              {value.length} messages
            </span>
          );
        },
      },
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("age"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("how_long_this_ticket_has_been_waiting"),
      render: {
        type: "age",
        config: {
          sla: "support",
          // A ticket is waiting on US while it is unanswered or the customer
          // has replied last. REPLIED means an agent answered, so the clock
          // stops there.
          activeStatuses: ["PENDING", "OPEN"],
        },
      },
      priority: 1,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A ticket is not a row of scalars. Three of its nine columns are structures the
 * key/value tile cannot hold — two joined people and a whole conversation — and
 * the flat grid rendered the conversation as the string "12 messages" and the
 * two people as compound plates squeezed into 200px tiles.
 *
 * So: the subject becomes the heading, the state pills sit beside it, the four
 * numbers an operator triages on (volume, first response, satisfaction, age)
 * become the stat strip, and the customer/agent pair and the message thread each
 * get a section that renders them as what they are.
 * -------------------------------------------------------------------------- */

/** `new Date()` on a null/garbage value yields an Invalid Date that `format` throws on. */
function safeDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function personInitials(person: any): string {
  return (
    `${person?.firstName?.[0] ?? ""}${person?.lastName?.[0] ?? ""}`.toUpperCase() ||
    person?.email?.[0]?.toUpperCase() ||
    "?"
  );
}

function personName(person: any): string {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ");
}

/** Customer / agent plate: the joined user record as a person, not as a tile. */
function PersonPlate({
  label,
  person,
  emptyText,
}: {
  label: string;
  person: any;
  emptyText: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      {person ? (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-9 border border-border shrink-0">
            <AvatarImage src={person.avatar || undefined} alt={personName(person)} />
            <AvatarFallback className="text-xs font-semibold">
              {personInitials(person)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {personName(person) || person.email || "—"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{person.email}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => row.subject || `#${row.id}`,

      subtitle: (row) =>
        personName(row.user) || row.user?.email || tCommon("customer"),

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status, "support")} appearance="soft">
            {statusLabel(row.status) || tCommon("status")}
          </Badge>
          <Badge tone={statusTone(row.importance)} appearance="soft">
            {statusLabel(row.importance)}
          </Badge>
          {!row.agentId && (
            <Badge tone="warning" appearance="soft">
              Unassigned
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("messages"),
          icon: MessageSquare,
          value: (row) => (Array.isArray(row.messages) ? row.messages.length : 0),
        },
        {
          label: t("first_response"),
          icon: Clock,
          value: (row) => `${row.responseTime} min`,
          condition: (row) => row.responseTime !== null && row.responseTime !== undefined,
        },
        {
          label: t("satisfaction"),
          icon: Star,
          value: (row) => `${row.satisfaction} / 5`,
          tone: "warning",
          condition: (row) => row.satisfaction !== null && row.satisfaction !== undefined,
        },
        {
          label: tCommon("opened"),
          icon: CalendarIcon,
          value: (row) => {
            const date = safeDate(row.createdAt);
            return date ? format(date, "MMM d, yyyy HH:mm") : "—";
          },
        },
      ],

      sections: [
        {
          id: "people",
          title: t("people"),
          icon: UserCog,
          variant: "plain",
          priority: 1,
          render: (row) => (
            <div className="grid gap-3 @md:grid-cols-2">
              <PersonPlate
                label={tCommon("customer")}
                person={row.user}
                emptyText="—"
              />
              <PersonPlate
                label={tCommon("assigned_agent")}
                person={row.agent}
                emptyText="Unassigned"
              />
            </div>
          ),
        },
        {
          id: "ticket",
          title: tCommon("ticket_details"),
          icon: Inbox,
          columns: 3,
          priority: 2,
          fields: [
            { key: "type", icon: Bell },
            { key: "id", title: "ID", icon: Shield, copyable: true },
            {
              // No column backs `updatedAt`, so it carries its own renderer —
              // and it is the one field that says whether anyone has touched
              // this ticket since it was opened.
              key: "updatedAt",
              title: tCommon("cron_last_activity"),
              icon: History,
              render: (value) => {
                const date = safeDate(value);
                return date ? format(date, "MMM d, yyyy HH:mm") : "—";
              },
            },
            {
              key: "tags",
              title: tCommon("tags"),
              icon: Tag,
              condition: (row) => Array.isArray(row.tags) && row.tags.length > 0,
              render: (value) => (
                <span className="flex flex-wrap gap-1.5">
                  {(value as string[]).map((tag, index) => (
                    <Badge key={`${tag}-${index}`} tone="neutral" appearance="soft">
                      {tag}
                    </Badge>
                  ))}
                </span>
              ),
            },
          ],
        },
        {
          id: "conversation",
          title: tCommon("messages"),
          icon: MessageSquare,
          variant: "plain",
          priority: 3,
          render: (row) => {
            const messages = Array.isArray(row.messages) ? row.messages : [];
            if (!messages.length) {
              return (
                <p className="text-sm text-muted-foreground">{t("no_messages")}</p>
              );
            }
            return (
              <div className="max-h-96 overflow-y-auto space-y-2 pe-1">
                {messages.map((message: any, index: number) => {
                  const fromAgent =
                    String(message?.type ?? "").toLowerCase() === "agent";
                  const sent = safeDate(message?.time);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg border border-border p-3 min-w-0",
                        fromAgent && "bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <Badge
                          tone={fromAgent ? "info" : "neutral"}
                          appearance="soft"
                        >
                          {fromAgent ? tCommon("agent") : tCommon("customer")}
                        </Badge>
                        {sent && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(sent, "MMM d, yyyy HH:mm")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {message?.text || "—"}
                      </p>
                      {message?.attachment && (
                        <a
                          href={message.attachment}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          Attachment
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          },
        },
      ],
    }),
    [t, tCommon]
  );
}

