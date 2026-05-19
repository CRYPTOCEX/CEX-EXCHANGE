"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("../init");
class twoFactor extends sequelize_1.Model {
    static initModel(sequelize) {
        return twoFactor.init({
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
            secret: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "secret: Secret cannot be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("EMAIL", "SMS", "APP"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["EMAIL", "SMS", "APP"]],
                        msg: "type: Type must be one of ['EMAIL', 'SMS', 'APP']",
                    },
                },
            },
            enabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            recoveryCodes: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "twoFactor",
            tableName: "two_factor",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "twoFactorUserIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "twoFactorUserIdForeign",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
            hooks: {
                ...(0, init_1.createUserCacheHooks)(),
            },
        });
    }
    static associate(models) {
        twoFactor.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = twoFactor;
