import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class nftOffer
  extends Model<nftOfferAttributes, nftOfferCreationAttributes>
  implements nftOfferAttributes
{
  id!: string;
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
  userId!: string; // Changed from offererId
  /**
   * Who accepted the offer, captured at acceptance.
   *
   * The unwind sweep used to read the seller off `nftToken.ownerId`, which is
   * only correct while ownership has not moved. Now that the payout happens at
   * confirm — AFTER ownership flips to the buyer — `token.ownerId` is the
   * BUYER, so the seller has to be recorded when the offer is accepted.
   */
  sellerId?: string;
  /** Set when a sweep could not resolve the offer and raised a dispute. */
  flaggedAt?: Date;
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
            isUUID: { args: ANY_UUID_VERSION, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "collectionId: Collection ID must be a valid UUID" },
          },
        },
        listingId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "listingId: Listing ID must be a valid UUID" },
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
        sellerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "sellerId: Seller ID must be a valid UUID" },
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
        flaggedAt: {
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
            name: "nftOfferSellerIdx",
            using: "BTREE",
            fields: [{ name: "sellerId" }],
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

    // SET NULL rather than CASCADE: an offer's history must survive the seller
    // closing their account, otherwise the settlement record disappears with
    // them.
    nftOffer.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
} 