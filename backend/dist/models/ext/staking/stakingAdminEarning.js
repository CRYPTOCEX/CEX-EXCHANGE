"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class stakingAdminEarning extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingAdminEarning.init({
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
            amount: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                validate: {
                    isFloat: { msg: "amount: Must be a valid number" },
                    min: { args: [0], msg: "amount: Cannot be negative" },
                },
            },
            isClaimed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("PLATFORM_FEE", "EARLY_WITHDRAWAL_FEE", "PERFORMANCE_FEE", "OTHER"),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "type: Type must not be empty" },
                    isIn: {
                        args: [
                            [
                                "PLATFORM_FEE",
                                "EARLY_WITHDRAWAL_FEE",
                                "PERFORMANCE_FEE",
                                "OTHER",
                            ],
                        ],
                        msg: "type: Must be one of: PLATFORM_FEE, EARLY_WITHDRAWAL_FEE, PERFORMANCE_FEE, OTHER",
                    },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
        }, {
            sequelize,
            modelName: "stakingAdminEarning",
            tableName: "staking_admin_earnings",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "staking_admin_earnings_pool_idx",
                    fields: [{ name: "poolId" }],
                },
                {
                    name: "staking_admin_earnings_claimed_idx",
                    fields: [{ name: "isClaimed" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingAdminEarning.belongsTo(models.stakingPool, {
            foreignKey: "poolId",
            as: "pool",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingAdminEarning;
