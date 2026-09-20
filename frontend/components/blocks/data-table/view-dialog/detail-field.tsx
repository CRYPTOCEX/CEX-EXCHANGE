"use client";

import React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CellRenderer } from "../content/rows/cells";
import { DetailStructuredValue, isStructuredValue } from "./detail-value";
import {
  getNestedValue,
  isFieldValueEmpty,
  type ResolvedViewField,
} from "./utils";
import { useTranslations } from "next-intl";

interface DetailFieldProps {
  field: ResolvedViewField;
  row: any;
  variant: "tiles" | "rows";
}

/** Types that need the whole row width to be readable. */
const FULL_WIDTH_TYPES = new Set([
  "textarea",
  "editor",
  "compound",
  "customFields",
  "image",
  "gallery",
]);

/** Beyond this a string needs the full grid row to stay on a sane line length. */
const LONG_TEXT_CHARS = 90;

/**
 * Whether a field spans the whole section grid.
 *
 * The `row` argument is what makes this useful: a column's TYPE does not tell
 * you that this particular record's `metadata` is a 20-key object or that its
 * `description` is a paragraph. Both were rendering into a half-width tile
 * with the other half left blank while the content wrapped into a narrow
 * ribbon.
 */
export function isFullWidthField(field: ResolvedViewField, row?: any): boolean {
  if (field.config.fullWidth !== undefined) return field.config.fullWidth;
  if (field.column?.fullWidth) return true;
  if (FULL_WIDTH_TYPES.has(field.column?.type || "")) return true;

  if (row && !field.config.render && !field.column?.render) {
    const value = getNestedValue(row, field.key);
    if (isStructuredValue(value)) return true;
    if (typeof value === "string" && value.length > LONG_TEXT_CHARS) return true;
  }
  return false;
}

/**
 * Keys whose value is an opaque identifier: an operator's only interaction
 * with one is to copy it, and none of them is legible in a proportional font
 * where `l`/`1` and `O`/`0` collide.
 */
const IDENTIFIER_KEY = /(^|\.)(id|uuid|hash|txid|address|reference|referenceId|idempotencyKey|trxId|transactionId|orderId|walletAddress)$|Id$|Hash$|Address$/;

function looksLikeIdentifier(key: string, value: any): boolean {
  if (typeof value !== "string" || value.length < 8) return false;
  return IDENTIFIER_KEY.test(key);
}

/** Fields a joined relation object commonly carries as its human label. */
const RELATION_LABEL_KEYS = ["name", "title", "label", "symbol", "email", "slug"];

/**
 * Resolve a foreign-key column to the label of the relation the payload
 * already carries.
 *
 * `roleId` rendered as the literal "1" — a number that means nothing to an
 * operator — while the same row carried `role: { id: 1, name: "Super Admin" }`
 * right next to it. The same shape recurs across the product: `userId`/`user`,
 * `currencyId`/`currency`, `productId`/`product`. The raw id is still the
 * fallback when no relation was loaded.
 */
function relationLabel(row: any, key: string): string | null {
  if (!key.endsWith("Id") || key.length <= 2) return null;
  const base = key.slice(0, -2);
  const relation = getNestedValue(row, base);
  if (!relation || typeof relation !== "object") return null;
  for (const candidate of RELATION_LABEL_KEYS) {
    const label = relation[candidate];
    if (typeof label === "string" && label.trim()) return label;
  }
  return null;
}

/** Column types that already have a purpose-built renderer; never override. */
const TYPED_COLUMNS = new Set([
  "number",
  "rating",
  "date",
  "boolean",
  "toggle",
  "select",
  "multiselect",
  "tags",
  "image",
  "compound",
  "customFields",
  "badge",
]);

export function DetailField({ field, row, variant }: DetailFieldProps) {
  const [copied, setCopied] = React.useState(false);
  const { column, config } = field;

  const value = column?.getValue ? column.getValue(row) : getNestedValue(row, field.key);
  const empty = isFieldValueEmpty(value);

  const handleCopy = React.useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      const text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
      navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    },
    [value]
  );

  const Icon = field.icon;

  /* Structured values get a structure. A column with no explicit renderer and
     an object/array value would otherwise reach `CellRenderer`, which coerces
     it with JSON.stringify — one unbroken line of braces in a 200px tile. An
     explicit `render` on the field or a purpose-built column type always wins;
     this only catches what would have been stringified. */
  const useStructured =
    !config.render &&
    !column?.render &&
    !TYPED_COLUMNS.has(column?.type || "") &&
    isStructuredValue(value);

  const isIdentifier =
    !config.render && !column?.render && looksLikeIdentifier(field.key, value);

  const relation =
    !config.render && !column?.render && !empty
      ? relationLabel(row, field.key)
      : null;

  const copyable = config.copyable ?? isIdentifier;

  /* An absent value renders as a muted dash, not as a blank tile. A blank tile
     reads as "still loading"; a dash reads as "nothing recorded", which is the
     actual state. `hideEmpty` is for fields where even that is noise. */
  const content = empty ? (
    <span className="text-muted-foreground">{config.emptyText ?? "—"}</span>
  ) : config.render ? (
    config.render(value, row)
  ) : relation ? (
    <span className="break-words">{relation}</span>
  ) : useStructured ? (
    <DetailStructuredValue value={value} />
  ) : isIdentifier ? (
    <span className="font-mono text-xs break-all">{String(value)}</span>
  ) : (
    <CellRenderer
      // `ColumnType` includes the structural "actions" value that
      // `CellRenderType` has no case for, so the union needs widening here —
      // exactly as every other CellRenderer call site does.
      renderType={(column?.render as any) || ({ type: column?.type } as any)}
      value={value}
      row={row}
      cropText={false}
      breakText
    />
  );

  if (variant === "rows") {
    return (
      <div className="flex items-start justify-between gap-4 py-2 min-w-0 border-b border-border/60 last:border-b-0">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 pt-0.5">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {field.title}
        </span>
        <span className="text-sm font-medium min-w-0 text-end break-words">
          {content}
          {copyable && !empty && (
            <CopyButton copied={copied} onCopy={handleCopy} />
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/field relative p-3 rounded-lg min-w-0",
        /* Tiles sit flush with the `bg-card` dialog ground and are delineated
           by their EDGE, not by a fill step — a tinted fill either vanished
           into the card or read as a second competing surface. */
        "bg-card border border-border",
        "transition-colors duration-200 hover:border-border-strong"
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="truncate">{field.title}</span>
      </p>
      <div className="text-sm font-medium break-words">{content}</div>
      {copyable && !empty && (
        <span className="absolute top-2 end-2 opacity-0 group-hover/field:opacity-100 transition-opacity">
          <CopyButton copied={copied} onCopy={handleCopy} />
        </span>
      )}
    </div>
  );
}

function CopyButton({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: (event: React.MouseEvent) => void;
}) {
  const t = useTranslations("components_blocks");
  return (
    <button
      type="button"
      onClick={onCopy}
      className="ms-1.5 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors align-middle"
      aria-label={t("copy_value")}
    >
      {copied ? (
        <Check className="h-3 w-3 text-success" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
