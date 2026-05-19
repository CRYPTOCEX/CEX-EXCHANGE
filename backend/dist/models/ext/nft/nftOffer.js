"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftOffer extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftOffer.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
                },
            },
            collectionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
                },
            },
            listingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "listingId: Listing ID must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "amount: Amount must be positive" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "ETH",
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
                },
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"]],
                        msg: "status: Status must be one of 'ACTIVE', 'ACCEPTED', 'REJECTED', 'EXPIRED', or 'CANCELLED'",
                    },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("TOKEN", "COLLECTION"),
                allowNull: true,
            },
            message: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            acceptedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            rejectedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            cancelledAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            expiredAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    return value ? JSON.parse(value) : null;
                },
                set(value) {
                    this.setDataValue("metadata", JSON.stringify(value));
                },
            },
        }, {
            sequelize,
            modelName: "nftOffer",
            tableName: "nft_offer",
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
                    name: "nftOfferTokenIdx",
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
                {
                    name: "nftOfferCollectionIdx",
                    using: "BTREE",
                    fields: [{ name: "collectionId" }],
                },
                {
                    name: "nftOfferListingIdx",
                    using: "BTREE",
                    fields: [{ name: "listingId" }],
                },
                {
                    name: "nftOfferUserIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "nftOfferStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "nftOfferAmountIdx",
                    using: "BTREE",
                    fields: [{ name: "amount" }],
                },
                {
                    name: "nftOfferExpiresAtIdx",
                    using: "BTREE",
                    fields: [{ name: "expiresAt" }],
                },
            ],
        });
    }
    static associate(models) {
        nftOffer.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftOffer.belongsTo(models.nftCollection, {
            as: "collection",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftOffer.belongsTo(models.nftListing, {
            as: "listing",
            foreignKey: "listingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftOffer.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftOffer;
