import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftPriceHistory
  extends Model<nftPriceHistoryAttributes, nftPriceHistoryCreationAttributes>
  implements nftPriceHistoryAttributes
{
  id!: string;
  tokenId!: string;
  collectionId?: string;
  price!: number;
  currency!: string;
  priceUSD?: number;
  saleType!: "DIRECT" | "AUCTION" | "OFFER";
  buyerId?: string;
  sellerId?: string;
  transactionHash?: string;
  createdAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftPriceHistory {
    return nftPriceHistory.init(
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
          comment: "ID of the NFT token",
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
          },
          comment: "ID of the NFT collection",
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isFloat: { msg: "price: Price must be a number" },
            min: { args: [0], msg: "price: Price must be positive" },
          },
          comment: "Sale price in the specified currency",
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency cannot be empty" },
          },
          comment: "Currency code (ETH, BNB, MATIC, etc.)",
        },
        priceUSD: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Price converted to USD at time of sale",
        },
        saleType: {
          type: DataTypes.ENUM("DIRECT", "AUCTION", "OFFER"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["DIRECT", "AUCTION", "OFFER"]],
              msg: "saleType: Must be DIRECT, AUCTION, or OFFER",
            },
          },
          comment: "Type of sale",
        },
        buyerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "buyerId: Buyer ID must be a valid UUID" },
          },
          comment: "ID of the buyer",
        },
        sellerId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "sellerId: Seller ID must be a valid UUID" },
          },
          comment: "ID of the seller",
        },
        transactionHash: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Blockchain transaction hash",
        },
      },
      {
        sequelize,
        modelName: "nftPriceHistory",
        tableName: "nft_price_history",
        timestamps: true,
        updatedAt: false, // Only createdAt needed for history
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "nftPriceHistoryTokenIdIdx",
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
          {
            name: "nftPriceHistoryCollectionIdIdx",
            using: "BTREE",
            fields: [{ name: "collectionId" }],
          },
          {
            name: "nftPriceHistoryCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftPriceHistory.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    nftPriceHistory.belongsTo(models.nftCollection, {
      as: "collection",
      foreignKey: "collectionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    nftPriceHistory.belongsTo(models.user, {
      as: "buyer",
      foreignKey: "buyerId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    nftPriceHistory.belongsTo(models.user, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
