"use client";

import React from "react";
import {
  Hash,
  User,
  Mail,
  Globe,
  Building2,
  CheckCircle2,
  Shield,
  CalendarIcon,
  DollarSign,
  ToggleLeft,
  Settings,
  Banknote,
  Coins,
  FileText,
  Gauge,
  MapPin,
  Percent,
  Phone,
  Store,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  FormConfig,
  ViewConfig,
} from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "name",
      title: tExtAdmin("business_name"),
      type: "text",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_registered_business_name_of_the"),
      priority: 1,
    },
    {
      key: "user",
      title: tCommon("owner"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_account_owner_who_manages_this"),
      priority: 2,
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
      key: "status",
      title: tCommon("status"),
      type: "select",
      icon: CheckCircle2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_operational_status_of_the_merchant"),
      priority: 1,
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {
          withDot: true,
        },
      },
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "ACTIVE", label: tCommon("active") },
        { value: "SUSPENDED", label: tCommon("suspended") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
    },
    {
      key: "verificationStatus",
      title: tCommon("verification"),
      type: "select",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("kyb_know_your_business_verification_status"),
      priority: 2,
      render: {
        // No local `variant`: the hue comes from `lib/status-tone.ts`. Adding one
        // back here silently overrides the platform's canonical status colours.
        type: "badge",
        config: {
          withDot: true,
        },
      },
      options: [
        { value: "UNVERIFIED", label: tCommon("unverified") },
        { value: "PENDING", label: tCommon("pending") },
        { value: "VERIFIED", label: tCommon("verified") },
        { value: "REJECTED", label: tCommon("rejected") },
      ],
    },
    {
      key: "testMode",
      title: tCommon("test_mode"),
      type: "boolean",
      icon: ToggleLeft,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("indicates_if_merchant_is_operating_in"),
      priority: 3,
      render: {
        type: "badge",
        config: {
          withDot: false,
          variant: (value: boolean) => (value ? "warning" : "success"),
          transform: (value: boolean) => (value ? "Test Mode" : "Live Mode"),
        },
      },
    },
    {
      key: "email",
      title: tCommon("business_email"),
      type: "text",
      icon: Mail,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("primary_contact_email_address_for_business"),
      expandedOnly: true,
    },
    {
      key: "website",
      title: tCommon("website"),
      type: "text",
      icon: Globe,
      sortable: false,
      searchable: false,
      filterable: false,
      description: tExtAdmin("official_website_url_where_the_merchant"),
      expandedOnly: true,
    },
    {
      key: "feePercentage",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("transaction_fee_percentage_charged_to_this"),
      expandedOnly: true,
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_merchant"),
      render: {
        type: "date",
        format: "PPP",
      },
      expandedOnly: true,
    },
    {
      key: "id",
      title: "ID",
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_system_identifier_for_the_merchant"),
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    create: {
      title: tExtAdmin("create_new_merchant"),
      description: tExtAdmin("register_a_new_payment_gateway_merchant"),
      groups: [
        {
          id: "business-info",
          title: tCommon("business_information"),
          icon: Building2,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              minLength: 2,
              maxLength: 191
            },
            {
              key: "email",
              required: true,
              maxLength: 255
            },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_merchant"),
      description: tExtAdmin("update_merchant_business_information_verification"),
      groups: [
        {
          id: "business-info",
          title: tCommon("business_information"),
          icon: Building2,
          priority: 1,
          fields: [
            {
              key: "name",
              required: true,
              minLength: 2,
              maxLength: 191
            },
            {
              key: "email",
              required: true,
              maxLength: 255
            },
            {
              key: "website",
              required: false,
              maxLength: 500
            },
          ],
        },
        {
          id: "status-verification",
          title: tExtAdmin("status_verification"),
          icon: Shield,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "ACTIVE", label: tCommon("active") },
                { value: "SUSPENDED", label: tCommon("suspended") },
                { value: "REJECTED", label: tCommon("rejected") },
              ],
            },
            {
              key: "verificationStatus",
              required: true,
              options: [
                { value: "UNVERIFIED", label: tCommon("unverified") },
                { value: "PENDING", label: tCommon("pending") },
                { value: "VERIFIED", label: tCommon("verified") },
              ],
            },
          ],
        },
        {
          id: "fee-settings",
          title: tExtAdmin("fee_settings"),
          icon: Settings,
          priority: 3,
          fields: [
            {
              key: "feePercentage",
              required: true,
              min: 0,
              max: 100
            },
            {
              key: "testMode",
              required: true
            },
          ],
        },
      ],
    },
  };
}

/* ---------------------------------------------------------------------------
 * View dialog
 * ------------------------------------------------------------------------ */

const MERCHANT_STATUS_TONE: Record<
  string,
  "success" | "warning" | "destructive" | "info" | "neutral"
> = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "warning",
  REJECTED: "destructive",
};

const VERIFICATION_TONE: Record<
  string,
  "success" | "warning" | "destructive" | "info" | "neutral"
> = {
  VERIFIED: "success",
  PENDING: "info",
  UNVERIFIED: "neutral",
  REJECTED: "destructive",
};

const FEE_TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "Percentage only",
  FIXED: "Fixed only",
  BOTH: "Percentage + fixed",
};

const PAYOUT_SCHEDULE_LABEL: Record<string, string> = {
  INSTANT: "Instant",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

/**
 * Every money column on this model is a DECIMAL, and mysql2 hands DECIMALs back
 * as STRINGS — `Number()` first or the arithmetic silently concatenates.
 */
function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: any, currency?: string): string {
  const parsed = toNumber(value);
  if (parsed === null) return "—";
  const body = parsed.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return currency ? `${body} ${currency}` : body;
}

function ChipList({ values }: { values: any }) {
  const list = Array.isArray(values) ? values : [];
  if (!list.length) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((entry: any) => (
        <Badge key={String(entry)} tone="neutral" appearance="soft">
          {String(entry)}
        </Badge>
      ))}
    </span>
  );
}

/**
 * A merchant record is an onboarding file, not a lookup row: the business, the
 * person who owns it, the pricing it trades on and the payout policy are four
 * separate decisions that happen to share a table. Flattened into one grid, the
 * fee an operator opened the panel to check sat between the postal code and the
 * webhook schedule, and none of the limits — the numbers that actually gate the
 * account — were visible at all.
 */
export function useViewConfig(): ViewConfig {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  return React.useMemo<ViewConfig>(
    () => ({
      size: "4xl",

      /* The compound `user` column wins `getPrimaryColumn`, so the untouched
         header announced the OWNER of a merchant table. The business is the
         record; the owner belongs in its own block. */
      title: (row) => row.name || t("merchant"),
      subtitle: (row) => row.slug || row.website || row.email || "",

      badges: (row) => (
        <>
          <Badge
            tone={MERCHANT_STATUS_TONE[String(row.status)] ?? "neutral"}
            appearance="soft"
          >
            {String(row.status ?? "").replace(/_/g, " ") || tCommon("unknown")}
          </Badge>
          <Badge
            tone={VERIFICATION_TONE[String(row.verificationStatus)] ?? "neutral"}
            appearance="soft"
          >
            <Shield className="h-3 w-3" />
            {String(row.verificationStatus ?? "").replace(/_/g, " ") ||
              tCommon("unverified")}
          </Badge>
          <Badge tone={row.testMode ? "warning" : "success"} appearance="soft">
            {row.testMode ? tCommon("test_mode") : tCommon("live_mode")}
          </Badge>
        </>
      ),

      stats: [
        {
          label: tCommon("fee"),
          icon: Percent,
          // The headline fee depends on which fee model the merchant is on;
          // showing the percentage alone misreads a FIXED merchant as free.
          value: (row) => {
            const percentage = toNumber(row.feePercentage);
            const fixed = toNumber(row.feeFixed);
            const currency = row.defaultCurrency || "";
            if (row.feeType === "FIXED") return formatMoney(fixed, currency);
            if (row.feeType === "BOTH") {
              return `${percentage ?? 0}% + ${formatMoney(fixed, currency)}`;
            }
            return percentage === null ? "—" : `${percentage}%`;
          },
        },
        {
          label: tExt("per_transaction"),
          icon: Gauge,
          value: (row) => formatMoney(row.transactionLimit, row.defaultCurrency),
        },
        {
          label: tCommon("daily_limit"),
          icon: Coins,
          value: (row) => formatMoney(row.dailyLimit, row.defaultCurrency),
        },
        {
          label: t("monthly_limit_per_merchant"),
          icon: Banknote,
          value: (row) => formatMoney(row.monthlyLimit, row.defaultCurrency),
        },
      ],

      tabs: [
        { id: "profile", title: tCommon("profile"), icon: Store },
        { id: "commerce", title: tCommon("commerce"), icon: Wallet },
        { id: "record", title: tCommon("record"), icon: FileText },
      ],

      sections: [
        {
          id: "business",
          tab: "profile",
          title: t("business"),
          icon: Building2,
          columns: 3,
          fields: [
            {
              key: "businessType",
              title: tCommon("business_type"),
              emptyText: tCommon("not_stated"),
              render: (value) => String(value),
            },
            { key: "website", icon: Globe },
            {
              key: "slug",
              title: tCommon("slug"),
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{String(value)}</span>
              ),
            },
            {
              key: "description",
              title: tCommon("description"),
              fullWidth: true,
              emptyText: tCommon("no_description_provided"),
              render: (value) => String(value),
            },
          ],
        },
        {
          id: "contact",
          tab: "profile",
          title: t("contact"),
          icon: Mail,
          columns: 3,
          fields: [
            { key: "email", icon: Mail, copyable: true },
            {
              key: "phone",
              title: tCommon("phone"),
              icon: Phone,
              emptyText: tCommon("not_provided"),
              render: (value) => String(value),
            },
          ],
        },
        {
          id: "owner",
          tab: "profile",
          title: tCommon("owner"),
          description:
            t("the_platform_account_that_signs_in"),
          icon: User,
          columns: 3,
          fields: [
            {
              key: "user.firstName",
              title: tCommon("owner"),
              emptyText: tCommon("unknown"),
              render: (_value, row) =>
                [row.user?.firstName, row.user?.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unknown",
            },
            {
              key: "user.email",
              title: t("owner_email"),
              copyable: true,
              render: (value) => String(value),
            },
            {
              key: "userId",
              title: t("owner_id"),
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "address",
          tab: "profile",
          title: t("registered_address"),
          icon: MapPin,
          columns: 4,
          // Every tile hides when empty, so a merchant that never filled the
          // address in drops the whole block rather than showing five dashes.
          fields: [
            {
              key: "address",
              title: t("street"),
              hideEmpty: true,
              fullWidth: true,
              render: (value) => String(value),
            },
            {
              key: "city",
              title: tCommon("city"),
              hideEmpty: true,
              render: (value) => String(value),
            },
            {
              key: "state",
              title: t("state"),
              hideEmpty: true,
              render: (value) => String(value),
            },
            {
              key: "country",
              title: tCommon("country"),
              hideEmpty: true,
              render: (value) => String(value),
            },
            {
              key: "postalCode",
              title: tExt("postal_code"),
              hideEmpty: true,
              render: (value) => String(value),
            },
          ],
        },
        {
          id: "pricing",
          tab: "commerce",
          title: t("pricing_currencies"),
          description:
            t("what_the_platform_charges_this_merchant"),
          icon: Percent,
          columns: 3,
          fields: [
            {
              key: "feeType",
              title: t("fee_model"),
              render: (value) => FEE_TYPE_LABEL[String(value)] ?? String(value),
            },
            {
              key: "defaultCurrency",
              title: t("default_currency"),
              icon: Coins,
              render: (value) => String(value),
            },
            {
              key: "allowedCurrencies",
              title: t("allowed_currencies"),
              fullWidth: true,
              emptyText: t("none_the_merchant_cannot_take_payments"),
              render: (value) => <ChipList values={value} />,
            },
            {
              key: "allowedWalletTypes",
              title: tExt("allowed_wallet_types"),
              fullWidth: true,
              emptyText: tCommon("no_grouping"),
              render: (value) => <ChipList values={value} />,
            },
          ],
        },
        {
          id: "payouts",
          tab: "commerce",
          title: t("payouts"),
          description:
            t("when_collected_balance_leaves_the_platform"),
          icon: Banknote,
          columns: 3,
          fields: [
            {
              key: "payoutSchedule",
              title: t("schedule"),
              render: (value) =>
                PAYOUT_SCHEDULE_LABEL[String(value)] ?? String(value),
            },
            {
              key: "payoutThreshold",
              title: tCommon("threshold"),
              render: (value, row) => formatMoney(value, row.defaultCurrency),
            },
            {
              key: "payoutWalletId",
              title: t("payout_wallet"),
              emptyText: t("not_set_payouts_are_held"),
              copyable: true,
              render: (value) => (
                <span className="font-mono text-xs break-all">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "record",
          tab: "record",
          title: tCommon("record"),
          icon: Hash,
          columns: 2,
          fields: [
            { key: "id", icon: Hash, copyable: true },
            { key: "createdAt", icon: CalendarIcon },
          ],
        },
        {
          id: "metadata",
          tab: "record",
          title: tCommon("metadata"),
          description: t("free_form_data_written_by_the_onboarding_flow"),
          icon: Settings,
          variant: "plain",
          condition: (row) =>
            Boolean(row.metadata) &&
            (typeof row.metadata !== "object" ||
              Object.keys(row.metadata).length > 0),
          render: (row) => {
            let parsed: any = row.metadata;
            if (typeof parsed === "string") {
              try {
                parsed = JSON.parse(parsed);
              } catch {
                return (
                  <p className="text-sm text-muted-foreground break-words">
                    {parsed}
                  </p>
                );
              }
            }
            return (
              <div className="overflow-x-auto rounded-lg border border-border bg-muted p-3">
                <pre className="text-xs font-mono whitespace-pre">
                  {JSON.stringify(parsed, null, 2)}
                </pre>
              </div>
            );
          },
        },
      ],
    }),
    []
  );
}
