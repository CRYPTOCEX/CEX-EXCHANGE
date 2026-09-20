"use client";

/**
 * The chrome editor's control rail — pick a navbar layout, pick a footer layout.
 * ============================================================================
 *
 * WHAT THIS IS ACTUALLY FOR
 *
 * Not "show four thumbnails". The variants are not interchangeable: `centered`
 * has no room for the search trigger, `minimal` has no desktop navigation at
 * all. Those are the facts that decide the choice, and the failure this rail
 * exists to prevent is an owner picking a layout, shipping it, and discovering a
 * week later that their search box is gone.
 *
 * So every card states what its layout CANNOT do as prominently as what it can.
 * The registry declares `capabilities` for exactly this; rendering only the true
 * ones would make a brochure, not a picker.
 *
 * The schematic answers the other half — "what does it look like" — before the
 * preview has to load. The two are complementary and both are needed: the
 * diagram is instant and lets four layouts be compared side by side, while the
 * preview is truthful about the owner's own content.
 */

import * as React from "react";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NavbarSchematic, FooterSchematic } from "@/lib/chrome/schematics";
import {
  FOOTER_VARIANTS,
  NAVBAR_VARIANTS,
  type FooterVariantMeta,
  type NavbarVariantMeta,
} from "@/lib/chrome/variants";
import { cn } from "@/lib/utils";

/* ==========================================================================
   CAPABILITY COPY

   One sentence per capability for BOTH states. The off-sentence is the whole
   point, so it is written as a consequence ("navigation moves into the menu
   drawer") rather than as the negation of a feature name ("no nav") — an owner
   reading "nav: false" learns nothing they can act on.

   A RECORD keyed by the registry's capability names, not an array of rows: the
   Record annotation is exhaustive, so a capability added to `variants.ts` is a
   compile error here instead of a line that silently never renders. That is the
   failure this rail cannot afford — a missing capability line reads as "this
   layout does everything".

   Insertion order is render order, most consequential first.
   ========================================================================== */

type NavCapabilityKey = keyof NavbarVariantMeta["capabilities"];
type FooterCapabilityKey = keyof FooterVariantMeta["capabilities"];

interface CapabilityCopy {
  /** Shown when the layout HAS it. */
  on: string;
  /** Shown when it does not — the consequence, never "no nav". */
  off: string;
}

const NAVBAR_CAPABILITY_COPY: Record<NavCapabilityKey, CapabilityCopy> = {
  nav: {
    on: "Navigation links sit in the bar itself.",
    off: "No navigation in the bar — every link moves into the menu drawer, on desktop as well as mobile.",
  },
  actions: {
    on: "Room for the full action cluster beside the brand.",
    off: "Not enough room for the full cluster — secondary actions collapse into the profile menu.",
  },
  search: {
    on: "Shows the search trigger.",
    off: "The search trigger is not shown in this layout.",
  },
  twoRow: {
    on: "Navigation gets its own full-width row beneath the brand row.",
    off: "Brand, navigation and controls share a single row.",
  },
};

const FOOTER_CAPABILITY_COPY: Record<FooterCapabilityKey, CapabilityCopy> = {
  brandBlock: {
    on: "Tall brand block with room for a tagline.",
    off: "Brand is one compact line — the tagline is not shown.",
  },
  newsletter: {
    on: "Includes the newsletter signup.",
    off: "The newsletter signup is not shown in this layout.",
  },
  socials: {
    on: "Shows the social links.",
    off: "Social links are not shown in this layout.",
  },
};

/* `Object.keys` widens to `string[]`; the cast is safe because the Record's key
   type IS the capability union and both objects are literals declared above. */
const NAVBAR_CAPABILITY_ORDER = Object.keys(NAVBAR_CAPABILITY_COPY) as NavCapabilityKey[];
const FOOTER_CAPABILITY_ORDER = Object.keys(FOOTER_CAPABILITY_COPY) as FooterCapabilityKey[];

/** Plain-English gloss of the registry's `columns` number. */
function columnsLabel(columns: number): string {
  if (columns <= 0) return "Inline links, no columns";
  if (columns === 1) return "One centred row of links";
  return `${columns} link columns`;
}

/* ==========================================================================
   PIECES
   ========================================================================== */

function CapabilityLine({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      {enabled ? (
        <Check className="mt-px h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <X className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      {/* The ABSENT capability is the line carrying information, so it is the one
          set in foreground ink. Greying out "no search trigger" would have made
          the trade-off the quietest thing on the card. */}
      <span className={cn("leading-snug", enabled ? "text-muted-foreground" : "text-foreground")}>
        {children}
      </span>
    </li>
  );
}

function VariantCard({
  label,
  description,
  meta,
  schematic,
  capabilities,
  selected,
  current,
  disabled,
  onSelect,
}: {
  label: string;
  description: string;
  meta: string;
  schematic: React.ReactNode;
  capabilities: React.ReactNode;
  selected: boolean;
  current: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className="w-full rounded-lg text-start focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
    >
      {/* `interactive` is dropped while the picker is busy on purpose. It carries
          `cursor-pointer`, and the Card fills the button edge to edge — so the
          button's own disabled cursor never reaches a pixel the pointer can land
          on, and a frozen card would still advertise itself as clickable.

          `hover:border-primary` on the selected card is not decoration either:
          `interactive` ships `hover:border-border-strong`, which applies at the
          exact moment the owner points at the card they have already chosen — so
          the selection ring would vanish under the cursor. */}
      <Card
        interactive={!disabled}
        padding="md"
        className={cn("h-full", selected && "border-primary bg-primary/5 hover:border-primary")}
      >
        <div className="mb-3 overflow-hidden rounded-md border border-border bg-surface-2 p-2">
          {schematic}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {selected ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          ) : null}
          {/* "Live" is what the site serves right now; "selected" is a draft
              until Save. With both shown the owner can always tell which of the
              two they are looking at mid-edit. */}
          {current ? (
            <Badge variant="muted" size="xs" className="ms-auto">
              Live
            </Badge>
          ) : null}
        </div>

        <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
        <p className="mt-2 text-[11px] text-subtle-foreground">{meta}</p>

        <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-[11px]">{capabilities}</ul>
      </Card>
    </button>
  );
}

/* ==========================================================================
   THE TWO PICKERS
   ========================================================================== */

export function NavbarPicker({
  value,
  live,
  disabled,
  onChange,
}: {
  value: string;
  live: string | undefined;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {NAVBAR_VARIANTS.map((variant) => (
        <VariantCard
          key={variant.id}
          label={variant.label}
          description={variant.description}
          meta={`Bar height ${variant.height} — every page's top clearance follows it.`}
          schematic={<NavbarSchematic variant={variant.id} className="w-full" />}
          selected={value === variant.id}
          current={live === variant.id}
          disabled={disabled}
          onSelect={() => onChange(variant.id)}
          capabilities={NAVBAR_CAPABILITY_ORDER.map((key) => {
            const enabled = variant.capabilities[key];
            const copy = NAVBAR_CAPABILITY_COPY[key];
            return (
              <CapabilityLine key={key} enabled={enabled}>
                {enabled ? copy.on : copy.off}
              </CapabilityLine>
            );
          })}
        />
      ))}
    </div>
  );
}

export function FooterPicker({
  value,
  live,
  disabled,
  onChange,
}: {
  value: string;
  live: string | undefined;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {FOOTER_VARIANTS.map((variant) => (
        <VariantCard
          key={variant.id}
          label={variant.label}
          description={variant.description}
          meta={columnsLabel(variant.columns)}
          schematic={<FooterSchematic variant={variant.id} className="w-full" />}
          selected={value === variant.id}
          current={live === variant.id}
          disabled={disabled}
          onSelect={() => onChange(variant.id)}
          capabilities={FOOTER_CAPABILITY_ORDER.map((key) => {
            const enabled = variant.capabilities[key];
            const copy = FOOTER_CAPABILITY_COPY[key];
            return (
              <CapabilityLine key={key} enabled={enabled}>
                {enabled ? copy.on : copy.off}
              </CapabilityLine>
            );
          })}
        />
      ))}
    </div>
  );
}
