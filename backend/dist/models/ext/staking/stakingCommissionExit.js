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
class stakingCommissionExit extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingCommissionExit.init({
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
            status: {
                type: sequelize_1.DataTypes.ENUM("QUEUED", "UNBONDING", "SETTLED", "PAID", "FAILED"),
                allowNull: false,
                defaultValue: "QUEUED",
                validate: {
                    isIn: {
                        args: [["QUEUED", "UNBONDING", "SETTLED", "PAID", "FAILED"]],
                        msg: "status: Must be one of: QUEUED, UNBONDING, SETTLED, PAID, FAILED",
                    },
                },
            },
            shares: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("shares"),
            },
            requestSharePrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 1,
                get: decimalGetter("requestSharePrice"),
            },
            requestedValue: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("requestedValue"),
            },
            settledAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                get: decimalGetter("settledAmount"),
            },
            settledAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            destination: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            exitBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            payoutBatchId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            txHash: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            networkFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("networkFee"),
            },
            failureReason: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            requestedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            requestedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            paidAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingCommissionExit",
            tableName: "staking_commission_exits",
            timestamps: true,
            paranoid: false,
            indexes: [
                { name: "staking_commission_exits_pool_status_idx", fields: [{ name: "poolId" }, { name: "status" }] },
                { name: "staking_commission_exits_payout_idx", fields: [{ name: "payoutBatchId" }] },
            ],
        });
    }
    static associate(models) {
        stakingCommissionExit.belongsTo(models.stakingPool, {
            as: "pool",
            foreignKey: "poolId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingCommissionExit;
