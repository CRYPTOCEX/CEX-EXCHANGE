import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftListing
  extends Model<nftListingAttributes, nftListingCreationAttributes>
  implements nftListingAttributes
{
  id!: string;
  tokenId!: string;
  sellerId!: string;
  type!: "FIXED_PRICE" | "AUCTION" | "BUNDLE";
  price?: number;
  currency!: string;
  reservePrice?: number;
  buyNowPrice?: number;
  startTime?: Date;
  endTime?: Date;
  status!: "ACTIVE" | "SOLD" | "CANCELLED" | "EXPIRED";
  views?: number;
  likes?: number;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftListing {
    return nftListing.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "tokenId: Token ID cannot be null" },
            isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        sellerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "sellerId: Seller ID cannot be null" },
            isUUID: { args: 4, msg: "sellerId: Seller ID must be a valid UUID" },
          },
        },
        type: {
          type: DataTypes.ENUM("FIXED_PRICE", "AUCTION", "BUNDLE"),
          allowNull: false,
          defaultValue: "FIXED_PRICE",
          validate: {
            isIn: {
              args: [["FIXED_PRICE", "AUCTION", "BUNDLE"]],
              msg: "type: Type must be one of 'FIXED_PRICE', 'AUCTION', or 'BUNDLE'",
            },
          },
        },
        price: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          validate: {
            min: { args: [0], msg: "price: Price must be non-negative" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "ETH",
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        reservePrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          validate: {
            min: { args: [0], msg: "reservePrice: Reserve price must be non-negative" },
          },
        },
        buyNowPrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          validate: {
            min: { args: [0], msg: "buyNowPrice: Buy now price must be non-negative" },
          },
        },
        startTime: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        endTime: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "SOLD", "CANCELLED", "EXPIRED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "SOLD", "CANCELLED", "EXPIRED"]],
              msg: "status: Status must be one of 'ACTIVE', 'SOLD', 'CANCELLED', or 'EXPIRED'",
            },
          },
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
        modelName: "nftListing",
        tableName: "nft_listing",
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
            name: "nftListingTokenIdx",
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
          {
            name: "nftListingSellerIdx",
            using: "BTREE",
            fields: [{ name: "sellerId" }],
          },
          {
            name: "nftListingStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "nftListingTypeIdx",
            using: "BTREE",
            fields: [{ name: "type" }],
          },
          {
            name: "nftListingPriceIdx",
            using: "BTREE",
            fields: [{ name: "price" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftListing.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftListing.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftListing.hasMany(models.nftBid, {
      as: "bids",
      foreignKey: "listingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftListing.hasMany(models.nftOffer, {
      as: "offers",
      foreignKey: "listingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftListing.hasMany(models.nftActivity, {
      as: "activities",
      foreignKey: "listingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 