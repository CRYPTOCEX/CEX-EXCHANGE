"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class poolBackingObligation extends sequelize_1.Model {
    static initModel(sequelize) {
        return poolBackingObligation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Currency the amount is denominated in",
            },
            side: {
                type: sequelize_1.DataTypes.ENUM("both", "exchange", "ecosystem"),
                allowNull: false,
                defaultValue: "both",
                comment: "Which pool the row describes: both (a same-currency transfer), exchange only, or ecosystem only",
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: "Ecosystem chain the coins sit on, when the ecosystem side is involved; null when the transfer's chain map could not attribute it",
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                comment: "Signed. Positive: the exchange pool is short by this much. Negative: the exchange holds this much more than it owes",
            },
            source: {
                type: sequelize_1.DataTypes.ENUM("transfer", "conversion", "fiat_transfer", "admin", "minted", "exchange_fee"),
                allowNull: false,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("OPEN", "CLAIMED", "SETTLED", "WAIVED", "CANCELLED"),
                allowNull: false,
                defaultValue: "OPEN",
            },
            nettable: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether the settlement engine may net this row against others of its currency and settle it. Only transfer legs are",
            },
            sourceRef: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "The transaction row that created it: the INCOMING leg of a transfer, the adjustment row of an admin credit. Deliberately not a foreign key — the row must survive a deleted transaction",
            },
            legs: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Both transaction ids of a transfer and the per-chain attribution the ledger recorded",
                get() {
                    return parseJsonColumn(this.getDataValue("legs"));
                },
            },
            evidence: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "What proved the row unbacked or backed: exchange deposit id and status, the fetch time",
                get() {
                    return parseJsonColumn(this.getDataValue("evidence"));
                },
            },
            settlementId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The poolBackingSettlement that claimed or settled this row",
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "The admin who caused an admin row; null for customer-driven rows",
            },
            waivedBy: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            waiveReason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            waivedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            settledAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        }, {
            sequelize,
            modelName: "poolBackingObligation",
            tableName: "pool_backing_obligation",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "idx_pool_backing_obligation_currency_status",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "status" }],
                },
                {
                    name: "idx_pool_backing_obligation_currency_chain_status",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "chain" }, { name: "status" }],
                },
                {
                    name: "uq_pool_backing_obligation_sourceRef_side",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "sourceRef" }, { name: "side" }],
                },
                {
                    name: "idx_pool_backing_obligation_settlementId",
                    using: "BTREE",
                    fields: [{ name: "settlementId" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = poolBackingObligation;
function parseJsonColumn(value) {
    if (value == null)
        return null;
    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        }
        catch (_a) {
            return null;
        }
    }
    return value;
}
