import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class walletData
  extends Model<walletDataAttributes, walletDataCreationAttributes>
  implements walletDataAttributes
{
  id!: string;
  walletId!: string;
  currency!: string;
  chain!: string;
  balance!: number;
  index!: number;
  data!: string;

  public static initModel(sequelize: Sequelize.Sequelize): typeof walletData {
    return walletData.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: {
              args: 4,
              msg: "walletId: Wallet ID must be a valid UUID",
            },
          },
          comment: "ID of the wallet this data belongs to",
        },
        currency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency cannot be empty" },
          },
          comment: "Currency symbol for this wallet data",
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain cannot be empty" },
          },
          comment: "Blockchain network name (e.g., ETH, BSC, TRX)",
        },
        balance: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isFloat: { msg: "balance: Balance must be a number" },
          },
          comment: "Current balance for this currency on this chain",
        },
        index: {
          type: DataTypes.INTEGER,
          allowNull: true,
          validate: {
            isInt: { msg: "index: Index must be an integer" },
          },
          comment: "Derivation index for HD wallet generation",
        },
        data: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "data: Data cannot be empty" },
          },
          comment: "Encrypted wallet data (private keys, addresses, etc.)",
        },
      },
      {
        sequelize,
        modelName: "walletData",
        tableName: "wallet_data",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "walletDataWalletIdCurrencyChainKey",
            unique: true,
            using: "BTREE",
            fields: [
              { name: "walletId" },
              { name: "currency" },
              { name: "chain" },
            ],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    walletData.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
