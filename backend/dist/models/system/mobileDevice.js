"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class mobileDevice extends sequelize_1.Model {
    static initModel(sequelize) {
        return mobileDevice.init({
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
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
                },
            },
            deviceId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "deviceId: Device identifier must not be empty" },
                },
            },
            platform: {
                type: sequelize_1.DataTypes.ENUM("ios", "android"),
                allowNull: false,
            },
            pushToken: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "pushToken: Push token must not be empty" },
                },
            },
            appVersion: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            locale: {
                type: sequelize_1.DataTypes.STRING(16),
                allowNull: true,
            },
            lastSeenAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            revokedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "mobileDevice",
            tableName: "mobile_device",
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
                    name: "mobileDeviceUserDeviceIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "deviceId" }],
                },
            ],
        });
    }
    static associate(models) {
        mobileDevice.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = mobileDevice;
