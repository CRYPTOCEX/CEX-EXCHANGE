import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftDispute
  extends Model<nftDisputeAttributes, nftDisputeCreationAttributes>
  implements nftDisputeAttributes
{
  id!: string;
  listingId?: string;
  tokenId?: string;
  transactionHash?: string;
  disputeType!: "FAKE_NFT" | "COPYRIGHT_INFRINGEMENT" | "SCAM" | "NOT_RECEIVED" | "WRONG_ITEM" | "UNAUTHORIZED_SALE" | "OTHER";
  status!: "PENDING" | "INVESTIGATING" | "AWAITING_RESPONSE" | "RESOLVED" | "REJECTED" | "ESCALATED";
  priority!: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reporterId!: string;
  respondentId?: string;
  assignedToId?: string;
  title!: string;
  description!: string;
  evidence?: any;
  resolution?: string;
  resolutionType?: "REFUND" | "CANCEL_SALE" | "REMOVE_LISTING" | "BAN_USER" | "WARNING" | "NO_ACTION";
  refundAmount?: number;
  escalatedAt?: Date;
  investigatedAt?: Date;
  resolvedAt?: Date;
  resolvedById?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftDispute {
    return nftDispute.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        listingId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "listingId: Must be a valid UUID" },
          },
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "tokenId: Must be a valid UUID" },
          },
        },
        transactionHash: {
          type: DataTypes.STRING(66),
          allowNull: true,
          validate: {
            is: {
              args: /^0x[a-fA-F0-9]{64}$/,
              msg: "transactionHash: Must be a valid transaction hash",
            },
          },
        },
        disputeType: {
          type: DataTypes.ENUM(
            "FAKE_NFT",
            "COPYRIGHT_INFRINGEMENT", 
            "SCAM",
            "NOT_RECEIVED",
            "WRONG_ITEM",
            "UNAUTHORIZED_SALE",
            "OTHER"
          ),
          allowNull: false,
          validate: {
            notNull: { msg: "disputeType: Dispute type is required" },
            isIn: {
              args: [["FAKE_NFT", "COPYRIGHT_INFRINGEMENT", "SCAM", "NOT_RECEIVED", "WRONG_ITEM", "UNAUTHORIZED_SALE", "OTHER"]],
              msg: "disputeType: Invalid dispute type",
            },
          },
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "INVESTIGATING",
            "AWAITING_RESPONSE",
            "RESOLVED",
            "REJECTED",
            "ESCALATED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "INVESTIGATING", "AWAITING_RESPONSE", "RESOLVED", "REJECTED", "ESCALATED"]],
              msg: "status: Invalid status",
            },
          },
        },
        priority: {
          type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH", "CRITICAL"),
          allowNull: false,
          defaultValue: "MEDIUM",
          validate: {
            isIn: {
              args: [["LOW", "MEDIUM", "HIGH", "CRITICAL"]],
              msg: "priority: Invalid priority level",
            },
          },
        },
        reporterId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "reporterId: Reporter ID is required" },
            isUUID: { args: 4, msg: "reporterId: Must be a valid UUID" },
          },
        },
        respondentId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "respondentId: Must be a valid UUID" },
          },
        },
        assignedToId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "assignedToId: Must be a valid UUID" },
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
            len: { args: [1, 255], msg: "title: Title must be between 1 and 255 characters" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description cannot be empty" },
            len: { args: [10, 5000], msg: "description: Description must be between 10 and 5000 characters" },
          },
        },
        evidence: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("evidence");
            return value ? JSON.parse(value as any) : null;
          },
          set(value) {
            this.setDataValue("evidence", value ? JSON.stringify(value) : null);
          },
        },
        resolution: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        resolutionType: {
          type: DataTypes.ENUM(
            "REFUND",
            "CANCEL_SALE",
            "REMOVE_LISTING",
            "BAN_USER",
            "WARNING",
            "NO_ACTION"
          ),
          allowNull: true,
          validate: {
            isIn: {
              args: [["REFUND", "CANCEL_SALE", "REMOVE_LISTING", "BAN_USER", "WARNING", "NO_ACTION"]],
              msg: "resolutionType: Invalid resolution type",
            },
          },
        },
        refundAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          validate: {
            isDecimal: { msg: "refundAmount: Must be a valid decimal number" },
            min: { args: [0], msg: "refundAmount: Cannot be negative" },
          },
        },
        escalatedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
        },
        investigatedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
        },
        resolvedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
        },
        resolvedById: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "resolvedById: Must be a valid UUID" },
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
            this.setDataValue("metadata", value ? JSON.stringify(value) : null);
          },
        },
      },
      {
        sequelize,
        modelName: "nftDispute",
        tableName: "nft_dispute",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "idx_nft_dispute_status", fields: ["status"] },
          { name: "idx_nft_dispute_priority", fields: ["priority"] },
          { name: "idx_nft_dispute_reporter", fields: ["reporterId"] },
          { name: "idx_nft_dispute_respondent", fields: ["respondentId"] },
          { name: "idx_nft_dispute_assigned", fields: ["assignedToId"] },
          { name: "idx_nft_dispute_listing", fields: ["listingId"] },
          { name: "idx_nft_dispute_token", fields: ["tokenId"] },
          { name: "idx_nft_dispute_created", fields: ["createdAt"] },
        ],
      }
    );
  }

  // Associations
  static associate(models: any) {
    nftDispute.belongsTo(models.user, {
      as: "reporter",
      foreignKey: "reporterId",
    });
    nftDispute.belongsTo(models.user, {
      as: "respondent",
      foreignKey: "respondentId",
    });
    nftDispute.belongsTo(models.user, {
      as: "assignedTo",
      foreignKey: "assignedToId",
    });
    nftDispute.belongsTo(models.user, {
      as: "resolvedBy",
      foreignKey: "resolvedById",
    });
    nftDispute.belongsTo(models.nftListing, {
      as: "listing",
      foreignKey: "listingId",
    });
    nftDispute.belongsTo(models.nftToken, {
      as: "token",
      foreignKey: "tokenId",
    });
    nftDispute.hasMany(models.nftDisputeMessage, {
      as: "messages",
      foreignKey: "disputeId",
    });
  }
}

interface nftDisputeAttributes {
  id: string;
  listingId?: string;
  tokenId?: string;
  transactionHash?: string;
  disputeType: "FAKE_NFT" | "COPYRIGHT_INFRINGEMENT" | "SCAM" | "NOT_RECEIVED" | "WRONG_ITEM" | "UNAUTHORIZED_SALE" | "OTHER";
  status: "PENDING" | "INVESTIGATING" | "AWAITING_RESPONSE" | "RESOLVED" | "REJECTED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reporterId: string;
  respondentId?: string;
  assignedToId?: string;
  title: string;
  description: string;
  evidence?: any;
  resolution?: string;
  resolutionType?: "REFUND" | "CANCEL_SALE" | "REMOVE_LISTING" | "BAN_USER" | "WARNING" | "NO_ACTION";
  refundAmount?: number;
  escalatedAt?: Date;
  investigatedAt?: Date;
  resolvedAt?: Date;
  resolvedById?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface nftDisputeCreationAttributes extends Omit<nftDisputeAttributes, "id" | "createdAt" | "updatedAt"> {}