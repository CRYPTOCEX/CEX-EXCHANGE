import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftActivity
  extends Model<nftActivityAttributes, nftActivityCreationAttributes>
  implements nftActivityAttributes
{
  id!: string;
  type!: "MINT" | "TRANSFER" | "SALE" | "LIST" | "DELIST" | "BID" | "OFFER" | "BURN";
  tokenId?: string;
  collectionId?: string;
  listingId?: string;
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
          type: DataTypes.ENUM("MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BID", "OFFER", "BURN"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["MINT", "TRANSFER", "SALE", "LIST", "DELIST", "BID", "OFFER", "BURN"]],
              msg: "type: Type must be one of 'MINT', 'TRANSFER', 'SALE', 'LIST', 'DELIST', 'BID', 'OFFER', or 'BURN'",
            },
          },
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
        fromUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "fromUserId: From User ID must be a valid UUID" },
          },
        },
        toUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "toUserId: To User ID must be a valid UUID" },
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
            return value ? JSON.parse(value as any) : null;
          },
          set(value) {
            this.setDataValue("metadata", JSON.stringify(value));
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