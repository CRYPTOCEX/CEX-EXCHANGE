import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import gatewayMerchant from "./gatewayMerchant";

export type GatewayBalanceWalletType = "FIAT" | "SPOT" | "ECO";

export default class gatewayMerchantBalance
  extends Model<gatewayMerchantBalanceAttributes, gatewayMerchantBalanceCreationAttributes>
  implements gatewayMerchantBalanceAttributes
{
  id!: string;
  merchantId!: string;
  currency!: string;
  walletType!: GatewayBalanceWalletType;
  available!: number;
  pending!: number;
  reserved!: number;
  totalReceived!: number;
  totalRefunded!: number;
  totalFees!: number;
  totalPaidOut!: number;
  updatedAt?: Date;

  // Associations
  merchant!: gatewayMerchant;
  getMerchant!: Sequelize.BelongsToGetAssociationMixin<gatewayMerchant>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayMerchantBalance {
    return gatewayMerchantBalance.init(
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
        currency: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
        walletType: {
          type: DataTypes.ENUM("FIAT", "SPOT", "ECO"),
          allowNull: false,
          defaultValue: "FIAT",
        },
        available: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("available");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        pending: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("pending");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        reserved: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("reserved");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalReceived: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalReceived");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalRefunded: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalRefunded");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalFees: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalFees");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        totalPaidOut: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0,
          get() {
            const value = this.getDataValue("totalPaidOut");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
      },
      {
        sequelize,
        modelName: "gatewayMerchantBalance",
        tableName: "gateway_merchant_balance",
        timestamps: true,
        createdAt: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "gatewayMerchantBalanceUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "merchantId" }, { name: "currency" }, { name: "walletType" }],
          },
          {
            name: "gatewayMerchantBalanceMerchantIdFkey",
            using: "BTREE",
            fields: [{ name: "merchantId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    gatewayMerchantBalance.belongsTo(models.gatewayMerchant, {
      as: "merchant",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
