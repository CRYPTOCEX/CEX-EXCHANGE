"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class investmentPlanDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return investmentPlanDuration.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the plan-duration relationship",
            },
            planId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "ID of the investment plan",
            },
            durationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                comment: "ID of the duration option available for this plan",
            },
        }, {
            sequelize,
            modelName: "investmentPlanDuration",
            tableName: "investment_plan_duration",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "idxPlanId",
                    using: "BTREE",
                    fields: [{ name: "planId" }],
                },
                {
                    name: "idxDurationId",
                    using: "BTREE",
                    fields: [{ name: "durationId" }],
                },
            ],
        });
    }
    static associate(models) {
        investmentPlanDuration.belongsTo(models.investmentDuration, {
            as: "duration",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        investmentPlanDuration.belongsTo(models.investmentPlan, {
            as: "plan",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = investmentPlanDuration;
