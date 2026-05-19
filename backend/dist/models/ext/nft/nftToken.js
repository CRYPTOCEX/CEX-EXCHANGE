"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftToken extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftToken.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            collectionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "collectionId: Collection ID cannot be null" },
                    isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
                },
            },
            tokenId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "tokenId: Token ID must not be empty" },
                },
            },
            blockchainTokenId: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "On-chain token ID, set after minting on blockchain",
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Token name must not be empty" },
                    len: { args: [1, 255], msg: "name: Token name must be between 1 and 255 characters" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            image: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            attributes: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("attributes");
                    return value ? JSON.parse(value) : null;
                },
                set(value) {
                    this.setDataValue("attributes", JSON.stringify(value));
                },
            },
            metadataUri: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    isUrl: { msg: "metadataUri: Metadata URI must be a valid URL" },
                },
            },
            metadataHash: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            ownerWalletAddress: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    is: {
                        args: /^0x[a-fA-F0-9]{40}$/,
                        msg: "ownerWalletAddress: Must be a valid Ethereum address",
                    },
                },
            },
            ownerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: { args: 4, msg: "ownerId: Owner ID must be a valid UUID" },
                },
            },
            creatorId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "creatorId: Creator ID cannot be null" },
                    isUUID: { args: 4, msg: "creatorId: Creator ID must be a valid UUID" },
                },
            },
            mintedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            isMinted: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isListed: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            views: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "views: Views must be non-negative" },
                },
            },
            likes: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "likes: Likes must be non-negative" },
                },
            },
            rarity: {
                type: sequelize_1.DataTypes.ENUM("COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]],
                        msg: "rarity: Rarity must be one of 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', or 'LEGENDARY'",
                    },
                },
            },
            rarityScore: {
                type: sequelize_1.DataTypes.DECIMAL(10, 2),
                allowNull: true,
                validate: {
                    min: { args: [0], msg: "rarityScore: Rarity score must be non-negative" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "MINTED", "BURNED"),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: {
                        args: [["DRAFT", "MINTED", "BURNED"]],
                        msg: "status: Status must be one of 'DRAFT', 'MINTED', or 'BURNED'",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "nftToken",
            tableName: "nft_token",
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
                    name: "nftTokenCollectionTokenKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "collectionId" }, { name: "tokenId" }],
                },
                {
                    name: "nftTokenCollectionIdx",
                    using: "BTREE",
                    fields: [{ name: "collectionId" }],
                },
                {
                    name: "nftTokenOwnerIdx",
                    using: "BTREE",
                    fields: [{ name: "ownerId" }],
                },
                {
                    name: "nftTokenCreatorIdx",
                    using: "BTREE",
                    fields: [{ name: "creatorId" }],
                },
                {
                    name: "nftTokenStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "nftTokenListedIdx",
                    using: "BTREE",
                    fields: [{ name: "isListed" }],
                },
            ],
        });
    }
    static associate(models) {
        nftToken.belongsTo(models.nftCollection, {
            as: "collection",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftToken.belongsTo(models.user, {
            as: "owner",
            foreignKey: "ownerId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        nftToken.belongsTo(models.nftCreator, {
            as: "creator",
            foreignKey: "creatorId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftToken.hasMany(models.nftListing, {
            as: "listings",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftToken.hasOne(models.nftListing, {
            as: "currentListing",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
            scope: {
                status: "ACTIVE"
            }
        });
        nftToken.hasMany(models.nftActivity, {
            as: "activities",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftToken.hasMany(models.nftFavorite, {
            as: "favorites",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftToken.hasMany(models.nftSale, {
            as: "sales",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftToken.hasMany(models.nftOffer, {
            as: "offers",
            foreignKey: "tokenId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftToken;
