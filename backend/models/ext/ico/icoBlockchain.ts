import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export interface icoBlockchainAttributes {
  id: string;
  name: string;
  value: string;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface icoBlockchainCreationAttributes
  extends Partial<icoBlockchainAttributes> {}

export default class icoBlockchain
  extends Model<icoBlockchainAttributes, icoBlockchainCreationAttributes>
  implements icoBlockchainAttributes
{
  id!: string;
  name!: string;
  value!: string;
  status!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof icoBlockchain {
    return icoBlockchain.init(
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
            notEmpty: { msg: "name: Blockchain name must not be empty" },
          },
        },
        value: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "value: Blockchain value must not be empty" },
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
        modelName: "icoBlockchain",
        tableName: "ico_blockchain",
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
    // Define associations here if needed in the future.
  }
}
