"use client";
import React from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Mail,
  CalendarIcon,
  ToggleLeft,
  Shield,
  Landmark,
  Clock,
  CheckSquare,
  Phone,
  BadgeIcon,
  Smartphone,
  MapPin,
  Globe,
  FileText,
  Fingerprint,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/user";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

export function useColumns() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const tDashboardUser = useTranslations("dashboard_user");
  return [
    {
      key: "user",
      disablePrefixSort: true,
      title: t("user_details"),
      expandedTitle: (row) => `User Profile: ${row.firstName || ''} ${row.lastName || ''}`,
      type: "compound",
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      icon: User,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            // Initials, not the generic "Image Placeholder" plate.
            //
            // That asset is 400x400 and carries its own caption; squeezed into
            // the 48px avatar circle it renders as an illegible grey smudge —
            // it is drawn for product shots and banners, not for people. The
            // rest of the app already answers "person with no photo" with
            // initials (Avatar/AvatarFallback, and Lightbox's own no-src path),
            // so this row now matches.
            //
            // ImageCell treats a fallback containing "/" or "." as a URL and
            // anything else as literal text, which is why this returns bare
            // letters. Falling through to "" is fine: Lightbox derives initials
            // from `alt` (the person's name) on its own.
            fallback: (row: any) =>
              `${row?.firstName?.[0] ?? ""}${row?.lastName?.[0] ?? ""}`.toUpperCase(),
            type: "image",
            title: tCommon("avatar"),
            description: tCommon("users_profile_picture"),
            filterable: false,
            sortable: false,
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tCommon("users_first_name"), tCommon("users_last_name")],
            sortable: true,
            sortKey: "firstName",
            icon: User,
            validation: (value) => {
              if (!value) return "Name is required";
              if (value.length < 2)
                return "Name must be at least 2 characters long";
              return null;
            },
          },
          secondary: {
            key: "email",
            icon: Mail,
            type: "email",
            title: tCommon("email_address"),
            description: t("users_email_address"),
            sortable: true,
            validation: (value) => {
              if (!value) return "Email is required";
              if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
              return null;
            },
          },
          metadata: [
            {
              key: "lastLogin",
              icon: Clock,
              type: "date",
              title: tCommon("last_login"),
              description: t("users_last_login_date"),
              sortable: true,
              render: (value) => value ? format(new Date(value), "MMM d, yyyy HH:mm") : "Never",
            },
            {
              key: "role",
              idKey: "id",
              labelKey: "name",
              baseKey: "roleId",
              icon: Shield,
              type: "select",
              title: tCommon("role"),
              description: t("users_role_in_the_system"),
              sortable: true,
              sortKey: "role.name",
              apiEndpoint: {
                url: "/api/admin/crm/role/options",
                method: "GET",
              },
              render: (value) => value?.name || "No Role",
            },
          ],
        },
      },
    },

    // Basic info fields (form only - displayed in compound column in table)
    {
      key: "avatar",
      title: tCommon("avatar"),
      type: "image",
      icon: User,
      sortable: false,
      filterable: false,
      description: tCommon("users_profile_picture"),
      expandedOnly: true,
    },
    {
      key: "firstName",
      title: tCommon("first_name"),
      type: "text",
      icon: User,
      sortable: true,
      filterable: false,
      description: tCommon("users_first_name"),
      expandedOnly: true,
    },
    {
      key: "lastName",
      title: tCommon("last_name"),
      type: "text",
      icon: User,
      sortable: true,
      filterable: false,
      description: tCommon("users_last_name"),
      expandedOnly: true,
    },
    {
      key: "email",
      title: tCommon("email_address"),
      type: "email",
      icon: Mail,
      sortable: true,
      filterable: false,
      description: t("users_email_address"),
      expandedOnly: true,
    },
    {
      key: "roleId",
      title: tCommon("role"),
      type: "select",
      icon: Shield,
      sortable: false,
      filterable: false,
      description: t("users_role_in_the_system"),
      apiEndpoint: {
        url: "/api/admin/crm/role/options",
        method: "GET",
      },
      expandedOnly: true,
    },

    // Contact Information
    {
      key: "phone",
      title: tCommon("phone_number"),
      type: "text",
      icon: Phone,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 2,
      description: t("users_phone_number"),
      render: {
        type: "custom",
        render: (value: string) => {
          return value || "Not Provided";
        },
      },
    },
    {
      key: "phoneVerified",
      title: tCommon("phone_verified"),
      type: "boolean",
      icon: Smartphone,
      sortable: true,
      filterable: true,
      priority: 3,
      description: t("whether_the_users_phone_has_been_verified"),
    },

    // Account Status & Security
    {
      key: "status",
      title: tDashboard("account_status"),
      type: "select",
      icon: ToggleLeft,
      sortable: true,
      searchable: true,
      filterable: true,
      priority: 1,
      description: t("users_account_status"),
      render: {
        type: "custom",
        render: (value: any, row: any) => {
          const isBlocked = row.blocks?.some((block: any) => block.isActive === true) || false;
          const variant = (() => {
            switch (value?.toUpperCase()) {
              case "ACTIVE":
                return "success";
              case "INACTIVE":
                return "muted";
              case "SUSPENDED":
                return "warning";
              case "BANNED":
                return "danger";
              default:
                return "default";
            }
          })();

          return (
            <div className="flex items-center space-x-2">
              <Badge
                variant={variant as any}
                className="capitalize"
              >
                {value?.toLowerCase()}
              </Badge>
              {isBlocked && (
                <Shield className="h-4 w-4 text-destructive" />
              )}
            </div>
          );
        },
      },
      options: [
        { value: "ACTIVE", label: tCommon("active") },
        { value: "INACTIVE", label: tCommon("inactive") },
        { value: "SUSPENDED", label: tCommon("suspended") },
        { value: "BANNED", label: tCommon("banned") },
      ],
    },
    {
      key: "emailVerified",
      title: tCommon("email_verified"),
      type: "boolean",
      icon: CheckSquare,
      sortable: true,
      filterable: true,
      priority: 2,
      description: t("whether_the_users_email_has_been_verified"),
    },

    /**
     * The CALLING admin's own password — not a field on the user being edited.
     *
     * It exists as a column only because ViewForm resolves every form field
     * back to one (`getColumnByKey`, view-form.tsx) and skips with a console
     * warning when it cannot. `optional` is what keeps it out of the payload:
     * `processFormValues` drops empty optional fields, so a save that needs no
     * re-confirmation does not send an empty string the API would have to
     * ignore. The edit form shows it to non-Super-Admins only — see
     * useFormConfig below.
     *
     * The label and the when-do-I-need-this line live HERE rather than on the
     * form field, because `mergeFieldWithColumn` (view-form.tsx) does not carry
     * a field config's `title`/`description` across — the column is the only
     * source that reaches the input.
     */
    {
      key: "currentPassword",
      title: tCommon("current_password"),
      type: "password",
      icon: KeyRound,
      sortable: false,
      searchable: false,
      filterable: false,
      optional: true,
      expandedOnly: true,
      description: t("only_needed_if_you_change_the_email"),
    },

    // KYC Status - Simplified
    {
      key: "kyc.status",
      title: t("kyc_status"),
      type: "text",
      icon: BadgeIcon,
      // `kyc` is derived from the user's kycApplications after the query runs,
      // so it is not a column the API can sort or filter on.
      sortable: false,
      filterable: false,
      priority: 2,
      description: t("kyc_verification_status"),
      render: {
        type: "custom",
        render: (value: string, row: any) => {
          if (!row.kyc) {
            return (
              <Badge variant="secondary" className="text-xs">
                {tCommon("not_submitted")}
              </Badge>
            );
          }

          const statusValue = value?.toUpperCase();
          let displayText = value || "Not Submitted";
          let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";

          switch (statusValue) {
            case "APPROVED":
              variant = "default";
              break;
            case "PENDING":
              variant = "outline";
              break;
            case "REJECTED":
              variant = "destructive";
              break;
            case "ADDITIONAL_INFO_REQUIRED":
              variant = "secondary";
              displayText = "Additional Info Required";
              break;
          }

          return (
            <Badge variant={variant} className="text-xs">
              {displayText}
            </Badge>
          );
        },
      },
    },

    // Two-Factor Authentication Status - Simplified
    {
      key: "twoFactor.enabled",
      title: `2FA ${tCommon('status')}`,
      type: "boolean",
      icon: Shield,
      sortable: false,
      filterable: false,
      priority: 3,
      description: t("two_factor_authentication_status"),
      render: {
        type: "custom",
        render: (value: boolean, row: any) => {
          const isEnabled = row.twoFactor?.enabled || false;
          return (
            <Badge variant={isEnabled ? "default" : "destructive"} className="text-xs">
              {isEnabled ? tCommon("enabled") : tCommon("disabled")}
            </Badge>
          );
        },
      },
    },

    // Timestamps
    {
      key: "createdAt",
      title: t("registration_date"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: t("date_when_the_user_registered"),
      render: {
        type: "date",
        format: "PPP",
      },
      priority: 2,
    },

    // Profile fields (form only)
    {
      key: "profile.bio",
      title: tCommon("bio"),
      type: "textarea",
      icon: FileText,
      sortable: false,
      filterable: false,
      description: t("user_biography_or_description"),
      expandedOnly: true,
    },
    {
      key: "profile.location.address",
      title: tCommon("address"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: t("users_street_address"),
      expandedOnly: true,
    },
    {
      key: "profile.location.city",
      title: tCommon("city"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: t("users_city"),
      expandedOnly: true,
    },
    {
      key: "profile.location.country",
      title: tCommon("country"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: t("users_country"),
      expandedOnly: true,
    },
    {
      key: "profile.location.zip",
      title: tCommon("zip_code"),
      type: "text",
      icon: MapPin,
      sortable: false,
      filterable: false,
      description: t("users_zip_postal_code"),
      expandedOnly: true,
    },
    {
      key: "profile.social.facebook",
      title: "Facebook",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: t("facebook_profile_url"),
      expandedOnly: true,
    },
    {
      key: "profile.social.twitter",
      title: "Twitter",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: t("twitter_profile_url"),
      expandedOnly: true,
    },
    {
      key: "profile.social.instagram",
      title: "Instagram",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: t("instagram_profile_url"),
      expandedOnly: true,
    },
    {
      key: "profile.social.github",
      title: "GitHub",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: t("github_profile_url"),
      expandedOnly: true,
    },
    {
      key: "profile.social.gitlab",
      title: "GitLab",
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: t("gitlab_profile_url"),
      expandedOnly: true,
    },
    {
      key: "profile.social.dribbble",
      title: t("dribbble"),
      type: "url",
      icon: Globe,
      sortable: false,
      filterable: false,
      description: t("dribbble_profile_url"),
      expandedOnly: true,
    },

  ];
}

/* -------------------------------------------------------------------------- *
 * View dialog
 *
 * Without this the expanded row rendered all 24 columns as one flat list of
 * key/value tiles in a 600px column — "AVATAR / No Image", "ROLE / 1" — under a
 * heading that was the row's raw uuid. A user record has an obvious shape
 * (who they are / how to reach them / how secure the account is / where they
 * are), so it is declared here and the dialog follows it.
 * -------------------------------------------------------------------------- */

function initialsOf(row: any): string {
  return `${row?.firstName?.[0] ?? ""}${row?.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function statusTone(status?: string) {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
      return "success" as const;
    case "INACTIVE":
      return "neutral" as const;
    case "SUSPENDED":
      return "warning" as const;
    case "BANNED":
      return "destructive" as const;
    default:
      return "neutral" as const;
  }
}

export function useViewConfig(): ViewConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      title: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-11 border border-border">
            <AvatarImage src={row.avatar || undefined} alt={`${row.firstName ?? ""} ${row.lastName ?? ""}`} />
            <AvatarFallback className="text-sm font-semibold">
              {initialsOf(row)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-foreground">
              {[row.firstName, row.lastName].filter(Boolean).join(" ") ||
                row.email ||
                `#${row.id}`}
            </span>
            <span className="block truncate text-sm font-normal text-muted-foreground">
              {row.email}
            </span>
          </span>
        </div>
      ),

      badges: (row) => {
        const blocked = row.blocks?.some((block: any) => block.isActive === true);
        return (
          <>
            <Badge tone={statusTone(row.status)} appearance="soft" className="capitalize">
              {String(row.status ?? "").toLowerCase() || tCommon("unknown")}
            </Badge>
            {blocked && (
              <Badge tone="destructive" appearance="soft">
                <Shield className="h-3 w-3" />
                {tCommon("blocked")}
              </Badge>
            )}
            {row.twoFactor?.enabled && (
              <Badge tone="info" appearance="soft">
                <ShieldCheck className="h-3 w-3" />
                2FA
              </Badge>
            )}
            {/* The platform's own accounts (pool-backing treasury, AI market
                maker pool). Listed, not hidden, so an operator doing hygiene
                sees what the row is; every action on it refuses by name. */}
            {row.system && (
              <Badge tone="warning" appearance="soft">
                <Landmark className="h-3 w-3" />
                {tCommon("system_account")}
              </Badge>
            )}
          </>
        );
      },

      stats: [
        {
          label: tCommon("role"),
          icon: Shield,
          value: (row) => row.role?.name || tCommon("no_role"),
        },
        {
          label: t("kyc_status"),
          icon: Fingerprint,
          tone: "default",
          value: (row) =>
            row.kyc?.status ? (
              <span className="capitalize">
                {String(row.kyc.status).toLowerCase().replace(/_/g, " ")}
              </span>
            ) : (
              tCommon("not_submitted")
            ),
        },
        {
          label: tCommon("last_login"),
          icon: Clock,
          value: (row) =>
            row.lastLogin ? format(new Date(row.lastLogin), "MMM d, yyyy HH:mm") : tCommon("never"),
        },
        {
          label: t("registration_date"),
          icon: CalendarIcon,
          value: (row) =>
            row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—",
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: User },
        { id: "profile", title: tCommon("profile"), icon: FileText },
        { id: "security", title: tCommon("security"), icon: KeyRound },
      ],

      sections: [
        {
          id: "identity",
          tab: "overview",
          title: tCommon("basic_information"),
          icon: User,
          columns: 3,
          fields: [
            { key: "firstName", icon: User },
            { key: "lastName", icon: User },
            { key: "email", icon: Mail, copyable: true },
            {
              // `roleId` is the FORM's field and holds the numeric id, so the
              // generic renderer printed "1". The row also carries the joined
              // `role` object, which is what an operator needs to read.
              key: "roleId",
              title: tCommon("role"),
              icon: Shield,
              render: (_value, row) => row.role?.name || tCommon("no_role"),
            },
            {
              key: "id",
              title: tCommon("user_id"),
              icon: Fingerprint,
              copyable: true,
              render: (_value, row) => (
                <span className="font-mono text-xs break-all">{row.id}</span>
              ),
            },
          ],
        },
        {
          id: "contact",
          tab: "overview",
          title: tCommon("contact_information"),
          icon: Phone,
          columns: 3,
          fields: [
            { key: "phone", icon: Phone, emptyText: tCommon("not_provided") },
            { key: "phoneVerified", icon: Smartphone },
            { key: "emailVerified", icon: CheckSquare },
          ],
        },
        {
          id: "bio",
          tab: "profile",
          title: tCommon("profile"),
          icon: FileText,
          columns: 1,
          fields: [{ key: "profile.bio", title: tCommon("bio"), fullWidth: true }],
        },
        {
          id: "location",
          tab: "profile",
          title: tCommon("location"),
          icon: MapPin,
          columns: 4,
          fields: [
            "profile.location.address",
            "profile.location.city",
            "profile.location.country",
            "profile.location.zip",
          ],
        },
        {
          id: "social",
          tab: "profile",
          title: tCommon("social_links"),
          icon: Globe,
          columns: 3,
          fields: [
            "profile.social.facebook",
            "profile.social.twitter",
            "profile.social.instagram",
            "profile.social.github",
            "profile.social.gitlab",
            "profile.social.dribbble",
          ],
        },
        {
          id: "security",
          tab: "security",
          title: tDashboard("account_status"),
          icon: ToggleLeft,
          columns: 3,
          fields: [
            { key: "status", icon: ToggleLeft },
            { key: "twoFactor.enabled", icon: ShieldCheck },
            { key: "kyc.status", icon: BadgeIcon },
            { key: "lastLogin", title: tCommon("last_login"), icon: Clock },
          ],
        },
        {
          id: "blocks",
          tab: "security",
          title: t("block_history"),
          icon: Shield,
          // A block record is a small timeline, not a field — the generic
          // key/value tile would print "[object Object]" for it.
          condition: (row) => Boolean(row.blocks?.length),
          render: (row) => (
            <div className="space-y-2">
              {row.blocks.map((block: any, index: number) => (
                <div
                  key={block.id ?? index}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">
                      {block.reason || tCommon("no_reason_provided")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {block.createdAt
                        ? format(new Date(block.createdAt), "PPp")
                        : "—"}
                      {block.until
                        ? ` → ${format(new Date(block.until), "PPp")}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    tone={block.isActive ? "destructive" : "neutral"}
                    appearance="soft"
                  >
                    {block.isActive ? tCommon("active") : tCommon("lifted")}
                  </Badge>
                </div>
              ))}
            </div>
          ),
        },
      ],
    }),
    [t, tCommon, tDashboard]
  );
}

export function useFormConfig(): FormConfig {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");

  /**
   * Who has to re-confirm their own password before a sensitive save.
   *
   * A Super Admin does not — see the re-auth block in the PUT handler
   * (backend/src/api/admin/crm/user/[id]/index.put.ts). Mirroring the exemption
   * here is what keeps the form honest: showing the field to someone the API
   * will never read it from is a step asked for nothing, and the last version
   * of this form showed it to NOBODY, which is why changing a role returned
   * "Your current password is required" with no field anywhere to type it into.
   *
   * This is presentation only. The server decides; a client that shows the
   * field to the wrong admin, or hides it from one, changes nothing about who
   * is allowed to save what.
   */
  const isSuperAdmin =
    useUserStore((state) => state.user)?.role?.name === "Super Admin";

  return {
    create: {
      title: t("create_new_user"),
      description: t("register_a_new_user_account_with"),
      groups: [
        {
          id: "basic-info",
          title: tCommon("basic_information"),
          icon: User,
          priority: 1,
          fields: [
            { key: "avatar", compoundKey: "user" },
            {
              key: "firstName",
              compoundKey: "user",
              required: true,
              validation: (value) => {
                if (!value) return "First name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "First name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "lastName",
              compoundKey: "user",
              required: true,
              validation: (value) => {
                if (!value) return "Last name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "Last name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "email",
              compoundKey: "user",
              required: true,
              validation: (value) => {
                if (!value) return "Email is required";
                if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
                return null;
              },
            },
          ],
        },
        {
          id: "contact",
          title: tCommon("contact_information"),
          icon: Phone,
          priority: 2,
          fields: [
            {
              key: "phone",
              required: false,
              validation: (value) => {
                if (value && !/^\+\d{7,15}$/.test(value))
                  return "Phone number must be in international format, e.g. +254711972926";
                return null;
              },
            },
            { key: "phoneVerified" },
          ],
        },
        {
          id: "role",
          title: t("role_permissions"),
          icon: Shield,
          priority: 3,
          fields: [
            {
              key: "roleId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/role/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "status",
          title: tDashboard("account_status"),
          icon: ToggleLeft,
          priority: 4,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "BANNED", label: tCommon("banned") },
              ],
            },
            { key: "emailVerified" },
          ],
        },
        {
          id: "profile",
          title: tCommon("profile"),
          icon: FileText,
          priority: 5,
          fields: [
            {
              key: "profile.bio",
              type: "textarea",
              title: tCommon("bio"),
              description: t("user_biography_or_description"),
              required: false,
            },
          ],
        },
        {
          id: "location",
          title: tCommon("location"),
          icon: MapPin,
          priority: 6,
          fields: [
            {
              key: "profile.location.address",
              type: "text",
              title: tCommon("address"),
              required: false,
            },
            {
              key: "profile.location.city",
              type: "text",
              title: tCommon("city"),
              required: false,
            },
            {
              key: "profile.location.country",
              type: "text",
              title: tCommon("country"),
              required: false,
            },
            {
              key: "profile.location.zip",
              type: "text",
              title: tCommon("zip_code"),
              required: false,
              validation: (value) => {
                if (value && (value.length < 5 || value.length > 10))
                  return "Zip code must be between 5 and 10 characters";
                return null;
              },
            },
          ],
        },
        {
          id: "social",
          title: tCommon("social_links"),
          icon: Globe,
          priority: 7,
          fields: [
            {
              key: "profile.social.facebook",
              type: "url",
              title: "Facebook",
              required: false,
            },
            {
              key: "profile.social.twitter",
              type: "url",
              title: "Twitter",
              required: false,
            },
            {
              key: "profile.social.instagram",
              type: "url",
              title: "Instagram",
              required: false,
            },
            {
              key: "profile.social.github",
              type: "url",
              title: "GitHub",
              required: false,
            },
            {
              key: "profile.social.gitlab",
              type: "url",
              title: "GitLab",
              required: false,
            },
            {
              key: "profile.social.dribbble",
              type: "url",
              title: t("dribbble"),
              required: false,
            },
          ],
        },
      ],
    },
    edit: {
      title: t("edit_user"),
      description: t("update_user_account_details_and_settings"),
      groups: [
        {
          id: "basic-info",
          title: tCommon("basic_information"),
          icon: User,
          priority: 1,
          fields: [
            { key: "avatar", compoundKey: "user" },
            {
              key: "firstName",
              compoundKey: "user",
              required: true,
              validation: (value) => {
                if (!value) return "First name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "First name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "lastName",
              compoundKey: "user",
              required: true,
              validation: (value) => {
                if (!value) return "Last name is required";
                if (!/^[\p{L} \-'.]+$/u.test(value))
                  return "Last name can only contain letters, spaces, hyphens, apostrophes, and periods";
                return null;
              },
            },
            {
              key: "email",
              compoundKey: "user",
              required: true,
              validation: (value) => {
                if (!value) return "Email is required";
                if (!/\S+@\S+\.\S+/.test(value)) return "Invalid email format";
                return null;
              },
            },
          ],
        },
        {
          id: "contact",
          title: tCommon("contact_information"),
          icon: Phone,
          priority: 2,
          fields: [
            {
              key: "phone",
              required: false,
              validation: (value) => {
                if (value && !/^\+\d{7,15}$/.test(value))
                  return "Phone number must be in international format, e.g. +254711972926";
                return null;
              },
            },
            { key: "phoneVerified" },
          ],
        },
        {
          id: "role",
          title: t("role_permissions"),
          icon: Shield,
          priority: 3,
          fields: [
            {
              key: "roleId",
              required: true,
              apiEndpoint: {
                url: "/api/admin/crm/role/options",
                method: "GET",
              },
            },
          ],
        },
        {
          id: "status",
          title: tDashboard("account_status"),
          icon: ToggleLeft,
          priority: 4,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "ACTIVE", label: tCommon("active") },
                { value: "INACTIVE", label: tCommon("inactive") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "BANNED", label: tCommon("banned") },
              ],
            },
            { key: "emailVerified" },
            { key: "phoneVerified" },
            // NO 2FA CONTROL HERE, DELIBERATELY. The old "Disable 2FA" switch
            // posted `disableTwoFactor` while the handler reads `twoFactor`, so
            // it reported success and did nothing. 2FA is reset from the user's
            // own page, which has the dedicated /reset-2fa action — see
            // admin/crm/user/[id]/page.tsx.
          ],
        },
        {
          id: "reauth",
          title: tCommon("security"),
          icon: KeyRound,
          // Last, immediately above Save: it confirms the form, it is not part
          // of the record being edited.
          priority: 8,
          // Hidden from a Super Admin, who the API exempts. `condition` is read
          // by processFormConfigGroups; the schema and defaults still carry the
          // key either way, and it leaves empty as an optional field.
          condition: !isSuperAdmin,
          fields: [{ key: "currentPassword", required: false }],
        },
        {
          id: "profile",
          title: tCommon("profile"),
          icon: FileText,
          priority: 5,
          fields: [
            {
              key: "profile.bio",
              type: "textarea",
              title: tCommon("bio"),
              description: t("user_biography_or_description"),
              required: false,
            },
          ],
        },
        {
          id: "location",
          title: tCommon("location"),
          icon: MapPin,
          priority: 6,
          fields: [
            {
              key: "profile.location.address",
              type: "text",
              title: tCommon("address"),
              required: false,
            },
            {
              key: "profile.location.city",
              type: "text",
              title: tCommon("city"),
              required: false,
            },
            {
              key: "profile.location.country",
              type: "text",
              title: tCommon("country"),
              required: false,
            },
            {
              key: "profile.location.zip",
              type: "text",
              title: tCommon("zip_code"),
              required: false,
              validation: (value) => {
                if (value && (value.length < 5 || value.length > 10))
                  return "Zip code must be between 5 and 10 characters";
                return null;
              },
            },
          ],
        },
        {
          id: "social",
          title: tCommon("social_links"),
          icon: Globe,
          priority: 7,
          fields: [
            {
              key: "profile.social.facebook",
              type: "url",
              title: "Facebook",
              required: false,
            },
            {
              key: "profile.social.twitter",
              type: "url",
              title: "Twitter",
              required: false,
            },
            {
              key: "profile.social.instagram",
              type: "url",
              title: "Instagram",
              required: false,
            },
            {
              key: "profile.social.github",
              type: "url",
              title: "GitHub",
              required: false,
            },
            {
              key: "profile.social.gitlab",
              type: "url",
              title: "GitLab",
              required: false,
            },
            {
              key: "profile.social.dribbble",
              type: "url",
              title: t("dribbble"),
              required: false,
            },
          ],
        },
      ],
    },
  };
}
