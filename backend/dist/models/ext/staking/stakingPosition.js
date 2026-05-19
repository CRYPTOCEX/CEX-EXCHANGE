"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
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
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            poolId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "poolId: Pool ID cannot be null" },
                    isUUID: { args: 4, msg: "poolId: Must be a valid UUID" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
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
                        if (new Date(value) >= new Date(this.endDate)) {
                            throw new Error("startDate: Must be before end date");
                        }
                    },
                },
            },
            endDate: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: "endDate: Must be a valid date", args: true },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [
                            ["ACTIVE", "COMPLETED", "CANCELLED", "PENDING_WITHDRAWAL"],
                        ],
                        msg: "status: Must be one of: ACTIVE, COMPLETED, CANCELLED, PENDING_WITHDRAWAL",
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
    }
}
exports.default = stakingPosition;
