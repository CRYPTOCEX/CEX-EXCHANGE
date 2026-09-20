"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function decimalGetter(field) {
    return function () {
        const raw = this.getDataValue(field);
        if (raw === null || raw === undefined)
            return raw;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) ? n : 0;
    };
}
class stakingDuration extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingDuration.init({
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
                },
            },
            name: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            lockPeriod: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    isInt: { msg: "lockPeriod: Must be an integer" },
                    min: { args: [1], msg: "lockPeriod: Must be at least 1 day" },
                    max: {
                        args: [36500],
                        msg: "lockPeriod: Must not exceed 36500 days (100 years)",
                    },
                },
            },
            apr: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: false,
                get: decimalGetter("apr"),
                validate: {
                    isFloat: { msg: "apr: Must be a valid number" },
                    min: { args: [0], msg: "apr: Cannot be negative" },
                },
            },
            earningFrequency: {
                type: sequelize_1.DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
                allowNull: false,
                defaultValue: "DAILY",
                validate: {
                    isIn: {
                        args: [["DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"]],
                        msg: "earningFrequency: Must be one of: DAILY, WEEKLY, MONTHLY, END_OF_TERM",
                    },
                },
            },
            autoCompound: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
            },
            minStake: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("minStake"),
                validate: {
                    isFloat: { msg: "minStake: Must be a valid number" },
                    min: { args: [0], msg: "minStake: Cannot be negative" },
                },
            },
            maxStake: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("maxStake"),
                validate: {
                    isFloat: { msg: "maxStake: Must be a valid number" },
                    min: { args: [0], msg: "maxStake: Cannot be negative" },
                    isGreaterThanMinStake(value) {
                        const min = this.minStake;
                        if (value !== null &&
                            value !== undefined &&
                            min !== null &&
                            min !== undefined &&
                            Number(value) <= Number(min)) {
                            throw new Error("maxStake: Must be greater than minStake");
                        }
                    },
                },
            },
            adminFeePercentage: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                get: decimalGetter("adminFeePercentage"),
                validate: {
                    isFloat: { msg: "adminFeePercentage: Must be a valid number" },
                    min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
                    max: { args: [100], msg: "adminFeePercentage: Cannot exceed 100%" },
                },
            },
            earlyWithdrawalFee: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                get: decimalGetter("earlyWithdrawalFee"),
                validate: {
                    isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
                    min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
                    max: { args: [100], msg: "earlyWithdrawalFee: Cannot exceed 100%" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "INACTIVE"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "INACTIVE"]],
                        msg: "status: Must be one of: ACTIVE, INACTIVE",
                    },
                },
            },
            isFeatured: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            order: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "order: Must be an integer" },
                    min: { args: [0], msg: "order: Cannot be negative" },
                },
            },
        }, {
            sequelize,
            modelName: "stakingDuration",
            tableName: "staking_durations",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_durations_pool_idx",
                    fields: [{ name: "poolId" }],
                },
                {
                    name: "staking_durations_pool_status_idx",
                    fields: [{ name: "poolId" }, { name: "status" }],
                },
                {
                    name: "staking_durations_pool_lock_idx",
                    fields: [{ name: "poolId" }, { name: "lockPeriod" }],
                },
                {
                    name: "staking_durations_order_idx",
                    fields: [{ name: "order" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingDuration.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingDuration.hasMany(models.stakingPosition, {
            foreignKey: "durationId",
            as: "positions",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingDuration;
