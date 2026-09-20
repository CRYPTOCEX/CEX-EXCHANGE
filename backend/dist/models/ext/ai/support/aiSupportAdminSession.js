"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportAdminSession extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportAdminSession.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            adminId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            title: { type: sequelize_1.DataTypes.STRING(160), allowNull: false },
            screen: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            turnCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            costUsdTotal: {
                type: sequelize_1.DataTypes.DECIMAL(12, 6),
                allowNull: false,
                defaultValue: 0,
            },
            lastMessageAt: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        }, {
            sequelize,
            modelName: "aiSupportAdminSession",
            tableName: "ai_support_admin_session",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_admin_session_owner_idx",
                    using: "BTREE",
                    fields: [{ name: "adminId" }, { name: "lastMessageAt" }],
                },
                {
                    name: "ai_support_admin_session_age_idx",
                    using: "BTREE",
                    fields: [{ name: "lastMessageAt" }],
                },
            ],
        });
    }
}
exports.default = aiSupportAdminSession;
