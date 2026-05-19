import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../../user";
import gatewayApiKey from "./gatewayApiKey";
import gatewayPayment from "./gatewayPayment";
import gatewayRefund from "./gatewayRefund";
import gatewayWebhook from "./gatewayWebhook";
import gatewayPayout from "./gatewayPayout";
import gatewayMerchantBalance from "./gatewayMerchantBalance";

export type GatewayMerchantStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type GatewayVerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";
export type GatewayFeeType = "PERCENTAGE" | "FIXED" | "BOTH";
export type GatewayPayoutSchedule = "INSTANT" | "DAILY" | "WEEKLY" | "MONTHLY";

export default class gatewayMerchant
  extends Model<gatewayMerchantAttributes, gatewayMerchantCreationAttributes>
  implements gatewayMerchantAttributes
{
  id!: string;
  userId!: string;
  name!: string;
  slug!: string;
  description?: string;
  logo?: string;
  website?: string;
  email!: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  apiKey!: string;
  secretKey!: string;
  webhookSecret!: string;
  testMode!: boolean;
  allowedCurrencies!: string[];
  allowedWalletTypes!: string[];
  defaultCurrency!: string;
  feeType!: GatewayFeeType;
  feePercentage!: number;
  feeFixed!: number;
  payoutSchedule!: GatewayPayoutSchedule;
  payoutThreshold!: number;
  payoutWalletId?: string;
  status!: GatewayMerchantStatus;
  verificationStatus!: GatewayVerificationStatus;
  dailyLimit!: number;
  monthlyLimit!: number;
  transactionLimit!: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // Associations
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;

  gatewayApiKeys!: gatewayApiKey[];
  getGatewayApiKeys!: Sequelize.HasManyGetAssociationsMixin<gatewayApiKey>;
  countGatewayApiKeys!: Sequelize.HasManyCountAssociationsMixin;

  gatewayPayments!: gatewayPayment[];
  getGatewayPayments!: Sequelize.HasManyGetAssociationsMixin<gatewayPayment>;
  countGatewayPayments!: Sequelize.HasManyCountAssociationsMixin;

  gatewayRefunds!: gatewayRefund[];
  getGatewayRefunds!: Sequelize.HasManyGetAssociationsMixin<gatewayRefund>;

  gatewayWebhooks!: gatewayWebhook[];
  getGatewayWebhooks!: Sequelize.HasManyGetAssociationsMixin<gatewayWebhook>;

  gatewayPayouts!: gatewayPayout[];
  getGatewayPayouts!: Sequelize.HasManyGetAssociationsMixin<gatewayPayout>;

  gatewayMerchantBalances!: gatewayMerchantBalance[];
  getGatewayMerchantBalances!: Sequelize.HasManyGetAssociationsMixin<gatewayMerchantBalance>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayMerchant {
    return gatewayMerchant.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Business name must not be empty" },
            len: { args: [2, 191], msg: "name: Must be between 2 and 191 characters" },
          },
        },
        slug: {
          type: DataTypes.STRING(191),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        logo: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        website: {
          type: DataTypes.STRING(500),
          allowNull: true,
          validate: {
            isValidUrl(value: string) {
              if (value && !/^https?:\/\/.+/.test(value)) {
                throw new Error("website: Must be a valid URL");
              }
            },
          },
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            isEmail: { msg: "email: Must be a valid email address" },
          },
        },
        phone: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        state: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        postalCode: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        apiKey: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        secretKey: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        webhookSecret: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        testMode: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        allowedCurrencies: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: ["USD"],
          get() {
            const value = this.getDataValue("allowedCurrencies");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        allowedWalletTypes: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: ["FIAT"],
          get() {
            const value = this.getDataValue("allowedWalletTypes");
            return typeof value === "string" ? JSON.parse(value) : value;
          },
        },
        defaultCurrency: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "USD",
        },
        feeType: {
          type: DataTypes.ENUM("PERCENTAGE", "FIXED", "BOTH"),
          allowNull: false,
          defaultValue: "BOTH",
        },
        feePercentage: {
          type: DataTypes.DECIMAL(10, 4),
          allowNull: false,
          defaultValue: 2.9,
          get() {
            const value = this.getDataValue("feePercentage");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        feeFixed: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 0.30,
          get() {
            const value = this.getDataValue("feeFixed");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        payoutSchedule: {
          type: DataTypes.ENUM("INSTANT", "DAILY", "WEEKLY", "MONTHLY"),
          allowNull: false,
          defaultValue: "DAILY",
        },
        payoutThreshold: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 100,
          get() {
            const value = this.getDataValue("payoutThreshold");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        payoutWalletId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("PENDING", "ACTIVE", "SUSPENDED", "REJECTED"),
          allowNull: false,
          defaultValue: "PENDING",
        },
        verificationStatus: {
          type: DataTypes.ENUM("UNVERIFIED", "PENDING", "VERIFIED"),
          allowNull: false,
          defaultValue: "UNVERIFIED",
        },
        dailyLimit: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 10000,
          get() {
            const value = this.getDataValue("dailyLimit");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        monthlyLimit: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 100000,
          get() {
            const value = this.getDataValue("monthlyLimit");
            return value ? parseFloat(value.toString()) : 0;
          },
        },
        transactionLimit: {
          type: DataTypes.DECIMAL(30, 8),
          allowNull: false,
          defaultValue: 5000,
          get() {
            const value = this.getDataValue("transactionLimit");
            return value ? parseFloat(value.toString()) : 0;
          },
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
        modelName: "gatewayMerchant",
        tableName: "gateway_merchant",
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
            name: "gatewayMerchantUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "gatewayMerchantApiKeyUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "apiKey" }],
          },
          {
            name: "gatewayMerchantSecretKeyUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "secretKey" }],
          },
          {
            name: "gatewayMerchantSlugUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "slug" }],
          },
          {
            name: "gatewayMerchantStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
        hooks: {
          async beforeValidate(merchant) {
            if (!merchant.slug && merchant.name) {
              merchant.slug = await gatewayMerchant.generateUniqueSlug(merchant.name);
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    gatewayMerchant.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayMerchant.hasMany(models.gatewayApiKey, {
      as: "gatewayApiKeys",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayMerchant.hasMany(models.gatewayPayment, {
      as: "gatewayPayments",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayMerchant.hasMany(models.gatewayRefund, {
      as: "gatewayRefunds",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayMerchant.hasMany(models.gatewayWebhook, {
      as: "gatewayWebhooks",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayMerchant.hasMany(models.gatewayPayout, {
      as: "gatewayPayouts",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    gatewayMerchant.hasMany(models.gatewayMerchantBalance, {
      as: "gatewayMerchantBalances",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }

  public static async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await gatewayMerchant.findOne({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }
}
