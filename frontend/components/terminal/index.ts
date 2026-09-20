/**
 * Platform-wide access to the trading-terminal primitives.
 *
 * The primitives themselves live at
 * `app/[locale]/trade/components/ui/terminal.tsx`, because that is the tree
 * that forced them into existence — the orderbook alone carried four copies of
 * the same header and row. They encode contrast decisions that are easy to get
 * wrong by hand (why an amount rides `--foreground` and not
 * `--muted-foreground` over a direction tint; why a filled direction ground
 * never takes `text-white`), so anything that renders dense market data should
 * be using them rather than re-deriving them.
 *
 * They were unreachable in practice: the only import path ran through a route
 * directory with a dynamic segment in it, so every other surface that wanted a
 * ladder or a tape hand-rolled one and drifted. This module is the stable name.
 *
 * Deliberately a re-export rather than a move — the implementation keeps ONE
 * home, and the four existing call sites in the trade tree do not change.
 */

export {
  // direction ink / tint / fill helpers
  directionText,
  directionBorder,
  directionTint,
  directionFill,
  // structure
  PanelStrip,
  ColumnHeader,
  Th,
  EmptyState,
  Spinner,
  StatusNotice,
  MetaChip,
  TabButton,
} from "@/app/[locale]/trade/components/ui/terminal";

export type { Direction } from "@/app/[locale]/trade/components/ui/terminal";
