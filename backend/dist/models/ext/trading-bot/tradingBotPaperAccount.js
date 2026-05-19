"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class tradingBotPaperAccount extends sequelize_1.Model {
    static initModel(sequelize) {
        return tradingBotPaperAccount.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "USDT",
            },
            balance: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("balance");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            initialBalance: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                get() {
                    const value = this.getDataValue("initialBalance");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            winningTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            losingTrades: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalProfit: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalProfit");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            totalVolume: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("totalVolume");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            highWaterMark: {
                type: sequelize_1.DataTypes.DECIMAL(18, 8),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("highWaterMark");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            maxDrawdown: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0,
                get() {
                    const value = this.getDataValue("maxDrawdown");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            isActive: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            lastResetAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            resetCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        }, {
            sequelize,
            modelName: "tradingBotPaperAccount",
            tableName: "trading_bot_paper_account",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotPaperAccountUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "tradingBotPaperAccountUserCurrencyIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "currency" }],
                },
            ],
        });
    }
    static associate(models) {
        tradingBotPaperAccount.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotPaperAccount;
