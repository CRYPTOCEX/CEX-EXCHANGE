"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportOperation extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportOperation.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            ticketId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            operation: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
            reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            workflowId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            stepIndex: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
            state: {
                type: sequelize_1.DataTypes.ENUM("PROPOSED", "CONFIRMED", "COMPLETED", "FAILED", "EXPIRED"),
                allowNull: false,
                defaultValue: "PROPOSED",
            },
            confirmedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            completedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            result: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportOperation",
            tableName: "ai_support_operation",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_operation_user_state_idx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "state" }],
                },
                {
                    name: "ai_support_operation_ticket_idx",
                    using: "BTREE",
                    fields: [{ name: "ticketId" }],
                },
                {
                    name: "ai_support_operation_workflow_idx",
                    using: "BTREE",
                    fields: [{ name: "workflowId" }, { name: "stepIndex" }],
                },
            ],
        });
    }
}
exports.default = aiSupportOperation;
