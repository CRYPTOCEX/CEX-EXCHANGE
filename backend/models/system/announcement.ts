import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class announcement
  extends Model<announcementAttributes, announcementCreationAttributes>
  implements announcementAttributes
{
  id!: string;
  type!: "GENERAL" | "EVENT" | "UPDATE";
  title!: string;
  message!: string;
  link?: string;
  status?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof announcement {
    return announcement.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("GENERAL", "EVENT", "UPDATE"),
          allowNull: false,
          defaultValue: "GENERAL",
          validate: {
            isIn: {
              args: [["GENERAL", "EVENT", "UPDATE"]],
              msg: "type: Type must be one of GENERAL, EVENT, UPDATE",
            },
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
          },
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "message: Message cannot be empty" },
          },
        },
        link: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "announcement",
        tableName: "announcement",
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
