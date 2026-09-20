"use client";
import React from "react";
import { Shield, ListChecks, Hash, Layers, KeyRound } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
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
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Hash,
      description: t("unique_identifier_for_the_role_record"),
      priority: 3,
    },
    {
      key: "name",
      title: t("role_name"),
      type: "text",
      sortable: true,
      searchable: true,
      filterable: true,
      icon: Shield,
      description: t("unique_name_of_the_role_e_g_admin_user_moderator"),
      priority: 1,
    },
    {
      key: "permissions",
      title: tCommon("permissions"),
      type: "multiselect",
      icon: ListChecks,
      sortable: false,
      searchable: false,
      filterable: false,
      description: t("list_of_permissions_assigned_to_this"),
      apiEndpoint: {
        url: "/api/admin/crm/permission/options",
        method: "GET",
      },
      render: {
        type: "tags",
        config: { maxDisplay: 3 },
      },
      priority: 2,
    },
  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * A role has three columns, but one of them IS the record: the permission set.
 * The list renders it with `maxDisplay: 3`, so a role carrying 180 grants shows
 * three chips and "+177" — and the flat dialog repeated exactly that, because
 * `permissions` is a typed column and reaches the table's own cell renderer.
 *
 * The panel therefore renders the whole set, grouped the way the names are
 * actually built (`<action>.<resource>`): one line per resource, the actions on
 * it as chips, with delete/edit toned so the dangerous grants are visible at a
 * glance rather than buried in an alphabetical wall.
 * -------------------------------------------------------------------------- */

/** Ink for a permission VERB. Destructive grants are the ones worth spotting. */
const ACTION_TONE: Record<string, BadgeTone> = {
  access: "neutral",
  view: "info",
  create: "success",
  edit: "warning",
  delete: "destructive",
};

interface PermissionGroup {
  resource: string;
  actions: string[];
}

/**
 * `create.ecommerce.category` → resource `ecommerce.category`, action `create`.
 * A name with no dot has no verb; it becomes its own single-entry group so it
 * is still shown rather than silently dropped.
 */
function groupPermissions(permissions: any[]): PermissionGroup[] {
  const groups = new Map<string, string[]>();

  for (const entry of permissions) {
    const name = typeof entry === "string" ? entry : entry?.name;
    if (!name) continue;

    const parts = String(name).split(".");
    const hasVerb = parts.length > 1;
    const resource = hasVerb ? parts.slice(1).join(".") : String(name);
    const action = hasVerb ? parts[0] : String(name);

    const actions = groups.get(resource) ?? [];
    if (!actions.includes(action)) actions.push(action);
    groups.set(resource, actions);
  }

  return Array.from(groups.entries())
    .map(([resource, actions]) => ({
      resource,
      actions: actions.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.resource.localeCompare(b.resource));
}

function permissionsOf(row: any): any[] {
  return Array.isArray(row?.permissions) ? row.permissions : [];
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "3xl",

      badges: (row) => {
        const count = permissionsOf(row).length;
        return count > 0 ? (
          <Badge tone="info" appearance="soft">
            {count === 1 ? "1 permission" : t("permissions", { count: String(count) })}
          </Badge>
        ) : (
          <Badge tone="warning" appearance="soft">
            {t("no_permissions")}
          </Badge>
        );
      },

      stats: [
        {
          label: t("permissions_granted"),
          icon: ListChecks,
          value: (row) => permissionsOf(row).length,
        },
        {
          label: t("resources_covered"),
          icon: Layers,
          value: (row) => groupPermissions(permissionsOf(row)).length,
        },
      ],

      sections: [
        {
          id: "role-info",
          title: t("role_information"),
          icon: Shield,
          // One short scalar; a bordered half-width tile for a role id reads as
          // a lonely box, a label/value line does not.
          variant: "rows",
          priority: 1,
          fields: [{ key: "id", title: "ID", icon: Hash }],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: KeyRound,
          variant: "plain",
          priority: 2,
          render: (row) => {
            const groups = groupPermissions(permissionsOf(row));
            if (!groups.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  {t("this_role_grants_no_permissions")}
                </p>
              );
            }
            return (
              <div className="max-h-96 overflow-y-auto space-y-2 pe-1">
                {groups.map((group) => (
                  <div
                    key={group.resource}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 min-w-0"
                  >
                    <span className="text-sm font-medium break-words min-w-0 me-auto">
                      {group.resource.replace(/\./g, " / ")}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {group.actions.map((action) => (
                        <Badge
                          key={action}
                          tone={ACTION_TONE[action] ?? "neutral"}
                          appearance="soft"
                          className="capitalize"
                        >
                          {action}
                        </Badge>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            );
          },
        },
      ],
    }),
    [t, tCommon]
  );
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  return {
    create: {
      title: t("create_new_role"),
      description: t("set_up_a_new_user_role_with_specific_permissions"),
      groups: [
        {
          id: "role-info",
          title: t("role_information"),
          icon: Shield,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              validation: (value) => {
                if (!value) return "Role name is required";
                if (value.length < 1) return "Role name cannot be empty";
                return null;
              },
            },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: ListChecks,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/permission/options",
                method: "GET",
              },
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_role"),
      description: t("update_role_details_and_permission_assignments"),
      groups: [
        {
          id: "role-info",
          title: t("role_information"),
          icon: Shield,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              validation: (value) => {
                if (!value) return "Role name is required";
                if (value.length < 1) return "Role name cannot be empty";
                return null;
              },
            },
          ],
        },
        {
          id: "permissions",
          title: tCommon("permissions"),
          icon: ListChecks,
          priority: 2,
          fields: [
            {
              key: "permissions",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/permission/options",
                method: "GET",
              },
            },
          ],
        },
      ],
    },
  };
}
