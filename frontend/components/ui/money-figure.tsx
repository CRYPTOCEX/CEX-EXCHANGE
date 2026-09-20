import * as React from "react"

import { cn } from "@/lib/utils"
import { Loadable } from "@/components/ui/skeleton"

/**
 * A money string, with the DIGITS monospaced and the currency code left alone.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The card anatomy says numbers get `font-mono tabular-nums` and prose does not,
 * and `isFigureValue` in `./card/stats-card` draws that line: a value carrying
 * three or more consecutive letters is prose. Money formatters break the line in
 * half. `formatCrypto`, `formatCurrency`, `formatAllocation` and friends all
 * return `"1,234.00 USDT"` — a number and a word, glued together in one string —
 * so the value is neither cleanly a figure nor cleanly prose, and it ends up
 * rendered three different ways across the app:
 *
 *   - whole string in mono          -> a 24px ticker in a monospace face
 *   - whole string through StatsCard -> `isFigureValue` says prose, so a money
 *                                       figure renders with NO tabular digits
 *   - split by hand at the call site -> correct, and duplicated
 *
 * The ICO offer page managed the first and second on the SAME page: line 296
 * monospaced `formatCurrency(x, purchaseCurrency)` and lines 384/405 passed the
 * identical expression to StatsCard, which rendered it without mono at all.
 *
 * WHY IT IS A COMPONENT AND NOT A FORMATTER CHANGE
 * The alternative is to make the formatters return parts. That is a wider blast
 * radius — those helpers feed toasts, CSV exports, aria-labels and table cells,
 * where a plain string is what is wanted — and it would change output text.
 * Splitting at DISPLAY time changes not one character of what is rendered; only
 * which face each half is set in.
 *
 * THE SPLIT IS THE LAST SPACE, AND ONLY IF WHAT FOLLOWS IS LETTERS. The three
 * hand-written copies all split on the last space unconditionally, which is
 * wrong for two shapes this app really renders: a ratio (`3 / 10` would lose its
 * denominator out of the mono run) and a space-grouped locale number (fr-FR
 * groups thousands with a space, so `1 234,56` would lose its last group).
 * Requiring the trailing token to be letters fixes both — and, as a free
 * consequence, leaves dates alone too, since `Jan 2026` ends in digits.
 *
 * Three copies of this had already been written independently — in
 * `admin/gateway/payment/[id]`, `copy-trading/analytics` and
 * `copy-trading/leader/[id]` — by different authors solving the same problem the
 * same way. That convergence is the argument for it living here.
 */
export interface MoneyFigureProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** A pre-formatted money string, e.g. "1,234.00 USDT" or "$1,234.00". */
  value: string
  /** Extra classes for the numeric half only. */
  figureClassName?: string
  /** Extra classes for the unit half only. */
  unitClassName?: string
  /**
   * Render the figure half pending. THE UNIT STILL RENDERS.
   *
   * This component draws two boxes on one line and only one of them is
   * unknown: "USDT" is the wallet's currency, which the page has before it asks
   * the server for a balance, so withholding it would be withholding something
   * we already know — and it is 4-5 characters of the line's width, so the
   * figure beside it would have re-flowed sideways when it appeared.
   *
   * `value` is still the RULER in this state: the split runs on it either way,
   * so pass a representatively-shaped string while loading (`formatCrypto(0,
   * currency)`, not `""`) or there is no unit to hold back.
   *
   * Defaults to `false`; all 81 existing call sites are unaffected.
   */
  loading?: boolean
  /**
   * The string whose box the pending figure reserves — "1,234.00". Money is
   * `font-mono tabular-nums` here by construction, so a placeholder with the
   * real value's digit count is exactly as wide, to the pixel.
   */
  figurePlaceholder?: string
}

/** True when the trailing token is a unit rather than part of the number. */
function trailingUnit(value: string): { figure: string; unit: string } | null {
  const trimmed = value.trimEnd()
  const split = trimmed.lastIndexOf(" ")
  if (split === -1) return null
  const unit = trimmed.slice(split + 1)
  /* A trailing token is a UNIT only if it is letters — `1,234.00 USDT` yes,
     `3 / 10` and `1 234,56` no. Without this, a locale that groups thousands
     with a space would have its last group demoted out of the mono run. */
  if (!/^[A-Za-z]{1,10}$/.test(unit)) return null
  return { figure: trimmed.slice(0, split), unit }
}

export function MoneyFigure({
  value,
  className,
  figureClassName,
  unitClassName,
  loading = false,
  figurePlaceholder,
  ...props
}: MoneyFigureProps) {
  const parts = trailingUnit(value)

  if (!parts) {
    // No unit to split off — "$1,234.00" is entirely a figure.
    return (
      <span
        className={cn("font-mono tabular-nums", className, figureClassName)}
        aria-busy={loading || undefined}
        {...props}
      >
        {/* Inside the mono/tabular span, so the placeholder is measured with the
            same digit advance the real amount will use. */}
        <Loadable loading={loading} placeholder={figurePlaceholder} chars={7}>
          {value}
        </Loadable>
      </span>
    )
  }

  return (
    <span className={className} aria-busy={loading || undefined} {...props}>
      <span className={cn("font-mono tabular-nums", figureClassName)}>
        <Loadable loading={loading} placeholder={figurePlaceholder} chars={7}>
          {parts.figure}
        </Loadable>
      </span>{" "}
      {/* Static. The currency code is knowable before the amount is, and the
          literal space in front of it is part of the line either way. */}
      <span className={unitClassName}>{parts.unit}</span>
    </span>
  )
}
