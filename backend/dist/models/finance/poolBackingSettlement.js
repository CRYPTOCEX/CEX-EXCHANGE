"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class poolBackingSettlement extends sequelize_1.Model {
    static initModel(sequelize) {
        return poolBackingSettlement.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            currency: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            direction: {
                type: sequelize_1.DataTypes.ENUM("eco_to_exchange", "exchange_to_eco", "external", "exchange_convert"),
                allowNull: false,
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: true,
                comment: "Ecosystem chain the coins move on, when the platform moved them",
            },
            network: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
                comment: "The exchange's own network id for that chain, as sent to it",
            },
            amountRequested: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                comment: "What the obligations are settled by",
            },
            amountSent: { type: sequelize_1.DataTypes.DECIMAL(36, 18), allowNull: true },
            amountReceived: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                comment: "What the receiving side confirmed; the difference to requested is fees",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PLANNED", "DISPATCHED", "CONFIRMED", "SETTLED", "NEEDS_REVIEW", "FAILED", "RECORDED"),
                allowNull: false,
                defaultValue: "PLANNED",
            },
            activeKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "<currency>|<direction> while in flight, NULL when terminal. UNIQUE: the in-flight lock every process shares",
            },
            txid: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "The on-chain hash the front-run guard checks: reserved before the movement is visible (the expected UTXO txid before broadcast, the exchange's txid once it publishes one), so the spot deposit claim route and both spot verifiers can refuse it. Also inside proof; this column is the indexed copy",
            },
            proof: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "txid, exchange withdrawal/deposit ids, from/to address and tag, broadcast and confirmation times, receipts",
                get() {
                    return parseJsonColumn(this.getDataValue("proof"));
                },
            },
            fees: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "gas in the chain's native asset, the venue's fee, and the shortfall booked as loss",
                get() {
                    return parseJsonColumn(this.getDataValue("fees"));
                },
            },
            initiatedBy: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "'auto' for the cron, otherwise the admin's user id",
            },
            note: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "poolBackingSettlement",
            tableName: "pool_backing_settlement",
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
                    name: "uq_pool_backing_settlement_activeKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "activeKey" }],
                },
                {
                    name: "idx_pool_backing_settlement_currency_status",
                    using: "BTREE",
                    fields: [{ name: "currency" }, { name: "status" }],
                },
                {
                    name: "idx_pool_backing_settlement_txid",
                    using: "BTREE",
                    fields: [{ name: "txid" }],
                },
            ],
        });
    }
    static associate(_models) {
    }
}
exports.default = poolBackingSettlement;
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
