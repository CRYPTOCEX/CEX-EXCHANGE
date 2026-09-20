"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class forexPlanDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return forexPlanDuration.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            planId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
            durationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
            },
        }, {
            sequelize,
            modelName: "forexPlanDuration",
            tableName: "forex_plan_duration",
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
        forexPlanDuration.belongsTo(models.forexDuration, {
            as: "duration",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexPlanDuration.belongsTo(models.forexPlan, {
            as: "plan",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = forexPlanDuration;
