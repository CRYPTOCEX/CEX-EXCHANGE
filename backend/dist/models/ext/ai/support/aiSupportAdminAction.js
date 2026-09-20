"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportAdminAction extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportAdminAction.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            proposedTo: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            action: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
            permission: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
            reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            workflowId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            procedure: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            stepIndex: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
            state: {
                type: sequelize_1.DataTypes.ENUM("PROPOSED", "CONFIRMED", "COMPLETED", "FAILED", "EXPIRED"),
                allowNull: false,
                defaultValue: "PROPOSED",
            },
            approvedBy: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            approvedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            completedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            result: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportAdminAction",
            tableName: "ai_support_admin_action",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_admin_action_pending_idx",
                    using: "BTREE",
                    fields: [{ name: "proposedTo" }, { name: "state" }],
                },
                {
                    name: "ai_support_admin_action_approved_idx",
                    using: "BTREE",
                    fields: [{ name: "approvedBy" }, { name: "completedAt" }],
                },
                {
                    name: "ai_support_admin_action_workflow_idx",
                    using: "BTREE",
                    fields: [{ name: "workflowId" }, { name: "stepIndex" }],
                },
            ],
        });
    }
}
exports.default = aiSupportAdminAction;
