import { fetchLanding } from "@/lib/fetchers/landing";
import ForexClient, { type LandingData } from "./client";

/**
 * The forex landing page's data, resolved on the server.
 *
 * `./client` used to ask `/api/forex/landing` from an effect, and until it
 * answered the hero shipped without its figure row entirely (`stats={null}`
 * while loading), the top-plan spotlight, the featured plans, the performance
 * history and the recent completions were all in their pending pass, and
 * `trendingPlans` fell back to a store array that is filled by an
 * AUTHENTICATED endpoint nothing on this page calls — i.e. empty for the
 * visitor this page is for.
 *
 * `fetchLanding` never throws and answers `null` for every failure, which is
 * the value `./client` already carried as its initial state, so its own fetch
 * still runs when the server could not reach the backend.
 */
export default async function ForexPage() {
  const initialData = await fetchLanding<LandingData>("/api/forex/landing");
  return <ForexClient initialData={initialData} />;
}
