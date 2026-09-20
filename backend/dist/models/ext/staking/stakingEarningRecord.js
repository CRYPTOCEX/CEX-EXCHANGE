"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class stakingEarningRecord extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingEarningRecord.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            positionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "positionId: Position ID cannot be null" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Must be a valid number" },
                    min: { args: [0], msg: "amount: Cannot be negative" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("REGULAR", "BONUS", "REFERRAL"),
                allowNull: false,
                defaultValue: "REGULAR",
                validate: {
                    isIn: {
                        args: [["REGULAR", "BONUS", "REFERRAL"]],
                        msg: "type: Must be one of: REGULAR, BONUS, REFERRAL",
                    },
                },
            },
            description: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            isClaimed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            claimedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                validate: {
                    isCoherentWithClaimed(value) {
                        if (value && this.isClaimed === false) {
                            throw new Error("claimedAt: Cannot set claim date when isClaimed is false");
                        }
                    },
                },
            },
            periodBucket: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
            },
            settlement: {
                type: sequelize_1.DataTypes.ENUM("CLAIMABLE", "COMPOUNDED"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["CLAIMABLE", "COMPOUNDED"]],
                        msg: "settlement: Must be one of: CLAIMABLE, COMPOUNDED",
                    },
                },
            },
            observationId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingEarningRecord",
            tableName: "staking_earning_records",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_earning_records_position_idx",
                    fields: [{ name: "positionId" }],
                },
                {
                    name: "staking_earning_records_type_idx",
                    fields: [{ name: "type" }],
                },
                {
                    name: "staking_earning_records_claimed_idx",
                    fields: [{ name: "isClaimed" }],
                },
                {
                    name: "staking_earning_records_position_claimed_idx",
                    fields: [{ name: "positionId" }, { name: "isClaimed" }],
                },
                {
                    name: "staking_earning_records_claimed_at_idx",
                    fields: [{ name: "claimedAt" }],
                },
                {
                    name: "staking_earning_records_observation_idx",
                    fields: [{ name: "observationId" }],
                },
                {
                    name: "staking_earning_records_period_idx",
                    unique: true,
                    fields: [{ name: "positionId" }, { name: "type" }, { name: "periodBucket" }],
                },
                {
                    name: "staking_earning_records_period_idx2",
                    using: "BTREE",
                    fields: [{ name: "periodBucket" }, { name: "positionId" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingEarningRecord.belongsTo(models.stakingPosition, {
            foreignKey: "positionId",
            as: "position",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        stakingEarningRecord.belongsTo(models.stakingObservation, {
            foreignKey: "observationId",
            as: "observation",
            onDelete: "RESTRICT",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingEarningRecord;
