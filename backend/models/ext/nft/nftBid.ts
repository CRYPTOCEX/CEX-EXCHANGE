import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class nftBid
  extends Model<nftBidAttributes, nftBidCreationAttributes>
  implements nftBidAttributes
{
  id!: string;
  listingId!: string;
  tokenId?: string;
  userId!: string;
  /** @deprecated Use userId instead */
  get bidderId(): string { return this.userId; }
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
            isUUID: { args: ANY_UUID_VERSION, msg: "listingId: Listing ID must be a valid UUID" },
          },
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("amount");
            return value === null || value === undefined ? value : Number(value);
          },
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
            if (value == null) return null;
            // MySQL returns JSON columns already parsed (object); MariaDB
            // returns the raw string. Only parse when a string arrives.
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
          set(value: any) {
            /*
             * NO JSON.stringify — this column is DataTypes.JSON and Sequelize
             * serialises it on write. Stringifying first stores the TEXT
             * `"{...}"` instead of the VALUE `{...}`, and the getter's single
             * parse then hands back a STRING forever after. That was live on
             * `user.profile`: 15 of 79 rows double-encoded, 11 carrying real
             * customers' data, all of it invisible to the product.
             * A string is still ACCEPTED and unwrapped, because callers exist
             * that pass one; what it must not do is wrap an object.
             */
            if (typeof value === "string") {
              try {
                this.setDataValue("metadata", JSON.parse(value));
              } catch {
                this.setDataValue("metadata", null as any);
              }
              return;
            }
            this.setDataValue("metadata", value ?? (null as any));
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