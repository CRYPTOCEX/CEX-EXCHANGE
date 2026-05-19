"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class adminProfit extends sequelize_1.Model {
    static initModel(sequelize) {
        return adminProfit.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            transactionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "transactionId: Transaction ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "transactionId: Transaction ID must be a valid UUID",
                    },
                },
                comment: "ID of the transaction that generated this profit",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("DEPOSIT", "WITHDRAW", "TRANSFER", "BINARY_ORDER", "EXCHANGE_ORDER", "INVESTMENT", "AI_INVESTMENT", "FOREX_DEPOSIT", "FOREX_WITHDRAW", "FOREX_INVESTMENT", "ICO_CONTRIBUTION", "STAKING", "P2P_TRADE", "NFT_SALE", "NFT_AUCTION", "NFT_OFFER", "GATEWAY_PAYMENT", "TRADE"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            [
                                "DEPOSIT",
                                "WITHDRAW",
                                "TRANSFER",
                                "BINARY_ORDER",
                                "EXCHANGE_ORDER",
                                "INVESTMENT",
                                "AI_INVESTMENT",
                                "FOREX_DEPOSIT",
                                "FOREX_WITHDRAW",
                                "FOREX_INVESTMENT",
                                "ICO_CONTRIBUTION",
                                "STAKING",
                                "P2P_TRADE",
                                "NFT_SALE",
                                "NFT_AUCTION",
                                "NFT_OFFER",
                                "GATEWAY_PAYMENT",
                                "TRADE",
                            ],
                        ],
                        msg: "type: Type must be one of the defined transaction types",
                    },
                },
                comment: "Type of transaction that generated the admin profit",
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Amount must be a number" },
                },
                comment: "Profit amount earned by admin from this transaction",
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency cannot be empty" },
                },
                comment: "Currency of the profit amount",
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Blockchain network if applicable",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Additional description of the profit source",
            },
        }, {
            sequelize,
            modelName: "adminProfit",
            tableName: "admin_profit",
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
                    name: "adminProfitTransactionIdForeign",
                    using: "BTREE",
                    fields: [{ name: "transactionId" }],
                },
                {
                    name: "idx_admin_profit_type",
                    using: "BTREE",
                    fields: [{ name: "type" }],
                },
                {
                    name: "idx_admin_profit_created_at",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "idx_admin_profit_summary",
                    using: "BTREE",
                    fields: [{ name: "type" }, { name: "createdAt" }, { name: "currency" }],
                },
            ],
        });
    }
    static associate(models) {
        adminProfit.belongsTo(models.transaction, {
            as: "transaction",
            foreignKey: "transactionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = adminProfit;
