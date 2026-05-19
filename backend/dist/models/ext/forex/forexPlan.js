"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class forexPlan extends sequelize_1.Model {
    static initModel(sequelize) {
        return forexPlan.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                unique: "forexPlanNameKey",
                validate: {
                    notEmpty: { msg: "name: Name cannot be empty" },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            description: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            image: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency cannot be empty" },
                },
            },
            walletType: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "walletType: Wallet type cannot be empty" },
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
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isFloat: { msg: "minAmount: Minimum amount must be a number" },
                },
            },
            maxAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isFloat: { msg: "maxAmount: Maximum amount must be a number" },
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
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "status: Status must be a boolean value" },
                },
            },
            defaultProfit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                defaultValue: 0,
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
            trending: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false,
                validate: {
                    isBoolean: { msg: "trending: Trending must be a boolean value" },
                },
            },
        }, {
            sequelize,
            modelName: "forexPlan",
            tableName: "forex_plan",
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
                    name: "forexPlanNameKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "name" }],
                },
                {
                    name: "forexPlanStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "forexPlanCurrencyIdx",
                    using: "BTREE",
                    fields: [{ name: "currency" }],
                },
                {
                    name: "forexPlanTrendingIdx",
                    using: "BTREE",
                    fields: [{ name: "trending" }],
                },
            ],
        });
    }
    static associate(models) {
        forexPlan.hasMany(models.forexInvestment, {
            as: "investments",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexPlan.hasMany(models.forexPlanDuration, {
            as: "planDurations",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        forexPlan.belongsToMany(models.forexDuration, {
            through: models.forexPlanDuration,
            as: "durations",
            foreignKey: "planId",
            otherKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = forexPlan;
