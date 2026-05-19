import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

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
            isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        listingId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "listingId: Listing ID must be a valid UUID" },
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
        buyerId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "buyerId: Buyer ID cannot be null" },
            isUUID: { args: 4, msg: "buyerId: Buyer ID must be a valid UUID" },
          },
        },
        price: {
          type: DataTypes.DECIMAL(36, 18),
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
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "marketplaceFee: Marketplace fee must be non-negative" },
          },
        },
        royaltyFee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "royaltyFee: Royalty fee must be non-negative" },
          },
        },
        totalFee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "totalFee: Total fee must be non-negative" },
          },
        },
        netAmount: {
          type: DataTypes.DECIMAL(36, 18),
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
            return value ? JSON.parse(value as any) : null;
          },
          set(value) {
            this.setDataValue("metadata", JSON.stringify(value));
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