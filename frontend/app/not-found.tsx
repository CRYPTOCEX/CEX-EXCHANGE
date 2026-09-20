// Root not-found page for handling 404s outside of locale routes — and, in
// practice, for every unmatched URL under `/en/...` too, since an unmatched
// path never reaches `app/[locale]/not-found.tsx` (that one only serves an
// explicit `notFound()` call from inside a locale segment).
//
// This renders its own <html>/<body>, so it does NOT inherit the locale layout —
// no globals.css link, no font variables, no design-theme <style>. Measured on
// /en/market/zzz, /en/user/zzz and /en/legal/terms: 11.4 KB documents with zero
// stylesheet links and a hardcoded #0070f3 button. On a themed install these were
// the only pages in the product that ignored the palette entirely, in the first
// frame and in every frame after it.
//
// Importing globals.css brings the token declarations with it, so the page tracks
// the shipped palette instead of literals.
//
// TWO THINGS THIS DELIBERATELY DOES NOT DO:
//   - fetch settings to inline a saved admin theme. This route serves requests
//     that already fell through everything else, and a settings round-trip is
//     exactly the work a 404 should not be doing. It renders the SHIPPED palette:
//     correct-looking, just not personalised.
//   - consult `.dark`. There is no theme provider on this page, so the OS
//     preference is the only signal available — which is the right one here,
//     since there is no app state to read. `light-dark()` reads it directly.
//
// WHICH IS WHY THERE IS NO ACCENT HERE (2026-07-30). Following the rule above to
// its conclusion: an install that has themed `--primary` orange got a page whose
// only saturated element was the SHIPPED blue, so the one screen that could not
// know the brand was also the one shouting a colour in it. Every surface, rule
// and ink below is drawn from the neutral ramp, which is near-identical across
// themes — so this page is quietly correct on any install rather than confidently
// wrong on most of them. The shape (panel, dial, status code) is shared with
// `global-error.tsx` and, through `components/error/error-shell.tsx`, with every
// other error surface in the product.
import "./globals.css";

// Force dynamic rendering to avoid prerender issues
export const dynamic = "force-dynamic";

// The shipped tokens, light and dark, copied from globals.css `:root` / `.dark`.
// These cannot be `var(--background)`: with no `.dark` class on any ancestor,
// that expression always resolves to the light value.
const INK = "light-dark(hsl(218 52.4% 8.2%), hsl(212 35.1% 92.7%))";
const MUTED_INK = "light-dark(hsl(216 18.4% 40.4%), hsl(215 16.2% 64.9%))";
const GROUND = "light-dark(hsl(214 41.2% 96.7%), hsl(220 33.3% 3.5%))";
const CARD = "light-dark(hsl(0 0% 100%), hsl(216 29.4% 6.7%))";
const HAIRLINE = "light-dark(hsl(213 34.6% 89.8%), hsl(213 24.3% 14.5%))";

export default function NotFound() {
  // Note: cannot use getTranslations here as this is outside the locale routing
  // structure. Using static text instead.
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          // `light-dark()` resolves against this; without it the first arm wins.
          colorScheme: "light dark",
          backgroundColor: GROUND,
          color: INK,
          fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem 1rem",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "32rem",
              boxSizing: "border-box",
              padding: "3rem 2rem",
              textAlign: "center",
              backgroundColor: CARD,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: "var(--radius, 0.5rem)",
            }}
          >
            <div
              style={{
                margin: "0 auto 2rem",
                width: "9rem",
                height: "9rem",
                position: "relative",
              }}
            >
              <svg
                viewBox="0 0 200 200"
                fill="none"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  color: MUTED_INK,
                }}
              >
                <circle
                  cx="100"
                  cy="100"
                  r="62"
                  fill="currentColor"
                  opacity="0.07"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="62"
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="3 13"
                  opacity="0.6"
                />
              </svg>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "2.25rem",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: INK,
                }}
              >
                404
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: "-0.025em",
              }}
            >
              Page not found
            </h1>
            <p
              style={{
                margin: "0.75rem 0 0",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: MUTED_INK,
              }}
            >
              The page you are looking for does not exist or has been moved.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "2rem",
              }}
            >
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "3rem",
                  padding: "0 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  color: INK,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: "var(--radius, 0.5rem)",
                  boxSizing: "border-box",
                }}
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
