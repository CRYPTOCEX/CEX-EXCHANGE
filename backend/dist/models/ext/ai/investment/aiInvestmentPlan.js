"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiInvestmentPlan extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiInvestmentPlan.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "aiInvestmentPlanNameKey",
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            image: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "image: Image must be a valid URL",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
            invested: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "invested: Invested amount must be an integer" },
                    min: {
                        args: [0],
                        msg: "invested: Invested amount cannot be negative",
                    },
                },
            },
            profitPercentage: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isFloat: {
                        msg: "profitPercentage: Profit percentage must be a number",
                    },
                    min: {
                        args: [0],
                        msg: "profitPercentage: Profit percentage cannot be negative",
                    },
                },
            },
            minProfit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "minProfit: Minimum profit must be a number" },
                },
            },
            maxProfit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "maxProfit: Maximum profit must be a number" },
                },
            },
            minAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "minAmount: Minimum amount must be a number" },
                    min: {
                        args: [0],
                        msg: "minAmount: Minimum amount cannot be negative",
                    },
                },
            },
            maxAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "maxAmount: Maximum amount must be a number" },
                },
            },
            trending: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
            },
            defaultProfit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "defaultProfit: Default profit must be a number" },
                },
            },
            defaultResult: {
                type: sequelize_1.DataTypes.ENUM("WIN", "LOSS", "DRAW"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["WIN", "LOSS", "DRAW"]],
                        msg: "defaultResult: Must be one of 'WIN', 'LOSS', 'DRAW'",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "aiInvestmentPlan",
            tableName: "ai_investment_plan",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "aiInvestmentPlanNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
            ],
        });
    }
    static associate(models) {
        aiInvestmentPlan.hasMany(models.aiInvestment, {
            as: "investments",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestmentPlan.hasMany(models.aiInvestmentPlanDuration, {
            as: "planDurations",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestmentPlan.belongsToMany(models.aiInvestmentDuration, {
            through: models.aiInvestmentPlanDuration,
            as: "durations",
            foreignKey: "planId",
            otherKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiInvestmentPlan;
