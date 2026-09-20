"use client";

/**
 * Extension Case Pane Stub
 * ============================================================================
 *
 * Stands in for `app/[locale]/(ext)/admin/ai/support/inbox/case-pane` on an
 * install whose licence does not include the AI Support addon.
 *
 * That module is the operator's second column on the assistant inbox — the
 * handover brief, what the assistant retrieved, and the custody controls. It is
 * imported statically by core surfaces (the design-system resolution harness
 * today), so on an install without the addon it is a hard "module not found"
 * that kills the production build. `next.config.js` aliases it here instead.
 *
 * WHY THIS EXISTS RATHER THAN THE GENERATED FALLBACK
 * ---------------------------------------------------------------------------
 * The generated stub in `ext-fallback-stub.generated.ts` keeps the build alive
 * and answers `null` — so an embedding surface draws a pane-shaped hole with no
 * explanation, and "the case pane is broken" becomes indistinguishable from
 * "the case pane was never licensed here". This one draws the same frame the
 * real pane draws and says which addon is missing, which is the whole reason
 * `stubForExtSpecifier()` prefers a hand-written answer.
 *
 * IT EXPORTS THE REAL MODULE'S WHOLE PUBLIC SURFACE, deliberately. A stub that
 * is missing a binding some importer asks for fails the build exactly as loudly
 * as the absent module did — that is the trade for leaving the generated
 * fallback, which cannot miss a name because it is derived from the imports.
 * So the two pure helpers are carried across verbatim; they are string
 * formatting with no dependency on the addon, and only ever one copy is
 * compiled into a given install.
 *
 * `__isStub` is stamped on the component so a caller can ask. The resolution
 * harness uses it to swap four empty frames for one honest sentence.
 */

import { useTranslations } from "next-intl";
import { PaneHeader } from "@/components/support/resolution-pane";

export type CaseTab = "brief" | "evidence" | "case";

export interface CasePaneCapabilities {
  manage: boolean;
  teach: boolean;
}

export interface CasePaneProps {
  detail: any;
  loading: boolean;
  currentUserId?: string | null;
  currentUserName?: string | null;
  tab: CaseTab;
  onTabChange: (tab: CaseTab) => void;
  busy: string | null;
  can: CasePaneCapabilities;
  onTakeover: () => void;
  onRelease: () => void;
  onUseDraft: (text: string) => void;
  onStatus: (status: string) => void;
  onPriority: (importance: string) => void;
  onAssignToMe: () => void;
  onTeach: () => void;
  onRefresh?: () => void;
  onCollapse?: () => void;
  showHeader?: boolean;
}

/** Carried from the real module — pure, and a wire contract it does not own. */
const HANDOVER_DRAFT_MARKER = "--- suggested reply ---";

export function splitHandoverNote(note: string | null | undefined): {
  brief: string;
  suggested: string | null;
} {
  if (!note) return { brief: "", suggested: null };
  const at = note.indexOf(HANDOVER_DRAFT_MARKER);
  if (at === -1) return { brief: note.trim(), suggested: null };
  return {
    brief: note.slice(0, at).trim(),
    suggested: note.slice(at + HANDOVER_DRAFT_MARKER.length).trim() || null,
  };
}

export function humaniseReason(reason: string): string {
  const [head, tail] = reason.split(":");
  const words = head.replace(/[_-]+/g, " ").trim();
  const sentence = words.charAt(0).toUpperCase() + words.slice(1);
  return tail ? `${sentence} — ${tail.replace(/[_-]+/g, " ")}` : sentence;
}

/**
 * The pane, as an empty state.
 *
 * Same outer frame and same header as the real one, so a surface that gives the
 * column a width does not collapse or stretch when the addon is absent. The
 * copy is in English rather than through `useTranslations`: it names an addon
 * and a build-time condition, it is read by whoever installs the product, and
 * inventing message keys for an install that does not ship the namespace they
 * would live in trades a blank pane for a raw key.
 */
export function CasePane({ onCollapse, showHeader = true }: CasePaneProps) {
  const tCommon = useTranslations("common");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader ? (
        <PaneHeader title={tCommon("case")} onCollapse={onCollapse} />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <p className="text-foreground text-sm font-medium">
          AI Support is not installed
        </p>
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          The handover brief, the retrieval evidence and the custody controls
          ship with that addon. The conversation beside this column is core and
          is unaffected.
        </p>
      </div>
    </div>
  );
}

(CasePane as any).__isStub = true;

/** The 44px rail the pane collapses to, with nothing to count. */
export function CollapsedCaseRail({
  onExpand,
}: {
  detail?: any;
  onExpand: () => void;
}) {
  const tCommon = useTranslations("common");

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={tCommon("case")}
      className="border-border bg-card/40 hover:bg-card/70 group hidden w-11 shrink-0 cursor-pointer flex-col items-center gap-3 border-s py-3 transition-colors xl:flex"
    >
      <span
        className="text-subtle-foreground font-mono text-[10px] tracking-widest uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        {tCommon("case")}
      </span>
    </button>
  );
}

(CollapsedCaseRail as any).__isStub = true;
