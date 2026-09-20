import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class slider
  extends Model<sliderAttributes, sliderCreationAttributes>
  implements sliderAttributes
{
  id!: string;
  image!: string;
  link?: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof slider {
    return slider.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: "Unique identifier for the slider item",
        },
        image: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "image: Image cannot be empty" },
          },
          comment: "URL path to the slider image",
        },
        link: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Optional URL that the slider image should link to when clicked",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          comment: "Whether this slider item is active and should be displayed",
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "slider",
        tableName: "slider",
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
