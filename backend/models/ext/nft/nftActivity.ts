import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class nftActivity
  extends Model<nftActivityAttributes, nftActivityCreationAttributes>
  implements nftActivityAttributes
{
  id!: string;
  type!: "MINT" | "TRANSFER" | "SALE" | "LIST" | "DELIST" | "BID" | "OFFER" | "BURN" | "COLLECTION_CREATED" | "COLLECTION_DEPLOYED" | "AUCTION_ENDED";
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
  offerId?: string;
  bidId?: string;
  fromUserId?: string;
  toUserId?: string;
  price?: number;
  currency?: string;
  transactionHash?: string;
  blockNumber?: number;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftActivity {
    return nftActivity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BID", "OFFER", "BURN", "COLLECTION_CREATED", "COLLECTION_DEPLOYED", "AUCTION_ENDED"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BID", "OFFER", "BURN", "COLLECTION_CREATED", "COLLECTION_DEPLOYED", "AUCTION_ENDED"]],
              msg: "type: Type must be one of 'MINT', 'TRANSFER', 'SALE', 'LIST', 'DELIST', 'BID', 'OFFER', 'BURN', 'COLLECTION_CREATED', 'COLLECTION_DEPLOYED', or 'AUCTION_ENDED'",
            },
          },
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
        offerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "offerId: Offer ID must be a valid UUID" },
          },
        },
        bidId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "bidId: Bid ID must be a valid UUID" },
          },
        },
        fromUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "fromUserId: From User ID must be a valid UUID" },
          },
        },
        toUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "toUserId: To User ID must be a valid UUID" },
          },
        },
        price: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("price");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: true,
          validate: {
            min: { args: [0], msg: "price: Price must be non-negative" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: true,
        },
        transactionHash: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            is: { args: /^0x[a-fA-F0-9]{64}$/, msg: "transactionHash: Invalid transaction hash format" },
          },
        },
        blockNumber: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            min: { args: [0], msg: "blockNumber: Block number must be non-negative" },
          },
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
        modelName: "nftActivity",
        tableName: "nft_activity",
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
            name: "nftActivityTokenIdx",
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
          {
            name: "nftActivityCollectionIdx",
            using: "BTREE",
            fields: [{ name: "collectionId" }],
          },
          {
            name: "nftActivityTypeIdx",
            using: "BTREE",
            fields: [{ name: "type" }],
          },
          {
            name: "nftActivityFromUserIdx",
            using: "BTREE",
            fields: [{ name: "fromUserId" }],
          },
          {
            name: "nftActivityToUserIdx",
            using: "BTREE",
            fields: [{ name: "toUserId" }],
          },
          {
            name: "nftActivityOfferIdx",
            using: "BTREE",
            fields: [{ name: "offerId" }],
          },
          {
            name: "nftActivityBidIdx",
            using: "BTREE",
            fields: [{ name: "bidId" }],
          },
          {
            name: "nftActivityCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftActivity.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftActivity.belongsTo(models.nftCollection, {
      as: "collection",
      foreignKey: "collectionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftActivity.belongsTo(models.nftListing, {
      as: "listing",
      foreignKey: "listingId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftActivity.belongsTo(models.nftOffer, {
      as: "offer",
      foreignKey: "offerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftActivity.belongsTo(models.nftBid, {
      as: "bid",
      foreignKey: "bidId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftActivity.belongsTo(models.user, {
      as: "fromUser",
      foreignKey: "fromUserId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    nftActivity.belongsTo(models.user, {
      as: "toUser",
      foreignKey: "toUserId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
} 