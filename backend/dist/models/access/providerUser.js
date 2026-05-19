"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("../init");
class providerUser extends sequelize_1.Model {
    static initModel(sequelize) {
        return providerUser.init({
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
            providerUserId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "providerUserId",
                validate: {
                    notNull: {
                        msg: "providerUserId: Provider user ID cannot be null",
                    },
                    len: {
                        args: [1, 255],
                        msg: "providerUserId: Provider user ID must be between 1 and 255 characters",
                    },
                },
            },
            provider: {
                type: sequelize_1.DataTypes.ENUM("GOOGLE", "WALLET"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["GOOGLE", "WALLET"]],
                        msg: "provider: Provider must be 'GOOGLE' or 'WALLET'",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "providerUser",
            tableName: "provider_user",
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
                    name: "providerUserId",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "providerUserId" }],
                },
                {
                    name: "ProviderUserUserIdFkey",
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
        providerUser.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = providerUser;
