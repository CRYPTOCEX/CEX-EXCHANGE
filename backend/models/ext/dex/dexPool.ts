import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  EVM_ADDRESS_RE,
  RAW_AMOUNT_RE,
  TX_HASH_RE,
} from "@b/utils/dex/units";

/**
 * An AMM pool this platform is willing to quote from.
 *
 * `paranoid: true` — SOFT-ARCHIVE ONLY. A pool is an on-chain fact that outlives
 * any decision we make about it; `RETIRED` is the operator's off switch and the
 * row stays as the record of what was quoted and why. Hard-deleting one would
 * orphan the positions and events that point at it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [DECISION] `state` AND `verifiedAt` ARE TWO ORTHOGONAL AXES ON ONE ROW, NOT
 * ONE MERGED STATUS.
 *
 * LIFECYCLE answers *"how far through create → seed → retire is this pool"*.
 * VERIFICATION answers *"is our proof that a trusted factory produced this pool
 * still fresh"*. Quoting requires BOTH `state = "ACTIVE"` AND a verification
 * newer than `dexPoolVerifyMaxAgeHours`.
 *
 * Merging them means a stale verification either silently RETIRES a live pool —
 * an outage with no cause anyone can find — or is silently IGNORED, which is a
 * pool quoting on a proof nobody has rechecked since a registry edit.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE CANONICAL SORT IS ENFORCED IN A HOOK, NOT DOCUMENTED. See the `validate`
 * block: a reversed pair does not throw at quote time, it silently INVERTS every
 * price this venue quotes and every candle it builds.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 */
export default class dexPool
  extends Model<dexPoolAttributes, dexPoolCreationAttributes>
  implements dexPoolAttributes
{
  id!: string;
  chainId!: number;
  venueName!: string;
  standard!: string;
  factory!: string;
  router!: string;
  routerAbi!: string;
  quoter?: string | null;
  positionManager?: string | null;
  poolAddress?: string | null;
  predictedAddress?: string | null;
  initCodeHash?: string | null;
  token0!: string;
  token1!: string;
  token0Id?: string | null;
  token1Id?: string | null;
  feeTier!: number;
  lpFeeShareBps!: number;
  tickSpacing?: number | null;
  state!: string;
  verifiedAt?: Date | null;
  verifiedAtBlock?: number | null;
  rejectedReason?: string | null;
  createTxHash?: string | null;
  createBlockNumber?: number | null;
  reserve0?: string | null;
  reserve1?: string | null;
  totalSupply?: string | null;
  sqrtPriceX96?: string | null;
  poolLiquidity?: string | null;
  reservesBlock?: number | null;
  reservesUpdatedAt?: Date | null;
  liquidityUsd?: number | null;
  seededByPlatformOperator!: boolean;
  seedTxHash?: string | null;
  lastSwapBlock?: number | null;
  indexedToBlock?: number | null;
  indexedToBlockHash?: string | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexPool {
    return dexPool.init(
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
        venueName: {
          type: DataTypes.STRING(32),
          allowNull: false,
          comment: "AmmDeployment.key — 'uniswap-v2' | 'uniswap-v3' | 'pancake-v2'",
        },
        standard: {
          type: DataTypes.STRING(4),
          allowNull: false,
          validate: { isIn: [["V2", "V3"]] },
          comment:
            "Decides everything downstream: the maths, the calldata shape, whether fees are bookable at all",
        },
        factory: {
          type: DataTypes.STRING(42),
          allowNull: false,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "factory",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment:
            "DENORMALISED at create. The row must survive a registry edit — otherwise changing a deployment retroactively changes what an existing pool claims to be",
        },
        router: {
          type: DataTypes.STRING(42),
          allowNull: false,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "router",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment: "Denormalised at create. The swap `to` AND the ERC20 spender",
        },
        routerAbi: {
          type: DataTypes.STRING(24),
          allowNull: false,
          validate: { isIn: [["V2_ROUTER02", "V3_SWAP_ROUTER", "V3_SWAP_ROUTER_02"]] },
          comment:
            "The deadline lives in a DIFFERENT PLACE in each shape. Never inferred from the address: SwapRouter02.exactInputSingle called directly encodes and executes with NO DEADLINE AT ALL",
        },
        quoter: {
          type: DataTypes.STRING(42),
          allowNull: true,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "quoter",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment: "V3 only: QuoterV2",
        },
        positionManager: {
          type: DataTypes.STRING(42),
          allowNull: true,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "positionManager",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment: "V3 only: NonfungiblePositionManager",
        },
        poolAddress: {
          type: DataTypes.STRING(42),
          /*
            NULL WHILE DRAFT, AND THAT IS THE POINT.

            The address is PRODUCED BY THE FACTORY ROUND-TRIP. A pool the operator
            has planned but not yet created has no address that exists, and the
            only alternatives are both worse: writing the CREATE2 PREDICTION here
            makes an advisory guess indistinguishable from a verified fact, and
            writing a zero-address placeholder collides on dexPoolChainAddressKey
            the moment a second draft exists.

            NULL is safe under that unique index precisely because MySQL treats
            NULLs as DISTINCT — the same property that forced dexPoolEvent to
            carry its own (chainId, txHash, logIndex) key. Two drafts coexist;
            dexPoolChainPathKey is what stops two drafts for the SAME pool.

            `addressRequiredOnceCreated` below refuses to let a row leave DRAFT
            without one.
          */
          allowNull: true,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "poolAddress",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment:
            "PRODUCED BY THE FACTORY ROUND-TRIP, never taken from input. NULL only while DRAFT. A CREATE2 prediction is advisory and may not be written here",
        },
        predictedAddress: {
          type: DataTypes.STRING(42),
          allowNull: true,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "predictedAddress",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
          comment:
            "What CREATE2 said. Kept so a disagreement with poolAddress stays forensically visible after the fact",
        },
        initCodeHash: {
          type: DataTypes.STRING(66),
          allowNull: true,
          comment:
            "V2, INFORMATIONAL ONLY. Never used to derive poolAddress — a wrong value would otherwise predict a stranger's contract",
        },
        token0: {
          type: DataTypes.STRING(42),
          allowNull: false,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "token0",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
        },
        token1: {
          type: DataTypes.STRING(42),
          allowNull: false,
          validate: { is: EVM_ADDRESS_RE },
          set(value: any) {
            this.setDataValue(
              "token1",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
        },
        token0Id: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "Nullable: a pool may be verified before either token is allowlisted. The ADDRESSES are the authority",
        },
        token1Id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        feeTier: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 0, max: 999_999 },
          comment:
            "uint24, HUNDREDTHS OF A BIP. 3000 = 0.30%. The V3 calldata takes it verbatim. NEVER bps",
        },
        lpFeeShareBps: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 0, max: 10_000 },
          comment:
            "What the LP ACTUALLY RECEIVES after the pool's protocol fee — 25 on canonical v2 post-UNIfication, not 30. Never defaulted to feeTier: a break-even projection built on the tier number overstates income by 17-20%",
        },
        tickSpacing: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "V3; needed for the full-range bounds",
        },
        state: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: [["DRAFT", "CREATED", "SEEDING", "ACTIVE", "WITHDRAWING", "RETIRED", "FAILED"]],
          },
          comment: "The LIFECYCLE axis. Orthogonal to verifiedAt — see the file header",
        },
        verifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment:
            "The TRUST axis. Drives the staleness refusal, mirroring SCREENING_STALE. Orthogonal to state",
        },
        verifiedAtBlock: {
          type: DataTypes.BIGINT,
          allowNull: true,
        },
        rejectedReason: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "The PoolRejectionReason slug from pool-verify.ts",
        },
        createTxHash: {
          type: DataTypes.STRING(66),
          allowNull: true,
          validate: { is: TX_HASH_RE },
          set(value: any) {
            this.setDataValue(
              "createTxHash",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
        },
        createBlockNumber: {
          type: DataTypes.BIGINT,
          allowNull: true,
          comment: "The log-sweep backfill floor. Known exactly for a receipt-verified pool",
        },
        reserve0: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "V2. CACHE — NEVER QUOTED FROM. A quote reads the chain at a pinned block",
        },
        reserve1: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "V2. CACHE — NEVER QUOTED FROM",
        },
        totalSupply: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "V2 LP token supply. CACHE",
        },
        sqrtPriceX96: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment:
            "V3. CACHE. Not an amount but a uint160, and the same STRING rule applies for the same reason: MySQL DECIMAL(65,0) cannot hold a uint256 and mysql2 returns every DECIMAL as a string, so `a + b` concatenates",
        },
        poolLiquidity: {
          type: DataTypes.STRING(78),
          allowNull: true,
          validate: { is: RAW_AMOUNT_RE },
          comment: "V3. CACHE",
        },
        reservesBlock: {
          type: DataTypes.BIGINT,
          allowNull: true,
          comment: "The block the cache was read at",
        },
        reservesUpdatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        liquidityUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("liquidityUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment:
            "display/aggregation only — LOSSY, never authoritative. NULL means UNPRICEABLE and never 0: the depth gate REFUSES on null rather than passing",
        },
        seededByPlatformOperator: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment:
            "Set from the on-chain Mint log's RECIPIENT, never from a form field. That provenance is the only reason this flag may appear in a user-facing legal disclosure",
        },
        seedTxHash: {
          type: DataTypes.STRING(66),
          allowNull: true,
          validate: { is: TX_HASH_RE },
          set(value: any) {
            this.setDataValue(
              "seedTxHash",
              typeof value === "string" ? value.toLowerCase() : value
            );
          },
        },
        lastSwapBlock: {
          type: DataTypes.BIGINT,
          allowNull: true,
          comment: "The event-indexer cursor",
        },
        indexedToBlock: {
          type: DataTypes.BIGINT,
          allowNull: true,
          comment: "Resumable sweep cursor. Never advanced past head - requiredConfirmations",
        },
        indexedToBlockHash: {
          type: DataTypes.STRING(66),
          allowNull: true,
          comment:
            "Compared before extending. A mismatch means a reorg deeper than the confirmation depth, which rewinds and RE-DERIVES the affected candles rather than patching them",
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          get() {
            const raw = this.getDataValue("metadata");
            if (raw === null || raw === undefined) return null;
            if (typeof raw === "object") return raw;
            try {
              return JSON.parse(raw as any);
            } catch {
              return null;
            }
          },
          set(value: any) {
            this.setDataValue(
              "metadata",
              value === null || value === undefined
                ? null
                : typeof value === "string"
                  ? value
                  : (JSON.stringify(value) as any)
            );
          },
          comment: "JSON-in-TEXT: prod MySQL pre-parses a real JSON column",
        },
      },
      {
        sequelize,
        modelName: "dexPool",
        tableName: "dex_pool",
        timestamps: true,
        paranoid: true,
        validate: {
          /**
           * THE CANONICAL SORT, ENFORCED RATHER THAN DOCUMENTED.
           *
           * token0/token1 are the canonical Uniswap ordering: token0 is the
           * numerically smaller 160-bit address. Because the column `set()`
           * lowercases and both values are exactly "0x" + 40 lowercase hex, the
           * 160-bit unsigned compare is EXACTLY a JavaScript string compare —
           * but ONLY on the lowercase form.
           *
           * THE TRAP: comparing EIP-55 checksummed (mixed-case) addresses with
           * `<` gives the WRONG answer, because 'A' (0x41) < 'a' (0x61). A
           * reversed pair silently INVERTS every price this venue quotes and
           * every candle it builds. It does not throw; it produces a chart that
           * is upside down and a quote that is the reciprocal of the truth.
           */
          canonicalTokenOrder() {
            const t0 = (this as any).token0;
            const t1 = (this as any).token1;
            if (!t0 || !t1) return;
            if (t0 >= t1) {
              throw new Error(
                "dexPool.token0 must sort strictly before token1 (lowercase compare)"
              );
            }
          },
          /**
           * A V3 row without a quoter cannot be quoted from at all, and the
           * failure would surface as a null-dereference inside the adapter
           * rather than as a refusal an operator can read.
           */
          /**
           * A row may only be DRAFT without an address. Every other state means
           * a factory has told us the address, and a CREATED row with none would
           * be a pool the quote path can look up by id and then dereference
           * `null` on — an outage with no cause an operator can read.
           */
          addressRequiredOnceCreated() {
            if ((this as any).state === "DRAFT") return;
            if (!(this as any).poolAddress) {
              throw new Error(
                "dexPool.poolAddress is required once the row leaves DRAFT — it comes from the factory's own event"
              );
            }
          },
          v3NeedsQuoter() {
            if ((this as any).standard !== "V3") return;
            if (!(this as any).quoter) {
              throw new Error("a V3 dexPool requires a quoter (QuoterV2) address");
            }
          },
        },
        indexes: [
          { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
          {
            /*
              One pool CONTRACT on one chain is one row. Without it, "which
              factory verified this pool" answers differently depending on query
              order — security-relevant in exactly the way
              dexTokenChainAddressKey is.
            */
            name: "dexPoolChainAddressKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "poolAddress" }],
          },
          {
            /*
              The FACTORY's own key. Stops two rows claiming to be the same pool
              at different addresses. A V2 factory's constant fee degenerates the
              tuple correctly, so this works for both standards.
            */
            name: "dexPoolChainPathKey",
            unique: true,
            using: "BTREE",
            fields: [
              { name: "chainId" },
              { name: "factory" },
              { name: "token0" },
              { name: "token1" },
              { name: "feeTier" },
            ],
          },
          {
            // The quote-path lookup.
            name: "dexPoolStateIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "state" }],
          },
          {
            name: "dexPoolTokensIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "token0" }, { name: "token1" }],
          },
          {
            /*
              The indexer sweep cursor — same shape and same reason as
              dexSwapPollerIdx (status, lastCheckedAt): without it the sweep
              table-scans a table that only grows.
            */
            name: "dexPoolCursorIdx",
            using: "BTREE",
            fields: [{ name: "state" }, { name: "lastSwapBlock" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    /*
      SET NULL, not RESTRICT: a pool may be verified before either token is
      allowlisted, and delisting a token must not be blocked by a pool row. The
      ADDRESSES on this row are the authority; these FKs are a convenience join.
    */
    dexPool.belongsTo(models.dexToken, {
      as: "baseToken",
      foreignKey: "token0Id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    dexPool.belongsTo(models.dexToken, {
      as: "quoteToken",
      foreignKey: "token1Id",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    dexPool.hasMany(models.dexPoolPosition, {
      as: "positions",
      foreignKey: "poolId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    dexPool.hasMany(models.dexPoolEvent, {
      as: "events",
      foreignKey: "poolId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
