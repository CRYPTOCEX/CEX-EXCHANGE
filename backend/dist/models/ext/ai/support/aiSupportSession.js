"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportSession extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportSession.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            ticketId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: true,
            },
            agentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            state: {
                type: sequelize_1.DataTypes.ENUM("AI_ACTIVE", "AWAITING_USER", "HUMAN_REQUESTED", "HUMAN_ACTIVE", "AI_SUSPENDED", "RESOLVED"),
                allowNull: false,
                defaultValue: "AI_ACTIVE",
            },
            previousState: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            generationToken: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            activeTurnId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            humanAgentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            turnCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            escalationReason: {
                type: sequelize_1.DataTypes.STRING(96),
                allowNull: true,
            },
            locale: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
            },
            handoverSummary: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            lastStateAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            deflected: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
            },
            costUsdTotal: {
                type: sequelize_1.DataTypes.DECIMAL(12, 6),
                allowNull: false,
                defaultValue: 0,
            },
            channel: {
                type: sequelize_1.DataTypes.ENUM("TICKET", "LIVE"),
                allowNull: false,
                defaultValue: "TICKET",
            },
        }, {
            sequelize,
            modelName: "aiSupportSession",
            tableName: "ai_support_session",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_session_ticket_uq",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "ticketId" }],
                },
                {
                    name: "ai_support_session_state_idx",
                    using: "BTREE",
                    fields: [{ name: "state" }],
                },
                {
                    name: "ai_support_session_agent_idx",
                    using: "BTREE",
                    fields: [{ name: "agentId" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportSession.belongsTo(models.supportTicket, {
            foreignKey: "ticketId",
            as: "ticket",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiSupportSession.belongsTo(models.aiSupportAgent, {
            foreignKey: "agentId",
            as: "agent",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        aiSupportSession.hasMany(models.aiSupportTurn, {
            foreignKey: "sessionId",
            as: "turns",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiSupportSession.hasMany(models.aiSupportHandover, {
            foreignKey: "sessionId",
            as: "handovers",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportSession;
