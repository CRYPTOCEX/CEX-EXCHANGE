import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftMarketplace
  extends Model<nftMarketplaceAttributes, nftMarketplaceCreationAttributes>
  implements nftMarketplaceAttributes
{
  id!: string;
  chain!: string;
  network!: string;
  contractAddress!: string;
  deployerAddress!: string;
  deployedBy?: string;
  feeRecipient!: string;
  feePercentage!: number;
  listingFee?: number;
  maxRoyaltyPercentage?: number;
  transactionHash!: string;
  blockNumber!: number;
  gasUsed?: string;
  deploymentCost?: string;
  status!: "ACTIVE" | "PAUSED" | "DEPRECATED";
  pauseReason?: string;
  pausedAt?: Date;
  pausedBy?: string;
  version?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftMarketplace {
    return nftMarketplace.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain must not be empty" },
            isIn: {
              args: [["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM", "BASE", "AVALANCHE"]],
              msg: "chain: Chain must be one of supported chains",
            },
          },
        },
        network: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: "mainnet",
          validate: {
            notEmpty: { msg: "network: Network must not be empty" },
            isIn: {
              args: [["mainnet", "testnet"]],
              msg: "network: Network must be either 'mainnet' or 'testnet'",
            },
          },
        },
        contractAddress: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "contractAddress: Contract address must not be empty" },
            is: {
              args: /^0x[a-fA-F0-9]{40}$/,
              msg: "contractAddress: Invalid contract address format",
            },
          },
        },
        deployerAddress: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "deployerAddress: Deployer address must not be empty" },
            is: {
              args: /^0x[a-fA-F0-9]{40}$/,
              msg: "deployerAddress: Invalid deployer address format",
            },
          },
        },
        deployedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "deployedBy: Must be a valid UUID" },
          },
        },
        feeRecipient: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "feeRecipient: Fee recipient address must not be empty" },
            is: {
              args: /^0x[a-fA-F0-9]{40}$/,
              msg: "feeRecipient: Invalid fee recipient address format",
            },
          },
        },
        feePercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          validate: {
            min: { args: [0], msg: "feePercentage: Fee percentage must be non-negative" },
            max: { args: [10], msg: "feePercentage: Fee percentage cannot exceed 10%" },
          },
        },
        listingFee: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          defaultValue: 0,
          validate: {
            min: { args: [0], msg: "listingFee: Listing fee must be non-negative" },
          },
        },
        maxRoyaltyPercentage: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: true,
          defaultValue: 10,
          validate: {
            min: { args: [0], msg: "maxRoyaltyPercentage: Max royalty percentage must be non-negative" },
            max: { args: [50], msg: "maxRoyaltyPercentage: Max royalty percentage cannot exceed 50%" },
          },
        },
        transactionHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "transactionHash: Transaction hash must not be empty" },
            is: {
              args: /^0x[a-fA-F0-9]{64}$/,
              msg: "transactionHash: Invalid transaction hash format",
            },
          },
        },
        blockNumber: {
          type: DataTypes.BIGINT,
          allowNull: false,
          validate: {
            min: { args: [0], msg: "blockNumber: Block number must be non-negative" },
          },
        },
        gasUsed: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        deploymentCost: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "PAUSED", "DEPRECATED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "PAUSED", "DEPRECATED"]],
              msg: "status: Status must be one of 'ACTIVE', 'PAUSED', or 'DEPRECATED'",
            },
          },
        },
        pauseReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        pausedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        pausedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "pausedBy: Must be a valid UUID" },
          },
        },
        version: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: "1.0.0",
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
        modelName: "nftMarketplace",
        tableName: "nft_marketplace",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "nftMarketplaceChainIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chain" }, { name: "network" }, { name: "status" }],
          },
          {
            name: "nftMarketplaceContractIdx",
            using: "BTREE",
            fields: [{ name: "contractAddress" }],
          },
          {
            name: "nftMarketplaceStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "nftMarketplaceDeployedByIdx",
            using: "BTREE",
            fields: [{ name: "deployedBy" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    nftMarketplace.belongsTo(models.user, {
      as: "deployer",
      foreignKey: "deployedBy",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    nftMarketplace.belongsTo(models.user, {
      as: "pauser",
      foreignKey: "pausedBy",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}

export interface nftMarketplaceAttributes {
  id: string;
  chain: string;
  network: string;
  contractAddress: string;
  deployerAddress: string;
  deployedBy?: string;
  feeRecipient: string;
  feePercentage: number;
  listingFee?: number;
  maxRoyaltyPercentage?: number;
  transactionHash: string;
  blockNumber: number;
  gasUsed?: string;
  deploymentCost?: string;
  status: "ACTIVE" | "PAUSED" | "DEPRECATED";
  pauseReason?: string;
  pausedAt?: Date;
  pausedBy?: string;
  version?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface nftMarketplaceCreationAttributes {
  id?: string;
  chain: string;
  network?: string;
  contractAddress: string;
  deployerAddress: string;
  deployedBy?: string;
  feeRecipient: string;
  feePercentage: number;
  listingFee?: number;
  maxRoyaltyPercentage?: number;
  transactionHash: string;
  blockNumber: number;
  gasUsed?: string;
  deploymentCost?: string;
  status?: "ACTIVE" | "PAUSED" | "DEPRECATED";
  pauseReason?: string;
  pausedAt?: Date;
  pausedBy?: string;
  version?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}
