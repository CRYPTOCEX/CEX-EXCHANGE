import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import gatewayMerchant from "./gatewayMerchant";
import gatewayPayment from "./gatewayPayment";
import gatewayWebhook from "./gatewayWebhook";
import transaction from "../../finance/transaction";

export type GatewayRefundStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type GatewayRefundReason = "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT" | "OTHER";

export default class gatewayRefund
  extends Model<gatewayRefundAttributes, gatewayRefundCreationAttributes>
  implements gatewayRefundAttributes
{
  id!: string;
  paymentId!: string;
  merchantId!: string;
  transactionId?: string;
  refundId!: string;
  amount!: number;
  currency!: string;
  reason!: GatewayRefundReason;
  description?: string;
  status!: GatewayRefundStatus;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // Associations
  payment!: gatewayPayment;
  getPayment!: Sequelize.BelongsToGetAssociationMixin<gatewayPayment>;

  merchant!: gatewayMerchant;
  getMerchant!: Sequelize.BelongsToGetAssociationMixin<gatewayMerchant>;

  transaction?: transaction;
  getTransaction!: Sequelize.BelongsToGetAssociationMixin<transaction>;

  gatewayWebhooks!: gatewayWebhook[];
  getGatewayWebhooks!: Sequelize.HasManyGetAssociationsMixin<gatewayWebhook>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayRefund {
    return gatewayRefund.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        paymentId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "paymentId: Must be a valid UUID" },
          },
        },
        merchantId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "merchantId: Must be a valid UUID" },
          },
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        refundId: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          validate: {
            min: { args: [0.01], msg: "amount: Must be greater than 0" },
          },
          get() {
            const value = this.getDataValue("amount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currency: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        reason: {
          type: DataTypes.ENUM("REQUESTED_BY_CUSTOMER", "DUPLICATE", "FRAUDULENT", "OTHER"),
          allowNull: false,
          defaultValue: "REQUESTED_BY_CUSTOMER",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED", "CANCELLED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("metadata");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
      },
      {
        sequelize,
        modelName: "gatewayRefund",
        tableName: "gateway_refund",
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
            name: "gatewayRefundIdUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "refundId" }],
          },
          {
            name: "gatewayRefundPaymentIdFkey",
            using: "BTREE",
            fields: [{ name: "paymentId" }],
          },
          {
            name: "gatewayRefundMerchantIdFkey",
            using: "BTREE",
            fields: [{ name: "merchantId" }],
          },
          {
            name: "gatewayRefundTransactionIdFkey",
            using: "BTREE",
            fields: [{ name: "transactionId" }],
          },
          {
            name: "gatewayRefundStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    gatewayRefund.belongsTo(models.gatewayPayment, {
      as: "payment",
      foreignKey: "paymentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayRefund.belongsTo(models.gatewayMerchant, {
      as: "merchant",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayRefund.belongsTo(models.transaction, {
      as: "transaction",
      foreignKey: "transactionId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    gatewayRefund.hasMany(models.gatewayWebhook, {
      as: "gatewayWebhooks",
      foreignKey: "refundId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
