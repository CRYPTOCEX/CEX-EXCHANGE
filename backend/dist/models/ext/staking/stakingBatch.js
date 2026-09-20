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
class stakingBatch extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingBatch.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
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
                type: sequelize_1.DataTypes.ENUM("GATHER", "DELEGATE", "EXIT", "CLAIM", "RETURN", "REFUND", "COMMISSION_EXIT", "SWEEP", "LIQUID_EXIT"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            [
                                "GATHER",
                                "DELEGATE",
                                "EXIT",
                                "CLAIM",
                                "RETURN",
                                "REFUND",
                                "COMMISSION_EXIT",
                                "SWEEP",
                                "LIQUID_EXIT",
                            ],
                        ],
                        msg: "kind: Must be a known batch kind",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "BROADCAST", "CONFIRMED", "RETRYING", "FAILED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "BROADCAST", "CONFIRMED", "RETRYING", "FAILED"]],
                        msg: "status: Must be one of: PENDING, BROADCAST, CONFIRMED, RETRYING, FAILED",
                    },
                },
            },
            stakingWalletId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            intentDigest: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
            },
            intent: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            txHash: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            broadcastMeta: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
            networkFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("networkFee"),
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("amount"),
            },
            attempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: { isInt: { msg: "attempts: Must be an integer" } },
            },
            lastError: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            broadcastAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            confirmedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingBatch",
            tableName: "staking_batches",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "staking_batches_status_kind_idx", fields: [{ name: "status" }, { name: "kind" }] },
                { name: "staking_batches_pool_idx", fields: [{ name: "poolId" }] },
                {
                    name: "staking_batches_tx_hash_key",
                    unique: true,
                    fields: [{ name: "txHash" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingBatch.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
        stakingBatch.belongsTo(models.stakingChainWallet, {
            foreignKey: "stakingWalletId",
            as: "stakingWallet",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingBatch;
