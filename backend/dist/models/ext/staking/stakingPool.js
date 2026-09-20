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
class stakingPool extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingPool.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Pool name must not be empty" },
                    len: {
                        args: [2, 100],
                        msg: "name: Length must be between 2 and 100 characters",
                    },
                },
            },
            token: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "token: Token name must not be empty" },
                },
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                    len: {
                        args: [1, 10],
                        msg: "symbol: Length must be between 1 and 10 characters",
                    },
                },
            },
            icon: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            walletType: {
                type: sequelize_1.DataTypes.ENUM("FIAT", "SPOT", "ECO"),
                allowNull: false,
                defaultValue: "SPOT",
                validate: {
                    isIn: {
                        args: [["FIAT", "SPOT", "ECO"]],
                        msg: "walletType: Must be one of: FIAT, SPOT, ECO",
                    },
                },
            },
            walletChain: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
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
            apr: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                get: decimalGetter("apr"),
                validate: {
                    isFloat: { msg: "apr: Must be a valid number" },
                    min: { args: [0], msg: "apr: Cannot be negative" },
                },
            },
            lockPeriod: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    isInt: { msg: "lockPeriod: Must be an integer" },
                    min: { args: [1], msg: "lockPeriod: Must be at least 1 day" },
                },
            },
            minStake: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
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
                        if (value !== null && value <= this.minStake) {
                            throw new Error("maxStake: Must be greater than minStake");
                        }
                    },
                },
            },
            availableToStake: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                defaultValue: 0,
                get: decimalGetter("availableToStake"),
                validate: {
                    isFloat: { msg: "availableToStake: Must be a valid number" },
                    min: { args: [0], msg: "availableToStake: Cannot be negative" },
                },
            },
            earlyWithdrawalFee: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                defaultValue: 0,
                get: decimalGetter("earlyWithdrawalFee"),
                validate: {
                    isFloat: { msg: "earlyWithdrawalFee: Must be a valid number" },
                    min: { args: [0], msg: "earlyWithdrawalFee: Cannot be negative" },
                    max: { args: [100], msg: "earlyWithdrawalFee: Cannot exceed 100%" },
                },
            },
            adminFeePercentage: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("adminFeePercentage"),
                validate: {
                    isFloat: { msg: "adminFeePercentage: Must be a valid number" },
                    min: { args: [0], msg: "adminFeePercentage: Cannot be negative" },
                    max: { args: [100], msg: "adminFeePercentage: Cannot exceed 100%" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "INACTIVE", "COMING_SOON"),
                allowNull: false,
                defaultValue: "INACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "INACTIVE", "COMING_SOON"]],
                        msg: "status: Must be one of: ACTIVE, INACTIVE, COMING_SOON",
                    },
                },
            },
            isPromoted: {
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
            earningFrequency: {
                type: sequelize_1.DataTypes.ENUM("DAILY", "WEEKLY", "MONTHLY", "END_OF_TERM"),
                allowNull: true,
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
                defaultValue: false,
            },
            externalPoolUrl: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                validate: {
                    isValidOptionalUrl(value) {
                        if (value && value.trim() !== "") {
                            const urlRegex = /^https?:\/\/.+/i;
                            if (!urlRegex.test(value)) {
                                throw new Error("externalPoolUrl: Must be a valid URL");
                            }
                        }
                    },
                },
            },
            profitSource: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    notEmpty: { msg: "profitSource: Profit source must not be empty" },
                },
            },
            fundAllocation: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    notEmpty: {
                        msg: "fundAllocation: Fund allocation must not be empty",
                    },
                },
            },
            risks: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "risks: Risks must not be empty" },
                },
            },
            rewards: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "rewards: Rewards must not be empty" },
                },
            },
            venue: {
                type: sequelize_1.DataTypes.ENUM("SOLANA_NATIVE", "LIDO_STETH"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["SOLANA_NATIVE", "LIDO_STETH"]],
                        msg: "venue: Must be one of: SOLANA_NATIVE, LIDO_STETH",
                    },
                },
            },
            activationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            stakingWalletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            validatorSetId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            totalShares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("totalShares"),
                validate: {
                    min: { args: [0], msg: "totalShares: Cannot be negative" },
                },
            },
            sharePrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 1,
                get: decimalGetter("sharePrice"),
                validate: {
                    min: { args: [0], msg: "sharePrice: Cannot be negative" },
                },
            },
            onchainValue: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("onchainValue"),
                validate: {
                    min: { args: [0], msg: "onchainValue: Cannot be negative" },
                },
            },
            unallocatedValue: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("unallocatedValue"),
                validate: {
                    min: { args: [0], msg: "unallocatedValue: Cannot be negative" },
                },
            },
            treasuryShares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("treasuryShares"),
                validate: {
                    min: { args: [0], msg: "treasuryShares: Cannot be negative" },
                },
            },
            lastObservedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastObservedEpoch: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            trailingRewardRateBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            activationDelaySeconds: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            unbondingEstimateSeconds: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            unbondingBoundSeconds: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            disclosureVersion: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            commissionEffectiveAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            pendingAdminFeePercentage: {
                type: sequelize_1.DataTypes.DECIMAL(10, 8),
                allowNull: true,
                get: decimalGetter("pendingAdminFeePercentage"),
                validate: {
                    min: { args: [0], msg: "pendingAdminFeePercentage: Cannot be negative" },
                    max: { args: [100], msg: "pendingAdminFeePercentage: Cannot exceed 100%" },
                },
            },
            slashingPolicy: {
                type: sequelize_1.DataTypes.ENUM("PASS_THROUGH", "REIMBURSE_CAPPED"),
                allowNull: true,
            },
            slashingReimburseCap: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("slashingReimburseCap"),
            },
            liquidExitEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            liquidExitMaxSlippageBps: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                validate: {
                    isInt: { msg: "liquidExitMaxSlippageBps: Must be an integer" },
                    min: { args: [1], msg: "liquidExitMaxSlippageBps: A cap of zero would refuse every exit" },
                    max: { args: [1000], msg: "liquidExitMaxSlippageBps: A cap above 10% is not a cap" },
                },
            },
            intakeStatus: {
                type: sequelize_1.DataTypes.ENUM("OPEN", "PAUSED"),
                allowNull: false,
                defaultValue: "OPEN",
                validate: {
                    isIn: {
                        args: [["OPEN", "PAUSED"]],
                        msg: "intakeStatus: Must be one of: OPEN, PAUSED",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "stakingPool",
            tableName: "staking_pools",
            paranoid: true,
            timestamps: true,
            validate: {
                fixedRateTermsMatchMode() {
                    var _a;
                    const REAL_MUST_BE_NULL = [
                        "apr",
                        "lockPeriod",
                        "availableToStake",
                        "earlyWithdrawalFee",
                        "earningFrequency",
                        "autoCompound",
                        "externalPoolUrl",
                        "profitSource",
                        "fundAllocation",
                    ];
                    const isReal = String((_a = this.mode) !== null && _a !== void 0 ? _a : "SYNTHETIC").toUpperCase() === "REAL";
                    if (isReal) {
                        const set = REAL_MUST_BE_NULL.filter((k) => this.getDataValue(k) !== null && this.getDataValue(k) !== undefined);
                        if (set.length) {
                            throw new Error(`An on-chain pool has no fixed-rate terms: ${set.join(", ")} must be null.`);
                        }
                        return;
                    }
                    const missing = REAL_MUST_BE_NULL.filter((k) => k !== "externalPoolUrl" && (this.getDataValue(k) === null || this.getDataValue(k) === undefined));
                    if (missing.length) {
                        throw new Error(`A fixed-rate pool needs every rate term: ${missing.join(", ")} must not be null.`);
                    }
                },
            },
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_pools_token_idx",
                    fields: [{ name: "token" }],
                },
                {
                    name: "staking_pools_status_idx",
                    fields: [{ name: "status" }],
                },
                {
                    name: "staking_pools_order_idx",
                    fields: [{ name: "order" }],
                },
                {
                    name: "staking_pools_mode_idx",
                    fields: [{ name: "mode" }],
                },
                {
                    name: "staking_pools_intake_idx",
                    fields: [{ name: "intakeStatus" }],
                },
                {
                    name: "staking_pools_activation_idx",
                    fields: [{ name: "activationId" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingPool.hasMany(models.stakingPosition, {
            foreignKey: "poolId",
            as: "positions",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingDuration, {
            foreignKey: "poolId",
            as: "durations",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingAdminEarning, {
            foreignKey: "poolId",
            as: "adminEarnings",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingExternalPoolPerformance, {
            foreignKey: "poolId",
            as: "performances",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingPool.belongsTo(models.stakingChainActivation, {
            foreignKey: "activationId",
            as: "activation",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.belongsTo(models.stakingChainWallet, {
            foreignKey: "stakingWalletId",
            as: "stakingWallet",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.belongsTo(models.stakingValidatorSet, {
            foreignKey: "validatorSetId",
            as: "validatorSet",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingTranche, {
            foreignKey: "poolId",
            as: "tranches",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingObservation, {
            foreignKey: "poolId",
            as: "observations",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingBatch, {
            foreignKey: "poolId",
            as: "batches",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingPool.hasMany(models.stakingIncident, {
            foreignKey: "poolId",
            as: "incidents",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingPool;
