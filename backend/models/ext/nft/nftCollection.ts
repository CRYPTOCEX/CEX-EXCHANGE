import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftCollection
  extends Model<nftCollectionAttributes, nftCollectionCreationAttributes>
  implements nftCollectionAttributes
{
  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  symbol!: string;
  contractAddress?: string;
  chain!: string;
  network!: string;
  standard!: "ERC721" | "ERC1155";
  totalSupply?: number;
  maxSupply?: number;
  mintPrice?: number;
  currency?: string;
  royaltyPercentage?: number;
  royaltyAddress?: string;
  creatorId!: string;
  categoryId?: string;
  bannerImage?: string;
  logoImage?: string;
  featuredImage?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  telegram?: string;
  isVerified?: boolean;
  isLazyMinted?: boolean;
  status!: "DRAFT" | "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftCollection {
    return nftCollection.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Collection name must not be empty" },
            len: { args: [1, 255], msg: "name: Collection name must be between 1 and 255 characters" },
          },
        },
        slug: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "nftCollectionSlugKey",
          validate: {
            notEmpty: { msg: "slug: Slug must not be empty" },
            is: { args: /^[a-z0-9-]+$/, msg: "slug: Slug must contain only lowercase letters, numbers, and hyphens" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        symbol: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
            len: { args: [1, 10], msg: "symbol: Symbol must be between 1 and 10 characters" },
          },
        },
        contractAddress: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            is: { args: /^0x[a-fA-F0-9]{40}$/, msg: "contractAddress: Invalid contract address format" },
          },
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain must not be empty" },
          },
        },
        network: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: "mainnet",
          validate: {
            notEmpty: { msg: "network: Network must not be empty" },
          },
        },
        standard: {
          type: DataTypes.ENUM("ERC721", "ERC1155"),
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
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "totalSupply: Total supply must be non-negative" },
          },
        },
        maxSupply: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: { args: [1], msg: "maxSupply: Max supply must be positive" },
          },
        },
        mintPrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          validate: {
            min: { args: [0], msg: "mintPrice: Mint price must be non-negative" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: true,
          defaultValue: "ETH",
        },
        royaltyPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 2.5,
          validate: {
            min: { args: [0], msg: "royaltyPercentage: Royalty percentage must be non-negative" },
            max: { args: [50], msg: "royaltyPercentage: Royalty percentage cannot exceed 50%" },
          },
        },
        royaltyAddress: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            is: { args: /^0x[a-fA-F0-9]{40}$/, msg: "royaltyAddress: Invalid royalty address format" },
          },
        },
        creatorId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "creatorId: Creator ID cannot be null" },
            isUUID: { args: 4, msg: "creatorId: Creator ID must be a valid UUID" },
          },
        },
        categoryId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "categoryId: Category ID must be a valid UUID" },
          },
        },
        bannerImage: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "bannerImage: Banner image must be a valid URL",
            },
          },
        },
        logoImage: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "logoImage: Logo image must be a valid URL",
            },
          },
        },
        featuredImage: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "featuredImage: Featured image must be a valid URL",
            },
          },
        },
        website: {
          type: DataTypes.STRING(500),
          allowNull: true,
          validate: {
            isUrl: { msg: "website: Website must be a valid URL" },
          },
        },
        discord: {
          type: DataTypes.STRING(500),
          allowNull: true,
          validate: {
            isUrl: { msg: "discord: Discord must be a valid URL" },
          },
        },
        twitter: {
          type: DataTypes.STRING(500),
          allowNull: true,
          validate: {
            isUrl: { msg: "twitter: Twitter must be a valid URL" },
          },
        },
        telegram: {
          type: DataTypes.STRING(500),
          allowNull: true,
          validate: {
            isUrl: { msg: "telegram: Telegram must be a valid URL" },
          },
        },
        isVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isLazyMinted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"),
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
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("metadata");
            return value ? JSON.parse(value as any) : null;
          },
          set(value) {
            this.setDataValue("metadata", JSON.stringify(value));
          },
        },
      },
      {
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
      }
    );
  }

  public static associate(models: any) {
    nftCollection.belongsTo(models.user, {
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

    // No direct association to nftSale - access through tokens
  }
} 