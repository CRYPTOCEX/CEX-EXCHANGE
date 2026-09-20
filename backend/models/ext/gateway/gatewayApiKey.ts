import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import gatewayMerchant from "./gatewayMerchant";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export type GatewayApiKeyType = "PUBLIC" | "SECRET";
export type GatewayApiKeyMode = "LIVE" | "TEST";

export interface AllowedWalletTypesConfig {
  [walletType: string]: {
    enabled: boolean;
    currencies: string[];
  };
}

export interface gatewayApiKeyAttributes {
  id: string;
  merchantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  lastFourChars: string;
  type: GatewayApiKeyType;
  mode: GatewayApiKeyMode;
  permissions: string[];
  ipWhitelist?: string[];
  allowedWalletTypes?: AllowedWalletTypesConfig;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  status: boolean;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export type gatewayApiKeyCreationAttributes = Optional<
  gatewayApiKeyAttributes,
  "id" | "permissions" | "status" | "createdAt" | "updatedAt" | "deletedAt"
>;

export default class gatewayApiKey
  extends Model<gatewayApiKeyAttributes, gatewayApiKeyCreationAttributes>
  implements gatewayApiKeyAttributes
{
  id!: string;
  merchantId!: string;
  name!: string;
  keyPrefix!: string;
  keyHash!: string;
  lastFourChars!: string;
  type!: GatewayApiKeyType;
  mode!: GatewayApiKeyMode;
  permissions!: string[];
  ipWhitelist?: string[];
  allowedWalletTypes?: AllowedWalletTypesConfig;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  status!: boolean;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // Associations
  merchant!: gatewayMerchant;
  getMerchant!: Sequelize.BelongsToGetAssociationMixin<gatewayMerchant>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof gatewayApiKey {
    return gatewayApiKey.init(
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
            isUUID: { args: ANY_UUID_VERSION, msg: "merchantId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Key name must not be empty" },
          },
        },
        keyPrefix: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: {
              args: [["pk_live_", "pk_test_", "sk_live_", "sk_test_"]],
              msg: "keyPrefix: Must be a valid key prefix",
            },
          },
        },
        keyHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        lastFourChars: {
          type: DataTypes.STRING(4),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("PUBLIC", "SECRET"),
          allowNull: false,
        },
        mode: {
          type: DataTypes.ENUM("LIVE", "TEST"),
          allowNull: false,
        },
        permissions: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
          get(this: any) {
            /*
             * Guarded on BOTH sides. `typeof` keeps an already-parsed value
             * (prod MySQL) from being parsed again — `JSON.parse("[object
             * Object]")` is the prod-only 500 this class of bug is famous for —
             * and the try/catch keeps a corrupt or legacy value from throwing
             * inside a getter, which is invoked during ordinary reads including
             * authentication.
             */
            const value = this.getDataValue("permissions") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        ipWhitelist: {
          type: DataTypes.JSON,
          allowNull: true,
          get(this: any) {
            /*
             * Guarded on BOTH sides. `typeof` keeps an already-parsed value
             * (prod MySQL) from being parsed again — `JSON.parse("[object
             * Object]")` is the prod-only 500 this class of bug is famous for —
             * and the try/catch keeps a corrupt or legacy value from throwing
             * inside a getter, which is invoked during ordinary reads including
             * authentication.
             */
            const value = this.getDataValue("ipWhitelist") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        allowedWalletTypes: {
          type: DataTypes.JSON,
          allowNull: true,
          get(this: any) {
            /*
             * Guarded on BOTH sides. `typeof` keeps an already-parsed value
             * (prod MySQL) from being parsed again — `JSON.parse("[object
             * Object]")` is the prod-only 500 this class of bug is famous for —
             * and the try/catch keeps a corrupt or legacy value from throwing
             * inside a getter, which is invoked during ordinary reads including
             * authentication.
             */
            const value = this.getDataValue("allowedWalletTypes") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        successUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        cancelUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        webhookUrl: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastUsedIp: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "gatewayApiKey",
        tableName: "gateway_api_key",
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
            name: "gatewayApiKeyMerchantIdFkey",
            using: "BTREE",
            fields: [{ name: "merchantId" }],
          },
          {
            name: "gatewayApiKeyHashIdx",
            using: "BTREE",
            fields: [{ name: "keyHash" }],
          },
          {
            name: "gatewayApiKeyStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    gatewayApiKey.belongsTo(models.gatewayMerchant, {
      as: "merchant",
      foreignKey: "merchantId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
