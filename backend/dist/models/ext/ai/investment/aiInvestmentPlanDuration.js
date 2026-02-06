"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiInvestmentPlanDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiInvestmentPlanDuration.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            planId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "planId: Plan ID cannot be null" },
                    isUUID: { args: 4, msg: "planId: Plan ID must be a valid UUID" },
                },
            },
            durationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "durationId: Duration ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "durationId: Duration ID must be a valid UUID",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "aiInvestmentPlanDuration",
            tableName: "ai_investment_plan_duration",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "aiInvestmentPlanDurationPlanIdForeign",
                    using: "BTREE",
                    fields: [{ name: "planId" }],
                },
                {
                    name: "aiInvestmentPlanDurationDurationIdForeign",
                    using: "BTREE",
                    fields: [{ name: "durationId" }],
                },
            ],
        });
    }
    static associate(models) {
        aiInvestmentPlanDuration.belongsTo(models.aiInvestmentDuration, {
            as: "duration",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestmentPlanDuration.belongsTo(models.aiInvestmentPlan, {
            as: "plan",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiInvestmentPlanDuration;
