"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexPair extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexPair.init({
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
            baseTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            quoteTokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                comment: "Display base symbol, mirroring fxInstrument.currency",
            },
            pair: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                comment: "Display quote symbol",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(96),
                allowNull: false,
                comment: 'Canonical "chainId:CURRENCY/PAIR", e.g. 8453:WETH/USDC. The chain id is embedded on purpose: WETH/USDC exists on six chains, and a bare symbol makes the chart and the websocket subscribe to different markets',
            },
            poolAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("poolAddress", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "THE INDEXER'S BINDING HINT — what GeckoTerminal calls a pool. NOT the same fact as `poolId`, which is a row we round-tripped through a trusted factory. When a pool is bound this is written FROM dexPool.poolAddress by the same handler and is not independently editable; two fields is the honest shape",
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The VERIFIED pool this pair may route through. Effectively NOT NULL whenever the effective venue policy can reach a direct venue — enforced in the validate hook below, because auto-sync's granular alter path has no cross-column CHECK",
            },
            venuePolicy: {
                type: sequelize_1.DataTypes.STRING(24),
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
                comment: 'DIRECT_ONLY is accepted HERE and rejected at the global settings layer. Per pair it is a legitimate statement ("this is my token, my pool, do not bother asking 0x"); globally it would route every pair including the majors through whatever pool is bound, at a fill no user could see the cause of',
            },
            restrictedCountries: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                get() {
                    const raw = this.getDataValue("restrictedCountries");
                    if (raw === null || raw === undefined)
                        return [];
                    if (Array.isArray(raw))
                        return raw;
                    try {
                        const parsed = JSON.parse(raw);
                        return Array.isArray(parsed) ? parsed : [];
                    }
                    catch (_a) {
                        return [];
                    }
                },
                set(value) {
                    const list = Array.isArray(value)
                        ? value
                            .map((c) => String(c !== null && c !== void 0 ? c : "").trim().toUpperCase())
                            .filter((c) => /^[A-Z]{2}$/.test(c))
                        : [];
                    this.setDataValue("restrictedCountries", JSON.stringify(list));
                },
                comment: "ISO-3166-1 alpha-2 codes this market may not be quoted in. Evaluated at the quote chokepoint, NOT in the sync geo middleware — see the getter note",
            },
            marketDataSource: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "INDEXER",
                validate: { isIn: [["INDEXER", "ONCHAIN", "NONE"]] },
                comment: "ONCHAIN reads the pool's own Swap logs. A pool created ten minutes ago is in no indexer, and that is exactly the moment an operator most wants a chart",
            },
            indexerId: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
                comment: "Provider-native pool id, when the indexer does not key on the address",
            },
            status: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "INACTIVE",
                validate: { isIn: [["INACTIVE", "ACTIVE", "HIDDEN", "DELISTED"]] },
                comment: "INACTIVE (imported, not enabled) -> ACTIVE -> DELISTED; HIDDEN keeps the market quotable but off the rail",
            },
            isHot: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isTrending: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            pricePrecision: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 8,
                comment: "Display only — never used to round an amount that is sent to a router",
            },
            amountPrecision: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 8,
                comment: "Display only — never used to round an amount that is sent to a router",
            },
            defaultSlippageBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "Per-pair override of the dexDefaultSlippageBps setting",
            },
            lastPrice: {
                type: sequelize_1.DataTypes.DECIMAL(38, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("lastPrice");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            change24h: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("change24h");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            volume24hUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("volume24hUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            liquidityUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("liquidityUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("metadata", typeof value === "string" ? value : JSON.stringify(value));
                },
                get() {
                    const v = this.getDataValue("metadata");
                    return typeof v === "string" ? JSON.parse(v) : (v !== null && v !== void 0 ? v : null);
                },
            },
        }, {
            sequelize,
            modelName: "dexPair",
            tableName: "dex_pair",
            timestamps: true,
            paranoid: false,
            validate: {
                directPolicyNeedsPool() {
                    var _a;
                    const policy = String((_a = this.venuePolicy) !== null && _a !== void 0 ? _a : "INHERIT");
                    if (policy !== "DIRECT_ONLY")
                        return;
                    if (!this.poolId) {
                        throw new Error("dexPair.venuePolicy DIRECT_ONLY requires a bound poolId — otherwise every quote on this pair refuses with NO_ROUTE");
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
                    name: "dexPairSymbolKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "symbol" }],
                },
                {
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
        });
    }
    static associate(models) {
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
exports.default = dexPair;
