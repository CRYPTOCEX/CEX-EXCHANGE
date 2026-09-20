"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class nftSale extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftSale.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "tokenId: Token ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "tokenId: Token ID must be a valid UUID" },
                },
            },
            listingId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "listingId: Listing ID must be a valid UUID" },
                },
            },
            sellerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "sellerId: Seller ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "sellerId: Seller ID must be a valid UUID" },
                },
            },
            buyerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "buyerId: Buyer ID cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "buyerId: Buyer ID must be a valid UUID" },
                },
            },
            price: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                get() {
                    const value = this.getDataValue("price");
                    return value === null || value === undefined ? value : Number(value);
                },
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "price: Price must be positive" },
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
            marketplaceFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                get() {
                    const value = this.getDataValue("marketplaceFee");
                    return value === null || value === undefined ? value : Number(value);
                },
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "marketplaceFee: Marketplace fee must be non-negative" },
                },
            },
            royaltyFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                get() {
                    const value = this.getDataValue("royaltyFee");
                    return value === null || value === undefined ? value : Number(value);
                },
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "royaltyFee: Royalty fee must be non-negative" },
                },
            },
            totalFee: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                get() {
                    const value = this.getDataValue("totalFee");
                    return value === null || value === undefined ? value : Number(value);
                },
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "totalFee: Total fee must be non-negative" },
                },
            },
            netAmount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                get() {
                    const value = this.getDataValue("netAmount");
                    return value === null || value === undefined ? value : Number(value);
                },
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "netAmount: Net amount must be non-negative" },
                },
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
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "COMPLETED", "FAILED", "CANCELLED"]],
                        msg: "status: Status must be one of 'PENDING', 'COMPLETED', 'FAILED', or 'CANCELLED'",
                    },
                },
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("metadata");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
                set(value) {
                    if (typeof value === "string") {
                        try {
                            this.setDataValue("metadata", JSON.parse(value));
                        }
                        catch (_a) {
                            this.setDataValue("metadata", null);
                        }
                        return;
                    }
                    this.setDataValue("metadata", value !== null && value !== void 0 ? value : null);
                },
            },
        }, {
            sequelize,
            modelName: "nftSale",
            tableName: "nft_sale",
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
                    name: "nftSaleTokenIdx",
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
                {
                    name: "nftSaleListingIdx",
                    using: "BTREE",
                    fields: [{ name: "listingId" }],
                },
                {
                    name: "nftSaleSellerIdx",
                    using: "BTREE",
                    fields: [{ name: "sellerId" }],
                },
                {
                    name: "nftSaleBuyerIdx",
                    using: "BTREE",
                    fields: [{ name: "buyerId" }],
                },
                {
                    name: "nftSaleTransactionHashIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "transactionHash" }],
                },
                {
                    name: "nftSaleStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "nftSalePriceIdx",
                    using: "BTREE",
                    fields: [{ name: "price" }],
                },
                {
                    name: "nftSaleCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        nftSale.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftSale.belongsTo(models.nftListing, {
            as: "listing",
            foreignKey: "listingId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        nftSale.belongsTo(models.user, {
            as: "seller",
            foreignKey: "sellerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftSale.belongsTo(models.user, {
            as: "buyer",
            foreignKey: "buyerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftSale;
