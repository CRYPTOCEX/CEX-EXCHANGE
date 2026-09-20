import type { Metadata } from "next";
import { fetchLanding } from "@/lib/fetchers/landing";
import CopyTradingLanding, { type LandingData } from "./client";

export const metadata: Metadata = {
  title: "Copy Trading | Follow Expert Traders",
  description:
    "Automatically copy trades from expert traders and grow your portfolio with our copy trading platform",
};

/**
 * The copy-trading landing page's data, resolved on the server.
 *
 * `./client` used to ask `/api/copy-trading/landing` from an effect, so the
 * HTML this route shipped was its pending pass — the long comment above
 * `heroStats` in that file describes what that costs and bounds it with a
 * three-cell reservation. The reservation stays; with the payload already in
 * the RSC payload there is nothing left for it to reserve against on a healthy
 * install.
 *
 * A static `metadata` export and an async default export coexist happily —
 * both are server-side, and this file was already a server component.
 *
 * `fetchLanding` never throws and answers `null` for every failure, which is
 * the value `./client` already carried as its initial state, so its own fetch
 * still runs when the server could not reach the backend.
 */
export default async function CopyTradingPage() {
  const initialData = await fetchLanding<LandingData>(
    "/api/copy-trading/landing"
  );
  return <CopyTradingLanding initialData={initialData} />;
}
