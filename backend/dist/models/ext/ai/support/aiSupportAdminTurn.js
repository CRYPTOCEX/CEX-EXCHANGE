"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportAdminTurn extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportAdminTurn.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            sessionId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            adminId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            question: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
            answer: { type: sequelize_1.DataTypes.TEXT("long"), allowNull: false },
            grounded: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            sources: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("sources");
                    if (value == null)
                        return [];
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return value;
                },
            },
            proposals: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("proposals");
                    if (value == null)
                        return [];
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return value;
                },
            },
            screen: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            providerId: { type: sequelize_1.DataTypes.STRING(32), allowNull: true },
            model: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            inputTokens: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            outputTokens: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            cacheReadTokens: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            cacheWriteTokens: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            costUsd: {
                type: sequelize_1.DataTypes.DECIMAL(12, 6),
                allowNull: false,
                defaultValue: 0,
            },
            latencyMs: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportAdminTurn",
            tableName: "ai_support_admin_turn",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_admin_turn_session_idx",
                    using: "BTREE",
                    fields: [{ name: "sessionId" }, { name: "createdAt" }],
                },
                {
                    name: "ai_support_admin_turn_cost_idx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }, { name: "costUsd" }],
                },
            ],
        });
    }
}
exports.default = aiSupportAdminTurn;
