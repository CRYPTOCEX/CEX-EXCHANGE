"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Calendar,
  Globe,
  Layers,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

/**
 * The operator's licence record.
 *
 * WHAT AN OPERATOR IS DOING HERE: saying "we may serve this module to residents
 * of this country, and here is the licence that says so". Nothing on this
 * screen is verified — it is a statement, recorded. What it changes is that
 * serving futures into Germany becomes something somebody typed a licence
 * number for, rather than a default nobody chose.
 *
 * EXPIRY LEADS, not the module. A lapsed row stops serving its country the
 * moment it lapses, with no grace period, so the row that matters most is
 * always the one closest to expiring.
 */

const MODULE_LABELS: Record<string, string> = {
  trade: "Spot trading",
  p2p: "P2P trading",
  staking: "Staking",
  ico: "Token offerings",
  futures: "Futures",
  ecosystem: "Ecosystem wallets",
  "copy-trading": "Copy trading",
};

/** Days from now, negative when already past. */
function daysUntil(value: unknown): number | null {
  if (!value) return null;
  const when = new Date(String(value)).getTime();
  if (Number.isNaN(when)) return null;
  return Math.ceil((when - Date.now()) / 86_400_000);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function useColumns() {
  return [
    {
      key: "moduleId",
      title: "Module",
      type: "select",
      icon: Layers,
      priority: 1,
      filterable: true,
      sortable: true,
      description:
        "Which module this licence covers. Futures and token offerings ask a " +
        "second question a country licence does not answer — see below.",
      options: Object.entries(MODULE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-medium">{MODULE_LABELS[value] ?? value}</span>
        ),
      },
    },
    {
      key: "countryCode",
      title: "Country",
      type: "text",
      icon: Globe,
      priority: 1,
      filterable: true,
      sortable: true,
      searchable: true,
      description:
        "ISO 3166-1 alpha-2. Residents of this country are the ones served.",
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-mono text-sm">{value || "—"}</span>
        ),
      },
    },
    {
      key: "expiresAt",
      title: "Expires",
      type: "date",
      icon: Calendar,
      priority: 1,
      sortable: true,
      filterable: false,
      description:
        "A lapsed attestation stops serving its country immediately. There is no grace period.",
      render: {
        type: "custom",
        render: (value: string) => {
          const days = daysUntil(value);
          if (!value || days === null) return <span>—</span>;

          const label = formatDate(value);
          if (days <= 0) return <Badge variant="destructive">Lapsed · {label}</Badge>;
          // Thirty days is roughly what a renewal takes, so this is the last
          // point at which noticing is still useful.
          if (days <= 30) return <Badge variant="outline">{days}d · {label}</Badge>;
          return <span className="text-sm">{label}</span>;
        },
      },
    },
    {
      key: "entityName",
      title: "Entity",
      type: "text",
      icon: Building2,
      sortable: true,
      filterable: false,
      searchable: true,
      description: "The legal entity holding the licence — not the brand.",
    },
    {
      key: "regulator",
      title: "Regulator",
      type: "text",
      icon: ShieldCheck,
      sortable: true,
      filterable: false,
      searchable: true,
    },
    {
      key: "licenceNumber",
      title: "Licence no.",
      type: "text",
      icon: ScrollText,
      sortable: false,
      filterable: false,
      searchable: true,
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="font-mono text-xs">{value || "—"}</span>
        ),
      },
    },
    {
      key: "notes",
      title: "Notes",
      type: "textarea",
      icon: ScrollText,
      sortable: false,
      filterable: false,
      render: {
        type: "custom",
        render: (value: string) => (
          <span className="line-clamp-2 max-w-[32ch] text-xs text-muted-foreground">
            {value || "—"}
          </span>
        ),
      },
    },
  ];
}

export function useFormConfig(): FormConfig {
  const fields = [
    { key: "moduleId", required: true },
    { key: "countryCode", required: true },
    { key: "entityName", required: true },
    { key: "regulator", required: true },
    { key: "licenceNumber", required: true },
    { key: "expiresAt", required: true },
    { key: "notes", required: false },
  ];

  return {
    create: {
      title: "Record a licence",
      description:
        "This makes the module available to residents of that country. Nothing here is verified — it is your statement, recorded — and the countries you enter also produce your Apple storefront and Google Play targeting lists. " +
        "FUTURES AND TOKEN OFFERINGS CARRY A SECOND TEST. Apple 3.1.5(iv) says apps facilitating ICOs, cryptocurrency futures trading and other crypto-securities or quasi-securities trading “must come from established banks, securities firms, futures commission merchants (‘FCM’), or other approved financial institutions”. That is a question about WHO YOU ARE, not about where you are licensed, and a country licence recorded here does not answer it. If the entity below is not one of those, expect the mobile app to be rejected for those two modules however complete this table is.",
      groups: [
        {
          id: "licence",
          title: "Licence",
          icon: ShieldCheck,
          priority: 1,
          fields,
        },
      ],
    },
    edit: {
      title: "Update this licence",
      description:
        "Changing the country or the module changes who is served, immediately.",
      groups: [
        {
          id: "licence",
          title: "Licence",
          icon: ShieldCheck,
          priority: 1,
          fields,
        },
      ],
    },
  };
}
