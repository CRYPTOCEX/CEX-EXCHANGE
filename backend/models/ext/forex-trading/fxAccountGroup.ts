import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class fxAccountGroup
  extends Model<fxAccountGroupAttributes, fxAccountGroupCreationAttributes>
  implements fxAccountGroupAttributes
{
  id!: string;
  name!: string;
  marginCallLevel!: number;
  stopOutLevel!: number;
  negativeBalanceProtection?: boolean;
  maxLeverage!: number;
  defaultForType?: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxAccountGroup {
    return fxAccountGroup.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
          comment: "Account tier name (e.g. Standard, Pro, ESMA Retail)",
        },
        marginCallLevel: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 100,
          validate: {
            isFloat: { msg: "marginCallLevel: Must be a number" },
            min: { args: [0], msg: "marginCallLevel: Must be >= 0" },
          },
          comment:
            "Margin level % below which margin call fires (notify + block margin-increasing orders and withdrawals)",
        },
        stopOutLevel: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 50,
          validate: {
            isFloat: { msg: "stopOutLevel: Must be a number" },
            min: { args: [0], msg: "stopOutLevel: Must be >= 0" },
          },
          comment:
            "Margin level % below which forced liquidation runs (largest-losing open-session position first). ESMA preset 50, offshore presets 20-30",
        },
        negativeBalanceProtection: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "negativeBalanceProtection: Must be a boolean" },
          },
          comment:
            "Zero negative balances after full liquidation via NBP_CORRECTION deal against operator P&L",
        },
        maxLeverage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          validate: {
            isInt: { msg: "maxLeverage: Must be an integer" },
            min: { args: [1], msg: "maxLeverage: Must be >= 1" },
          },
          comment: "Account-tier leverage cap (effectiveLeverage = min of all caps)",
        },
        defaultForType: {
          type: DataTypes.STRING(10),
          allowNull: true,
          validate: {
            isIn: {
              args: [["DEMO", "LIVE"]],
              msg: "defaultForType: Must be DEMO or LIVE",
            },
          },
          comment: "Auto-assign this group to newly created accounts of this type",
        },
      },
      {
        sequelize,
        modelName: "fxAccountGroup",
        tableName: "fx_account_group",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxAccountGroupNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxAccountGroup.hasMany(models.fxAccount, {
      as: "accounts",
      foreignKey: "groupId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
