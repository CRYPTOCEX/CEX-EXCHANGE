import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export default class nftOffer
  extends Model<nftOfferAttributes, nftOfferCreationAttributes>
  implements nftOfferAttributes
{
  id!: string;
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
  userId!: string; // Changed from offererId
  amount!: number;
  currency!: string;
  expiresAt?: Date;
  status!: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  type?: "TOKEN" | "COLLECTION";
  message?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  expiredAt?: Date;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftOffer {
    return nftOffer.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
          },
        },
        listingId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "listingId: Listing ID must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          validate: {
            min: { args: [0], msg: "amount: Amount must be positive" },
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
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"),
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
          type: DataTypes.ENUM("TOKEN", "COLLECTION"),
          allowNull: true,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        acceptedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        rejectedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        cancelledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        expiredAt: {
          type: DataTypes.DATE,
          allowNull: true,
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
      }
    );
  }

  public static associate(models: any) {
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