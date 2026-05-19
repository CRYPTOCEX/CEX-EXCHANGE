import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class mailwizardBlock
  extends Model<mailwizardBlockAttributes, mailwizardBlockCreationAttributes>
  implements mailwizardBlockAttributes
{
  id!: string;
  name!: string;
  design!: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof mailwizardBlock {
    return mailwizardBlock.init(
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
            notEmpty: { msg: "name: Name cannot be empty" },
          },
        },
        design: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "design: Design description cannot be empty" },
          },
        },
      },
      {
        sequelize,
        modelName: "mailwizardBlock",
        tableName: "mailwizard_block",
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
  public static associate(models: any) {}
}
