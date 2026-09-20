"use client";

import { useMemo } from "react";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { isKycFeatureEnforced } from "@/utils/kyc";
import type { KycFeatureId } from "@/config/kyc-features";

/**
 * The one place a page asks "may this user do X?".
 *
 * Before this hook, every gated surface hand-rolled the same four lines —
 * pull `hasKyc`/`canAccessFeature` off the user store, re-derive the KYC
 * master switch from `settings.kycStatus` inline, `&&` them, early-return a
 * notice. Sixteen copies, and they did not agree: only one passed
 * `requirement="higher_level"`, so the other fifteen told an already-approved
 * user to "Complete Verification" and sent them to a KYC page that already
 * showed 100% complete. Several forgot to check `user` at all, so a logged-out
 * visitor — and every user during the SSR-to-hydration window — was shown a
 * KYC notice instead of a login prompt.
 *
 * That SSR-to-hydration window is now gone: the session is resolved on the
 * server and seeded before the first client render (`store/auth-boot.ts`), so
 * `user` is the real answer from the very first paint on both sides. This hook
 * still reads `isLoading` rather than the new `authResolved` on purpose —
 * `isLoading` is ALSO set while a sign-in request is in flight, and pausing the
 * gate for that is the existing behaviour, which this change deliberately left
 * alone. `authResolved` would make "loading" unreachable here.
 *
 * `state` distinguishes the four outcomes so no call site can conflate them:
 *
 *   "loading"    a sign-in request is in flight (or, in a tree mounted outside
 *                the app's providers, the store was never seeded). Render
 *                nothing.
 *   "anonymous"  nobody is signed in. This is a LOGIN problem, not a KYC one.
 *   "needs_kyc"  signed in, no approved application. Send them to verification.
 *   "needs_level" approved, but this level does not carry the feature. Do NOT
 *                say "complete verification" — they already did.
 *   "allowed"    proceed.
 *
 * `allowed` is also true when enforcement is off platform-wide, so a call site
 * can branch on it alone. That mirrors `isKycFeatureEnforcementEnabled` in
 * backend/src/utils/kyc.ts — the gate must never be stricter than the server.
 */
export type KycGateState =
  | "loading"
  | "anonymous"
  | "needs_kyc"
  | "needs_level"
  | "allowed";

export interface KycGate {
  state: KycGateState;
  allowed: boolean;
  /** Which message KycRequiredNotice should render. Null when allowed. */
  requirement: "verification" | "higher_level" | null;
  /** True only while enforcement is live platform-wide. */
  enforced: boolean;
}

export function useKycGate(feature: KycFeatureId): KycGate {
  const user = useUserStore((s) => s.user);
  const isLoading = useUserStore((s) => s.isLoading);
  const canAccessFeature = useUserStore((s) => s.canAccessFeature);
  const hasKyc = useUserStore((s) => s.hasKyc);
  const settings = useConfigStore((s) => s.settings);

  return useMemo<KycGate>(() => {
    const enforced = isKycFeatureEnforced(settings);

    // Enforcement off: the server would allow this, so the UI must too.
    if (!enforced) {
      return { state: "allowed", allowed: true, requirement: null, enforced };
    }
    if (isLoading) {
      return { state: "loading", allowed: false, requirement: null, enforced };
    }
    if (!user) {
      return { state: "anonymous", allowed: false, requirement: null, enforced };
    }
    if (!hasKyc()) {
      return {
        state: "needs_kyc",
        allowed: false,
        requirement: "verification",
        enforced,
      };
    }
    if (!canAccessFeature(feature)) {
      return {
        state: "needs_level",
        allowed: false,
        requirement: "higher_level",
        enforced,
      };
    }
    return { state: "allowed", allowed: true, requirement: null, enforced };
  }, [feature, user, isLoading, settings, hasKyc, canAccessFeature]);
}
