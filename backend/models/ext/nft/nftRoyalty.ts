import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftRoyalty
  extends Model<nftRoyaltyAttributes, nftRoyaltyCreationAttributes>
  implements nftRoyaltyAttributes
{
  id!: string;
  saleId!: string;
  tokenId!: string;
  collectionId!: string;
  recipientId!: string;
  amount!: number;
  percentage!: number;
  currency!: string;
  transactionHash?: string;
  blockNumber?: number;
  status!: "PENDING" | "PAID" | "FAILED";
  paidAt?: Date;
  metadata?: any;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftRoyalty {
    return nftRoyalty.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        saleId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "saleId: Sale ID cannot be null" },
            isUUID: { args: 4, msg: "saleId: Sale ID must be a valid UUID" },
          },
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "tokenId: Token ID cannot be null" },
            isUUID: { args: 4, msg: "tokenId: Token ID must be a valid UUID" },
          },
        },
        collectionId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "collectionId: Collection ID cannot be null" },
            isUUID: { args: 4, msg: "collectionId: Collection ID must be a valid UUID" },
          },
        },
        recipientId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "recipientId: Recipient ID cannot be null" },
            isUUID: { args: 4, msg: "recipientId: Recipient ID must be a valid UUID" },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          validate: {
            min: { args: [0], msg: "amount: Amount must be non-negative" },
          },
        },
        percentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          validate: {
            min: { args: [0], msg: "percentage: Percentage must be non-negative" },
            max: { args: [100], msg: "percentage: Percentage cannot exceed 100%" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
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
          type: DataTypes.ENUM("PENDING", "PAID", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "PAID", "FAILED"]],
              msg: "status: Status must be one of 'PENDING', 'PAID', or 'FAILED'",
            },
          },
        },
        paidAt: {
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
        modelName: "nftRoyalty",
        tableName: "nft_royalty",
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
            name: "nftRoyaltySaleIdx",
            using: "BTREE",
            fields: [{ name: "saleId" }],
          },
          {
            name: "nftRoyaltyTokenIdx",
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
          {
            name: "nftRoyaltyCollectionIdx",
            using: "BTREE",
            fields: [{ name: "collectionId" }],
          },
          {
            name: "nftRoyaltyRecipientIdx",
            using: "BTREE",
            fields: [{ name: "recipientId" }],
          },
          {
            name: "nftRoyaltyStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "nftRoyaltyCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftRoyalty.belongsTo(models.nftSale, {
      as: "sale",
      foreignKey: "saleId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftRoyalty.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftRoyalty.belongsTo(models.nftCollection, {
      as: "collection",
      foreignKey: "collectionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    nftRoyalty.belongsTo(models.user, {
      as: "recipient",
      foreignKey: "recipientId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
} 