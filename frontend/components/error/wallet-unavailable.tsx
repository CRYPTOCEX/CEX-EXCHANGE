"use client";

import { AlertTriangle, Home, RefreshCw, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user";

/**
 * The card every wallet surface shows when the wallet stack cannot start.
 *
 * TWO REASONS, TWO DIFFERENT AUDIENCES.
 *
 * `unconfigured` — the build has no NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID.
 *   This is an operator's problem and only an operator can fix it, so the
 *   remedy (the variable, where the id comes from, and that it needs a REBUILD)
 *   is shown to admins only. An ordinary user is told the feature is not set up
 *   yet and that the rest of their account is unaffected — a variable name
 *   means nothing to them and reads like a crash.
 *
 * `load_failed` — the wallet chunk did not arrive, or threw while it started.
 *   Usually transient (offline, a deploy that rotated chunk hashes under an
 *   open tab), so the primary action is a reload. `React.lazy` caches the
 *   rejection, so an in-place retry would re-throw the same error; a reload is
 *   the only honest retry. The error message is shown to admins so a support
 *   ticket can quote it.
 *
 * It renders INSTEAD OF the wallet tree, never beside it: the children of the
 * wallet provider call wagmi/AppKit hooks that throw without their providers,
 * so this card is the entire subtree until the cause is fixed. See
 * `context/wallet.tsx` and `context/wallet-chunk-boundary.tsx`.
 *
 * Keys live in `common`, not `ext_dex`: the profile wallet tab, wallet sign-in
 * and the NFT flows are core screens, and the DEX only borrows this. That is
 * also why the file lives under components/error and not components/web3-wallet
 * — `wallet-i18n.test.ts` resolves everything under web3-wallet against
 * `ext_dex`, and would report these keys missing from a namespace they were
 * never meant to be in.
 */
export type WalletUnavailableReason = "unconfigured" | "load_failed";

/**
 * `variant` is where the card renders, because its seven mount sites disagree
 * about the frame:
 *  - "inline" (default) — a page section under a fixed site header (the
 *    profile wallet tab, the NFT flows, the admin pool page). Clears the
 *    header with `pt-header-clear`, because the padding that used to do that
 *    lived in the children this card replaces.
 *  - "modal" — inside the sign-in dialog. Compact, and no "Go home": a
 *    navigation button inside a modal is a trap door.
 *  - "page" — the chromeless Swap terminal, where the card owns the viewport.
 */
export type WalletUnavailableVariant = "inline" | "modal" | "page";

const VARIANT_FRAME: Record<WalletUnavailableVariant, string> = {
  inline: "flex w-full justify-center px-4 pb-12 pt-header-clear",
  modal: "flex w-full justify-center px-1 py-6",
  page: "flex min-h-[70vh] w-full items-center justify-center px-4 py-12",
};

export function WalletUnavailable({
  reason,
  error,
  variant = "inline",
}: {
  reason: WalletUnavailableReason;
  error?: Error | null;
  variant?: WalletUnavailableVariant;
}) {
  const t = useTranslations("common");
  /*
    Narrow selectors, not the whole store: this card can sit on screen for the
    life of the page. Both checks stay: a Super Admin holds ZERO permission
    rows on this platform, so `hasPermission("access.admin")` alone would hide
    the remedy from the one person guaranteed to be able to apply it.
  */
  const user = useUserStore((s) => s.user);
  const hasPermission = useUserStore((s) => s.hasPermission);
  const isOperator =
    user?.role?.name === "Super Admin" || hasPermission("access.admin");
  const unconfigured = reason === "unconfigured";
  // AlertTriangle, not a network glyph: the boundary that renders `load_failed`
  // cannot tell a failed download from a throw during startup, so the icon
  // must not claim to know either.
  const Icon = unconfigured ? Wallet : AlertTriangle;
  // The chromeless terminal has no other heading; everywhere else the card
  // sits inside a page that already owns its h1.
  const Heading = variant === "page" ? "h1" : "h2";
  const detail = error?.message?.trim() || null;
  const showDetail =
    !unconfigured &&
    Boolean(detail) &&
    (isOperator || process.env.NODE_ENV === "development");

  return (
    <div
      /*
        `status`, not `alert`, for the unconfigured state: it is a persistent
        property of the deployment, and an assertive live region would read the
        entire card — environment variable included — over whatever the screen
        reader was doing. A failed load IS an event, so that one stays an alert.
      */
      role={reason === "load_failed" ? "alert" : "status"}
      data-testid="wallet-unavailable"
      data-reason={reason}
      className={VARIANT_FRAME[variant]}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-surface-2/50 p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
          <Icon className="h-7 w-7 text-warning-ink" aria-hidden="true" />
        </div>
        <Heading className="text-xl font-semibold tracking-tight text-foreground">
          {unconfigured
            ? t("wallet_connection_is_not_set_up_yet")
            : t("wallet_features_could_not_be_loaded")}
        </Heading>
        <p className="mt-2 text-sm leading-relaxed text-subtle-foreground">
          {unconfigured
            ? t("wallet_connection_is_not_set_up_yet_body")
            : t("wallet_features_could_not_be_loaded_body")}
        </p>

        {unconfigured && isOperator && (
          <div
            data-testid="wallet-unavailable-operator-hint"
            className="mt-5 rounded-xl border border-border-strong/50 bg-muted/50 p-4 text-left text-sm text-muted-foreground"
          >
            <p>
              {t("wallet_connection_operator_hint", {
                variable: "NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID",
                provider: "cloud.reown.com",
              })}
            </p>
            {/* tabIndex: a scrollable region a keyboard cannot reach fails
                WCAG 2.1.1; focus makes arrow-key scrolling work. */}
            <pre
              tabIndex={0}
              className="mt-3 overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {"NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id\npnpm build:frontend\npnpm restart"}
            </pre>
          </div>
        )}

        {showDetail && (
          <pre
            data-testid="wallet-unavailable-detail"
            tabIndex={0}
            className="mt-4 overflow-x-auto rounded-lg bg-muted/50 p-3 text-left font-mono text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {detail}
          </pre>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!unconfigured && (
            <Button
              onClick={() => window.location.reload()}
              className="sm:min-w-[160px]"
            >
              <RefreshCw className="h-4 w-4" />
              {t("refresh_page")}
            </Button>
          )}
          {/* `asChild`: an <a> wrapping a <button> is invalid HTML and two tab
              stops — the same reason error-shell.tsx does it this way. Hidden
              in the sign-in modal: navigating "home" from inside a dialog
              closes the flow the user is mid-way through. */}
          {variant !== "modal" && (
            <Button asChild variant="outline" className="sm:min-w-[160px]">
              <Link href="/">
                <Home className="h-4 w-4" />
                {t("go_home")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WalletUnavailable;
