"use client";

import React from "react";
import {
  Hash,
  Building2,
  User,
  Mail,
  DollarSign,
  CheckCircle2,
  CalendarIcon,
  FileText,
  Coins,
  Globe,
  Receipt,
  Fingerprint,
  Clock,
  Wallet,
  MapPin,
  Monitor,
  Server,
  ShoppingCart,
  Layers,
  Link2,
  Code,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
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
      key: "id",
      title: tExt("payment_id"),
      type: "text",
      icon: Hash,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_payment_transaction_identifier_used_for"),
      priority: 1,
    },
    {
      key: "merchant",
      title: tExtAdmin("merchant"),
      type: "compound",
      icon: Building2,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_merchant_business_receiving_this_payment"),
      priority: 2,
      render: {
        type: "compound",
        config: {
          primary: {
            key: "name",
            title: tExtAdmin("merchant_name"),
            description: tExtAdmin("merchant_business_name"),
            icon: Building2,
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
      key: "customer",
      title: tCommon("customer"),
      type: "compound",
      icon: User,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("the_customer_who_initiated_and_made_the_payment"),
      priority: 3,
      render: {
        type: "compound",
        config: {
          image: {
            key: "avatar",
            fallback: "/img/placeholder.svg",
            type: "image",
            title: tCommon("avatar"),
            description: tExtAdmin("customer_avatar"),
          },
          primary: {
            key: ["firstName", "lastName"],
            title: [tCommon("first_name"), tCommon("last_name")],
            description: [tExtAdmin("customer_first_name"), tExtAdmin("customer_last_name")],
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
      key: "amount",
      title: tCommon("amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("total_payment_amount_charged_to_the_customer"),
      priority: 1,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="font-medium">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
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
      description: tExtAdmin("current_processing_status_of_the_payment"),
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
        { value: "COMPLETED", label: tCommon("completed") },
        { value: "FAILED", label: tCommon("failed") },
        { value: "CANCELLED", label: tCommon("cancelled") },
        { value: "EXPIRED", label: tCommon("expired") },
        { value: "REFUNDED", label: tCommon("refunded") },
        { value: "PARTIALLY_REFUNDED", label: tExt("partially_refunded") },
      ],
    },
    {
      key: "createdAt",
      title: tCommon("created_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("date_and_time_when_the_payment"),
      render: {
        type: "date",
        format: "PPP p",
      },
      priority: 2,
    },
    {
      key: "orderId",
      title: tExt("order_id"),
      type: "text",
      icon: FileText,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("external_order_reference_number_from_the"),
      expandedOnly: true,
    },
    {
      key: "currency",
      title: tCommon("currency"),
      type: "text",
      icon: Coins,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("currency_code_for_the_payment_transaction"),
      expandedOnly: true,
    },
    {
      key: "fee",
      title: tCommon("fee"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("gateway_transaction_fee_deducted_from_the"),
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="text-muted-foreground">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "netAmount",
      title: tExt("net_amount"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("final_amount_received_by_merchant_after"),
      expandedOnly: true,
      render: {
        type: "custom",
        render: (value: number, row: any) => (
          <span className="font-medium text-success">
            {value?.toFixed(2)} {row.currency}
          </span>
        ),
      },
    },
    {
      key: "completedAt",
      title: tExt("completed_at"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: false,
      filterable: false,
      description: tExtAdmin("date_and_time_when_the_payment"),
      render: {
        type: "date",
        format: "PPP p",
      },
      expandedOnly: true,
    },
  ];
}

/* ---------------------------------------------------------------------- *
 * View dialog
 *
 * The payload is the whole `gatewayPayment` record plus the joined `merchant`
 * and `customer` — far more than the eleven columns the table shows. Several
 * of the richest parts of it (line items, wallet allocations, the billing
 * address, the checkout URLs, the device fingerprint) have no column at all,
 * so they are named directly against the API shape with an explicit `render`.
 *
 * NOTE on two columns that are deliberately NOT used here: `orderId` and
 * `fee` are declared in the columns array above but the API returns
 * `merchantOrderId` and `feeAmount`. Both columns render an em dash in the
 * table; the dialog reads the keys the payload actually carries.
 * ---------------------------------------------------------------------- */

const money = (value: any, currency?: string) => {
  const amount = Number(value ?? 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}${
    currency ? ` ${currency}` : ""
  }`;
};

const dateTime = (value: any) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : format(date, "PPP p");
};

/** MySQL JSON columns arrive parsed on prod and as a string on some drivers. */
const parseJson = (value: any) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const asArray = (value: any): any[] => {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed : [];
};

const asObject = (value: any): Record<string, any> | null => {
  const parsed = parseJson(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : null;
};

const mono = (value: any) => (
  <span className="font-mono text-xs break-all">{String(value)}</span>
);

const urlValue = (value: any) => (
  <a
    href={String(value)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline break-all text-xs"
  >
    {String(value)}
  </a>
);

export function useViewConfig(): ViewConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");

  return React.useMemo<ViewConfig>(
    () => ({
      size: "5xl",

      // `merchant` is the table's primary (compound) column, so it is the
      // header rather than a tile.
      title: (row) => (
        <span className="block truncate">
          {row.merchant?.name || tExtAdmin("merchant")}
        </span>
      ),
      subtitle: (row) => row.merchant?.email || undefined,

      badges: (row) => (
        <>
          <Badge tone={statusTone(row.status)} appearance="soft" className="capitalize">
            {String(row.status ?? "").toLowerCase().replace(/_/g, " ")}
          </Badge>
          {row.walletType && (
            <Badge tone="neutral" appearance="soft">
              <Wallet className="h-3 w-3" />
              {row.walletType}
            </Badge>
          )}
          {row.testMode && (
            <Badge tone="warning" appearance="soft">
              {tCommon("test_mode")}
            </Badge>
          )}
        </>
      ),

      stats: [
        {
          label: tCommon("amount"),
          icon: DollarSign,
          value: (row) => money(row.amount, row.currency),
        },
        {
          label: tCommon("fee"),
          icon: Receipt,
          value: (row) => money(row.feeAmount, row.currency),
        },
        {
          label: tExt("net_amount"),
          icon: Wallet,
          tone: "success",
          value: (row) => money(row.netAmount, row.currency),
        },
      ],

      tabs: [
        { id: "overview", title: tCommon("overview"), icon: Receipt },
        { id: "customer", title: tCommon("customer"), icon: User },
        { id: "technical", title: tExt("technical"), icon: Server },
      ],

      sections: [
        {
          id: "transaction",
          tab: "overview",
          title: tExtAdmin("payment_information"),
          icon: Hash,
          columns: 3,
          priority: 1,
          fields: [
            { key: "id", title: tExt("payment_id"), icon: Hash },
            {
              key: "paymentIntentId",
              title: tExtAdmin("payment_intent"),
              icon: Fingerprint,
              copyable: true,
              render: mono,
            },
            {
              key: "merchantOrderId",
              title: tExt("order_id"),
              icon: FileText,
              copyable: true,
              emptyText: tExtAdmin("not_supplied"),
              render: mono,
            },
            { key: "currency", icon: Coins },
            {
              key: "transactionId",
              title: tExtAdmin("wallet_transaction"),
              icon: Link2,
              copyable: true,
              condition: (row) => Boolean(row.transactionId),
              render: mono,
            },
            {
              key: "description",
              title: tCommon("description"),
              icon: FileText,
              fullWidth: true,
              condition: (row) => Boolean(row.description),
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
          ],
        },
        {
          id: "line-items",
          tab: "overview",
          title: tExtAdmin("line_items"),
          icon: ShoppingCart,
          priority: 2,
          condition: (row) => asArray(row.lineItems).length > 0,
          render: (row) => {
            const items = asArray(row.lineItems);
            return (
              <div className="rounded-lg border border-border divide-y divide-border">
                {items.map((item: any, index: number) => (
                  <div
                    key={`${item?.name ?? "item"}-${index}`}
                    className="flex items-start justify-between gap-4 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">
                        {item?.name || tExtAdmin("item")}
                      </p>
                      {item?.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="text-sm font-medium">
                        {money(
                          Number(item?.unitPrice ?? 0) *
                            Number(item?.quantity ?? 0),
                          row.currency
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Number(item?.quantity ?? 0)} ×{" "}
                        {money(item?.unitPrice, row.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          },
        },
        {
          id: "urls",
          tab: "overview",
          title: tExtAdmin("urls"),
          icon: Globe,
          columns: 1,
          priority: 3,
          fields: [
            {
              key: "checkoutUrl",
              title: tExtAdmin("checkout_url"),
              icon: Globe,
              copyable: true,
              render: urlValue,
            },
            {
              key: "returnUrl",
              title: tExtAdmin("return_url"),
              icon: Globe,
              copyable: true,
              render: urlValue,
            },
            {
              key: "cancelUrl",
              title: tExt("cancel_url"),
              icon: Globe,
              condition: (row) => Boolean(row.cancelUrl),
              copyable: true,
              render: urlValue,
            },
            {
              key: "webhookUrl",
              title: tExt("webhook_url"),
              icon: Server,
              condition: (row) => Boolean(row.webhookUrl),
              copyable: true,
              render: urlValue,
            },
          ],
        },
        {
          id: "timeline",
          tab: "overview",
          title: tCommon("timeline"),
          icon: Clock,
          columns: 3,
          priority: 4,
          fields: [
            { key: "createdAt", icon: CalendarIcon },
            { key: "completedAt", icon: CheckCircle2 },
            {
              key: "expiresAt",
              title: tExtAdmin("expires_at"),
              icon: Clock,
              render: dateTime,
            },
            {
              key: "updatedAt",
              title: tCommon("last_updated"),
              icon: Clock,
              render: dateTime,
            },
          ],
        },
        {
          id: "customer",
          tab: "customer",
          title: tCommon("customer_information"),
          icon: User,
          columns: 2,
          priority: 5,
          fields: [
            {
              // The linked platform account, when the payer was signed in.
              // Rendered by hand rather than through the `customer` compound
              // column: the admin list endpoint selects only id/name/email for
              // that relation, so the compound's avatar slot would draw a
              // placeholder plate where a face should be.
              key: "customer",
              title: tCommon("customer"),
              icon: User,
              fullWidth: false,
              condition: (row) => Boolean(row.customer),
              render: (value) => (
                <span className="break-words">
                  {[value?.firstName, value?.lastName]
                    .filter(Boolean)
                    .join(" ") || value?.email}
                </span>
              ),
            },
            {
              key: "customer.email",
              title: tExtAdmin("account_email"),
              icon: Mail,
              copyable: true,
              condition: (row) => Boolean(row.customer?.email),
              render: (value) => (
                <span className="break-all">{String(value)}</span>
              ),
            },
            {
              key: "customerName",
              title: tExtAdmin("checkout_name"),
              icon: User,
              emptyText: tExtAdmin("not_supplied"),
              render: (value) => (
                <span className="break-words">{String(value)}</span>
              ),
            },
            {
              key: "customerEmail",
              title: tExtAdmin("checkout_email"),
              icon: Mail,
              copyable: true,
              emptyText: tExtAdmin("not_supplied"),
              render: (value) => (
                <span className="break-all">{String(value)}</span>
              ),
            },
            {
              key: "customerId",
              title: tExtAdmin("customer_id"),
              icon: Fingerprint,
              copyable: true,
              condition: (row) => Boolean(row.customerId),
              render: mono,
            },
          ],
        },
        {
          id: "billing",
          tab: "customer",
          title: tExt("billing_address"),
          icon: MapPin,
          priority: 6,
          condition: (row) => Boolean(asObject(row.billingAddress)),
          render: (row) => {
            const address = asObject(row.billingAddress) ?? {};
            const lines = [
              address.line1,
              address.line2,
              [address.city, address.state].filter(Boolean).join(", "),
              address.postalCode,
              address.country,
            ].filter(Boolean);
            return (
              <div className="rounded-lg border border-border p-3">
                {lines.length ? (
                  lines.map((line: any, index: number) => (
                    <p key={index} className="text-sm break-words">
                      {String(line)}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            );
          },
        },
        {
          id: "allocations",
          tab: "technical",
          title: tExtAdmin("wallet_allocations"),
          description:
            tExtAdmin("how_the_charge_was_drawn_across"),
          icon: Layers,
          priority: 7,
          condition: (row) => asArray(row.allocations).length > 0,
          render: (row) => (
            <div className="rounded-lg border border-border divide-y divide-border">
              {asArray(row.allocations).map((item: any, index: number) => (
                <div
                  key={`${item?.walletId ?? "wallet"}-${index}`}
                  className="flex items-start justify-between gap-4 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item?.currency} · {item?.walletType}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5 break-all">
                      {item?.walletId}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-sm font-medium">
                      {money(item?.amount, item?.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ≈ {money(item?.equivalentInPaymentCurrency, row.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: "technical",
          tab: "technical",
          title: tCommon("origin"),
          icon: Monitor,
          columns: 2,
          priority: 8,
          fields: [
            {
              key: "merchantId",
              title: tExtAdmin("merchant_id"),
              icon: Building2,
              copyable: true,
              render: mono,
            },
            {
              key: "ipAddress",
              title: tCommon("ip_address"),
              icon: Globe,
              copyable: true,
              render: mono,
            },
            {
              key: "userAgent",
              title: tCommon("user_agent"),
              icon: Monitor,
              fullWidth: true,
              render: (value) => (
                <span className="text-xs text-muted-foreground break-all">
                  {String(value)}
                </span>
              ),
            },
          ],
        },
        {
          id: "metadata",
          tab: "technical",
          title: tCommon("metadata"),
          icon: Code,
          priority: 9,
          condition: (row) =>
            Object.keys(asObject(row.metadata) ?? {}).length > 0,
          render: (row) => (
            <pre className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground overflow-x-auto">
              {JSON.stringify(asObject(row.metadata), null, 2)}
            </pre>
          ),
        },
      ],
    }),
    [tCommon, tExt, tExtAdmin]
  );
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return {
    edit: {
      title: tExtAdmin("edit_payment"),
      description: tExtAdmin("update_payment_transaction_details_including_amoun"),
      groups: [
        {
          id: "payment-info",
          title: tExtAdmin("payment_information"),
          icon: DollarSign,
          priority: 1,
          fields: [
            {
              key: "amount",
              required: true,
              min: 0.01
            },
            {
              key: "currency",
              required: true,
              maxLength: 20
            },
            {
              key: "walletType",
              required: true,
              options: [
                { value: "FIAT", label: tCommon("fiat") },
                { value: "SPOT", label: tCommon("spot") },
                { value: "ECO", label: tCommon("eco") },
              ],
            },
          ],
        },
        {
          id: "status-info",
          title: tCommon("status"),
          icon: CheckCircle2,
          priority: 2,
          fields: [
            {
              key: "status",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "PROCESSING", label: tCommon("processing") },
                { value: "COMPLETED", label: tCommon("completed") },
                { value: "FAILED", label: tCommon("failed") },
                { value: "CANCELLED", label: tCommon("cancelled") },
                { value: "EXPIRED", label: tCommon("expired") },
                { value: "REFUNDED", label: tCommon("refunded") },
                { value: "PARTIALLY_REFUNDED", label: tExt("partially_refunded") },
              ],
            },
          ],
        },
        {
          id: "urls",
          title: tExtAdmin("urls"),
          icon: Globe,
          priority: 3,
          fields: [
            {
              key: "returnUrl",
              required: true,
              maxLength: 1000
            },
            {
              key: "cancelUrl",
              required: false,
              maxLength: 1000
            },
            {
              key: "webhookUrl",
              required: false,
              maxLength: 1000
            },
          ],
        },
        {
          id: "customer-info",
          title: tCommon("customer_information"),
          icon: User,
          priority: 4,
          fields: [
            {
              key: "customerEmail",
              required: false,
              maxLength: 255
            },
            {
              key: "customerName",
              required: false,
              maxLength: 191
            },
          ],
        },
      ],
    },
  };
}
