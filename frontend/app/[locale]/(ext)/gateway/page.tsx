import { fetchLanding } from "@/lib/fetchers/landing";
import GatewayLandingClient, { type LandingData } from "./client";

/**
 * The payment-gateway landing page's data, resolved on the server.
 *
 * `./client` used to ask `/api/gateway/landing` from an effect, so the shipped
 * HTML had no hero figure row at all (`showStats` is false until `stats`
 * lands, and `LandingHero` drops the whole `<dl>` when its stat list is
 * empty), a pending supported-currencies grid, a pending fee calculator and a
 * pending activity feed. The row then appeared and pushed everything under it
 * down by its own height.
 *
 * `fetchLanding` never throws and answers `null` for every failure, which is
 * the value `./client` already carried as its initial state, so its own fetch
 * still runs when the server could not reach the backend.
 */
export default async function GatewayPage() {
  const initialData = await fetchLanding<LandingData>("/api/gateway/landing");
  return <GatewayLandingClient initialData={initialData} />;
}
