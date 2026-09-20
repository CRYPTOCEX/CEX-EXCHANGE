import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

/**
 * NFTs — mint integrity.
 *
 * The page this replaces had two permanent 50/50 pies (both slices of each
 * compiled to `= 0`, because a tinyint was compared to the string 'true'), a
 * "Minted NFTs" line that plotted the UNMINTED population, five rarity tiles
 * restating five slices of the pie beside them, and three engagement cards
 * that were dropped before they reached SQL.
 *
 * The question this page has to answer first is not "how many NFTs are there"
 * — it is "which rows are lying". A token flagged MINTED with no on-chain
 * token id was never minted; the user believes they own something that does
 * not exist on chain.
 *
 * SECOND WAVE. `mintedAt` is a real column, so "how long does a mint take" is
 * now expressible as an elapsed-time aggregate rather than a wish, and the two
 * ends of the mint funnel — drafts that were abandoned and mints that never
 * landed — finally sit next to the success rate they explain.
 *
 * STILL NOT EXPRESSIBLE: the blueprint's Missing Metadata is
 * `metadataUri IS NULL OR metadataHash IS NULL`. `values: [...]` is an OR over
 * the values of ONE column; there is no OR across two different columns, and
 * guards are ANDed. The card below therefore tests `metadataUri` only, which is
 * the half that breaks the image everywhere — a row with a URI but no hash is
 * un-reverifiable rather than invisible.
 */
export const nftTokenAnalytics: AnalyticsConfig = [
  // ─────────────────────────────────────────────────────────────
  // Row 1 — Integrity alarms. Snapshots, not window counts: a token that
  // has been stuck since March is the one that matters.
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 2 },
        desktop: { cols: 3, span: 2 },
      },
      items: [
        {
          id: "stuck_mints",
          title: "Stuck Mints",
          metric: "stuckMints",
          model: "nftToken",
          // MINTED in the database, no blockchainTokenId. Highest-severity
          // data state on the page and nothing surfaced it before.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "MINTED" },
              { field: "blockchainTokenId", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:alert-octagon",
        },
        {
          id: "orphaned_minted_tokens",
          title: "Minted Without an Owner",
          metric: "orphanedTokens",
          model: "nftToken",
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "MINTED" },
              { field: "ownerId", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:account-off-outline",
        },
        {
          id: "missing_metadata",
          title: "Minted Without Metadata",
          metric: "missingMetadata",
          model: "nftToken",
          // No metadataUri means a broken image everywhere and nothing to
          // re-verify against IPFS. This is the metadata-backup backlog.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "MINTED" },
              { field: "metadataUri", value: null },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:file-remove-outline",
        },
        {
          id: "minted_tokens_live",
          title: "Minted (All Time)",
          metric: "mintedLive",
          model: "nftToken",
          aggregation: { field: "status", value: "MINTED" },
          valueMode: "current",
          format: "number",
          icon: "mdi:check-decagram",
        },
        {
          id: "listed_tokens_live",
          title: "Listed Right Now",
          metric: "listedLive",
          model: "nftToken",
          aggregation: { field: "isListed", value: "true" },
          valueMode: "current",
          format: "number",
          icon: "mdi:storefront",
        },
        {
          id: "listed_share_of_minted",
          title: "Listed Share of Minted",
          metric: "listedShare",
          model: "nftToken",
          // Marketplace liquidity in one number. Minted-but-never-listed
          // inventory is dead weight; a falling ratio means sellers are
          // leaving.
          derived: { op: "percent", of: ["listedLive", "mintedLive"] },
          format: "percent",
          icon: "mdi:store-check-outline",
        },
      ],
    },
    {
      type: "chart",
      responsive: {
        mobile: { span: 1 },
        tablet: { span: 2 },
        desktop: { span: 1 },
      },
      items: [
        {
          id: "mintSuccessTrend",
          title: "Mint Success Rate",
          type: "line",
          model: "nftToken",
          metrics: ["mintSuccessRate"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { mintSuccessRate: "Minted / Created %" },
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────
  // Row 2 — The mint funnel, end to end: created, minted, burned, the rate
  // between them, how long the middle step takes, and what fell out of it.
  // Bucketed on createdAt because the engine has one time axis; `mintedAt`
  // would be the honest axis for the MINTED band.
  // ─────────────────────────────────────────────────────────────
  [
    {
      type: "kpi",
      responsive: {
        mobile: { cols: 1, span: 1 },
        tablet: { cols: 2, span: 2 },
        desktop: { cols: 2, span: 2 },
      },
      items: [
        {
          id: "new_tokens",
          title: "Tokens Created",
          metric: "newTokens",
          model: "nftToken",
          aggregation: { op: "count", field: "id" },
          format: "number",
          icon: "mdi:image-plus",
        },
        {
          id: "minted_this_period",
          title: "Minted",
          metric: "MINTED",
          model: "nftToken",
          aggregation: { field: "status", value: "MINTED" },
          format: "number",
          icon: "mdi:hammer",
        },
        {
          id: "burned_this_period",
          title: "Burned",
          metric: "BURNED",
          model: "nftToken",
          aggregation: { field: "status", value: "BURNED" },
          format: "number",
          invert: true,
          icon: "mdi:fire",
        },
        {
          id: "mint_success_rate",
          title: "Mint Success Rate",
          metric: "mintSuccessRate",
          model: "nftToken",
          // Moves before the support queue does: a drop below baseline is gas
          // failures, RPC problems or a broken contract.
          derived: { op: "percent", of: ["MINTED", "newTokens"] },
          format: "percent",
          icon: "mdi:speedometer",
        },
        {
          id: "avg_time_to_mint",
          title: "Avg Time to Mint",
          metric: "avgTimeToMint",
          model: "nftToken",
          // TIMESTAMPDIFF(HOUR, createdAt, mintedAt), averaged. Hours because
          // `format: "duration"` reads its input as hours and promotes to days
          // past 48. Tokens that never minted carry a NULL `mintedAt` and are
          // skipped by AVG, so this is the latency of mints that SUCCEEDED —
          // read it beside the success rate, never instead of it.
          //
          // `current`, AND IT HAS TO BE. `buildAttributes` mirrors an `avg`
          // into `SUM(col)`/`COUNT(col)` companion columns so the period fold
          // can weight by bucket, and that mirror predates `since` — it wraps
          // the RAW column, not the TIMESTAMPDIFF. Folded, this card divides
          // SUM(createdAt) by a row count and prints ~2.03e13, the numeric
          // form of a datetime. The snapshot pass reads the real expression,
          // so the all-time mean is correct. Fix the mirror in
          // `backend/src/utils/chart.ts` and this can go back to a windowed
          // average with a sparkline.
          aggregation: {
            field: "createdAt",
            op: "avg",
            since: { unit: "h", until: "mintedAt" },
          },
          valueMode: "current",
          format: "duration",
          invert: true,
          icon: "mdi:timer-sand",
        },
        {
          id: "aged_drafts",
          title: "Drafts Older Than 30 Days",
          metric: "agedDrafts",
          model: "nftToken",
          // The other end of the funnel: uploaded, never minted, and old
          // enough that the creator is not coming back. A snapshot, because a
          // draft abandoned in March is precisely the row a createdAt window
          // hides.
          aggregation: {
            op: "count",
            field: "id",
            where: [
              { field: "status", value: "DRAFT" },
              { field: "createdAt", op: "<", value: { ago: "30d" } },
            ],
          },
          valueMode: "current",
          format: "number",
          invert: true,
          icon: "mdi:clock-alert-outline",
        },
      ],
    },
    {
      type: "chart",
      responsive: {
        mobile: { span: 1 },
        tablet: { span: 2 },
        desktop: { span: 1 },
      },
      items: [
        {
          id: "tokenLifecycleOverTime",
          title: "Mints vs Burns",
          type: "stackedBar",
          model: "nftToken",
          metrics: ["MINTED", "BURNED"],
          timeframes: ["24h", "7d", "30d", "3m", "6m", "y"],
          labels: { MINTED: "Minted", BURNED: "Burned" },
        },
      ],
    },
  ],
] satisfies AnalyticsConfig;
