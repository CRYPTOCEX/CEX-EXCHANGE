"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexPool extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexPool.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            venueName: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                comment: "AmmDeployment.key — 'uniswap-v2' | 'uniswap-v3' | 'pancake-v2'",
            },
            standard: {
                type: sequelize_1.DataTypes.STRING(4),
                allowNull: false,
                validate: { isIn: [["V2", "V3"]] },
                comment: "Decides everything downstream: the maths, the calldata shape, whether fees are bookable at all",
            },
            factory: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: false,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("factory", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "DENORMALISED at create. The row must survive a registry edit — otherwise changing a deployment retroactively changes what an existing pool claims to be",
            },
            router: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: false,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("router", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "Denormalised at create. The swap `to` AND the ERC20 spender",
            },
            routerAbi: {
                type: sequelize_1.DataTypes.STRING(24),
                allowNull: false,
                validate: { isIn: [["V2_ROUTER02", "V3_SWAP_ROUTER", "V3_SWAP_ROUTER_02"]] },
                comment: "The deadline lives in a DIFFERENT PLACE in each shape. Never inferred from the address: SwapRouter02.exactInputSingle called directly encodes and executes with NO DEADLINE AT ALL",
            },
            quoter: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("quoter", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "V3 only: QuoterV2",
            },
            positionManager: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("positionManager", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "V3 only: NonfungiblePositionManager",
            },
            poolAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("poolAddress", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "PRODUCED BY THE FACTORY ROUND-TRIP, never taken from input. NULL only while DRAFT. A CREATE2 prediction is advisory and may not be written here",
            },
            predictedAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("predictedAddress", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "What CREATE2 said. Kept so a disagreement with poolAddress stays forensically visible after the fact",
            },
            initCodeHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                comment: "V2, INFORMATIONAL ONLY. Never used to derive poolAddress — a wrong value would otherwise predict a stranger's contract",
            },
            token0: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: false,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("token0", typeof value === "string" ? value.toLowerCase() : value);
                },
            },
            token1: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: false,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("token1", typeof value === "string" ? value.toLowerCase() : value);
                },
            },
            token0Id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Nullable: a pool may be verified before either token is allowlisted. The ADDRESSES are the authority",
            },
            token1Id: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            feeTier: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: { min: 0, max: 999999 },
                comment: "uint24, HUNDREDTHS OF A BIP. 3000 = 0.30%. The V3 calldata takes it verbatim. NEVER bps",
            },
            lpFeeShareBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: { min: 0, max: 10000 },
                comment: "What the LP ACTUALLY RECEIVES after the pool's protocol fee — 25 on canonical v2 post-UNIfication, not 30. Never defaulted to feeTier: a break-even projection built on the tier number overstates income by 17-20%",
            },
            tickSpacing: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "V3; needed for the full-range bounds",
            },
            state: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: [["DRAFT", "CREATED", "SEEDING", "ACTIVE", "WITHDRAWING", "RETIRED", "FAILED"]],
                },
                comment: "The LIFECYCLE axis. Orthogonal to verifiedAt — see the file header",
            },
            verifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "The TRUST axis. Drives the staleness refusal, mirroring SCREENING_STALE. Orthogonal to state",
            },
            verifiedAtBlock: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
            },
            rejectedReason: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "The PoolRejectionReason slug from pool-verify.ts",
            },
            createTxHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                validate: { is: units_1.TX_HASH_RE },
                set(value) {
                    this.setDataValue("createTxHash", typeof value === "string" ? value.toLowerCase() : value);
                },
            },
            createBlockNumber: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
                comment: "The log-sweep backfill floor. Known exactly for a receipt-verified pool",
            },
            reserve0: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V2. CACHE — NEVER QUOTED FROM. A quote reads the chain at a pinned block",
            },
            reserve1: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V2. CACHE — NEVER QUOTED FROM",
            },
            totalSupply: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V2 LP token supply. CACHE",
            },
            sqrtPriceX96: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V3. CACHE. Not an amount but a uint160, and the same STRING rule applies for the same reason: MySQL DECIMAL(65,0) cannot hold a uint256 and mysql2 returns every DECIMAL as a string, so `a + b` concatenates",
            },
            poolLiquidity: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V3. CACHE",
            },
            reservesBlock: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
                comment: "The block the cache was read at",
            },
            reservesUpdatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            liquidityUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("liquidityUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative. NULL means UNPRICEABLE and never 0: the depth gate REFUSES on null rather than passing",
            },
            seededByPlatformOperator: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Set from the on-chain Mint log's RECIPIENT, never from a form field. That provenance is the only reason this flag may appear in a user-facing legal disclosure",
            },
            seedTxHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                validate: { is: units_1.TX_HASH_RE },
                set(value) {
                    this.setDataValue("seedTxHash", typeof value === "string" ? value.toLowerCase() : value);
                },
            },
            lastSwapBlock: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
                comment: "The event-indexer cursor",
            },
            indexedToBlock: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: true,
                comment: "Resumable sweep cursor. Never advanced past head - requiredConfirmations",
            },
            indexedToBlockHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: true,
                comment: "Compared before extending. A mismatch means a reorg deeper than the confirmation depth, which rewinds and RE-DERIVES the affected candles rather than patching them",
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                get() {
                    const raw = this.getDataValue("metadata");
                    if (raw === null || raw === undefined)
                        return null;
                    if (typeof raw === "object")
                        return raw;
                    try {
                        return JSON.parse(raw);
                    }
                    catch (_a) {
                        return null;
                    }
                },
                set(value) {
                    this.setDataValue("metadata", value === null || value === undefined
                        ? null
                        : typeof value === "string"
                            ? value
                            : JSON.stringify(value));
                },
                comment: "JSON-in-TEXT: prod MySQL pre-parses a real JSON column",
            },
        }, {
            sequelize,
            modelName: "dexPool",
            tableName: "dex_pool",
            timestamps: true,
            paranoid: true,
            validate: {
                canonicalTokenOrder() {
                    const t0 = this.token0;
                    const t1 = this.token1;
                    if (!t0 || !t1)
                        return;
                    if (t0 >= t1) {
                        throw new Error("dexPool.token0 must sort strictly before token1 (lowercase compare)");
                    }
                },
                addressRequiredOnceCreated() {
                    if (this.state === "DRAFT")
                        return;
                    if (!this.poolAddress) {
                        throw new Error("dexPool.poolAddress is required once the row leaves DRAFT — it comes from the factory's own event");
                    }
                },
                v3NeedsQuoter() {
                    if (this.standard !== "V3")
                        return;
                    if (!this.quoter) {
                        throw new Error("a V3 dexPool requires a quoter (QuoterV2) address");
                    }
                },
            },
            indexes: [
                { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
                {
                    name: "dexPoolChainAddressKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "poolAddress" }],
                },
                {
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
                    name: "dexPoolCursorIdx",
                    using: "BTREE",
                    fields: [{ name: "state" }, { name: "lastSwapBlock" }],
                },
            ],
        });
    }
    static associate(models) {
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
exports.default = dexPool;
