import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

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
            isUUID: { args: ANY_UUID_VERSION, msg: "disputeId: Must be a valid UUID" },
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID is required" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
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
            if (value == null) return [];
            // MySQL returns JSON columns already parsed (object); MariaDB
            // returns the raw string. Only parse when a string arrives.
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
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
                this.setDataValue("attachments", JSON.parse(value));
              } catch {
                this.setDataValue("attachments", null as any);
              }
              return;
            }
            this.setDataValue("attachments", value ?? (null as any));
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