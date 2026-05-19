import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import gatewayMerchant from "./gatewayMerchant";
import gatewayRefund from "./gatewayRefund";
import gatewayWebhook from "./gatewayWebhook";
import user from "../../user";
import transaction from "../../finance/transaction";

export type GatewayPaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type GatewayWalletType = "FIAT" | "SPOT" | "ECO";

export interface GatewayLineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface GatewayPaymentAllocation {
  walletId: string;
  walletType: "FIAT" | "SPOT" | "ECO";
  currency: string;
  amount: number;
  equivalentInPaymentCurrency: number;
}

export interface GatewayBillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export default class gatewayPayment
  extends Model<gatewayPaymentAttributes, gatewayPaymentCreationAttributes>
  implements gatewayPaymentAttributes
{
  id!: string;
  merchantId!: string;
  customerId?: string;
  transactionId?: string;
  paymentIntentId!: string;
  merchantOrderId?: string;
  amount!: number;
  currency!: string;
  walletType!: GatewayWalletType;
  feeAmount!: number;
  netAmount!: number;
  status!: GatewayPaymentStatus;
  checkoutUrl!: string;
  returnUrl!: string;
  cancelUrl?: string;
  webhookUrl?: string;
  description?: string;
  metadata?: Record<string, any>;
  lineItems?: GatewayLineItem[];
  customerEmail?: string;
  customerName?: string;
  billingAddress?: GatewayBillingAddress;
  expiresAt!: Date;
  completedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  allocations?: GatewayPaymentAllocation[];
  testMode!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // Associations
  merchant!: gatewayMerchant;
  getMerchant!: Sequelize.BelongsToGetAssociationMixin<gatewayMerchant>;

  customer?: user;
  getCustomer!: Sequelize.BelongsToGetAssociationMixin<user>;

  transaction?: transaction;
  getTransaction!: Sequelize.BelongsToGetAssociationMixin<transaction>;

  gatewayRefunds!: gatewayRefund[];
  getGatewayRefunds!: Sequelize.HasManyGetAssociationsMixin<gatewayRefund>;

  gatewayWebhooks!: gatewayWebhook[];
  getGatewayWebhooks!: Sequelize.HasManyGetAssociationsMixin<gatewayWebhook>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayPayment {
    return gatewayPayment.init(
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
        customerId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        transactionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        paymentIntentId: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        merchantOrderId: {
          type: DataTypes.STRING(255),
          allowNull: true,
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
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          defaultValue: "FIAT",
        },
        feeAmount: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("feeAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        netAmount: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("netAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        status: {
          type: DataTypes.ENUM(
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
            "EXPIRED",
            "REFUNDED",
            "PARTIALLY_REFUNDED"
          ),
          allowNull: false,
          defaultValue: "PENDING",
        },
        checkoutUrl: {
          type: DataTypes.STRING(1000),
          allowNull: false,
        },
        returnUrl: {
          type: DataTypes.STRING(1000),
          allowNull: false,
          validate: {
            isValidUrl(value: string) {
              try {
                new URL(value);
              } catch {
                throw new Error("returnUrl: Must be a valid URL");
              }
            },
          },
        },
        cancelUrl: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        webhookUrl: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("metadata");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        lineItems: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("lineItems");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        customerEmail: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isEmail: { msg: "customerEmail: Must be a valid email" },
          },
        },
        customerName: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        billingAddress: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("billingAddress");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        allocations: {
          type: DataTypes.JSON,
          allowNull: true,
          comment: "Array of wallet allocations used for this payment",
          get() {
            const value = this.getDataValue("allocations");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        testMode: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: "gatewayPayment",
        tableName: "gateway_payment",
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
            name: "gatewayPaymentIntentIdUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "paymentIntentId" }],
          },
          {
            name: "gatewayPaymentMerchantIdFkey",
            using: "BTREE",
            fields: [{ name: "merchantId" }],
          },
          {
            name: "gatewayPaymentCustomerIdFkey",
            using: "BTREE",
            fields: [{ name: "customerId" }],
          },
          {
            name: "gatewayPaymentTransactionIdFkey",
            using: "BTREE",
            fields: [{ name: "transactionId" }],
          },
          {
            name: "gatewayPaymentStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "gatewayPaymentMerchantOrderIdx",
            using: "BTREE",
            fields: [{ name: "merchantId" }, { name: "merchantOrderId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    gatewayPayment.belongsTo(models.gatewayMerchant, {
      as: "merchant",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayPayment.belongsTo(models.user, {
      as: "customer",
      foreignKey: "customerId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    gatewayPayment.belongsTo(models.transaction, {
      as: "transaction",
      foreignKey: "transactionId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    gatewayPayment.hasMany(models.gatewayRefund, {
      as: "gatewayRefunds",
      foreignKey: "paymentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayPayment.hasMany(models.gatewayWebhook, {
      as: "gatewayWebhooks",
      foreignKey: "paymentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
