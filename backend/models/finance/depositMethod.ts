import { camelCase } from "lodash";
import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class depositMethod
  extends Model<depositMethodAttributes, depositMethodCreationAttributes>
  implements depositMethodAttributes
{
  id!: string;
  title!: string;
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

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof depositMethod {
    return depositMethod.init(
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
            notEmpty: { msg: "title: Title must not be empty" },
          },
          comment: "Display name of the deposit method",
        },
        instructions: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "instructions: Instructions must not be empty" },
          },
          comment: "Step-by-step instructions for using this deposit method",
        },
        image: {
          type: DataTypes.STRING(1000),
          allowNull: true,
          validate: {
            is: {
              args: ["^/(uploads|img)/.*$", "i"],
              msg: "image: Image must be a valid URL",
            },
          },
          comment: "URL path to the method's logo or icon",
        },
        fixedFee: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "fixedFee: Fixed fee must be a valid number" },
            min: { args: [0], msg: "fixedFee: Fixed fee cannot be negative" },
          },
          comment: "Fixed fee amount charged for deposits",
        },
        percentageFee: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: {
              msg: "percentageFee: Percentage fee must be a valid number",
            },
            min: {
              args: [0],
              msg: "percentageFee: Percentage fee cannot be negative",
            },
          },
          comment: "Percentage fee charged on deposit amount",
        },
        minAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "minAmount: Minimum amount must be a valid number" },
            min: { args: [0], msg: "minAmount: Minimum amount cannot be negative" },
          },
          comment: "Minimum deposit amount allowed",
        },
        maxAmount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "maxAmount: Maximum amount must be a valid number" },
            min: { args: [0], msg: "maxAmount: Maximum amount cannot be negative" },
          },
          comment: "Maximum deposit amount allowed",
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
          comment: "Custom form fields required for this deposit method",
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
          comment: "Whether this deposit method is active and available",
        },
      },
      {
        sequelize,
        modelName: "depositMethod",
        tableName: "deposit_method",
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
