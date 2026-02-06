import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexAccount from "./forexAccount";
import forexAccountSignal from "./forexAccountSignal";

export default class forexSignal
  extends Model<forexSignalAttributes, forexSignalCreationAttributes>
  implements forexSignalAttributes
{
  id!: string;
  title!: string;
  image!: string;
  status!: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // forexSignal belongsToMany forexAccount via forexSignalId and forexAccountId
  forexAccountIdForexAccounts!: forexAccount[];
  getForexAccountIdForexAccounts!: Sequelize.BelongsToManyGetAssociationsMixin<forexAccount>;
  setForexAccountIdForexAccounts!: Sequelize.BelongsToManySetAssociationsMixin<
    forexAccount,
    string
  >;
  addForexAccountIdForexAccount!: Sequelize.BelongsToManyAddAssociationMixin<
    forexAccount,
    string
  >;
  addForexAccountIdForexAccounts!: Sequelize.BelongsToManyAddAssociationsMixin<
    forexAccount,
    string
  >;
  createForexAccountIdForexAccount!: Sequelize.BelongsToManyCreateAssociationMixin<forexAccount>;
  removeForexAccountIdForexAccount!: Sequelize.BelongsToManyRemoveAssociationMixin<
    forexAccount,
    string
  >;
  removeForexAccountIdForexAccounts!: Sequelize.BelongsToManyRemoveAssociationsMixin<
    forexAccount,
    string
  >;
  hasForexAccountIdForexAccount!: Sequelize.BelongsToManyHasAssociationMixin<
    forexAccount,
    string
  >;
  hasForexAccountIdForexAccounts!: Sequelize.BelongsToManyHasAssociationsMixin<
    forexAccount,
    string
  >;
  countForexAccountIdForexAccounts!: Sequelize.BelongsToManyCountAssociationsMixin;
  // forexSignal hasMany forexAccountSignal via forexSignalId
  forexAccountSignals!: forexAccountSignal[];
  getForexAccountSignals!: Sequelize.HasManyGetAssociationsMixin<forexAccountSignal>;
  setForexAccountSignals!: Sequelize.HasManySetAssociationsMixin<
    forexAccountSignal,
    string
  >;
  addForexAccountSignal!: Sequelize.HasManyAddAssociationMixin<
    forexAccountSignal,
    string
  >;
  addForexAccountSignals!: Sequelize.HasManyAddAssociationsMixin<
    forexAccountSignal,
    string
  >;
  createForexAccountSignal!: Sequelize.HasManyCreateAssociationMixin<forexAccountSignal>;
  removeForexAccountSignal!: Sequelize.HasManyRemoveAssociationMixin<
    forexAccountSignal,
    string
  >;
  removeForexAccountSignals!: Sequelize.HasManyRemoveAssociationsMixin<
    forexAccountSignal,
    string
  >;
  hasForexAccountSignal!: Sequelize.HasManyHasAssociationMixin<
    forexAccountSignal,
    string
  >;
  hasForexAccountSignals!: Sequelize.HasManyHasAssociationsMixin<
    forexAccountSignal,
    string
  >;
  countForexAccountSignals!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(sequelize: Sequelize.Sequelize): typeof forexSignal {
    return forexSignal.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
          },
        },
        image: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "image: Image cannot be empty" },
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
      },
      {
        sequelize,
        modelName: "forexSignal",
        tableName: "forex_signal",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    forexSignal.hasMany(models.forexAccountSignal, {
      as: "forexAccountSignals",
      foreignKey: "forexSignalId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexSignal.belongsToMany(models.forexAccount, {
      as: "signalAccounts",
      through: models.forexAccountSignal,
      foreignKey: "forexSignalId",
      otherKey: "forexAccountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
