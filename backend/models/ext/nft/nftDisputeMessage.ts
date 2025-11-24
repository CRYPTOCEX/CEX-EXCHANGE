import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class nftDisputeMessage
  extends Model<nftDisputeMessageAttributes, nftDisputeMessageCreationAttributes>
  implements nftDisputeMessageAttributes
{
  id!: string;
  disputeId!: string;
  userId!: string;
  message!: string;
  attachments?: any;
  isInternal!: boolean;
  isSystemMessage!: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftDisputeMessage {
    return nftDisputeMessage.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        disputeId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "disputeId: Dispute ID is required" },
            isUUID: { args: 4, msg: "disputeId: Must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID is required" },
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "message: Message cannot be empty" },
            len: { args: [1, 10000], msg: "message: Message must be between 1 and 10000 characters" },
          },
        },
        attachments: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("attachments");
            return value ? JSON.parse(value as any) : [];
          },
          set(value) {
            this.setDataValue("attachments", value ? JSON.stringify(value) : null);
          },
        },
        isInternal: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isSystemMessage: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: "nftDisputeMessage",
        tableName: "nft_dispute_message",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "idx_dispute_message_dispute", fields: ["disputeId"] },
          { name: "idx_dispute_message_user", fields: ["userId"] },
          { name: "idx_dispute_message_created", fields: ["createdAt"] },
        ],
      }
    );
  }

  // Associations
  static associate(models: any) {
    nftDisputeMessage.belongsTo(models.nftDispute, {
      as: "dispute",
      foreignKey: "disputeId",
    });
    nftDisputeMessage.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
    });
  }
}

interface nftDisputeMessageAttributes {
  id: string;
  disputeId: string;
  userId: string;
  message: string;
  attachments?: any;
  isInternal: boolean;
  isSystemMessage: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface nftDisputeMessageCreationAttributes extends Omit<nftDisputeMessageAttributes, "id" | "createdAt" | "updatedAt"> {}