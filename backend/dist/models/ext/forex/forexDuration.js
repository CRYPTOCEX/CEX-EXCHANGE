"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class forexDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return forexDuration.init({
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
                },
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
            },
        }, {
            sequelize,
            modelName: "forexDuration",
            tableName: "forex_duration",
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
        forexDuration.hasMany(models.forexInvestment, {
            as: "investments",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexDuration.hasMany(models.forexPlanDuration, {
            as: "forexPlanDurations",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexDuration.belongsToMany(models.forexPlan, {
            through: models.forexPlanDuration,
            as: "plans",
            foreignKey: "durationId",
            otherKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = forexDuration;
