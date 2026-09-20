"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexPoolEvent extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexPoolEvent.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            positionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Null for pool-level events (SWAP, SYNC) that belong to no position",
            },
            kind: {
                type: sequelize_1.DataTypes.STRING(24),
                allowNull: false,
                validate: {
                    isIn: [["CREATE", "MINT", "BURN", "COLLECT", "DECREASE_LIQUIDITY", "SWAP", "SYNC"]],
                },
            },
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            txHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: false,
                validate: { is: units_1.TX_HASH_RE },
                set(value) {
                    this.setDataValue("txHash", typeof value === "string" ? value.toLowerCase() : value);
                },
            },
            logIndex: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                comment: "Which log in the receipt. Together with (chainId, txHash) this is the row's IDENTITY, which is what makes a re-run of the sweep non-double-counting by construction",
            },
            blockNumber: {
                type: sequelize_1.DataTypes.BIGINT,
                allowNull: false,
            },
            blockTimestamp: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "From the CHAIN's own block, never from a local clock. Block timestamps are seconds; the chart contract is milliseconds",
            },
            tokenAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: true,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("tokenAddress", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "Denormalised — the report must survive a delist",
            },
            tokenSymbol: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Denormalised — the report must survive a delist",
            },
            tokenDecimals: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: { min: 0, max: 36 },
                comment: "Denormalised. Without it a swept row cannot be re-derived from its raw amount once the token row is gone",
            },
            amount0Raw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "SIGNED — a burn is negative. 79 not 78 for the sign",
            },
            amount1Raw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "SIGNED — a burn is negative",
            },
            grossAmountRaw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "V3: the Collect amount for this token",
            },
            principalReturnedRaw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "V3: the sum of DecreaseLiquidity amounts since the last Collect. Subtracted from gross to leave the bookable fee",
            },
            feeAmountRaw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: {
                    is: units_1.SIGNED_RAW_AMOUNT_RE,
                    notNegative(value) {
                        if (value === null || value === undefined)
                            return;
                        if (String(value).trim().startsWith("-")) {
                            throw new Error("dexPoolEvent.feeAmountRaw cannot be negative — a collect below its principal is an arithmetic error, not a zero fee");
                        }
                    },
                },
                comment: "NULL on every V2 row, permanently: there is no on-chain fact separating fee from principal on a V2 burn",
            },
            amountUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("amountUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY. A NULL means NO PRICE, never zero",
            },
            usdRateSource: {
                type: sequelize_1.DataTypes.STRING(24),
                allowNull: true,
            },
            sweepStatus: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "NONE",
                validate: { isIn: [["NONE", "ACCRUED", "SWEPT", "UNRECOVERABLE"]] },
                comment: 'NONE on every V2 row and on pool-level events. UNRECOVERABLE is expected rather than anomalous on this path: the operator\'s own token is precisely the symbol that is not in exchangeCurrency, and the sweep refuses by name rather than creating a wallet in a currency nothing can spend',
            },
            sweepAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "collectPlatformFee NEVER THROWS and returns null on failure. A null must not mark the group SWEPT — it stays ACCRUED, this increments, and at 5 the row goes UNRECOVERABLE",
            },
            creditedTransactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            adminProfitId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            creditedAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get() {
                    const v = this.getDataValue("creditedAmount");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "What actually reached the wallet, after the 8-dp conversion",
            },
            roundingResidueRaw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "The base units dropped by that conversion. Recorded rather than discarded — the wallet service speaks in 8-dp Numbers and an 18-decimal amount does not fit",
            },
            sweepFailureReason: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
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
            modelName: "dexPoolEvent",
            tableName: "dex_pool_event",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
                {
                    name: "dexPoolEventTxLogKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "chainId" }, { name: "txHash" }, { name: "logIndex" }],
                },
                {
                    name: "dexPoolEventSweepIdx",
                    using: "BTREE",
                    fields: [{ name: "sweepStatus" }, { name: "chainId" }],
                },
                {
                    name: "dexPoolEventPoolKindIdx",
                    using: "BTREE",
                    fields: [{ name: "poolId" }, { name: "kind" }, { name: "blockNumber" }],
                },
            ],
        });
    }
    static associate(models) {
        dexPoolEvent.belongsTo(models.dexPool, {
            as: "pool",
            foreignKey: "poolId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        dexPoolEvent.belongsTo(models.dexPoolPosition, {
            as: "position",
            foreignKey: "positionId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexPoolEvent;
