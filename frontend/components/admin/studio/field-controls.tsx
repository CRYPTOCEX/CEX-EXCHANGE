"use client";

/**
 * One renderer per field kind, driven by `home-schema`.
 * ============================================================================
 *
 * Everything here is sized for a 340px panel that sits beside a live preview,
 * which is a different design problem from the full-width cards this replaces:
 * the owner's eye is on the WORKSPACE, and the panel's job is to be operable
 * without being looked at for long. So the labels are small and constant, the
 * controls are dense, and nothing animates.
 *
 * WHAT AN "EDITED" MARK MEANS
 * A dot against a field means it differs from what is saved — not that it is
 * non-empty. The previous editor had one global boolean latch for the whole
 * document, which could not answer "what did I change" and never cleared when a
 * value was typed back to its original. Per-field comparison against the saved
 * record is the only version of this that stays true.
 */

import * as React from "react";
import { GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { HOME_ICON_NAMES } from "@/lib/default-page/home-icons";
import {
  readPath,
  type EditorField,
  type RepeaterField,
  type RowField,
} from "@/components/admin/studio/home-schema";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/* ==========================================================================
   SHARED CHROME
   ========================================================================== */

function FieldShell({
  label,
  hint,
  edited,
  onReset,
  count,
  children,
}: {
  label: string;
  hint?: string;
  edited?: boolean;
  onReset?: () => void;
  count?: { at: number; soft: number };
  children: React.ReactNode;
}) {
  const t = useTranslations("components");
  return (
    <div className="space-y-1">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
          {edited ? (
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              /* The dot is the only thing carrying "changed" here, so it needs
                 a text equivalent — colour and shape alone is not a state. */
              title={t("changed_since_the_last_save")}
            >
              <span className="sr-only">Changed. </span>
            </span>
          ) : null}
          <span className="truncate">{label}</span>
        </span>
        {count ? (
          <span
            className={cn(
              "ms-auto shrink-0 text-[10px] tabular-nums",
              count.at > count.soft ? "text-warning-ink" : "text-subtle-foreground"
            )}
            /* Advisory, not a limit — the page truncates nothing, it just gets
               ugly. Saying "over" rather than blocking the keystroke. */
            title={
              count.at > count.soft
                ? t("longer_than_the_characters_this_slot", { soft: String(count.soft) })
                : undefined
            }
          >
            {count.at}/{count.soft}
          </span>
        ) : null}
        {edited && onReset ? (
          <Button
            size="icon-xs"
            variant="ghost"
            className={cn("shrink-0", !count && "ms-auto")}
            onClick={onReset}
            aria-label={t("reset", { label: String(label) })}
            title={t("back_to_the_saved_value")}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {children}
      {hint ? <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "h-7 rounded-md border-input bg-background px-2 text-xs text-foreground placeholder:text-subtle-foreground";

/* ==========================================================================
   ICON PICKER
   ========================================================================== */

function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  /* A native `<select>` rather than a grid of glyphs. Fifty-seven names in a
     340px column is a scrolling picture-book; the names are meaningful English
     words and the preview beside the panel shows the glyph in place a moment
     later, which is the only rendering that matters. */
  return (
    <select
      value={HOME_ICON_NAMES.includes(value as never) ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs text-foreground disabled:opacity-50"
    >
      {/* An unrecognised stored name must stay visible rather than silently
          reading as the first option — the page falls back to a generic glyph
          for it and the owner needs to be able to see that is what happened. */}
      {!HOME_ICON_NAMES.includes(value as never) ? (
        <option value="">{value ? t("not_available", { value: String(value) }) : tCommon("choose_an_icon")}</option>
      ) : null}
      {HOME_ICON_NAMES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

/* ==========================================================================
   STRING LIST
   ========================================================================== */

function StringList({
  items,
  itemLabel,
  onChange,
  disabled,
}: {
  items: string[];
  itemLabel: string;
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            removeWrapper
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            disabled={disabled}
            aria-label={`${itemLabel} ${i + 1}`}
            className={cn(inputClass, "min-w-0 flex-1")}
          />
          <div className="flex shrink-0">
            <Button
              size="icon-xs"
              variant="ghost"
              disabled={disabled || i === 0}
              onClick={() => move(i, i - 1)}
              aria-label={`Move ${itemLabel} ${i + 1} up`}
            >
              {/* Rotated rather than a second icon import — the chevron pair is
                  the same glyph and this keeps the two buttons optically
                  identical in weight. */}
              <GripVertical className="size-3 rotate-90" aria-hidden="true" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              disabled={disabled}
              onClick={() => onChange(items.filter((_, at) => at !== i))}
              aria-label={`Remove ${itemLabel} ${i + 1}`}
            >
              <Trash2 className="size-3" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        size="2xs"
        variant="outline"
        className="w-full gap-1.5"
        disabled={disabled}
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="size-3" aria-hidden="true" />
        Add {itemLabel}
      </Button>
    </div>
  );
}

/* ==========================================================================
   REPEATER
   ========================================================================== */

function RowFieldControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: RowField;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
}) {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);

  if (field.kind === "icon") {
    return (
      <FieldShell label={field.label} hint={field.hint}>
        <IconPicker value={text} onChange={onChange} disabled={disabled} />
      </FieldShell>
    );
  }
  if (field.kind === "textarea") {
    return (
      <FieldShell
        label={field.label}
        hint={field.hint}
        count={field.soft ? { at: text.length, soft: field.soft } : undefined}
      >
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 2}
          disabled={disabled}
          aria-label={field.label}
          className="min-h-0 resize-y rounded-md border-input bg-background px-2 py-1.5 text-xs"
        />
      </FieldShell>
    );
  }
  return (
    <FieldShell
      label={field.label}
      hint={field.hint}
      count={field.soft ? { at: text.length, soft: field.soft } : undefined}
    >
      <Input
        removeWrapper
        value={text}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={field.label}
        className={cn(inputClass, "w-full")}
      />
    </FieldShell>
  );
}

function Repeater({
  field,
  rows,
  onChange,
  disabled,
}: {
  field: RepeaterField;
  rows: Record<string, unknown>[];
  onChange: (next: Record<string, unknown>[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("components");
  const [open, setOpen] = React.useState<number | null>(0);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
    setOpen(to);
  };

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => {
        const title = String(row?.[field.titleFrom] ?? "").trim() || t("untitled", { itemLabel: String(field.itemLabel) });
        /* Rows past the render limit are KEPT and editable. The old editor
           padded this array to exactly four and sliced the rest away, which
           silently destroyed the fifth and sixth entries of a seed that ships
           six. Marking them is honest; deleting them is not the editor's
           decision to make. */
        const beyond = field.rendered != null && i >= field.rendered;
        const expanded = open === i;

        return (
          <div
            key={i}
            className={cn(
              "rounded-lg border border-border bg-card",
              beyond && "border-dashed opacity-70"
            )}
          >
            <div className="flex items-center gap-1 px-1.5 py-1">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm py-0.5 text-start focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className="shrink-0 text-[10px] tabular-nums text-subtle-foreground">
                  {i + 1}
                </span>
                <span className="truncate text-[11px] font-medium text-foreground">{title}</span>
                {beyond ? (
                  <span className="shrink-0 rounded-sm bg-muted px-1 text-[9px] leading-4 text-muted-foreground">
                    {t("not_shown")}
                  </span>
                ) : null}
              </button>
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={disabled || i === 0}
                onClick={() => move(i, i - 1)}
                aria-label={`Move ${field.itemLabel} ${i + 1} up`}
              >
                <GripVertical className="size-3 rotate-90" aria-hidden="true" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                disabled={disabled}
                onClick={() => {
                  onChange(rows.filter((_, at) => at !== i));
                  setOpen(null);
                }}
                aria-label={`Remove ${field.itemLabel} ${i + 1}`}
              >
                <Trash2 className="size-3" aria-hidden="true" />
              </Button>
            </div>

            {expanded ? (
              <div className="space-y-2 border-t border-border px-2 py-2">
                {field.fields.map((rowField) => (
                  <RowFieldControl
                    key={rowField.path}
                    field={rowField}
                    value={row?.[rowField.path]}
                    onChange={(next) => {
                      const copy = [...rows];
                      copy[i] = { ...(copy[i] ?? {}), [rowField.path]: next };
                      onChange(copy);
                    }}
                    disabled={disabled}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <Button
        size="2xs"
        variant="outline"
        className="w-full gap-1.5"
        disabled={disabled}
        onClick={() => {
          onChange([...rows, { ...field.blank }]);
          setOpen(rows.length);
        }}
      >
        <Plus className="size-3" aria-hidden="true" />
        Add {field.itemLabel}
      </Button>

      {field.rendered != null && rows.length > field.rendered ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          The page draws the first {field.rendered}. The rest are kept but not shown.
        </p>
      ) : null}
    </div>
  );
}

/* ==========================================================================
   THE ONE ENTRY POINT
   ========================================================================== */

export function FieldControl({
  field,
  variables,
  savedVariables,
  onChange,
  disabled,
}: {
  field: EditorField;
  variables: unknown;
  savedVariables: unknown;
  onChange: (path: string, value: unknown) => void;
  disabled?: boolean;
}) {
  const raw = readPath(variables, field.path);
  const savedRaw = readPath(savedVariables, field.path);
  const edited = JSON.stringify(raw ?? null) !== JSON.stringify(savedRaw ?? null);
  const reset = () => onChange(field.path, savedRaw);

  if (field.kind === "switch") {
    /* Absent has to read the way the PAGE reads it, per switch. A hide-this
       switch is on when absent; an add-this switch is off. Hard-coding the
       first reading made the second impossible to express, and a control that
       shows on while the page renders off is worse than no control. */
    const on = field.defaultOn === false ? raw === true : raw !== false;
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
        <span className="flex min-w-0 items-center gap-1.5">
          {edited ? (
            <span className="size-1.5 shrink-0 rounded-full bg-primary">
              <span className="sr-only">Changed. </span>
            </span>
          ) : null}
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-foreground">
              {field.label}
            </span>
            {field.hint ? (
              <span className="block text-[10px] leading-snug text-muted-foreground">
                {field.hint}
              </span>
            ) : null}
          </span>
        </span>
        <Switch
          checked={on}
          onCheckedChange={(next) => onChange(field.path, next)}
          disabled={disabled}
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.kind === "strings") {
    const items = Array.isArray(raw) ? raw.map((v) => (typeof v === "string" ? v : String(v ?? ""))) : [];
    return (
      <FieldShell label={field.label} hint={field.hint} edited={edited} onReset={reset}>
        <StringList
          items={items}
          itemLabel={field.itemLabel}
          onChange={(next) => onChange(field.path, next)}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  if (field.kind === "repeater") {
    const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    return (
      <FieldShell label={field.label} hint={field.hint} edited={edited} onReset={reset}>
        <Repeater
          field={field}
          rows={rows}
          onChange={(next) => onChange(field.path, next)}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  if (field.kind === "icon") {
    const text = typeof raw === "string" ? raw : "";
    return (
      <FieldShell label={field.label} hint={field.hint} edited={edited} onReset={reset}>
        <IconPicker
          value={text}
          onChange={(next) => onChange(field.path, next)}
          disabled={disabled}
        />
      </FieldShell>
    );
  }

  const text = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  const count = field.soft ? { at: text.length, soft: field.soft } : undefined;

  if (field.kind === "textarea") {
    return (
      <FieldShell
        label={field.label}
        hint={field.hint}
        edited={edited}
        onReset={reset}
        count={count}
      >
        <Textarea
          value={text}
          onChange={(e) => onChange(field.path, e.target.value)}
          rows={field.rows ?? 3}
          disabled={disabled}
          aria-label={field.label}
          className="min-h-0 resize-y rounded-md border-input bg-background px-2 py-1.5 text-xs"
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell label={field.label} hint={field.hint} edited={edited} onReset={reset} count={count}>
      <Input
        removeWrapper
        value={text}
        onChange={(e) => onChange(field.path, e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        aria-label={field.label}
        className={cn(inputClass, "w-full")}
      />
    </FieldShell>
  );
}
