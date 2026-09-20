"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
function decimalGetter(field) {
    return function () {
        const raw = this.getDataValue(field);
        if (raw === null || raw === undefined)
            return raw;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) ? n : 0;
    };
}
class stakingPosition extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingPosition.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "poolId: Pool ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "poolId: Must be a valid UUID" },
                },
            },
            durationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUIDOrNull(value) {
                        if (value === null || value === undefined)
                            return;
                        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                            throw new Error("durationId: Must be a valid UUID");
                        }
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                get: decimalGetter("amount"),
                validate: {
                    isFloat: { msg: "amount: Must be a valid number" },
                    min: { args: [0], msg: "amount: Cannot be negative" },
                    isValidAmount(value) {
                        if (value <= 0) {
                            throw new Error("amount: Must be greater than 0");
                        }
                    },
                },
            },
            startDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: "startDate: Must be a valid date", args: true },
                    isBeforeEndDate(value) {
                        const end = this.endDate;
                        if (end === null || end === undefined)
                            return;
                        if (new Date(value) >= new Date(end)) {
                            throw new Error("startDate: Must be before end date");
                        }
                    },
                },
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: "endDate: Must be a valid date", args: true },
                },
            },
            mode: {
                type: sequelize_1.DataTypes.ENUM("SYNTHETIC", "REAL"),
                allowNull: false,
                defaultValue: "SYNTHETIC",
                validate: {
                    isIn: {
                        args: [["SYNTHETIC", "REAL"]],
                        msg: "mode: Must be one of: SYNTHETIC, REAL",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL", "PENDING_DELEGATION", "UNSTAKE_REQUESTED", "UNBONDING", "WITHDRAWABLE", "FAILED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [
                            [
                                "ACTIVE",
                                "COMPLETED",
                                "CANCELLED",
                                "PENDING_WITHDRAWAL",
                                "PENDING_DELEGATION",
                                "UNSTAKE_REQUESTED",
                                "UNBONDING",
                                "WITHDRAWABLE",
                                "FAILED",
                            ],
                        ],
                        msg: "status: Must be a known position status",
                    },
                },
            },
            withdrawalRequested: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            withdrawalRequestDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: "withdrawalRequestDate: Must be a valid date",
                        args: true,
                    },
                    isValidWithdrawalDate(value) {
                        if (value && !this.withdrawalRequested) {
                            throw new Error("withdrawalRequestDate: Cannot set withdrawal date when withdrawal is not requested");
                        }
                    },
                },
            },
            adminNotes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            completedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: "completedAt: Must be a valid date", args: true },
                    isValidCompletionDate(value) {
                        if (value && this.status !== "COMPLETED") {
                            throw new Error("completedAt: Cannot set completion date when status is not COMPLETED");
                        }
                    },
                },
            },
            apr: {
                type: sequelize_1.DataTypes.DECIMAL(16, 8),
                allowNull: true,
                get: decimalGetter("apr"),
                validate: {
                    isFloat: { msg: "apr: Must be a valid number" },
                    min: { args: [0], msg: "apr: Cannot be negative" },
                },
            },
            adminFeePercentage: {
                type: sequelize_1.DataTypes.DECIMAL(16, 8),
                allowNull: true,
                get: decimalGetter("adminFeePercentage"),
                validate: {
                    isFloat: { msg: "adminFeePercentage: Must be a valid number" },
                    min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
                    max: {
                        args: [100],
                        msg: "adminFeePercentage: Cannot exceed 100%",
                    },
                },
            },
            earlyWithdrawalFee: {
                type: sequelize_1.DataTypes.DECIMAL(16, 8),
                allowNull: true,
                get: decimalGetter("earlyWithdrawalFee"),
                validate: {
                    isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
                    min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
                    max: {
                        args: [100],
                        msg: "earlyWithdrawalFee: Cannot exceed 100%",
                    },
                },
            },
            earningFrequency: {
                type: sequelize_1.DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
                allowNull: true,
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
            lockPeriod: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    isInt: { msg: "lockPeriod: Must be an integer" },
                    min: { args: [1], msg: "lockPeriod: Must be at least 1 day" },
                },
            },
            lastDistributionDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: {
                        msg: "lastDistributionDate: Must be a valid date",
                        args: true,
                    },
                },
            },
            consentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            shares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("shares"),
                validate: { min: { args: [0], msg: "shares: Cannot be negative" } },
            },
            entrySharePrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("entrySharePrice"),
                validate: { min: { args: [0], msg: "entrySharePrice: Cannot be negative" } },
            },
            principalOnchain: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("principalOnchain"),
                validate: { min: { args: [0], msg: "principalOnchain: Cannot be negative" } },
            },
            gatherTxHash: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            returnTxHash: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            gatherNetworkFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("gatherNetworkFee"),
            },
            returnNetworkFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("returnNetworkFee"),
            },
            unstakeRequestedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            unstakeShares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("unstakeShares"),
                validate: { min: { args: [0], msg: "unstakeShares: Cannot be negative" } },
            },
            unstakeSharePrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("unstakeSharePrice"),
                validate: { min: { args: [0], msg: "unstakeSharePrice: Cannot be negative" } },
            },
            unbondingEndsAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            unbondingBoundAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            settledAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("settledAmount"),
                validate: { min: { args: [0], msg: "settledAmount: Cannot be negative" } },
            },
            settledAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            failureReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            forceUnstakedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            forceUnstakeReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            gatherBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            exitBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            returnBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingPosition",
            tableName: "staking_positions",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_positions_user_idx",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "staking_positions_pool_idx",
                    fields: [{ name: "poolId" }],
                },
                {
                    name: "staking_positions_status_idx",
                    fields: [{ name: "status" }],
                },
                {
                    name: "staking_positions_withdrawal_idx",
                    fields: [{ name: "withdrawalRequested" }],
                },
                {
                    name: "staking_positions_user_status_idx",
                    fields: [{ name: "userId" }, { name: "status" }],
                },
                {
                    name: "staking_positions_end_date_idx",
                    fields: [{ name: "endDate" }],
                },
                {
                    name: "staking_positions_created_idx",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "staking_positions_accrual_idx",
                    fields: [{ name: "status" }, { name: "lastDistributionDate" }],
                },
                {
                    name: "staking_positions_duration_idx",
                    fields: [{ name: "durationId" }],
                },
                {
                    name: "staking_positions_mode_status_idx",
                    fields: [{ name: "mode" }, { name: "status" }],
                },
                {
                    name: "staking_positions_unbonding_idx",
                    fields: [{ name: "status" }, { name: "unbondingEndsAt" }],
                },
                {
                    name: "staking_positions_unstake_requested_idx",
                    fields: [{ name: "poolId" }, { name: "unstakeRequestedAt" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingPosition.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingPosition.belongsTo(models.stakingDuration, {
            foreignKey: "durationId",
            as: "duration",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPosition.hasMany(models.stakingEarningRecord, {
            foreignKey: "positionId",
            as: "earningHistory",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingPosition.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingPosition.belongsTo(models.stakingConsent, {
            foreignKey: "consentId",
            as: "consent",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingPosition;
