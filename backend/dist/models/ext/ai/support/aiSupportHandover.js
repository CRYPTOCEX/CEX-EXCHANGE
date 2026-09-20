"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportHandover extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportHandover.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            sessionId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            fromState: { type: sequelize_1.DataTypes.STRING(32), allowNull: true },
            toState: { type: sequelize_1.DataTypes.STRING(32), allowNull: false },
            actor: {
                type: sequelize_1.DataTypes.ENUM("AI", "HUMAN", "SYSTEM", "USER"),
                allowNull: false,
                defaultValue: "SYSTEM",
            },
            actorId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            reason: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
            note: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: "aiSupportHandover",
            tableName: "ai_support_handover",
            paranoid: false,
            timestamps: false,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_handover_session_idx",
                    using: "BTREE",
                    fields: [{ name: "sessionId" }, { name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportHandover.belongsTo(models.aiSupportSession, {
            foreignKey: "sessionId",
            as: "session",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportHandover;
