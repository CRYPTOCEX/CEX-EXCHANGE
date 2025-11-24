import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexAccountSignal from "./forexAccountSignal";
import forexSignal from "./forexSignal";

export default class forexAccount
  extends Model<forexAccountAttributes, forexAccountCreationAttributes>
  implements forexAccountAttributes
{
  id!: string;
  userId?: string;
  accountId?: string;
  password?: string;
  broker?: string;
  mt?: number;
  balance: number;
  leverage?: number;
  type!: "DEMO" | "LIVE";
  status?: boolean;
  dailyWithdrawLimit?: number;
  monthlyWithdrawLimit?: number;
  dailyWithdrawn?: number;
  monthlyWithdrawn?: number;
  lastWithdrawReset?: Date;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // forexAccount hasMany forexAccountSignal via forexAccountId
  forexAccountSignals!: forexAccountSignal[];
  getForexAccountSignals!: Sequelize.HasManyGetAssociationsMixin<forexAccountSignal>;
  setForexAccountSignals!: Sequelize.HasManySetAssociationsMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  addForexAccountSignal!: Sequelize.HasManyAddAssociationMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  addForexAccountSignals!: Sequelize.HasManyAddAssociationsMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  createForexAccountSignal!: Sequelize.HasManyCreateAssociationMixin<forexAccountSignal>;
  removeForexAccountSignal!: Sequelize.HasManyRemoveAssociationMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  removeForexAccountSignals!: Sequelize.HasManyRemoveAssociationsMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  hasForexAccountSignal!: Sequelize.HasManyHasAssociationMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  hasForexAccountSignals!: Sequelize.HasManyHasAssociationsMixin<
    forexAccountSignal,
    forexAccountSignalId
  >;
  countForexAccountSignals!: Sequelize.HasManyCountAssociationsMixin;
  // forexAccount belongsToMany forexSignal via forexAccountId and forexSignalId
  forexSignalIdForexSignals!: forexSignal[];
  getForexSignalIdForexSignals!: Sequelize.BelongsToManyGetAssociationsMixin<forexSignal>;
  setForexSignalIdForexSignals!: Sequelize.BelongsToManySetAssociationsMixin<
    forexSignal,
    forexSignalId
  >;
  addForexSignalIdForexSignal!: Sequelize.BelongsToManyAddAssociationMixin<
    forexSignal,
    forexSignalId
  >;
  addForexSignalIdForexSignals!: Sequelize.BelongsToManyAddAssociationsMixin<
    forexSignal,
    forexSignalId
  >;
  createForexSignalIdForexSignal!: Sequelize.BelongsToManyCreateAssociationMixin<forexSignal>;
  removeForexSignalIdForexSignal!: Sequelize.BelongsToManyRemoveAssociationMixin<
    forexSignal,
    forexSignalId
  >;
  removeForexSignalIdForexSignals!: Sequelize.BelongsToManyRemoveAssociationsMixin<
    forexSignal,
    forexSignalId
  >;
  hasForexSignalIdForexSignal!: Sequelize.BelongsToManyHasAssociationMixin<
    forexSignal,
    forexSignalId
  >;
  hasForexSignalIdForexSignals!: Sequelize.BelongsToManyHasAssociationsMixin<
    forexSignal,
    forexSignalId
  >;
  countForexSignalIdForexSignals!: Sequelize.BelongsToManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof forexAccount {
    return forexAccount.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
        },
        accountId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            notEmpty: { msg: "accountId: Account ID must not be empty" },
          },
        },
        password: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            notEmpty: { msg: "password: Password must not be empty" },
            len: {
              args: [6, 191],
              msg: "password: Password must be between 6 and 191 characters long",
            },
          },
        },
        broker: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            notEmpty: { msg: "broker: Broker name must not be empty" },
          },
        },
        mt: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            isInt: { msg: "mt: MT version must be an integer" },
          },
        },
        balance: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "balance: Balance must be a number" },
          },
        },
        leverage: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 1,
          validate: {
            isInt: { msg: "leverage: Leverage must be an integer" },
          },
        },
        type: {
          type: DataTypes.ENUM("DEMO", "LIVE"),
          allowNull: false,
          defaultValue: "DEMO",
          validate: {
            isIn: {
              args: [["DEMO", "LIVE"]],
              msg: "type: Type must be either 'DEMO' or 'LIVE'",
            },
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
        dailyWithdrawLimit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 5000, // Default $5000 daily limit
          validate: {
            isFloat: { msg: "dailyWithdrawLimit: Daily withdraw limit must be a number" },
            min: { args: [0], msg: "dailyWithdrawLimit: Daily withdraw limit must be positive" },
          },
        },
        monthlyWithdrawLimit: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 50000, // Default $50000 monthly limit
          validate: {
            isFloat: { msg: "monthlyWithdrawLimit: Monthly withdraw limit must be a number" },
            min: { args: [0], msg: "monthlyWithdrawLimit: Monthly withdraw limit must be positive" },
          },
        },
        dailyWithdrawn: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "dailyWithdrawn: Daily withdrawn must be a number" },
            min: { args: [0], msg: "dailyWithdrawn: Daily withdrawn must be positive" },
          },
        },
        monthlyWithdrawn: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "monthlyWithdrawn: Monthly withdrawn must be a number" },
            min: { args: [0], msg: "monthlyWithdrawn: Monthly withdrawn must be positive" },
          },
        },
        lastWithdrawReset: {
          type: DataTypes.DATE(3),
          allowNull: true,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "forexAccount",
        tableName: "forex_account",
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
            name: "forexAccountUserIdFkey",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          {
            name: "forexAccountUserIdTypeIdx",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "type" }],
          },
          {
            name: "forexAccountStatusIdx",
            using: "BTREE",
            fields: [{ name: "status" }],
          },
          {
            name: "forexAccountCreatedAtIdx",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    forexAccount.hasMany(models.forexAccountSignal, {
      as: "forexAccountSignals",
      foreignKey: "forexAccountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexAccount.belongsToMany(models.forexSignal, {
      as: "accountSignals",
      through: models.forexAccountSignal,
      foreignKey: "forexAccountId",
      otherKey: "forexSignalId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexAccount.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
