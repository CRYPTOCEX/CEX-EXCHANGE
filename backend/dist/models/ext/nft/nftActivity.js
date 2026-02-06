"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftActivity extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftActivity.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BID", "OFFER", "BURN", "COLLECTION_CREATED", "COLLECTION_DEPLOYED", "AUCTION_ENDED"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BID", "OFFER", "BURN", "COLLECTION_CREATED", "COLLECTION_DEPLOYED", "AUCTION_ENDED"]],
                        msg: "type: Type must be one of 'MINT', 'TRANSFER', 'SALE', 'LIST', 'DELIST', 'BID', 'OFFER', 'BURN', 'COLLECTION_CREATED', 'COLLECTION_DEPLOYED', or 'AUCTION_ENDED'",
                    },
                },
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
            offerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "offerId: Offer ID must be a valid UUID" },
                },
            },
            bidId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "bidId: Bid ID must be a valid UUID" },
                },
            },
            fromUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "fromUserId: From User ID must be a valid UUID" },
                },
            },
            toUserId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "toUserId: To User ID must be a valid UUID" },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                validate: {
                    min: { args: [0], msg: "price: Price must be non-negative" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: true,
            },
            transactionHash: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    is: { args: /^0x[a-fA-F0-9]{64}$/, msg: "transactionHash: Invalid transaction hash format" },
                },
            },
            blockNumber: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: { args: [0], msg: "blockNumber: Block number must be non-negative" },
                },
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
            modelName: "nftActivity",
            tableName: "nft_activity",
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
                    name: "nftActivityTokenIdx",
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
                {
                    name: "nftActivityCollectionIdx",
                    using: "BTREE",
                    fields: [{ name: "collectionId" }],
                },
                {
                    name: "nftActivityTypeIdx",
                    using: "BTREE",
                    fields: [{ name: "type" }],
                },
                {
                    name: "nftActivityFromUserIdx",
                    using: "BTREE",
                    fields: [{ name: "fromUserId" }],
                },
                {
                    name: "nftActivityToUserIdx",
                    using: "BTREE",
                    fields: [{ name: "toUserId" }],
                },
                {
                    name: "nftActivityOfferIdx",
                    using: "BTREE",
                    fields: [{ name: "offerId" }],
                },
                {
                    name: "nftActivityBidIdx",
                    using: "BTREE",
                    fields: [{ name: "bidId" }],
                },
                {
                    name: "nftActivityCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        nftActivity.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftActivity.belongsTo(models.nftCollection, {
            as: "collection",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftActivity.belongsTo(models.nftListing, {
            as: "listing",
            foreignKey: "listingId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftActivity.belongsTo(models.nftOffer, {
            as: "offer",
            foreignKey: "offerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftActivity.belongsTo(models.nftBid, {
            as: "bid",
            foreignKey: "bidId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftActivity.belongsTo(models.user, {
            as: "fromUser",
            foreignKey: "fromUserId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        nftActivity.belongsTo(models.user, {
            as: "toUser",
            foreignKey: "toUserId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftActivity;
