import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import gatewayMerchant from "./gatewayMerchant";
import transaction from "../../finance/transaction";

export type GatewayPayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export default class gatewayPayout
  extends Model<gatewayPayoutAttributes, gatewayPayoutCreationAttributes>
  implements gatewayPayoutAttributes
{
  id!: string;
  merchantId!: string;
  transactionId?: string;
  payoutId!: string;
  amount!: number;
  currency!: string;
  walletType!: string;
  status!: GatewayPayoutStatus;
  periodStart!: Date;
  periodEnd!: Date;
  grossAmount!: number;
  feeAmount!: number;
  netAmount!: number;
  paymentCount!: number;
  refundCount!: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  merchant!: gatewayMerchant;
  getMerchant!: Sequelize.BelongsToGetAssociationMixin<gatewayMerchant>;

  transaction?: transaction;
  getTransaction!: Sequelize.BelongsToGetAssociationMixin<transaction>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayPayout {
    return gatewayPayout.init(
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
        transactionId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        payoutId: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        amount: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          get() {
            const value = this.getDataValue("amount");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        currency: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        walletType: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "FIAT",
        },
        status: {
          type: DataTypes.ENUM("PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        periodStart: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        periodEnd: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        grossAmount: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("grossAmount");
            return value ? parseFloat(value.toString()) : 0;
          },
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
        paymentCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        refundCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
        modelName: "gatewayPayout",
        tableName: "gateway_payout",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "gatewayPayoutIdUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "payoutId" }],
          },
          {
            name: "gatewayPayoutMerchantIdFkey",
            using: "BTREE",
            fields: [{ name: "merchantId" }],
          },
          {
            name: "gatewayPayoutTransactionIdFkey",
            using: "BTREE",
            fields: [{ name: "transactionId" }],
          },
          {
            name: "gatewayPayoutStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    gatewayPayout.belongsTo(models.gatewayMerchant, {
      as: "merchant",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayPayout.belongsTo(models.transaction, {
      as: "transaction",
      foreignKey: "transactionId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
