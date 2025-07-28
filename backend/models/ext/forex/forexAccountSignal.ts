import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import forexAccount from "./forexAccount";
import forexSignal from "./forexSignal";

export default class forexAccountSignal
  extends Model<
    forexAccountSignalAttributes,
    forexAccountSignalCreationAttributes
  >
  implements forexAccountSignalAttributes
{
  forexAccountId!: string;
  forexSignalId!: string;

  // forexAccountSignal belongsTo forexAccount via forexAccountId
  forexAccount!: forexAccount;
  getForexAccount!: Sequelize.BelongsToGetAssociationMixin<forexAccount>;
  setForexAccount!: Sequelize.BelongsToSetAssociationMixin<
    forexAccount,
    forexAccountId
  >;
  createForexAccount!: Sequelize.BelongsToCreateAssociationMixin<forexAccount>;
  // forexAccountSignal belongsTo forexSignal via forexSignalId
  forexSignal!: forexSignal;
  getForexSignal!: Sequelize.BelongsToGetAssociationMixin<forexSignal>;
  setForexSignal!: Sequelize.BelongsToSetAssociationMixin<
    forexSignal,
    forexSignalId
  >;
  createForexSignal!: Sequelize.BelongsToCreateAssociationMixin<forexSignal>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof forexAccountSignal {
    return forexAccountSignal.init(
      {
        forexAccountId: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          allowNull: false,
          primaryKey: true,
        },
        forexSignalId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
        },
      },
      {
        sequelize,
        modelName: "forexAccountSignal",
        tableName: "forex_account_signal",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "forexAccountId" }, { name: "forexSignalId" }],
          },
          {
            name: "forexAccountSignalForexSignalIdFkey",
            using: "BTREE",
            fields: [{ name: "forexSignalId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    forexAccountSignal.belongsTo(models.forexAccount, {
      as: "forexAccount",
      foreignKey: "forexAccountId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    forexAccountSignal.belongsTo(models.forexSignal, {
      as: "forexSignal",
      foreignKey: "forexSignalId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
