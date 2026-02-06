"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiInvestment extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiInvestment.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                },
            },
            planId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "planId: Plan ID cannot be null" },
                },
            },
            durationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Market cannot be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("SPOT", "ECO"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["SPOT", "ECO"]],
                        msg: "type: Must be a valid wallet type",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "amount: Amount must be a number" },
                },
            },
            profit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isNumeric: { msg: "profit: Profit must be a number" },
                },
            },
            result: {
                type: sequelize_1.DataTypes.ENUM("WIN", "LOSS", "DRAW"),
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"]],
                        msg: "status: Must be a valid status",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "aiInvestment",
            tableName: "ai_investment",
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
                    name: "aiInvestmentIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "aiInvestmentUserIdForeign",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "aiInvestmentPlanIdForeign",
                    using: "BTREE",
                    fields: [{ name: "planId" }],
                },
                {
                    name: "aiInvestmentDurationIdForeign",
                    using: "BTREE",
                    fields: [{ name: "durationId" }],
                },
            ],
        });
    }
    static associate(models) {
        aiInvestment.belongsTo(models.aiInvestmentPlan, {
            as: "plan",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestment.belongsTo(models.aiInvestmentDuration, {
            as: "duration",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        aiInvestment.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiInvestment;
