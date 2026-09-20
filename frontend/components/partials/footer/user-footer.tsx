"use client";

import { useChrome } from "@/components/chrome/chrome-provider";
import { useSettings } from "@/hooks/use-settings";
import FooterLayout from "./footer-layouts";
import { useFooterData } from "./use-footer-data";
import { VerificationBadge } from "./verification-badge";

/**
 * The public site footer.
 * ============================================================================
 *
 * Three things live here and nowhere else:
 *
 *  1. WHICH LAYOUT. Resolved server-side and delivered by `ChromeProvider`, so
 *     the chosen footer is in the server HTML and never swaps after paint. An
 *     explicit `variant` prop still wins, which is what lets the admin picker
 *     preview an arrangement without saving it.
 *  2. THE SHELL. The surface, the top border and the gradient wash are shared
 *     by every layout, so changing arrangement never changes the page's bottom
 *     edge. A layout renders the shell's children, not the shell.
 *  3. THE NOT-READY STATE — and it is now a state of this footer, not a
 *     different footer. See the note on `ready` below.
 *
 * Content itself is derived once by `useFooterData`. Layouts arrange it.
 *
 * Called with no props in 7 places (page templates, the legal layout, the blog
 * layout, the extension wrapper), so `variant` must stay optional.
 */
export function SiteFooter({ variant }: { variant?: string } = {}) {
  const chrome = useChrome();
  const effectiveVariant = variant ?? chrome.footerVariant;

  /**
   * Opt-in, and it must default to hidden.
   *
   * Compared against BOTH the boolean and the string: settings are TEXT rows, and
   * the SSR fetch puts raw strings in the store while only the client fetch coerces
   * — and the client fetch is skipped when SSR already populated it. A plain
   * truthiness test would silently show the badge for the string "false".
   */
  const { settings } = useSettings();
  const showVerificationBadge =
    settings?.verificationBadge === true || settings?.verificationBadge === "true";

  /* `ready` is deliberately NOT read — see the note below the destructure. */
  const {
    brand,
    sections,
    flatLinks,
    socials,
    legal,
    year,
    allRightsReserved,
    copyright,
  } = useFooterData();

  /**
   * `ready` NO LONGER SWAPS THE FOOTER OUT.
   * ==========================================================================
   *
   * What was here was `if (!ready) return <footer className="bg-muted/30 py-12
   * border-t">` wrapping two grey bars — a 6px-and-4px stack inside 96px of
   * padding, so about 150px of footer standing in for a real one that measures
   * 350-450px in every layout. That is 200-300px of page height appearing at
   * the bottom of every route on the site, on the settings fetch, which also
   * moves the scroll position of anyone already reading down there.
   *
   * The justification given for it was that settings decide which links exist
   * so there is "nothing yet to arrange". That is not what `useFooterData`
   * actually returns before the fetch: Resources and Company are unconditional,
   * and Trading always contains Markets, so three of the four columns and the
   * whole brand block, social row and legal line are already there. What
   * settings ADD is entries inside columns that are being drawn either way.
   *
   * So the footer draws once. The remaining settle is links appearing inside
   * columns that already exist — a column growing by a row or two — instead of
   * the entire footer materialising. It also puts the footer's links in the
   * server HTML, which the swap never did.
   */

  return (
    <footer className="relative bg-muted/30 border-t">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-background/50 to-transparent pointer-events-none" />

      <div className="relative">
        <FooterLayout
          variant={effectiveVariant}
          brand={brand}
          sections={sections}
          flatLinks={flatLinks}
          socials={socials}
          legal={legal}
          year={year}
          allRightsReserved={allRightsReserved}
          copyright={copyright}
          /*
            Passed INTO the layout so it lands in the legal bar beside Privacy and
            Terms, which is where a trust mark belongs. Rendering it in this shell
            instead would drop it below the legal bar, centred in dead space and
            aligned to nothing — visibly bolted on.

            This is compatible with the frozen `columns` markup on the terms the
            freeze sets: `verificationBadge` ships off, so `badge` is undefined and
            an untouched install renders exactly what it rendered before.
          */
          badge={showVerificationBadge ? <VerificationBadge /> : undefined}
        />
      </div>
    </footer>
  );
}
