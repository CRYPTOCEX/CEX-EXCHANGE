"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class investmentDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return investmentDuration.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the investment duration option",
            },
            duration: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "duration: Duration must be an integer" },
                },
                comment: "Duration value (number of timeframe units)",
            },
            timeframe: {
                type: sequelize_1.DataTypes.ENUM("HOUR", "DAY", "WEEK", "MONTH"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["HOUR", "DAY", "WEEK", "MONTH"]],
                        msg: "timeframe: Timeframe must be one of HOUR, DAY, WEEK, MONTH",
                    },
                },
                comment: "Time unit for the duration (HOUR, DAY, WEEK, MONTH)",
            },
        }, {
            sequelize,
            modelName: "investmentDuration",
            tableName: "investment_duration",
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
        investmentDuration.hasMany(models.investment, {
            as: "investments",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        investmentDuration.hasMany(models.investmentPlanDuration, {
            as: "investmentPlanDurations",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        investmentDuration.belongsToMany(models.investmentPlan, {
            through: models.investmentPlanDuration,
            as: "plans",
            foreignKey: "durationId",
            otherKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = investmentDuration;
