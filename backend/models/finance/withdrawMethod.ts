import { camelCase } from "lodash";
import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class withdrawMethod
  extends Model<withdrawMethodAttributes, withdrawMethodCreationAttributes>
  implements withdrawMethodAttributes
{
  id!: string;
  title!: string;
  processingTime!: string;
  instructions!: string;
  image?: string;
  fixedFee!: number;
  percentageFee!: number;
  minAmount!: number;
  maxAmount!: number;
  customFields?: string;
  status?: boolean;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof withdrawMethod {
    return withdrawMethod.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title cannot be empty" },
          },
          comment: "Display name of the withdrawal method",
        },
        processingTime: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "processingTime: Processing time cannot be empty",
            },
          },
          comment: "Expected processing time for withdrawals (e.g., '1-3 business days')",
        },
        instructions: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "instructions: Instructions cannot be empty" },
          },
          comment: "Step-by-step instructions for using this withdrawal method",
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          comment: "URL path to the method's logo or icon",
        },
        fixedFee: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "fixedFee: Fixed fee must be a number" },
          },
          comment: "Fixed fee amount charged for withdrawals",
        },
        percentageFee: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "percentageFee: Percentage fee must be a number" },
          },
          comment: "Percentage fee charged on withdrawal amount",
        },
        minAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "minAmount: Minimum amount must be a number" },
          },
          comment: "Minimum withdrawal amount allowed",
        },
        maxAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "maxAmount: Maximum amount must be a number" },
          },
          comment: "Maximum withdrawal amount allowed",
        },
        customFields: {
          type: DataTypes.JSON,
          allowNull: true,
          get() {
            const rawData = this.getDataValue("customFields");
            return rawData ? JSON.parse(rawData) : null;
          },
          set(fields: CustomField[]) {
            this.setDataValue(
              "customFields",
              JSON.stringify(
                fields
                  .filter((field) => field.title && field.title !== "")
                  .map((field) => ({
                    name: camelCase(field.title.trim()),
                    title: field.title.trim(),
                    type: field.type,
                    required: field.required,
                  }))
              )
            );
          },
          comment: "Custom form fields required for this withdrawal method",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          comment: "Whether this withdrawal method is active and available",
        },
      },
      {
        sequelize,
        modelName: "withdrawMethod",
        tableName: "withdraw_method",
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
