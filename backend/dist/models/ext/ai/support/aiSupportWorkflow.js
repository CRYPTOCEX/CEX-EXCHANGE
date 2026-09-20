"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportWorkflow extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportWorkflow.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            ticketId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            workflow: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
            reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            currentStep: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            state: {
                type: sequelize_1.DataTypes.ENUM("RUNNING", "COMPLETED", "CANCELLED", "EXPIRED", "FAILED"),
                allowNull: false,
                defaultValue: "RUNNING",
            },
            cancelledBy: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            completedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            result: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportWorkflow",
            tableName: "ai_support_workflow",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_workflow_ticket_state_idx",
                    using: "BTREE",
                    fields: [{ name: "ticketId" }, { name: "state" }],
                },
                {
                    name: "ai_support_workflow_user_state_idx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "state" }],
                },
            ],
        });
    }
}
exports.default = aiSupportWorkflow;
