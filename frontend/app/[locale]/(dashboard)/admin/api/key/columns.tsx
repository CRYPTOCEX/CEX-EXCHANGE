"use client";
import React from "react";
import {
  Activity,
  Ban,
  CalendarClock,
  CalendarIcon,
  Fingerprint,
  Gauge,
  Key as KeyIcon,
  Lock,
  Mail,
  Network,
  Shield,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TagsCell } from "@/components/blocks/data-table/content/rows/cells/tags";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
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
      description: t("unique_identifier_for_the_api_key"),
      priority: 1,
    },
    {
      key: "user",
      title: tCommon("user"),
      expandedTitle: (row) => `User: ${row.id}`,
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_user_associated_with_the_api_key"),
      priority: 1,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("user_avatar"),
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
            icon: KeyIcon,
          },
        },
      },
    },
    {
      key: "name",
      title: tCommon("name"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("the_name_of_the_api_key"),
      priority: 1,
    },
    {
      key: "key",
      title: tCommon("key"),
      type: "text",
      icon: KeyIcon,
      sortable: true,
      searchable: true,
      filterable: false,
      description: t("the_api_key_string"),
      priority: 2,
      expandedOnly: true,
    },
    {
      key: "permissions",
      title: tCommon("permissions"),
      type: "multiselect",
      icon: Shield,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("list_of_permissions_for_this_api_key"),
      options: [
        { value: "trade", label: tCommon("trade") },
        { value: "futures", label: tCommon("futures") },
        { value: "deposit", label: tCommon("deposit") },
        { value: "withdraw", label: tCommon("withdraw") },
        { value: "transfer", label: tCommon("transfer") },
      ],
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          let perms = [];
          try {
            perms = typeof value === "string" ? JSON.parse(value) : value;
          } catch (err) {
            return <span className="text-destructive">{tCommon("invalid_json")}</span>;
          }
          return <TagsCell value={perms} row={row} maxDisplay={3} />;
        },
      },
    },
    {
      key: "ipRestriction",
      title: tCommon("ip_restriction"),
      type: "boolean",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("whether_ip_restriction_is_enabled"),
      priority: 1,
    },
    {
      key: "ipWhitelist",
      title: tCommon("ip_whitelist"),
      type: "tags",
      icon: Shield,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("whitelisted_ip_addresses"),
      expandedOnly: true,
      condition: (values) => values.ipRestriction === true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_api_key_was_created"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 2,
      expandedOnly: true,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * An API key is a CREDENTIAL, and the flat every-column grid showed only the
 * eight columns the table declares — the fields that decide whether a key is
 * still dangerous (expiry, last use, disabled state, rate-limit overrides) are
 * all carried by the row and none of them had a column. They are declared here
 * with explicit renderers so the panel shows the whole credential.
 * -------------------------------------------------------------------------- */

/** `permissions`/`ipWhitelist` are JSON columns that arrive as array OR string. */
function parseList(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatMoment(value: any, pattern = "MMM d, yyyy HH:mm"): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, pattern);
}

function isExpired(row: any): boolean {
  return Boolean(row?.expiresAt) && new Date(row.expiresAt).getTime() < Date.now();
}

function ownerName(row: any): string {
  return [row?.user?.firstName, row?.user?.lastName].filter(Boolean).join(" ");
}

function Mono({ value }: { value: any }) {
  return <span className="font-mono text-xs break-all">{String(value)}</span>;
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => row.name || `#${row.id}`,
      subtitle: (row) =>
        row.user
          ? [ownerName(row), row.user.email].filter(Boolean).join(" · ")
          : tCommon("unassigned_key"),

      badges: (row) => {
        const expired = isExpired(row);
        return (
          <>
            {row.deletedAt ? (
              <Badge tone="neutral" appearance="soft">
                Deleted
              </Badge>
            ) : row.disabled ? (
              <Badge tone="destructive" appearance="soft">
                <Ban className="h-3 w-3" />
                Disabled
              </Badge>
            ) : expired ? (
              <Badge tone="warning" appearance="soft">
                Expired
              </Badge>
            ) : (
              <Badge tone="success" appearance="soft">
                Active
              </Badge>
            )}
            {row.ipRestriction && (
              <Badge tone="info" appearance="soft">
                <Network className="h-3 w-3" />
                {t("ip_restricted")}
              </Badge>
            )}
          </>
        );
      },

      stats: [
        {
          label: tCommon("scopes"),
          icon: Lock,
          value: (row) => parseList(row.permissions).length,
        },
        {
          label: tCommon("last_used"),
          icon: Activity,
          value: (row) =>
            row.lastUsedAt ? formatMoment(row.lastUsedAt) : "Never used",
        },
        {
          label: tCommon("expires"),
          icon: CalendarClock,
          tone: "default",
          value: (row) =>
            row.expiresAt ? formatMoment(row.expiresAt, "MMM d, yyyy") : "No expiry",
        },
        {
          label: tCommon("created_at"),
          icon: CalendarIcon,
          value: (row) => formatMoment(row.createdAt, "MMM d, yyyy"),
        },
      ],

      sections: [
        {
          id: "credential",
          title: tCommon("credential"),
          icon: KeyIcon,
          columns: 3,
          fields: [
            {
              // The API returns the key masked to its last four characters, so
              // there is nothing here worth copying — only worth recognising.
              key: "key",
              icon: KeyIcon,
              render: (value) => <Mono value={value} />,
            },
            {
              key: "type",
              title: t("key_type"),
              icon: Shield,
              render: (value) => (
                <Badge
                  tone={value === "plugin" ? "info" : "neutral"}
                  appearance="soft"
                  className="capitalize"
                >
                  {String(value || "user")}
                </Badge>
              ),
            },
            { key: "id", title: tCommon("key_id"), icon: Fingerprint },
          ],
        },
        {
          id: "owner",
          title: tCommon("owner"),
          icon: User,
          columns: 2,
          // A plugin key can exist without a user; the section is meaningless then.
          condition: (row) => Boolean(row.user || row.userId),
          fields: [
            {
              key: "user.email",
              title: tCommon("email"),
              icon: Mail,
              copyable: true,
              render: (value) => <span className="break-all">{String(value)}</span>,
            },
            {
              key: "userId",
              title: tCommon("user_id"),
              icon: Fingerprint,
              copyable: true,
              render: (value) => <Mono value={value} />,
            },
          ],
        },
        {
          id: "scopes",
          title: tCommon("permissions"),
          description: t("what_this_key_is_allowed_to_do"),
          icon: Lock,
          columns: 1,
          fields: [{ key: "permissions", fullWidth: true }],
        },
        {
          id: "network",
          title: tCommon("network_restrictions"),
          icon: Network,
          columns: 2,
          fields: [
            { key: "ipRestriction", icon: Shield },
            {
              key: "ipWhitelist",
              icon: Network,
              fullWidth: true,
              condition: (row) => Boolean(row.ipRestriction),
              emptyText: t("no_addresses_whitelisted"),
            },
          ],
        },
        {
          id: "usage",
          title: t("usage"),
          icon: Activity,
          columns: 2,
          fields: [
            {
              key: "lastUsedIp",
              title: tCommon("last_used_from"),
              icon: Network,
              render: (value) => <Mono value={value} />,
              emptyText: tCommon("never_used"),
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: CalendarIcon,
              render: (value) => formatMoment(value),
            },
          ],
        },
        {
          id: "suspension",
          title: t("suspension"),
          icon: Ban,
          columns: 3,
          condition: (row) => Boolean(row.disabled || row.disabledAt),
          fields: [
            {
              key: "disabledAt",
              title: tCommon("disabled_at"),
              icon: CalendarIcon,
              render: (value) => formatMoment(value),
            },
            {
              key: "disabledBy",
              title: tCommon("disabled_by"),
              icon: User,
              render: (value) => (
                <span className="capitalize">{String(value)}</span>
              ),
            },
            {
              key: "disabledReason",
              title: tCommon("reason"),
              icon: Ban,
              fullWidth: true,
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "rate-limits",
          title: t("rate_limit_overrides"),
          description: t("per_route_limits_that_replace_the"),
          icon: Gauge,
          condition: (row) =>
            Boolean(row.rateLimitOverride) &&
            Object.keys(row.rateLimitOverride || {}).length > 0,
          render: (row) => (
            <div className="space-y-2">
              {Object.entries(row.rateLimitOverride || {}).map(
                ([route, rule]: [string, any]) => (
                  <div
                    key={route}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                  >
                    <span className="font-mono text-xs break-all">{route}</span>
                    <span className="text-sm font-medium shrink-0">
                      {rule?.limit ?? "—"}
                      <span className="text-muted-foreground">
                        {" / "}
                        {rule?.windowSec ?? "—"}s
                      </span>
                    </span>
                  </div>
                )
              )}
            </div>
          ),
        },
      ],
    }),
    [tCommon]
  );
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: tCommon("create_new_api_key"),
      description: t("generate_a_new_api_key_with"),
      groups: [
        {
          id: "basic-info",
          title: tCommon("basic_information"),
          icon: Shield,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 255 },
            { key: "key", required: true, maxLength: 255 },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: Lock,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              options: [
                { value: "trade", label: tCommon("trade") },
                { value: "futures", label: tCommon("futures") },
                { value: "deposit", label: tCommon("deposit") },
                { value: "withdraw", label: tCommon("withdraw") },
                { value: "transfer", label: tCommon("transfer") },
              ],
            },
          ],
        },
        {
          id: "security",
          title: tCommon("security_settings"),
          icon: Shield,
          priority: 3,
          fields: [
            { key: "ipRestriction" },
            { key: "ipWhitelist", condition: (values) => values.ipRestriction === true },
          ],
        },
      ],
    },
    edit: {
      title: tCommon("edit_api_key"),
      description: t("update_api_key_settings_and_permissions"),
      groups: [
        {
          id: "basic-info",
          title: tCommon("basic_information"),
          icon: Shield,
          priority: 1,
          fields: [
            { key: "name", required: true, maxLength: 255 },
            { key: "key", required: true, maxLength: 255 },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: Lock,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              options: [
                { value: "trade", label: tCommon("trade") },
                { value: "futures", label: tCommon("futures") },
                { value: "deposit", label: tCommon("deposit") },
                { value: "withdraw", label: tCommon("withdraw") },
                { value: "transfer", label: tCommon("transfer") },
              ],
            },
          ],
        },
        {
          id: "security",
          title: tCommon("security_settings"),
          icon: Shield,
          priority: 3,
          fields: [
            { key: "ipRestriction" },
            { key: "ipWhitelist", condition: (values) => values.ipRestriction === true },
          ],
        },
      ],
    },
  };
}
