"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class fxDeal extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxDeal.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            accountId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "accountId: Must be a valid UUID" },
                },
            },
            positionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            orderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            kind: {
                type: sequelize_1.DataTypes.STRING(20),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [[
                                "OPEN", "CLOSE", "PARTIAL_CLOSE", "SWAP", "COMMISSION",
                                "DIVIDEND", "ADJUSTMENT", "NBP_CORRECTION",
                                "DEPOSIT", "WITHDRAW", "WITHDRAW_REVERSAL",
                            ]],
                        msg: "kind: Invalid deal kind",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Base units for trade deals; money amount for balance deals",
            },
            price: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "EXECUTED price for trade deals (marked-up)",
            },
            rawFeedBid: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Raw provider bid at execution — audit/dispute defense",
            },
            rawFeedAsk: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Raw provider ask at execution — audit/dispute defense",
            },
            rateUsed: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Swap points / dividend rate / ccy conversion rate used",
            },
            pnl: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                comment: "Balance impact in account ccy. INVARIANT: Σ pnl over an account's deals == balance (integrity cron)",
            },
            balanceAfter: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                comment: "Account balance immediately after this deal (chain check)",
            },
            idempotencyKey: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                comment: "Stable per-operation key — the dedup guard (fx_<action>_<id>)",
            },
            executionProviderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "fxExecutionProvider of the hedge leg — NULL for internal fills",
            },
            externalDealId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "OANDA transactionID / MT dealId of the hedge fill",
            },
            externalPrice: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
                comment: "Broker fill price (decimal STRING); `price` stays the client executed price",
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                set(value) {
                    this.setDataValue("metadata", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("metadata");
                    if (!value)
                        return null;
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                },
            },
        }, {
            sequelize,
            modelName: "fxDeal",
            tableName: "fx_deal",
            timestamps: true,
            updatedAt: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "fxDealAccountIdCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "accountId" }, { name: "createdAt" }],
                },
                {
                    name: "fxDealPositionIdIdx",
                    using: "BTREE",
                    fields: [{ name: "positionId" }],
                },
                {
                    name: "fxDealIdempotencyKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "idempotencyKey" }],
                },
            ],
        });
    }
    static associate(models) {
        fxDeal.belongsTo(models.fxAccount, {
            as: "account",
            foreignKey: "accountId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        fxDeal.belongsTo(models.fxPosition, {
            as: "position",
            foreignKey: "positionId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxDeal;
