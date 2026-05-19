"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class stakingExternalPoolPerformance extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingExternalPoolPerformance.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "poolId: Pool ID cannot be null" },
                    isUUID: { args: 4, msg: "poolId: Must be a valid UUID" },
                },
            },
            date: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: "date: Must be a valid date", args: true },
                    isNotFuture(value) {
                        if (new Date(value) > new Date()) {
                            throw new Error("date: Cannot be in the future");
                        }
                    },
                },
            },
            apr: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "apr: Must be a valid number" },
                    min: { args: [0], msg: "apr: Cannot be negative" },
                },
            },
            totalStaked: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "totalStaked: Must be a valid number" },
                    min: { args: [0], msg: "totalStaked: Cannot be negative" },
                },
            },
            profit: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "profit: Must be a valid number" },
                },
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "notes: Notes must not be empty" },
                },
            },
        }, {
            sequelize,
            modelName: "stakingExternalPoolPerformance",
            tableName: "staking_external_pool_performances",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_external_pool_performances_pool_idx",
                    fields: [{ name: "poolId" }],
                },
                {
                    name: "staking_external_pool_performances_date_idx",
                    fields: [{ name: "date" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingExternalPoolPerformance.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingExternalPoolPerformance;
