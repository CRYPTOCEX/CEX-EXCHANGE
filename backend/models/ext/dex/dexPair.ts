import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { EVM_ADDRESS_RE } from "@b/utils/dex/units";

/**
 * The curated tradable list that drives the market rail, the chart and the
 * market websocket.
 *
 * Every DECIMAL column here is DISPLAY/AGGREGATION ONLY and carries a get()
 * returning Number(). Two reasons for the getter: mysql2 hands back every
 * DECIMAL as a STRING, so `row.change24h > 0` compares a string; and defusing
 * that at the model boundary means no call site has to remember. The columns
 * are DECIMAL rather than STRING precisely so admin SUM()/ORDER BY happen in
 * SQL — they are never authoritative and never used to reconstruct a transfer.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 */
export default class dexPair
  extends Model<dexPairAttributes, dexPairCreationAttributes>
  implements dexPairAttributes
{
  id!: string;
  chainId!: number;
  baseTokenId!: string;
  quoteTokenId!: string;
  currency!: string;
  pair!: string;
  symbol!: string;
  poolAddress?: string | null;
  poolId?: string | null;
  venuePolicy!: string;
  restrictedCountries?: string | string[] | null;
  marketDataSource!: string;
  indexerId?: string | null;
  status!: string;
  isHot!: boolean;
  isTrending!: boolean;
  pricePrecision!: number;
  amountPrecision!: number;
  defaultSlippageBps?: number | null;
  lastPrice?: number | null;
  change24h?: number | null;
  volume24hUsd?: number | null;
  liquidityUsd?: number | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexPair {
    return dexPair.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        baseTokenId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        quoteTokenId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        currency: {
          type: DataTypes.STRING(32),
          allowNull: false,
          comment: "Display base symbol, mirroring fxInstrument.currency",
        },
        pair: {
          type: DataTypes.STRING(32),
          allowNull: false,
          comment: "Display quote symbol",
        },
        symbol: {
          type: DataTypes.STRING(96),
          allowNull: false,
          comment:
            'Canonical "chainId:CURRENCY/PAIR", e.g. 8453:WETH/USDC. The chain id is embedded on purpose: WETH/USDC exists on six chains, and a bare symbol makes the chart and the websocket subscribe to different markets',
        },
        poolAddress: {
          type: DataTypes.STRING(42),
          allowNull: true,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "poolAddress",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment:
            "THE INDEXER'S BINDING HINT — what GeckoTerminal calls a pool. NOT the same fact as `poolId`, which is a row we round-tripped through a trusted factory. When a pool is bound this is written FROM dexPool.poolAddress by the same handler and is not independently editable; two fields is the honest shape",
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "The VERIFIED pool this pair may route through. Effectively NOT NULL whenever the effective venue policy can reach a direct venue — enforced in the validate hook below, because auto-sync's granular alter path has no cross-column CHECK",
        },
        venuePolicy: {
          type: DataTypes.STRING(24),
          allowNull: false,
          defaultValue: "INHERIT",
          validate: {
            isIn: [
              [
                "INHERIT",
                "AGGREGATOR_ONLY",
                "AGGREGATOR_PREFERRED",
                "BEST_EXECUTION",
                "DIRECT_ONLY_WHEN_UNQUOTED",
                "DIRECT_ONLY",
              ],
            ],
          },
          comment:
            'DIRECT_ONLY is accepted HERE and rejected at the global settings layer. Per pair it is a legitimate statement ("this is my token, my pool, do not bother asking 0x"); globally it would route every pair including the majors through whatever pool is bound, at a fill no user could see the cause of',
        },
        restrictedCountries: {
          /*
            PER-MARKET GEO, AND IT IS DELIBERATELY NOT IN THE GEO MIDDLEWARE.

            `geoRestrictionGate` is a SYNCHRONOUS uWS middleware: an `await`
            inside it loses the response object, and its own catch would turn
            the resulting throw into the operator's failure policy — a
            platform-wide allow or deny caused by a DEX lookup. Its rule model
            is also `country -> action` with no market dimension, and widening
            that would push a DEX concept into a compliance primitive eight
            other surfaces depend on.

            So this is evaluated at the QUOTE CHOKEPOINT instead, in step 6b,
            with the country resolved through the SAME `resolveNetworkLocation`
            the gate uses — one resolver, so the two can never disagree about
            where a request came from.

            JSON-in-TEXT: production MySQL pre-parses a real JSON column, so the
            getter has to survive receiving an already-parsed value.
          */
          type: DataTypes.TEXT,
          allowNull: true,
          get() {
            const raw = this.getDataValue("restrictedCountries");
            if (raw === null || raw === undefined) return [];
            if (Array.isArray(raw)) return raw;
            try {
              const parsed = JSON.parse(raw as any);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              /*
                An unparseable value reads as NO RESTRICTION, not as a blanket
                block. A malformed blob is an operator typo, and turning one
                into a silent outage on a market that was working is the worse
                of the two failures — the console shows the list, so a value
                that vanished is visible there.
              */
              return [];
            }
          },
          set(value: any) {
            const list = Array.isArray(value)
              ? value
                  .map((c) => String(c ?? "").trim().toUpperCase())
                  .filter((c) => /^[A-Z]{2}$/.test(c))
              : [];
            this.setDataValue("restrictedCountries", JSON.stringify(list) as any);
          },
          comment:
            "ISO-3166-1 alpha-2 codes this market may not be quoted in. Evaluated at the quote chokepoint, NOT in the sync geo middleware — see the getter note",
        },
        marketDataSource: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "INDEXER",
          validate: { isIn: [["INDEXER", "ONCHAIN", "NONE"]] },
          comment:
            "ONCHAIN reads the pool's own Swap logs. A pool created ten minutes ago is in no indexer, and that is exactly the moment an operator most wants a chart",
        },
        indexerId: {
          type: DataTypes.STRING(128),
          allowNull: true,
          comment: "Provider-native pool id, when the indexer does not key on the address",
        },
        status: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "INACTIVE",
          validate: { isIn: [["INACTIVE", "ACTIVE", "HIDDEN", "DELISTED"]] },
          comment:
            "INACTIVE (imported, not enabled) -> ACTIVE -> DELISTED; HIDDEN keeps the market quotable but off the rail",
        },
        isHot: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isTrending: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        pricePrecision: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 8,
          comment: "Display only — never used to round an amount that is sent to a router",
        },
        amountPrecision: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 8,
          comment: "Display only — never used to round an amount that is sent to a router",
        },
        defaultSlippageBps: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Per-pair override of the dexDefaultSlippageBps setting",
        },
        lastPrice: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("lastPrice");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        change24h: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("change24h");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        volume24hUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("volume24hUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        liquidityUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("liquidityUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "metadata",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("metadata");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
        },
      },
      {
        sequelize,
        modelName: "dexPair",
        tableName: "dex_pair",
        timestamps: true,
        paranoid: false,
        validate: {
          /**
           * A pair whose policy can reach a direct venue MUST have a pool bound.
           *
           * Enforced here rather than as a CHECK constraint because auto-sync's
           * granular alter path has no cross-column CHECK, and there is no
           * migration system to add one. Without it, a pair set to `DIRECT_ONLY`
           * with a null `poolId` refuses every quote with NO_ROUTE — which reads
           * as "this market is broken" rather than "somebody set a policy and
           * forgot the second half".
           *
           * `INHERIT` is deliberately NOT checked: whether it can reach a direct
           * venue depends on a GLOBAL setting this hook cannot see, and refusing
           * to save a pair because of a setting elsewhere would be worse than
           * the refusal it prevents.
           */
          directPolicyNeedsPool() {
            const policy = String((this as any).venuePolicy ?? "INHERIT");
            if (policy !== "DIRECT_ONLY") return;
            if (!(this as any).poolId) {
              throw new Error(
                "dexPair.venuePolicy DIRECT_ONLY requires a bound poolId — otherwise every quote on this pair refuses with NO_ROUTE"
              );
            }
          },
        },
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // The symbol is what the websocket payload and the ?symbol= chart
            // param carry, so it has to resolve to exactly one row or the
            // chart and the ticker disagree about which market is on screen.
            name: "dexPairSymbolKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "symbol" }],
          },
          {
            // Deliberately permits the inverted pair as a separate row:
            // USDC/WETH and WETH/USDC are different display markets with
            // different precisions and different charts, so they are two rows,
            // not a duplicate.
            name: "dexPairChainBaseQuoteKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "baseTokenId" }, { name: "quoteTokenId" }],
          },
          {
            name: "dexPairStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "dexPairChainStatusIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "status" }],
          },
          {
            name: "dexPairHotIdx",
            using: "BTREE",
            fields: [{ name: "isHot" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // RESTRICT on both legs: hard-deleting a token out from under a live
    // market would leave the rail rendering a pair with no asset. dexToken is
    // paranoid, so the operator-facing "delete" is a soft delete and never
    // reaches this constraint.
    dexPair.belongsTo(models.dexToken, {
      as: "baseToken",
      foreignKey: "baseTokenId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    dexPair.belongsTo(models.dexToken, {
      as: "quoteToken",
      foreignKey: "quoteTokenId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
