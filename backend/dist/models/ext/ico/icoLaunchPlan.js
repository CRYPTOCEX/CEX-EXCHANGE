"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class icoLaunchPlan extends sequelize_1.Model {
    static initModel(sequelize) {
        return icoLaunchPlan.init({
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
                    notEmpty: { msg: "name: Launch plan name must not be empty" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "description: Description must not be empty" },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(18, 2),
                allowNull: false,
                validate: {
                    isFloat: { msg: "price: Must be a valid number" },
                    min: { args: [0], msg: "price: Cannot be negative" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            walletType: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "walletType: Wallet type must not be empty" },
                },
            },
            features: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: false,
            },
            recommended: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            sortOrder: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        }, {
            sequelize,
            modelName: "icoLaunchPlan",
            tableName: "ico_launch_plan",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
    static associate(models) {
        icoLaunchPlan.hasMany(models.icoTokenOffering, {
            foreignKey: "planId",
            as: "offerings",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = icoLaunchPlan;
