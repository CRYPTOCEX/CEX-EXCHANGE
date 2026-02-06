"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiInvestmentDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiInvestmentDuration.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            duration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "duration: Duration must be an integer" },
                    min: {
                        args: [1],
                        msg: "duration: Duration must be at least 1",
                    },
                },
            },
            timeframe: {
                type: sequelize_1.DataTypes.ENUM("HOUR", "DAY", "WEEK", "MONTH"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["HOUR", "DAY", "WEEK", "MONTH"]],
                        msg: "timeframe: Must be one of 'HOUR', 'DAY', 'WEEK', 'MONTH'",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "aiInvestmentDuration",
            tableName: "ai_investment_duration",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
    static associate(models) {
        aiInvestmentDuration.hasMany(models.aiInvestment, {
            as: "investments",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestmentDuration.hasMany(models.aiInvestmentPlanDuration, {
            as: "aiInvestmentPlanDurations",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestmentDuration.belongsToMany(models.aiInvestmentPlan, {
            through: models.aiInvestmentPlanDuration,
            as: "plans",
            foreignKey: "durationId",
            otherKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiInvestmentDuration;
