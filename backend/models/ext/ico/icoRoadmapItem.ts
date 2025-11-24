import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface icoRoadmapItemAttributes {
  id: string;
  offeringId: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface icoRoadmapItemCreationAttributes
  extends Partial<icoRoadmapItemAttributes> {}

export default class icoRoadmapItem
  extends Model<icoRoadmapItemAttributes, icoRoadmapItemCreationAttributes>
  implements icoRoadmapItemAttributes
{
  id!: string;
  offeringId!: string;
  title!: string;
  description!: string;
  date!: string;
  completed!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoRoadmapItem {
    return icoRoadmapItem.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        offeringId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "offeringId: Offering ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "offeringId: Offering ID must be a valid UUID",
            },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        date: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "date: Date must not be empty" },
          },
        },
        completed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: "icoRoadmapItem",
        tableName: "ico_roadmap_item",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoRoadmapItem.belongsTo(models.icoTokenOffering, {
      as: "offering",
      foreignKey: "offeringId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
