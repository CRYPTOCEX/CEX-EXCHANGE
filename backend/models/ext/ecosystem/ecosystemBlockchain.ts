import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class ecosystemBlockchain
  extends Model<
    ecosystemBlockchainAttributes,
    ecosystemBlockchainCreationAttributes
  >
  implements ecosystemBlockchainAttributes
{
  id!: string;
  productId!: string;
  name!: string;
  chain?: string;
  description?: string;
  link?: string;
  status?: boolean;
  version?: string;
  image?: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof ecosystemBlockchain {
    return ecosystemBlockchain.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },

        productId: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "ecosystemBlockchainProductIdKey",
          validate: {
            notEmpty: { msg: "productId: Product ID must not be empty" },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          unique: "ecosystemBlockchainNameKey",
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        chain: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        link: {
          type: DataTypes.STRING(191),
          allowNull: true,
          validate: {
            isUrl: { msg: "link: Link must be a valid URL" },
          },
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
        version: {
          type: DataTypes.STRING(191),
          allowNull: true,
          defaultValue: "0.0.1",
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
        },
      },
      {
        sequelize,
        modelName: "ecosystemBlockchain",
        tableName: "ecosystem_blockchain",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecosystemBlockchainProductIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "productId" }],
          },
          {
            name: "ecosystemBlockchainNameKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "name" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {}
}
