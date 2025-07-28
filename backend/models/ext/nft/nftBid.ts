import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftBid
  extends Model<nftBidAttributes, nftBidCreationAttributes>
  implements nftBidAttributes
{
  id!: string;
  listingId!: string;
  bidderId!: string;
  amount!: number;
  currency!: string;
  expiresAt?: Date;
  status!: "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
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
        bidderId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "bidderId: Bidder ID cannot be null" },
            isUUID: { args: 4, msg: "bidderId: Bidder ID must be a valid UUID" },
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
            name: "nftBidBidderIdx",
            using: "BTREE",
            fields: [{ name: "bidderId" }],
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
      as: "bidder",
      foreignKey: "bidderId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 