import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class settings
  extends Model<settingsAttributes, settingsCreationAttributes>
  implements settingsAttributes
{
  key!: string;
  value!: string | null;

  public static initModel(sequelize: Sequelize.Sequelize): typeof settings {
    return settings.init(
      {
        key: {
          type: DataTypes.STRING(255),
          allowNull: false,
          primaryKey: true,
          comment: "Unique setting key identifier",
        },
        value: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
          // Remove notEmpty validation since allowNull: true should allow empty values
          // and the API layer handles null/empty value conversion appropriately
          comment: "Setting value in JSON format or plain text",
        },
      },
      {
        sequelize,
        modelName: "settings",
        tableName: "settings",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "key" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
