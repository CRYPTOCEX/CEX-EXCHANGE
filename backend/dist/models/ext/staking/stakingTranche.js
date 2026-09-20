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
class stakingTranche extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingTranche.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { notNull: { msg: "poolId: Pool ID cannot be null" } },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(50),
                allowNull: false,
                validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                validate: { notEmpty: { msg: "network: Network must not be empty" } },
            },
            kind: {
                type: sequelize_1.DataTypes.ENUM("SOLANA_STAKE_ACCOUNT", "LIDO_SHARES"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["SOLANA_STAKE_ACCOUNT", "LIDO_SHARES"]],
                        msg: "kind: Must be one of: SOLANA_STAKE_ACCOUNT, LIDO_SHARES",
                    },
                },
            },
            stakeAccount: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            seed: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            validatorId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("CREATING", "ACTIVATING", "ACTIVE", "DEACTIVATING", "INACTIVE", "WITHDRAWN", "FAILED"),
                allowNull: false,
                defaultValue: "CREATING",
                validate: {
                    isIn: {
                        args: [
                            ["CREATING", "ACTIVATING", "ACTIVE", "DEACTIVATING", "INACTIVE", "WITHDRAWN", "FAILED"],
                        ],
                        msg: "status: Must be one of: CREATING, ACTIVATING, ACTIVE, DEACTIVATING, INACTIVE, WITHDRAWN, FAILED",
                    },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("amount"),
                validate: { min: { args: [0], msg: "amount: Cannot be negative" } },
            },
            observedValue: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("observedValue"),
            },
            activationEpoch: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            deactivationEpoch: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            lastObservedEpoch: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
            },
            lastObservedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            createBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            exitBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            withdrawBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            failureReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingTranche",
            tableName: "staking_tranches",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "staking_tranches_pool_status_idx", fields: [{ name: "poolId" }, { name: "status" }] },
                { name: "staking_tranches_stake_account_idx", fields: [{ name: "stakeAccount" }] },
                { name: "staking_tranches_validator_idx", fields: [{ name: "validatorId" }] },
            ],
        });
    }
    static associate(models) {
        stakingTranche.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingTranche.belongsTo(models.stakingValidator, {
            foreignKey: "validatorId",
            as: "validator",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingTranche;
