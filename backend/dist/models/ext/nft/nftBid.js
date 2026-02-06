"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftBid extends sequelize_1.Model {
    get bidderId() { return this.userId; }
    static initModel(sequelize) {
        return nftBid.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            listingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "listingId: Listing ID cannot be null" },
                    isUUID: { args: 4, msg: "listingId: Listing ID must be a valid UUID" },
                },
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
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
            transactionHash: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            expiresAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "OUTBID"),
                allowNull: false,
                defaultValue: "ACTIVE",
                validate: {
                    isIn: {
                        args: [["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "OUTBID"]],
                        msg: "status: Status must be one of 'ACTIVE', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', or 'OUTBID'",
                    },
                },
            },
            acceptedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            rejectedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            outbidAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            cancelledAt: {
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
            modelName: "nftBid",
            tableName: "nft_bid",
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
                    name: "nftBidListingIdx",
                    using: "BTREE",
                    fields: [{ name: "listingId" }],
                },
                {
                    name: "nftBidUserIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "nftBidTokenIdx",
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
                {
                    name: "nftBidStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "nftBidAmountIdx",
                    using: "BTREE",
                    fields: [{ name: "amount" }],
                },
                {
                    name: "nftBidExpiresAtIdx",
                    using: "BTREE",
                    fields: [{ name: "expiresAt" }],
                },
            ],
        });
    }
    static associate(models) {
        nftBid.belongsTo(models.nftListing, {
            as: "listing",
            foreignKey: "listingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftBid.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftBid.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftBid;
