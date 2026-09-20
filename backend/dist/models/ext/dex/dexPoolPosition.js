"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const units_1 = require("@b/utils/dex/units");
class dexPoolPosition extends sequelize_1.Model {
    static initModel(sequelize) {
        return dexPoolPosition.init({
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
            chainId: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
            },
            ownerAddress: {
                type: sequelize_1.DataTypes.STRING(42),
                allowNull: false,
                validate: { is: units_1.EVM_ADDRESS_RE },
                set(value) {
                    this.setDataValue("ownerAddress", typeof value === "string" ? value.toLowerCase() : value);
                },
                comment: "THE OPERATOR'S OWN ADDRESS. The platform never holds this key and cannot move or recover this position",
            },
            riskAckId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "NOT NULL + RESTRICT makes the acknowledgement gate A SCHEMA FACT rather than a handler convention. There is no code path that can produce a position without one",
            },
            openedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            openTxHash: {
                type: sequelize_1.DataTypes.STRING(66),
                allowNull: false,
                validate: { is: units_1.TX_HASH_RE },
                set(value) {
                    this.setDataValue("openTxHash", typeof value === "string" ? value.toLowerCase() : value);
                },
            },
            seeded0Raw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: false,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "COST BASIS in base units. Signed so a top-up appends rather than overwriting — 79 not 78 for the sign, same discipline as dexFeeAccrual.amountRaw",
            },
            seeded1Raw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: false,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "COST BASIS in base units. Signed",
            },
            seeded0Usd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("seeded0Usd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "STAMPED AT SEED TIME AND NEVER RE-PRICED — the same rule priceDexTokenUsd follows. display/aggregation only, LOSSY. NULL means unpriceable, never 0",
            },
            seeded1Usd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("seeded1Usd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "Stamped at seed time and never re-priced. LOSSY. NULL means unpriceable, never 0",
            },
            usdRateSource: {
                type: sequelize_1.DataTypes.STRING(24),
                allowNull: true,
                comment: "Which price source stamped the cost basis. A position priced only by its OWN pool is a self-referential mark and must never be headlined",
            },
            lpBalanceRaw: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V2 LP token balance",
            },
            nftTokenId: {
                type: sequelize_1.DataTypes.STRING(78),
                allowNull: true,
                validate: { is: units_1.RAW_AMOUNT_RE },
                comment: "V3. A uint256, therefore a STRING — Number() would lose it above 2^53",
            },
            tickLower: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                comment: "V3. v1 is FULL RANGE ONLY: a concentrated range the price leaves becomes 100% one-sided, the pool stops quoting entirely, and the market reads as an outage with no error anywhere",
            },
            tickUpper: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            state: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: false,
                defaultValue: "OPEN",
                validate: { isIn: [["OPEN", "PARTIAL", "CLOSED", "ORPHANED"]] },
                comment: "ORPHANED is a real state: a position whose opening receipt disappeared in a reorg is neither open nor closed, and saying so beats guessing",
            },
            closedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            realized0Raw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
                comment: "Signed: a withdrawal is negative against the seeded basis",
            },
            realized1Raw: {
                type: sequelize_1.DataTypes.STRING(79),
                allowNull: true,
                validate: { is: units_1.SIGNED_RAW_AMOUNT_RE },
            },
            realizedUsd: {
                type: sequelize_1.DataTypes.DECIMAL(20, 8),
                allowNull: true,
                get() {
                    const v = this.getDataValue("realizedUsd");
                    return v === null || v === undefined ? null : Number(v);
                },
                comment: "display/aggregation only — LOSSY, never authoritative",
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
            modelName: "dexPoolPosition",
            tableName: "dex_pool_position",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "PRIMARY", unique: true, using: "BTREE", fields: [{ name: "id" }] },
                {
                    name: "dexPoolPositionOpenTxKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "poolId" }, { name: "openTxHash" }],
                },
                {
                    name: "dexPoolPositionStateIdx",
                    using: "BTREE",
                    fields: [{ name: "state" }, { name: "chainId" }],
                },
                {
                    name: "dexPoolPositionAckIdx",
                    using: "BTREE",
                    fields: [{ name: "riskAckId" }],
                },
            ],
        });
    }
    static associate(models) {
        dexPoolPosition.belongsTo(models.dexPool, {
            as: "pool",
            foreignKey: "poolId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        dexPoolPosition.belongsTo(models.dexPoolRiskAck, {
            as: "riskAck",
            foreignKey: "riskAckId",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        dexPoolPosition.hasMany(models.dexPoolEvent, {
            as: "events",
            foreignKey: "positionId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = dexPoolPosition;
