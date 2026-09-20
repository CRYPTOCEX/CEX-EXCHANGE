"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("../init");
const model_validators_1 = require("@b/utils/model-validators");
class transferPin extends sequelize_1.Model {
    static initModel(sequelize) {
        return transferPin.init({
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
                    isUUID: {
                        args: model_validators_1.ANY_UUID_VERSION,
                        msg: "userId: User ID must be a valid UUID",
                    },
                },
            },
            pinHash: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "pinHash: PIN hash cannot be empty" },
                },
            },
            enabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            failedAttempts: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            lockoutCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            lockedUntil: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastVerifiedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            lastChangedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "transferPin",
            tableName: "transfer_pin",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "transferPinUserIdKey",
                    unique: true,
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
        transferPin.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = transferPin;
