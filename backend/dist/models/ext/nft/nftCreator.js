"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftCreator extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftCreator.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: "nftCreatorUserKey",
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            displayName: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    len: { args: [1, 255], msg: "displayName: Display name must be between 1 and 255 characters" },
                },
            },
            bio: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: { args: [0, 1000], msg: "bio: Bio must not exceed 1000 characters" },
                },
            },
            banner: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "banner: Banner must be a valid URL",
                    },
                },
            },
            isVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            verificationTier: {
                type: sequelize_1.DataTypes.ENUM("BRONZE", "SILVER", "GOLD", "PLATINUM"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["BRONZE", "SILVER", "GOLD", "PLATINUM"]],
                        msg: "verificationTier: Verification tier must be one of 'BRONZE', 'SILVER', 'GOLD', or 'PLATINUM'",
                    },
                },
            },
            totalSales: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "totalSales: Total sales must be non-negative" },
                },
            },
            totalVolume: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "totalVolume: Total volume must be non-negative" },
                },
            },
            totalItems: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "totalItems: Total items must be non-negative" },
                },
            },
            floorPrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                validate: {
                    min: { args: [0], msg: "floorPrice: Floor price must be non-negative" },
                },
            },
            profilePublic: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "nftCreator",
            tableName: "nft_creator",
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
                    name: "nftCreatorUserKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "nftCreatorVerifiedIdx",
                    using: "BTREE",
                    fields: [{ name: "isVerified" }],
                },
                {
                    name: "nftCreatorTierIdx",
                    using: "BTREE",
                    fields: [{ name: "verificationTier" }],
                },
                {
                    name: "nftCreatorVolumeIdx",
                    using: "BTREE",
                    fields: [{ name: "totalVolume" }],
                },
            ],
        });
    }
    static associate(models) {
        nftCreator.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftCreator.hasMany(models.nftCollection, {
            as: "collections",
            foreignKey: "creatorId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftCreator.hasMany(models.nftToken, {
            as: "tokens",
            foreignKey: "creatorId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftCreator;
