import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftFractional
  extends Model<nftFractionalAttributes, nftFractionalCreationAttributes>
  implements nftFractionalAttributes
{
  id!: string;
  tokenId!: string;
  vaultAddress?: string;
  totalShares!: number;
  availableShares!: number;
  sharePrice!: number;
  currency!: string;
  minPurchase!: number;
  maxPurchase!: number;
  buyoutPrice?: number;
  buyoutEnabled!: boolean;
  votingEnabled!: boolean;
  status!: "PENDING" | "ACTIVE" | "BUYOUT_PENDING" | "BOUGHT_OUT" | "CANCELLED";
  createdById!: string;
  deployedAt?: Date;
  buyoutAt?: Date;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftFractional {
    return nftFractional.init(
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
          unique: true,
          validate: {
            notNull: { msg: "tokenId: Token ID is required" },
            isUUID: { args: 4, msg: "tokenId: Must be a valid UUID" },
          },
        },
        vaultAddress: {
          type: DataTypes.STRING(42),
          allowNull: true,
          validate: {
            is: {
              args: /^0x[a-fA-F0-9]{40}$/,
              msg: "vaultAddress: Must be a valid Ethereum address",
            },
          },
        },
        totalShares: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            notNull: { msg: "totalShares: Total shares is required" },
            min: { args: [100], msg: "totalShares: Minimum 100 shares" },
            max: { args: [1000000], msg: "totalShares: Maximum 1M shares" },
          },
        },
        availableShares: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "availableShares: Cannot be negative" },
          },
        },
        sharePrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          validate: {
            notNull: { msg: "sharePrice: Share price is required" },
            isDecimal: { msg: "sharePrice: Must be a valid decimal" },
            min: { args: [0.000001], msg: "sharePrice: Must be greater than 0" },
          },
        },
        currency: {
          type: DataTypes.STRING(10),
          allowNull: false,
          defaultValue: "ETH",
          validate: {
            isIn: {
              args: [["ETH", "USDC", "USDT", "DAI", "MATIC", "BNB"]],
              msg: "currency: Invalid currency",
            },
          },
        },
        minPurchase: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            min: { args: [1], msg: "minPurchase: Minimum is 1 share" },
          },
        },
        maxPurchase: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1000,
          validate: {
            min: { args: [1], msg: "maxPurchase: Minimum is 1 share" },
          },
        },
        buyoutPrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          validate: {
            isDecimal: { msg: "buyoutPrice: Must be a valid decimal" },
            min: { args: [0], msg: "buyoutPrice: Cannot be negative" },
          },
        },
        buyoutEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        votingEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "ACTIVE",
            "BUYOUT_PENDING",
            "BOUGHT_OUT",
            "CANCELLED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
        },
        createdById: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "createdById: Creator ID is required" },
            isUUID: { args: 4, msg: "createdById: Must be a valid UUID" },
          },
        },
        deployedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
        },
        buyoutAt: {
          type: DataTypes.DATE(3),
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
            this.setDataValue("metadata", value ? JSON.stringify(value) : null);
          },
        },
      },
      {
        sequelize,
        modelName: "nftFractional",
        tableName: "nft_fractional",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "idx_nft_fractional_token", fields: ["tokenId"], unique: true },
          { name: "idx_nft_fractional_status", fields: ["status"] },
          { name: "idx_nft_fractional_creator", fields: ["createdById"] },
          { name: "idx_nft_fractional_vault", fields: ["vaultAddress"] },
        ],
      }
    );
  }

  // Associations
  static associate(models: any) {
    nftFractional.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
    });
    nftFractional.belongsTo(models.user, {
      as: "creator",
      foreignKey: "createdById",
    });
  }
}

interface nftFractionalAttributes {
  id: string;
  tokenId: string;
  vaultAddress?: string;
  totalShares: number;
  availableShares: number;
  sharePrice: number;
  currency: string;
  minPurchase: number;
  maxPurchase: number;
  buyoutPrice?: number;
  buyoutEnabled: boolean;
  votingEnabled: boolean;
  status: "PENDING" | "ACTIVE" | "BUYOUT_PENDING" | "BOUGHT_OUT" | "CANCELLED";
  createdById: string;
  deployedAt?: Date;
  buyoutAt?: Date;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface nftFractionalCreationAttributes extends Omit<nftFractionalAttributes, "id" | "createdAt" | "updatedAt"> {}