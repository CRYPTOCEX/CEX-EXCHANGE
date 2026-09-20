import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class nftSale
  extends Model<nftSaleAttributes, nftSaleCreationAttributes>
  implements nftSaleAttributes
{
  id!: string;
  tokenId!: string;
  listingId?: string;
  sellerId!: string;
  buyerId!: string;
  price!: number;
  currency!: string;
  marketplaceFee!: number;
  royaltyFee!: number;
  totalFee!: number;
  netAmount!: number;
  transactionHash?: string;
  blockNumber?: number;
  status!: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftSale {
    return nftSale.init(
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
            isUUID: { args: ANY_UUID_VERSION, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        listingId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "listingId: Listing ID must be a valid UUID" },
          },
        },
        sellerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "sellerId: Seller ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "sellerId: Seller ID must be a valid UUID" },
          },
        },
        buyerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "buyerId: Buyer ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "buyerId: Buyer ID must be a valid UUID" },
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
          allowNull: false,
          validate: {
            min: { args: [0], msg: "price: Price must be positive" },
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
        marketplaceFee: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("marketplaceFee");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "marketplaceFee: Marketplace fee must be non-negative" },
          },
        },
        royaltyFee: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("royaltyFee");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "royaltyFee: Royalty fee must be non-negative" },
          },
        },
        totalFee: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("totalFee");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "totalFee: Total fee must be non-negative" },
          },
        },
        netAmount: {
          type: DataTypes.DECIMAL(36, 18),
          // mysql2 returns DECIMAL as a STRING. `*` and `/` coerce, but `+`
          // CONCATENATES and `<`/`>` compare LEXICOGRAPHICALLY, so every
          // total and every threshold check silently used string semantics.
          // Hand back a number so the arithmetic means what it reads as.
          get(this: any) {
            const value = this.getDataValue("netAmount");
            return value === null || value === undefined ? value : Number(value);
          },
          allowNull: false,
          validate: {
            min: { args: [0], msg: "netAmount: Net amount must be non-negative" },
          },
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
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "COMPLETED", "FAILED", "CANCELLED"]],
              msg: "status: Status must be one of 'PENDING', 'COMPLETED', 'FAILED', or 'CANCELLED'",
            },
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
        modelName: "nftSale",
        tableName: "nft_sale",
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
            name: "nftSaleTokenIdx",
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
          {
            name: "nftSaleListingIdx",
            using: "BTREE",
            fields: [{ name: "listingId" }],
          },
          {
            name: "nftSaleSellerIdx",
            using: "BTREE",
            fields: [{ name: "sellerId" }],
          },
          {
            name: "nftSaleBuyerIdx",
            using: "BTREE",
            fields: [{ name: "buyerId" }],
          },
          {
            name: "nftSaleTransactionHashIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "transactionHash" }],
          },
          {
            name: "nftSaleStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "nftSalePriceIdx",
            using: "BTREE",
            fields: [{ name: "price" }],
          },
          {
            name: "nftSaleCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftSale.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftSale.belongsTo(models.nftListing, {
      as: "listing",
      foreignKey: "listingId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    nftSale.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftSale.belongsTo(models.user, {
      as: "buyer",
      foreignKey: "buyerId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 