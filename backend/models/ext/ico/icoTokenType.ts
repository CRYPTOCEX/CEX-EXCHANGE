import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface icoTokenTypeAttributes {
  id: string;
  name: string;
  value: string;
  description: string;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface icoTokenTypeCreationAttributes
  extends Omit<icoTokenTypeAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'deletedAt'> {}

export default class icoTokenType
  extends Model<icoTokenTypeAttributes, icoTokenTypeCreationAttributes>
  implements icoTokenTypeAttributes
{
  id!: string;
  name!: string;
  value!: string;
  description!: string;
  status!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof icoTokenType {
    return icoTokenType.init(
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
            notEmpty: { msg: "name: Token type name must not be empty" },
          },
        },
        value: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "value: Token type value must not be empty" },
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "description: Description must not be empty" },
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "icoTokenType",
        tableName: "ico_token_type",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "icoTokenTypeNameKey",
            unique: true,
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    icoTokenType.hasMany(models.icoTokenOffering, {
      foreignKey: "typeId",
      as: "offerings",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
