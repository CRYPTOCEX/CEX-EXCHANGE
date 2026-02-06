"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class investment extends sequelize_1.Model {
    static initModel(sequelize) {
        return investment.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the investment record",
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "ID of the user who made this investment",
            },
            planId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "planId: Plan ID must be a valid UUID" },
                },
                comment: "ID of the investment plan being invested in",
            },
            durationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "durationId: Duration ID must be a valid UUID",
                    },
                },
                comment: "ID of the duration period for this investment",
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Amount must be a number" },
                },
                comment: "Amount invested by the user",
            },
            profit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isFloat: { msg: "profit: Profit must be a number" },
                },
                comment: "Profit earned from this investment (if completed)",
            },
            result: {
                type: sequelize_1.DataTypes.ENUM("WIN", "LOSS", "DRAW"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["WIN", "LOSS", "DRAW"]],
                        msg: "result: Result must be WIN, LOSS, or DRAW",
                    },
                },
                comment: "Final result of the investment (WIN, LOSS, or DRAW)",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"]],
                        msg: "status: Status must be ACTIVE, COMPLETED, CANCELLED, or REJECTED",
                    },
                },
                comment: "Current status of the investment",
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: true,
                comment: "Date when the investment period ends",
            },
        }, {
            sequelize,
            modelName: "investment",
            tableName: "investment",
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
                    name: "investmentIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "investmentUserIdFkey",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "investmentPlanIdFkey",
                    using: "BTREE",
                    fields: [{ name: "planId" }],
                },
                {
                    name: "investmentDurationIdFkey",
                    using: "BTREE",
                    fields: [{ name: "durationId" }],
                },
                {
                    name: "investmentUserIdPlanIdStatusUnique",
                    unique: true,
                    using: "BTREE",
                    fields: ["userId", "planId", "status"],
                    where: {
                        status: "ACTIVE",
                    },
                },
            ],
        });
    }
    static associate(models) {
        investment.belongsTo(models.investmentPlan, {
            as: "plan",
            foreignKey: "planId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        investment.belongsTo(models.investmentDuration, {
            as: "duration",
            foreignKey: "durationId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        investment.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = investment;
