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
                type: sequelize_1.DataTypes.FLOAT,
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
    }
}
exports.default = stakingEarningRecord;
