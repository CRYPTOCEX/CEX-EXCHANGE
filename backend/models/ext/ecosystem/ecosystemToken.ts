import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class ecosystemToken
  extends Model<ecosystemTokenAttributes, ecosystemTokenCreationAttributes>
  implements ecosystemTokenAttributes
{
  id!: string;
  contract!: string;
  name!: string;
  currency!: string;
  chain!: string;
  network!: string;
  type!: string;
  decimals!: number;
  status?: boolean;
  precision?: number;
  limits?: {
    deposit?: {
      min?: number;
      max?: number;
    };
    withdrawal?: {
      min?: number;
      max?: number;
    };
  };
  fee?: {
    min: number;
    percentage: number;
  };
  icon?: string;
  contractType!: "PERMIT" | "NO_PERMIT" | "NATIVE";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof ecosystemToken {
    return ecosystemToken.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        currency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain must not be empty" },
          },
        },
        network: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "network: Network must not be empty" },
          },
        },
        contract: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "contract: Contract must not be empty" },
          },
        },
        contractType: {
          type: DataTypes.ENUM("PERMIT", "NO_PERMIT", "NATIVE"),
          allowNull: false,
          defaultValue: "PERMIT",
          validate: {
            isIn: {
              args: [["PERMIT", "NO_PERMIT", "NATIVE"]],
              msg: "contractType: Contract Type must be one of 'PERMIT', 'NO_PERMIT', or 'NATIVE'",
            },
          },
        },
        type: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "type: Type must not be empty" },
          },
        },
        decimals: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "decimals: Decimals must be an integer" },
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
        precision: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 8,
        },
        limits: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("limits");
            return value ? JSON.parse(value as any) : null;
          },
        },
        fee: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const value = this.getDataValue("fee");
            return value ? JSON.parse(value as any) : null;
          },
        },
        icon: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img|blockchains)/.*$", "i"],
              msg: "icon: icon must be a valid URL",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "ecosystemToken",
        tableName: "ecosystem_token",
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
            name: "ecosystemTokenContractChainKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "contract" }, { name: "chain" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
