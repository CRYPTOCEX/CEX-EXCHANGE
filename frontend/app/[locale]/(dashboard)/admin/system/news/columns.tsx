"use client";

import React from "react";
import {
  CalendarPlus,
  Clock,
  FileText,
  Hash,
  ImageIcon,
  Link2,
  RefreshCw,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ViewConfig } from "@/components/blocks/data-table/types/table";
import { useTranslations } from "next-intl";

/**
 * Columns for the market-news admin table.
 *
 * Literal strings rather than translation keys, matching the fx market-news
 * table this mirrors: these labels name database fields an operator is editing,
 * and a mistranslated column header on a CRUD form is worse than an English one.
 */
export function useColumns(): ColumnDefinition[] {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return [
    {
      key: "publishedAt",
      title: tCommon("published"),
      type: "date",
      render: { type: "date", format: "PPP p" },
      description: tCommon("publication_instant_stored_utc_shown_in"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "headline",
      title: tCommon("headline"),
      type: "text",
      description: tCommon("story_headline_shown_in_the_terminal_feed"),
      sortable: true,
      filterable: true,
      required: true,
      priority: 1,
    },
    {
      key: "summary",
      title: tCommon("summary"),
      type: "textarea",
      description:
        t("story_body_or_desk_commentary_stored"),
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "url",
      title: tCommon("link"),
      type: "text",
      description: tCommon("source_link_must_be_http_or_https"),
      sortable: false,
      filterable: false,
      priority: 3,
    },
    {
      key: "imageUrl",
      title: tCommon("image"),
      type: "text",
      description: tCommon("thumbnail_url_must_be_http_or_https"),
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "category",
      title: tCommon("category"),
      type: "text",
      description: t("crypto_general_used_by_the_feed_filter"),
      sortable: true,
      filterable: true,
      priority: 2,
    },
    {
      key: "relatedSymbols",
      title: tCommon("symbols"),
      type: "text",
      description:
        t("comma_separated_assets_btc_usdt_untagged"),
      sortable: false,
      filterable: false,
      expandedOnly: true,
    },
    {
      key: "source",
      title: tCommon("source"),
      type: "select",
      description:
        t("provider_rows_come_from_the_news"),
      sortable: true,
      filterable: true,
      priority: 2,
      options: [
        { value: "PROVIDER", label: tCommon("provider") },
        { value: "MANUAL", label: tCommon("manual") },
      ],
      render: {
        type: "badge",
        config: {
          variant: (value: string) => (value === "MANUAL" ? "info" : "secondary"),
        },
      },
    },
    {
      key: "status",
      title: tCommon("visible"),
      type: "toggle",
      description:
        tCommon("pull_a_story_from_the_client"),
      sortable: true,
      filterable: true,
      priority: 2,
    },
    {
      key: "createdAt",
      title: tCommon("created"),
      type: "date",
      description: tCommon("when_this_row_first_entered_the_table"),
      sortable: true,
      filterable: true,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A story is a document, not a record: the operator is checking that the
 * headline, the body and the thumbnail read correctly before (or after) it goes
 * out. So the body is prose and a picture rather than key/value tiles, and the
 * two facts that decide whether it is live at all — is it visible, did it come
 * from the sync or from the desk — are pills beside the headline.
 *
 * `headline` is the table's primary column, so it is already the dialog header
 * and must not also be a tile. (`getPrimaryColumn` runs over the VISIBLE
 * columns, and `summary` — the description-shaped column it would otherwise
 * prefer — is `expandedOnly`, so it never reaches that ranking.) The body
 * therefore has to render `summary` itself, which it wants to anyway: a story
 * body is prose, not a key/value tile.
 * -------------------------------------------------------------------------- */

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      title: (row) => row.headline || t("untitled_story"),
      subtitle: (row) =>
        row.source === "MANUAL"
          ? t("desk_commentary_written_here_never_touched")
          : t("provider_story_re_synced_by_the"),

      badges: (row) => (
        <>
          <Badge tone={row.status ? "success" : "neutral"} appearance="soft">
            {row.status ? tCommon("visible") : tCommon("hidden")}
          </Badge>
          <Badge
            tone={row.source === "MANUAL" ? "info" : "neutral"}
            appearance="soft"
          >
            {row.source === "MANUAL" ? tCommon("desk") : tCommon("provider")}
          </Badge>
        </>
      ),

      stats: [
        {
          label: tCommon("published"),
          icon: Clock,
          value: (row) =>
            row.publishedAt ? format(new Date(row.publishedAt), "PPP p") : "—",
        },
        {
          label: tCommon("category"),
          icon: Tag,
          value: (row) => row.category || "Uncategorised",
        },
        {
          label: tCommon("added"),
          icon: CalendarPlus,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "PPP") : "—",
        },
      ],

      sections: [
        {
          id: "story",
          title: tCommon("story"),
          icon: FileText,
          render: (row) =>
            row.summary ? (
              <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                {row.summary}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("no_summary_the_terminal_shows_the_headline_alone")}
              </p>
            ),
        },
        {
          id: "thumbnail",
          title: t("thumbnail"),
          icon: ImageIcon,
          condition: (row) => Boolean(row.imageUrl),
          render: (row) => (
            <div className="space-y-2">
              {/* A plain <img>, deliberately — the same call the terminal's own
                  news pane makes. These URLs point at whatever host the provider
                  used, and next/image THROWS during render for a host that is
                  not on the remotePatterns allowlist, so one unrecognised
                  publisher would take the whole dialog down. A dead CDN link is
                  the normal case here, so the element removes itself rather than
                  leaving the browser's broken-image glyph. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- see the note above */}
              <img
                src={row.imageUrl}
                alt={row.headline || t("story_thumbnail")}
                loading="lazy"
                // The publisher must not learn which admin page is open.
                referrerPolicy="no-referrer"
                className="max-h-48 w-auto rounded-lg border border-border object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <p className="font-mono text-xs text-muted-foreground break-all">
                {row.imageUrl}
              </p>
            </div>
          ),
        },
        {
          id: "links",
          title: tCommon("links"),
          icon: Link2,
          columns: 1,
          fields: [
            {
              key: "url",
              fullWidth: true,
              emptyText: t("no_link_the_headline_is_not_clickable"),
              render: (value) => (
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {String(value)}
                </a>
              ),
            },
          ],
        },
        {
          /* The answer to "why did my edit come back?".
             `provider` and `externalId` are real columns on marketNews and are
             returned by the list endpoint, but neither earns a table column —
             they matter exactly once, when an operator has edited a synced
             story and wants to know what will overwrite it. Collapsed by
             default, and absent entirely on desk commentary, which has no
             provider identity at all. */
          id: "sync",
          title: t("provider_record"),
          description:
            t("the_sync_upserts_on_this_key"),
          icon: RefreshCw,
          columns: 2,
          collapsible: true,
          defaultCollapsed: true,
          condition: (row) => row.source === "PROVIDER",
          fields: [
            {
              key: "provider",
              title: tCommon("provider"),
              emptyText: tCommon("not_recorded"),
              render: (value) => String(value),
            },
            {
              key: "externalId",
              title: t("sync_key"),
              copyable: true,
              emptyText: t("none_this_row_will_not_be_re_synced"),
              render: (value) => (
                <span className="font-mono text-xs break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "tagging",
          title: tCommon("tagging"),
          description:
            t("symbols_decide_which_markets_the_story"),
          icon: Hash,
          columns: 1,
          fields: [
            {
              key: "relatedSymbols",
              fullWidth: true,
              emptyText: t("untagged_shown_for_every_market"),
            },
          ],
        },
      ],
    }),
    []
  );
}
