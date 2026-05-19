import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import gatewayMerchant from "./gatewayMerchant";
import gatewayPayment from "./gatewayPayment";
import gatewayRefund from "./gatewayRefund";

export type GatewayWebhookStatus = "PENDING" | "SENT" | "FAILED" | "RETRYING";

export type GatewayWebhookEvent =
  | "payment.created"
  | "payment.completed"
  | "payment.failed"
  | "payment.cancelled"
  | "payment.expired"
  | "refund.created"
  | "refund.completed"
  | "refund.failed";

export default class gatewayWebhook
  extends Model<gatewayWebhookAttributes, gatewayWebhookCreationAttributes>
  implements gatewayWebhookAttributes
{
  id!: string;
  merchantId!: string;
  paymentId?: string;
  refundId?: string;
  eventType!: GatewayWebhookEvent;
  url!: string;
  payload!: Record<string, any>;
  signature!: string;
  status!: GatewayWebhookStatus;
  attempts!: number;
  maxAttempts!: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  merchant!: gatewayMerchant;
  getMerchant!: Sequelize.BelongsToGetAssociationMixin<gatewayMerchant>;

  payment?: gatewayPayment;
  getPayment!: Sequelize.BelongsToGetAssociationMixin<gatewayPayment>;

  refund?: gatewayRefund;
  getRefund!: Sequelize.BelongsToGetAssociationMixin<gatewayRefund>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayWebhook {
    return gatewayWebhook.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        merchantId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "merchantId: Must be a valid UUID" },
          },
        },
        paymentId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        refundId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        eventType: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            isIn: {
              args: [[
                "payment.created",
                "payment.completed",
                "payment.failed",
                "payment.cancelled",
                "payment.expired",
                "refund.created",
                "refund.completed",
                "refund.failed",
              ]],
              msg: "eventType: Must be a valid webhook event type",
            },
          },
        },
        url: {
          type: DataTypes.STRING(1000),
          allowNull: false,
          validate: {
            isUrl: { msg: "url: Must be a valid URL" },
          },
        },
        payload: {
          type: DataTypes.JSON,
          allowNull: false,
          get() {
            const value = this.getDataValue("payload");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        signature: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("PENDING", "SENT", "FAILED", "RETRYING"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        maxAttempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 5,
        },
        lastAttemptAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        nextRetryAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        responseStatus: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        responseBody: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        responseTime: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        errorMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "gatewayWebhook",
        tableName: "gateway_webhook",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "gatewayWebhookMerchantIdFkey",
            using: "BTREE",
            fields: [{ name: "merchantId" }],
          },
          {
            name: "gatewayWebhookPaymentIdFkey",
            using: "BTREE",
            fields: [{ name: "paymentId" }],
          },
          {
            name: "gatewayWebhookRefundIdFkey",
            using: "BTREE",
            fields: [{ name: "refundId" }],
          },
          {
            name: "gatewayWebhookStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "gatewayWebhookNextRetryIdx",
            using: "BTREE",
            fields: [{ name: "nextRetryAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    gatewayWebhook.belongsTo(models.gatewayMerchant, {
      as: "merchant",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayWebhook.belongsTo(models.gatewayPayment, {
      as: "payment",
      foreignKey: "paymentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayWebhook.belongsTo(models.gatewayRefund, {
      as: "refund",
      foreignKey: "refundId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
