import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export default class nftBid
  extends Model<nftBidAttributes, nftBidCreationAttributes>
  implements nftBidAttributes
{
  id!: string;
  listingId!: string;
  tokenId?: string;
  userId!: string; // Changed from bidderId
  amount!: number;
  currency!: string;
  transactionHash?: string;
  expiresAt?: Date;
  status!: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED" | "OUTBID";
  acceptedAt?: Date;
  rejectedAt?: Date;
  outbidAt?: Date;
  cancelledAt?: Date;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftBid {
    return nftBid.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        listingId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "listingId: Listing ID cannot be null" },
            isUUID: { args: 4, msg: "listingId: Listing ID must be a valid UUID" },
          },
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
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
        transactionHash: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "OUTBID"),
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
          type: DataTypes.DATE,
          allowNull: true,
        },
        rejectedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        outbidAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        cancelledAt: {
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
      }
    );
  }

  public static associate(models: any) {
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