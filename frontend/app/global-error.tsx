"use client";

// Root error boundary — the last one. It replaces the ROOT layout, so nothing
// above it exists: no `<html>` from `app/[locale]/layout.tsx`, no theme boot
// script, no NextIntlClientProvider, no ThemeProvider. It has to render its own
// document and it cannot call `useTranslations`.
//
// It carried the same defect `app/not-found.tsx` used to: a hardcoded #0070f3
// button and #666 body copy on the browser's default white, which on a dark
// install is the only screen in the product that ignores the palette. Fixed the
// same way, and for the same two reasons spelled out there:
//
//   - importing globals.css brings the token declarations along, so `--radius`
//     and the font stack track the shipped design rather than literals;
//   - `.dark` is unreachable (there is no provider on this page), so the OS
//     preference is the only signal available — which is the right one here,
//     since by definition there is no app state left to read. `light-dark()`
//     reads it directly, and `color-scheme` is what makes it resolve.
//
// The literals below ARE the shipped tokens, light and dark, copied from
// globals.css `:root` / `.dark`. They cannot be `var(--background)`: without a
// `.dark` class on any ancestor that expression always resolves to the light
// value.
import "./globals.css";

// Force dynamic rendering to avoid prerender issues
export const dynamic = "force-dynamic";

const INK = "light-dark(hsl(218 52.4% 8.2%), hsl(212 35.1% 92.7%))";
const MUTED_INK = "light-dark(hsl(216 18.4% 40.4%), hsl(215 16.2% 64.9%))";
const GROUND = "light-dark(hsl(214 41.2% 96.7%), hsl(220 33.3% 3.5%))";
const CARD = "light-dark(hsl(0 0% 100%), hsl(216 29.4% 6.7%))";
const HAIRLINE = "light-dark(hsl(213 34.6% 89.8%), hsl(213 24.3% 14.5%))";
const DANGER = "light-dark(hsl(354 67.7% 48.8%), hsl(354 83.2% 64.9%))";
// NO ACCENT, for the reason spelled out in `app/not-found.tsx`: this page cannot
// read the admin theme, so a shipped-blue button on an orange install would make
// the one screen that does not know the brand the loudest thing on it. The
// primary action earns its hierarchy by INVERTING the ink scale instead, which
// is near-identical across themes. `--destructive` is the one exception — it is
// carrying meaning here (this page only exists because something failed), not
// decorating, and red reads as red on every palette.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Note: cannot use useTranslations here — NextIntlClientProvider lives inside
  // the layout this boundary replaces. Static English is the only option.
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
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
                  color: DANGER,
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
                  stroke={MUTED_INK}
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
                500
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
              Something went wrong!
            </h1>
            <p
              style={{
                margin: "0.75rem 0 0",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: MUTED_INK,
              }}
            >
              An unexpected error occurred. Please try again, or contact support
              if the problem persists.
            </p>

            {error.digest && (
              <p
                style={{
                  margin: "1rem 0 0",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: "0.75rem",
                  color: MUTED_INK,
                }}
              >
                {error.digest}
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "0.75rem",
                marginTop: "2rem",
              }}
            >
              <button
                onClick={() => reset()}
                style={{
                  height: "3rem",
                  padding: "0 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  backgroundColor: INK,
                  color: GROUND,
                  border: "none",
                  borderRadius: "var(--radius, 0.5rem)",
                }}
              >
                Try again
              </button>
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
                  backgroundColor: "transparent",
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
