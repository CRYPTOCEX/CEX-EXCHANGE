"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiMarketMakerHistory extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiMarketMakerHistory.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            marketMakerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "marketMakerId: Market Maker ID must not be empty" },
                    isUUID: { args: 4, msg: "marketMakerId: Must be a valid UUID" },
                },
            },
            action: {
                type: sequelize_1.DataTypes.ENUM("TRADE", "PAUSE", "RESUME", "REBALANCE", "TARGET_CHANGE", "DEPOSIT", "WITHDRAW", "START", "STOP", "CONFIG_CHANGE", "EMERGENCY_STOP", "AUTO_PAUSE", "PHASE_CHANGE", "BIAS_CHANGE", "MOMENTUM_EVENT"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            [
                                "TRADE",
                                "PAUSE",
                                "RESUME",
                                "REBALANCE",
                                "TARGET_CHANGE",
                                "DEPOSIT",
                                "WITHDRAW",
                                "START",
                                "STOP",
                                "CONFIG_CHANGE",
                                "EMERGENCY_STOP",
                                "AUTO_PAUSE",
                                "PHASE_CHANGE",
                                "BIAS_CHANGE",
                                "MOMENTUM_EVENT",
                            ],
                        ],
                        msg: "action: Must be a valid action type",
                    },
                },
            },
            details: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("details");
                    if (!value)
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
                },
            },
            priceAtAction: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "priceAtAction: Must be a valid decimal number" },
                },
                get() {
                    const value = this.getDataValue("priceAtAction");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
            poolValueAtAction: {
                type: sequelize_1.DataTypes.DECIMAL(30, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isDecimal: { msg: "poolValueAtAction: Must be a valid decimal number" },
                },
                get() {
                    const value = this.getDataValue("poolValueAtAction");
                    return value ? parseFloat(value.toString()) : 0;
                },
            },
        }, {
            sequelize,
            modelName: "aiMarketMakerHistory",
            tableName: "ai_market_maker_history",
            timestamps: true,
            updatedAt: false,
            hooks: {
                beforeUpdate: () => {
                    throw new Error("History records cannot be updated - they are immutable for audit trail integrity");
                },
                beforeDestroy: (_instance, options) => {
                    if ((options === null || options === void 0 ? void 0 : options.transaction) || (options === null || options === void 0 ? void 0 : options.cascadeDelete)) {
                        return;
                    }
                    throw new Error("History records cannot be directly deleted - they are immutable for audit trail integrity");
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
                    name: "aiMarketMakerHistoryMarketMakerIdIdx",
                    using: "BTREE",
                    fields: [{ name: "marketMakerId" }],
                },
                {
                    name: "aiMarketMakerHistoryActionIdx",
                    using: "BTREE",
                    fields: [{ name: "action" }],
                },
                {
                    name: "aiMarketMakerHistoryCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "aiMarketMakerHistoryMarketCreatedIdx",
                    using: "BTREE",
                    fields: [{ name: "marketMakerId" }, { name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        aiMarketMakerHistory.belongsTo(models.aiMarketMaker, {
            as: "marketMaker",
            foreignKey: "marketMakerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiMarketMakerHistory;
