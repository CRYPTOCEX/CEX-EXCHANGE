import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftToken
  extends Model<nftTokenAttributes, nftTokenCreationAttributes>
  implements nftTokenAttributes
{
  id!: string;
  collectionId!: string;
  tokenId!: string;
  name!: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: any;
  metadataUri?: string;
  metadataHash?: string;
  ownerId?: string;
  creatorId!: string;
  mintedAt?: Date;
  isMinted!: boolean;
  isListed!: boolean;
  views?: number;
  likes?: number;
  rarity?: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
  rarityScore?: number;
  status!: "DRAFT" | "MINTED" | "BURNED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftToken {
    return nftToken.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "collectionId: Collection ID cannot be null" },
            isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
          },
        },
        tokenId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "tokenId: Token ID must not be empty" },
          },
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Token name must not be empty" },
            len: { args: [1, 255], msg: "name: Token name must be between 1 and 255 characters" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
        },
        animationUrl: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            isUrl: { msg: "animationUrl: Animation URL must be a valid URL" },
          },
        },
        externalUrl: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            isUrl: { msg: "externalUrl: External URL must be a valid URL" },
          },
        },
        attributes: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("attributes");
            return value ? JSON.parse(value as any) : null;
          },
          set(value) {
            this.setDataValue("attributes", JSON.stringify(value));
          },
        },
        metadataUri: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            isUrl: { msg: "metadataUri: Metadata URI must be a valid URL" },
          },
        },
        metadataHash: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        ownerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "ownerId: Owner ID must be a valid UUID" },
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
        mintedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isMinted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isListed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        views: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "views: Views must be non-negative" },
          },
        },
        likes: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "likes: Likes must be non-negative" },
          },
        },
        rarity: {
          type: DataTypes.ENUM("COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]],
              msg: "rarity: Rarity must be one of 'COMMON', 'UNCOMMON', 'RARE', 'EPIC', or 'LEGENDARY'",
            },
          },
        },
        rarityScore: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          validate: {
            min: { args: [0], msg: "rarityScore: Rarity score must be non-negative" },
          },
        },
        status: {
          type: DataTypes.ENUM("DRAFT", "MINTED", "BURNED"),
          allowNull: false,
          defaultValue: "DRAFT",
          validate: {
            isIn: {
              args: [["DRAFT", "MINTED", "BURNED"]],
              msg: "status: Status must be one of 'DRAFT', 'MINTED', or 'BURNED'",
            },
          },
        },
      },
      {
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
      }
    );
  }

  public static associate(models: any) {
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

    nftToken.belongsTo(models.user, {
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

    // nftBid access should be through nftListing, not directly
  }
} 