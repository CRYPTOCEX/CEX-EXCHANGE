import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class oneTimeToken
  extends Model<oneTimeTokenAttributes, oneTimeTokenCreationAttributes>
  implements oneTimeTokenAttributes
{
  id!: string;
  tokenId!: string;
  tokenType?: "RESET";
  expiresAt!: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof oneTimeToken {
    return oneTimeToken.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        tokenId: {
          type: DataTypes.STRING(60),
          allowNull: false,
          validate: {
            notEmpty: { msg: "tokenId: Token ID cannot be empty" },
          },
        },
        tokenType: {
          type: DataTypes.ENUM("RESET"),
          allowNull: true,
          validate: {
            isIn: {
              args: [["RESET"]],
              msg: "tokenType: Token type must be RESET",
            },
          },
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          validate: {
            isDate: {
              msg: "expiresAt: Expires At must be a valid date",
              args: true,
            },
          },
        },
      },
      {
        sequelize,
        modelName: "oneTimeToken",
        tableName: "one_time_token",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "tokenId",
            unique: true,
            using: "BTREE",
            fields: [{ name: "tokenId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
