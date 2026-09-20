"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Structured renderers for the values the generic key/value tile cannot say
 * anything useful about.
 *
 * `CellRenderer` coerces an unknown value with `JSON.stringify`, so every
 * object-shaped column in the product — a transaction's `metadata`, a wallet's
 * chain→address map, a market's whole trading config, an instrument's weekly
 * schedule, the binary engine's `settlementDecision` — rendered as one
 * unbroken line of braces and quotes inside a tile. That is the single most
 * common reason a details dialog was unreadable, and it is fixed here for every
 * table at once rather than per-column.
 */

function isPlainObject(value: any): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    (value.constructor === Object || value.constructor === undefined)
  );
}

/**
 * A string that is really JSON. Several columns store JSON in a TEXT/VARCHAR
 * and the API hands it back unparsed, so the tile would otherwise print the
 * raw source.
 */
function parseMaybeJson(value: any): any {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed.length < 2) return value;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (!((first === "{" && last === "}") || (first === "[" && last === "]"))) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/** True when the default renderer would produce "[object Object]"-grade output. */
export function isStructuredValue(value: any): boolean {
  const parsed = parseMaybeJson(value);
  return Array.isArray(parsed) || isPlainObject(parsed);
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function Scalar({ value }: { value: any }) {
  const tCommon = useTranslations("common");
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-success" : "text-muted-foreground"}>
        {value ? tCommon("yes") : tCommon("no")}
      </span>
    );
  }
  return <span className="break-words">{String(value)}</span>;
}

/** A flat array of primitives, as chips. */
function Chips({ items }: { items: any[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={index}
          className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground"
        >
          {String(item)}
        </span>
      ))}
    </div>
  );
}

interface TreeProps {
  value: any;
  depth: number;
}

const MAX_DEPTH = 4;
const COLLAPSE_AT = 6;

function Tree({ value, depth }: TreeProps) {
  const parsed = parseMaybeJson(value);

  if (Array.isArray(parsed)) {
    if (!parsed.length) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (parsed.every((item) => item === null || typeof item !== "object")) {
      return <Chips items={parsed} />;
    }
    if (depth >= MAX_DEPTH) {
      return (
        <span className="text-muted-foreground">
          {parsed.length} item{parsed.length === 1 ? "" : "s"}
        </span>
      );
    }
    return (
      <div className="space-y-1.5">
        {parsed.map((item, index) => (
          <div
            key={index}
            className="rounded-md border border-border/70 p-2 min-w-0"
          >
            <Tree value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(parsed)) {
    const entries = Object.entries(parsed);
    if (!entries.length) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (depth >= MAX_DEPTH) {
      return (
        <span className="text-muted-foreground">
          {entries.length} field{entries.length === 1 ? "" : "s"}
        </span>
      );
    }
    /* A two-column GRID, not flex + justify-between. With justify-between a
       long value (an idempotency key, a tx hash) wraps onto a second line that
       starts under the label, so the label and the value visually collide. A
       grid gives the label its own column and lets the value wrap inside its
       own, which is the only layout that survives arbitrary payloads. */
    return (
      <dl className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-3 gap-y-1 min-w-0">
        {entries.map(([key, item]) => (
          <React.Fragment key={key}>
            <dt className="text-xs text-muted-foreground break-words">
              {humanizeKey(key)}
            </dt>
            <dd className="text-xs font-medium min-w-0 break-words">
              {typeof item === "object" && item !== null ? (
                <Tree value={item} depth={depth + 1} />
              ) : (
                <Scalar value={item} />
              )}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }

  return <Scalar value={parsed} />;
}

/**
 * Renders an object/array value as a readable structure, collapsing anything
 * long behind a disclosure so one fat payload cannot push the rest of the
 * dialog off-screen.
 */
export function DetailStructuredValue({ value }: { value: any }) {
  const t = useTranslations("components_blocks");
  const parsed = React.useMemo(() => parseMaybeJson(value), [value]);
  const size = Array.isArray(parsed)
    ? parsed.length
    : isPlainObject(parsed)
      ? Object.keys(parsed).length
      : 0;
  const [open, setOpen] = React.useState(size <= COLLAPSE_AT);

  if (size === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ChevronRight className="h-3 w-3" />
        {Array.isArray(parsed)
          ? t("show_items", { size: String(size) })
          : t("show_fields", { size: String(size) })}
      </button>
    );
  }

  return (
    <div className={cn("min-w-0", size > COLLAPSE_AT && "space-y-1.5")}>
      <Tree value={parsed} depth={0} />
      {size > COLLAPSE_AT && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Collapse
        </button>
      )}
    </div>
  );
}
