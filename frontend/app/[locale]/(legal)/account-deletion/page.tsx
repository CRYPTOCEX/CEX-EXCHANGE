import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * How to close an account, on a page anybody can reach.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS PAGE EXISTS
 * ---------------------------------------------------------------------------
 * Google Play requires a **web URL** for account and data deletion in addition
 * to an in-app path, and it has to be reachable by somebody who has already
 * uninstalled the app — which rules out anything behind a sign-in. Apple asks
 * for the in-app path; Play asks for both. Submitting the app's Data Safety form
 * without a URL here is a rejection.
 *
 * ---------------------------------------------------------------------------
 * WHY IT DOES NOT DELETE ANYTHING
 * ---------------------------------------------------------------------------
 * It is a signed-out page, and deletion is irreversible. A form here would have
 * to identify the account from an email address alone, which makes it an oracle
 * for which addresses have accounts and — if it did anything more — a way to
 * start somebody else's deletion. Both authenticated doors already exist:
 * `POST /api/user/account/delete` (password) and the emailed
 * `POST /api/auth/delete` pair. This page tells a person where they are.
 *
 * ---------------------------------------------------------------------------
 * WHY THE RETENTION LIST IS SPELLED OUT
 * ---------------------------------------------------------------------------
 * Because it is true and the alternative is a false data-safety declaration.
 * Closing an account now strips its identity — name, email, phone, avatar,
 * wallet address, linked sign-in providers and push tokens all go, in the same
 * transaction as the soft delete (`backend/src/api/user/account/anonymize.ts`).
 * What survives is the financial and verification record, which
 * anti-money-laundering rules require be retained.
 *
 * KEEP THESE LISTS IN STEP WITH `DELETION_DISCLOSURE` in
 * `backend/src/api/user/account/utils.ts`. The app renders that constant
 * verbatim from `GET /api/user/account/delete`; this page restates it in prose
 * for a signed-out reader, so the two are only as consistent as someone makes
 * them.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Delete your account",
    description:
      "How to close your account, what is removed, and what is kept for regulatory reasons.",
  };
}

export default async function AccountDeletion() {
  const t = await getTranslations("common");

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold text-foreground">Delete your account</h1>

      <p className="mb-8 text-muted-foreground leading-relaxed">
        You can close your account yourself, at any time. There are two ways to do it.
      </p>

      <h2 className="mb-3 mt-8 text-2xl font-semibold text-foreground">In the mobile app</h2>
      {/* These steps name the real path. They previously read "go to the Account
          tab / tap Delete account", which described a screen the app did not
          have — the deletion control did not exist anywhere in the build. Play
          requires this page AND a working in-app path, so instructions for a
          button nobody can find fail both halves at once. */}
      <ol className="mb-8 list-decimal space-y-2 pl-6 text-muted-foreground">
        <li>Open the app and tap the settings icon in the top right of the dashboard.</li>
        <li>Scroll to the bottom and tap Delete Account.</li>
        <li>
          Read what will be removed and what will be kept, then confirm with your password.
        </li>
      </ol>

      <h2 className="mb-3 mt-8 text-2xl font-semibold text-foreground">
        If you do not have the app
      </h2>
      {/* Says what is actually true. This used to read "sign in and open your
          profile", but the web profile has no deletion control — its tabs are
          api-keys, notifications, phone-verification and wallet. Pointing a
          reader at a control that is not there is the same failure as the app
          instructions above had. */}
      <p className="mb-8 text-muted-foreground leading-relaxed">
        Deletion is available in the mobile app. If you have uninstalled it, or cannot sign
        in because you have lost access to the account, contact support from the email
        address the account uses and ask for it to be closed. You will be asked to confirm
        it is you before anything is removed.
      </p>

      <h2 className="mb-3 mt-8 text-2xl font-semibold text-foreground">Before you start</h2>
      <ul className="mb-8 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>
          <strong className="text-foreground">Cancel any open orders.</strong> An account with
          orders still resting on the market cannot be closed, because the orders would outlive
          it.
        </li>
        <li>
          <strong className="text-foreground">Withdraw or transfer your balances.</strong> Closing
          the account does not return them, and afterwards you will have no way to reach them.
        </li>
      </ul>

      <h2 className="mb-3 mt-8 text-2xl font-semibold text-foreground">What is removed</h2>
      <ul className="mb-8 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Access to the account: every signed-in device is signed out immediately.</li>
        <li>
          Your name, email address, phone number, profile picture and any linked wallet
          address.
        </li>
        <li>
          Google and wallet sign-in links, so neither can be used to reach the account
          again.
        </li>
        <li>Your public username, which is released for someone else to use.</li>
        <li>Push notification tokens, so no further notifications reach your devices.</li>
      </ul>
      <p className="mb-8 text-muted-foreground leading-relaxed">
        Because your email address is released, you can register a new account with it
        later. That new account starts empty — the closed one does not come back.
      </p>

      <h2 className="mb-3 mt-8 text-2xl font-semibold text-foreground">What is kept</h2>
      <p className="mb-4 text-muted-foreground leading-relaxed">
        Financial regulations require some records to be retained after an account closes. These
        are kept and are no longer accessible to you:
      </p>
      <ul className="mb-8 list-disc space-y-2 pl-6 text-muted-foreground">
        <li>Transaction and wallet records.</li>
        <li>Identity verification documents and their review history.</li>
        <li>Support tickets and their messages.</li>
      </ul>

      <p className="text-sm text-muted-foreground">
        See our{" "}
        <Link href="/privacy" className="text-primary underline underline-offset-4">
          {t("privacy_policy")}
        </Link>{" "}
        for how long each of these is held.
      </p>
    </div>
  );
}
