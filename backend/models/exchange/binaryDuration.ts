import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export default class binaryDuration
  extends Model<binaryDurationAttributes, binaryDurationCreationAttributes>
  implements binaryDurationAttributes
{
  public id!: string;
  public duration!: number;
  public profitPercentage!: number;
  public status!: boolean;

  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly deletedAt?: Date;

  /**
   * Initialize model
   */
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryDuration {
    return binaryDuration.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "duration: must be an integer (minutes)" },
            min: { args: [1], msg: "duration: must be at least 1 minute" },
          },
          comment: "Duration in minutes for binary option expiry",
        },
        profitPercentage: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: {
              msg: "profitPercentage: must be a number",
            },
            min: { args: [0], msg: "profitPercentage: must be non-negative" },
          },
          comment: "Profit percentage offered for this duration",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: must be a boolean" },
          },
          comment: "Whether this duration is active and available for trading",
        },
      },
      {
        sequelize,
        modelName: "binaryDuration",
        tableName: "binary_duration",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "binaryDuration_pkey",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "binaryDuration_duration_idx",
            fields: [{ name: "duration" }],
          },
        ],
      }
    );
  }
}
