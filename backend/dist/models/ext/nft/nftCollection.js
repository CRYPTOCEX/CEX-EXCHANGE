"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class nftCollection extends sequelize_1.Model {
    static initModel(sequelize) {
        return nftCollection.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Collection name must not be empty" },
                    len: { args: [1, 255], msg: "name: Collection name must be between 1 and 255 characters" },
                },
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "nftCollectionSlugKey",
                validate: {
                    notEmpty: { msg: "slug: Slug must not be empty" },
                    is: { args: /^[a-z0-9-]+$/, msg: "slug: Slug must contain only lowercase letters, numbers, and hyphens" },
                },
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                    len: { args: [1, 10], msg: "symbol: Symbol must be between 1 and 10 characters" },
                },
            },
            contractAddress: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    is: { args: /^0x[a-fA-F0-9]{40}$/, msg: "contractAddress: Invalid contract address format" },
                },
            },
            chain: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "chain: Chain must not be empty" },
                },
            },
            network: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                defaultValue: "mainnet",
                validate: {
                    notEmpty: { msg: "network: Network must not be empty" },
                },
            },
            standard: {
                type: sequelize_1.DataTypes.ENUM("ERC721", "ERC1155"),
                allowNull: false,
                defaultValue: "ERC721",
                validate: {
                    isIn: {
                        args: [["ERC721", "ERC1155"]],
                        msg: "standard: Standard must be either 'ERC721' or 'ERC1155'",
                    },
                },
            },
            totalSupply: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: "totalSupply: Total supply must be non-negative" },
                },
            },
            maxSupply: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: { args: [1], msg: "maxSupply: Max supply must be positive" },
                },
            },
            mintPrice: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: true,
                validate: {
                    min: { args: [0], msg: "mintPrice: Mint price must be non-negative" },
                },
            },
            currency: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: true,
                defaultValue: "ETH",
            },
            royaltyPercentage: {
                type: sequelize_1.DataTypes.DECIMAL(5, 2),
                allowNull: true,
                defaultValue: 2.5,
                validate: {
                    min: { args: [0], msg: "royaltyPercentage: Royalty percentage must be non-negative" },
                    max: { args: [50], msg: "royaltyPercentage: Royalty percentage cannot exceed 50%" },
                },
            },
            royaltyAddress: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    is: { args: /^0x[a-fA-F0-9]{40}$/, msg: "royaltyAddress: Invalid royalty address format" },
                },
            },
            creatorId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "creatorId: Creator ID cannot be null" },
                },
            },
            categoryId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            bannerImage: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "bannerImage: Banner image must be a valid URL",
                    },
                },
            },
            logoImage: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "logoImage: Logo image must be a valid URL",
                    },
                },
            },
            featuredImage: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
                validate: {
                    is: {
                        args: ["^/(uploads|img)/.*$", "i"],
                        msg: "featuredImage: Featured image must be a valid URL",
                    },
                },
            },
            website: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    isUrl: { msg: "website: Website must be a valid URL" },
                },
            },
            discord: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    isUrl: { msg: "discord: Discord must be a valid URL" },
                },
            },
            twitter: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    isUrl: { msg: "twitter: Twitter must be a valid URL" },
                },
            },
            telegram: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    isUrl: { msg: "telegram: Telegram must be a valid URL" },
                },
            },
            isVerified: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            isLazyMinted: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            isPublicMintEnabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: "Whether public minting is enabled on the smart contract. True by default for marketplace collections.",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: {
                        args: [["DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"]],
                        msg: "status: Status must be one of 'DRAFT', 'PENDING', 'ACTIVE', 'INACTIVE', or 'SUSPENDED'",
                    },
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
            modelName: "nftCollection",
            tableName: "nft_collection",
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
                    name: "nftCollectionSlugKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
                {
                    name: "nftCollectionCreatorIdx",
                    using: "BTREE",
                    fields: [{ name: "creatorId" }],
                },
                {
                    name: "nftCollectionChainIdx",
                    using: "BTREE",
                    fields: [{ name: "chain" }],
                },
                {
                    name: "nftCollectionStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        nftCollection.belongsTo(models.nftCreator, {
            as: "creator",
            foreignKey: "creatorId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftCollection.belongsTo(models.nftCategory, {
            as: "category",
            foreignKey: "categoryId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
        nftCollection.hasMany(models.nftToken, {
            as: "tokens",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        nftCollection.hasMany(models.nftActivity, {
            as: "activities",
            foreignKey: "collectionId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = nftCollection;
