"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportTurn extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportTurn.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            sessionId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            ticketId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            messageKey: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            trigger: {
                type: sequelize_1.DataTypes.ENUM("NEW_TICKET", "CUSTOMER_REPLY", "MANUAL", "RETRY", "HANDBACK"),
                allowNull: false,
                defaultValue: "CUSTOMER_REPLY",
            },
            providerId: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                defaultValue: "null",
            },
            model: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
            effort: { type: sequelize_1.DataTypes.STRING(16), allowNull: true },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "STREAMING", "SUCCEEDED", "FAILED", "CANCELLED", "SKIPPED", "REFUSED"),
                allowNull: false,
                defaultValue: "PENDING",
            },
            skipReason: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
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
            aiFirstResponseMs: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
            retrievalScore: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
            retrievedChunkIds: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("retrievedChunkIds");
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
            citations: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("citations");
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
            citationMode: {
                type: sequelize_1.DataTypes.ENUM("NATIVE", "MARKER"),
                allowNull: true,
            },
            toolCalls: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("toolCalls");
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
            groundedness: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
            verdict: {
                type: sequelize_1.DataTypes.ENUM("ANSWERED", "ESCALATED", "REFUSED"),
                allowNull: true,
            },
            escalationReason: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
            draftText: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            sentText: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            editDistance: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
            wasSent: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: true },
            promptHash: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            errorCode: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            errorMessage: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportTurn",
            tableName: "ai_support_turn",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_turn_session_idx",
                    using: "BTREE",
                    fields: [{ name: "sessionId" }],
                },
                {
                    name: "ai_support_turn_ticket_idx",
                    using: "BTREE",
                    fields: [{ name: "ticketId" }],
                },
                {
                    name: "ai_support_turn_status_created_idx",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "createdAt" }],
                },
                {
                    name: "ai_support_turn_verdict_idx",
                    using: "BTREE",
                    fields: [{ name: "verdict" }],
                },
                {
                    name: "ai_support_turn_cost_idx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }, { name: "costUsd" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportTurn.belongsTo(models.aiSupportSession, {
            foreignKey: "sessionId",
            as: "session",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiSupportTurn.hasMany(models.aiSupportFeedback, {
            foreignKey: "turnId",
            as: "feedback",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportTurn;
