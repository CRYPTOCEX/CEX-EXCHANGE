import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecosystemCustodialWallet from "./ecosystemCustodialWallet";

export default class ecosystemMasterWallet
  extends Model<
    ecosystemMasterWalletAttributes,
    ecosystemMasterWalletCreationAttributes
  >
  implements ecosystemMasterWalletAttributes
{
  id!: string;

  chain!: string;
  currency!: string;
  address!: string;
  balance!: number;
  data?: string;
  status!: boolean;
  lastIndex!: number;

  // ecosystemMasterWallet hasMany ecosystemCustodialWallet via masterWalletId
  ecosystemCustodialWallets!: ecosystemCustodialWallet[];
  getEcosystemCustodialWallets!: Sequelize.HasManyGetAssociationsMixin<ecosystemCustodialWallet>;
  setEcosystemCustodialWallets!: Sequelize.HasManySetAssociationsMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  addEcosystemCustodialWallet!: Sequelize.HasManyAddAssociationMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  addEcosystemCustodialWallets!: Sequelize.HasManyAddAssociationsMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  createEcosystemCustodialWallet!: Sequelize.HasManyCreateAssociationMixin<ecosystemCustodialWallet>;
  removeEcosystemCustodialWallet!: Sequelize.HasManyRemoveAssociationMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  removeEcosystemCustodialWallets!: Sequelize.HasManyRemoveAssociationsMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  hasEcosystemCustodialWallet!: Sequelize.HasManyHasAssociationMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  hasEcosystemCustodialWallets!: Sequelize.HasManyHasAssociationsMixin<
    ecosystemCustodialWallet,
    ecosystemCustodialWalletId
  >;
  countEcosystemCustodialWallets!: Sequelize.HasManyCountAssociationsMixin;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecosystemMasterWallet {
    return ecosystemMasterWallet.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain must not be empty" },
          },
        },
        currency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency must not be empty" },
          },
        },
        address: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "address: Address must not be empty" },
          },
        },
        balance: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isNumeric: { msg: "balance: Balance must be a number" },
          },
        },
        data: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          validate: {
            isBoolean: { msg: "status: Status must be a boolean value" },
          },
        },
        lastIndex: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            isInt: { msg: "lastIndex: Last index must be an integer" },
          },
        },
      },
      {
        sequelize,
        modelName: "ecosystemMasterWallet",
        tableName: "ecosystem_master_wallet",
        timestamps: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecosystemMasterWalletIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecosystemMasterWalletChainCurrencyKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chain" }, { name: "currency" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecosystemMasterWallet.hasMany(models.ecosystemCustodialWallet, {
      as: "ecosystemCustodialWallets",
      foreignKey: "masterWalletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
