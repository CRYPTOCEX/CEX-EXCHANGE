/**
 * The one place that turns `GET /api/copy-trading/leader/me` into the shape the
 * dashboard renders.
 *
 * WHAT BROKE: this transform used to read `apiData.stats.*`. That key has never
 * existed on this route — the handler spreads `getLeaderStats()` FLAT beside the
 * leader row (`...leader.toJSON(), ...stats`), exactly as the public leaderboard
 * does. `stats` therefore resolved to `{}`, every `parseFloat(undefined) || 0`
 * yielded 0, and because those explicit keys sit AFTER the spread they clobbered
 * the correct flat values the spread had just brought in. Every leader's own
 * scoreboard read 0% ROI / 0 followers / 0 trades while the SAME numbers
 * rendered correctly on the public leaderboard. Read the fields flat.
 *
 * `roi` also has to come from `roi`, not from `totalProfit`. The stats
 * calculator already returns roi as a PERCENT (profit / volume * 100) and the
 * card renders it with a literal `%` suffix, so sourcing it from the absolute
 * profit published a money amount as a percentage.
 *
 * Extracted from client.tsx because the transform was duplicated verbatim in
 * `fetchData` and `refetchLeaderProfile` — the copy in the refetch path re-zeroed
 * the scoreboard after every profile edit, so fixing only one was not a fix.
 */

/** The numeric fields the dashboard cards read; everything else passes through. */
export interface LeaderProfileNumerics {
  winRate: number;
  roi: number;
  totalFollowers: number;
  totalTrades: number;
  totalProfit: number;
  totalVolume: number;
  profitSharePercent: number;
  minFollowAmount: number;
}

/**
 * Sequelize hands back every DECIMAL as a STRING, so `profitSharePercent` and
 * `minFollowAmount` arrive as e.g. "20.00" and would concatenate under `+`.
 * `Number.isFinite` rather than `|| 0` so an Infinity never reaches `.toFixed()`.
 */
function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toLeaderProfile<T extends Record<string, any>>(
  apiData: T
): T & LeaderProfileNumerics {
  return {
    ...apiData,
    winRate: toNumber(apiData.winRate),
    roi: toNumber(apiData.roi),
    totalFollowers: toNumber(apiData.totalFollowers),
    totalTrades: toNumber(apiData.totalTrades),
    totalProfit: toNumber(apiData.totalProfit),
    totalVolume: toNumber(apiData.totalVolume),
    profitSharePercent: toNumber(apiData.profitSharePercent),
    minFollowAmount: toNumber(apiData.minFollowAmount),
  };
}
