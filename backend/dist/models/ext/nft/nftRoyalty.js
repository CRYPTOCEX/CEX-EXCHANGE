"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftRoyalty extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftRoyalty.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            saleId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "saleId: Sale ID cannot be null" },
                    isUUID: { args: 4, msg: "saleId: Sale ID must be a valid UUID" },
                },
            },
            tokenId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "tokenId: Token ID cannot be null" },
                    isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
                },
            },
            collectionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "collectionId: Collection ID cannot be null" },
                    isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
                },
            },
            recipientId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "recipientId: Recipient ID cannot be null" },
                    isUUID: { args: 4, msg: "recipientId: Recipient ID must be a valid UUID" },
                },
            },
            amount: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "amount: Amount must be non-negative" },
                },
            },
            percentage: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: false,
                validate: {
                    min: { args: [0], msg: "percentage: Percentage must be non-negative" },
                    max: { args: [100], msg: "percentage: Percentage cannot exceed 100%" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "currency: Currency must not be empty" },
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
                type: sequelize_1.DataTypes.ENUM("PENDING", "PAID", "FAILED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "PAID", "FAILED"]],
                        msg: "status: Status must be one of 'PENDING', 'PAID', or 'FAILED'",
                    },
                },
            },
            paidAt: {
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
            modelName: "nftRoyalty",
            tableName: "nft_royalty",
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
                    name: "nftRoyaltySaleIdx",
                    using: "BTREE",
                    fields: [{ name: "saleId" }],
                },
                {
                    name: "nftRoyaltyTokenIdx",
                    using: "BTREE",
                    fields: [{ name: "tokenId" }],
                },
                {
                    name: "nftRoyaltyCollectionIdx",
                    using: "BTREE",
                    fields: [{ name: "collectionId" }],
                },
                {
                    name: "nftRoyaltyRecipientIdx",
                    using: "BTREE",
                    fields: [{ name: "recipientId" }],
                },
                {
                    name: "nftRoyaltyStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "nftRoyaltyCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
            ],
        });
    }
    static associate(models) {
        nftRoyalty.belongsTo(models.nftSale, {
            as: "sale",
            foreignKey: "saleId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftRoyalty.belongsTo(models.nftToken, {
            as: "token",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftRoyalty.belongsTo(models.nftCollection, {
            as: "collection",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftRoyalty.belongsTo(models.user, {
            as: "recipient",
            foreignKey: "recipientId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftRoyalty;
