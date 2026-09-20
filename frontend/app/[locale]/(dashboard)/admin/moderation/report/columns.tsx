"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Flag,
  Gavel,
  MessageSquare,
  User,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

/**
 * The content report queue.
 *
 * WHAT AN OPERATOR IS DOING HERE. Reading a complaint about a piece of TEXT and
 * deciding whether it stands. That is a different job from the P2P report queue
 * next door, which is about a PERSON: there, five reports on one trader is the
 * pattern worth seeing, so the reported trader leads. Here the item leads,
 * because the remedy is to remove the item.
 *
 * The author is still shown, in the secondary line, for the one question a
 * per-item queue otherwise cannot answer: whether five complaints about five
 * different comments are five problems or one.
 *
 * NO ACTION ON THE CONTENT IS OFFERED FROM THIS TABLE. Deleting a comment and
 * rejecting it live on the blog administration screens with their own
 * permissions and their own audit trail. A second door onto them from here
 * would be a way to remove somebody's words outside all of it. What this screen
 * does is decide whether the complaint stands and record who decided.
 */

const TARGET_LABELS: Record<string, string> = {
  BLOG_COMMENT: "Comment",
  BLOG_POST: "Post",
  NFT_LISTING: "NFT listing",
  USER_PROFILE: "Profile",
};

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam or advertising",
  ABUSIVE_CONDUCT: "Abuse or harassment",
  HATE_SPEECH: "Hate speech",
  SEXUAL_CONTENT: "Sexual content",
  VIOLENCE: "Violence or threats",
  SCAM_OR_FRAUD: "Scam or fraud",
  IMPERSONATION: "Impersonation",
  OTHER: "Something else",
};

/**
 * The reasons that mean somebody may be harmed while this sits unread.
 *
 * Not a severity ranking — spam is not less real, it is less urgent. These are
 * the ones where the cost of a slow queue lands on a person rather than on the
 * tidiness of a comment thread.
 */
const URGENT = new Set([
  "HATE_SPEECH",
  "VIOLENCE",
  "SEXUAL_CONTENT",
  "SCAM_OR_FRAUD",
]);

const STATUS_TONE: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "destructive",
  REVIEWING: "default",
  ACTIONED: "secondary",
  DISMISSED: "outline",
};

function personName(
  row: any,
  key: "reporter" | "targetOwner" | "reviewedBy"
): string {
  const person = row?.[key];
  if (!person) return "Unknown";
  // The handle first: it is the name other users actually see, and it is the
  // one that identifies an author in the thread the operator is about to open.
  const handle = String(person.username ?? "").trim();
  if (handle) return handle;
  const name = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return name || "Unknown";
}

export function useColumns() {
  return [
    {
      key: "targetType",
      title: "What was reported",
      type: "select",
      icon: MessageSquare,
      priority: 1,
      filterable: true,
      sortable: true,
      description:
        "The kind of item. Its id is on the view panel — the content itself is managed on its own admin screen.",
      options: Object.entries(TARGET_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      render: {
        type: "compound",
        config: {
          primary: {
            key: "targetType",
            title: "Item",
            render: (value: string) => (
              <span className="font-medium">
                {TARGET_LABELS[value] ?? value}
              </span>
            ),
          },
          secondary: {
            key: "targetOwner.username",
            title: "Author",
            render: (_value: any, row: any) => (
              <span className="text-xs text-muted-foreground">
                by {personName(row, "targetOwner")}
              </span>
            ),
          },
        },
      },
    },
    {
      key: "reason",
      title: "Reason",
      type: "select",
      icon: Flag,
      priority: 1,
      filterable: true,
      sortable: true,
      description: "What the reporter picked from a fixed list.",
      options: Object.entries(REASON_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      render: {
        type: "custom",
        render: (value: string) => (
          <Badge variant={URGENT.has(value) ? "destructive" : "outline"}>
            {URGENT.has(value) && (
              <AlertTriangle className="me-1 size-3" aria-hidden="true" />
            )}
            {REASON_LABELS[value] ?? value}
          </Badge>
        ),
      },
    },
    {
      key: "details",
      title: "What was said",
      type: "textarea",
      icon: FileText,
      sortable: false,
      filterable: false,
      searchable: true,
      description:
        "The reporter's own account. This is what a decision is made on.",
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="line-clamp-2 max-w-[42ch] text-xs text-muted-foreground">
            {value || "—"}
          </span>
        ),
      },
    },
    {
      key: "reporter",
      title: "Reported by",
      type: "text",
      icon: User,
      sortable: false,
      filterable: false,
      searchable: true,
      render: {
        type: "custom",
        render: (_value: any, row: any) => (
          <span className="text-xs text-muted-foreground">
            {personName(row, "reporter")}
          </span>
        ),
      },
    },
    {
      key: "targetId",
      title: "Item id",
      type: "text",
      icon: FileText,
      sortable: false,
      filterable: false,
      searchable: true,
      description:
        "The reported row's id. It may already be gone — acting on a report does not delete the report.",
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-mono text-xs text-muted-foreground">
            {value ? `${String(value).slice(0, 8)}…` : "—"}
          </span>
        ),
      },
    },
    {
      key: "status",
      title: "Status",
      type: "select",
      icon: Gavel,
      priority: 1,
      filterable: true,
      sortable: true,
      options: [
        { value: "PENDING", label: "Unread" },
        { value: "REVIEWING", label: "Being read" },
        { value: "ACTIONED", label: "Upheld" },
        { value: "DISMISSED", label: "Dismissed" },
      ],
      render: {
        type: "custom",
        render: (value: string) => (
          <Badge variant={STATUS_TONE[value] ?? "outline"}>
            {value === "PENDING"
              ? "Unread"
              : value === "REVIEWING"
                ? "Being read"
                : value === "ACTIONED"
                  ? "Upheld"
                  : "Dismissed"}
          </Badge>
        ),
      },
    },
    {
      key: "resolution",
      title: "Outcome",
      type: "textarea",
      icon: Gavel,
      sortable: false,
      filterable: false,
      description: "Required before a report can be closed.",
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="line-clamp-2 max-w-[36ch] text-xs text-muted-foreground">
            {value || "—"}
          </span>
        ),
      },
    },
    {
      key: "createdAt",
      title: "Filed",
      type: "date",
      icon: Calendar,
      sortable: true,
      filterable: false,
      render: { type: "date", format: "PPp" },
    },
  ];
}

export function useFormConfig(): FormConfig {
  /*
    EDIT ONLY, and only the two fields a decision is made of.

    Nothing about the complaint itself is editable — not the reason, not the
    details, not who filed it, not what it points at. A queue where the reader
    can rewrite the allegation before ruling on it is not a record of anything.
  */
  return {
    edit: {
      title: "Rule on this report",
      description:
        "Close it with a reason. Removing the content itself is done on its own admin screen, where it is audited.",
      groups: [
        {
          id: "ruling",
          title: "Decision",
          icon: Gavel,
          priority: 1,
          fields: [
            { key: "status", required: true },
            { key: "resolution", required: false },
          ],
        },
      ],
    },
  };
}
