import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import ecosystemMasterWallet from "./ecosystemMasterWallet";

export default class ecosystemCustodialWallet
  extends Model<
    ecosystemCustodialWalletAttributes,
    ecosystemCustodialWalletCreationAttributes
  >
  implements ecosystemCustodialWalletAttributes
{
  id!: string;
  masterWalletId!: string;
  address!: string;
  chain!: string;
  network!: string;
  status!: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  // ecosystemCustodialWallet belongsTo ecosystemMasterWallet via masterWalletId
  masterWallet!: ecosystemMasterWallet;
  getMasterWallet!: Sequelize.BelongsToGetAssociationMixin<ecosystemMasterWallet>;
  setMasterWallet!: Sequelize.BelongsToSetAssociationMixin<
    ecosystemMasterWallet,
    ecosystemMasterWalletId
  >;
  createMasterWallet!: Sequelize.BelongsToCreateAssociationMixin<ecosystemMasterWallet>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecosystemCustodialWallet {
    return ecosystemCustodialWallet.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        masterWalletId: {
          type: DataTypes.UUID,
          allowNull: false,

          validate: {
            notNull: { msg: "masterWalletId: Master Wallet ID cannot be null" },
            isUUID: {
              args: 4,
              msg: "masterWalletId: Master Wallet ID must be a valid UUID",
            },
          },
        },
        address: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: "ecosystemCustodialWalletAddressKey",
          validate: {
            notEmpty: { msg: "address: Address must not be empty" },
          },
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain must not be empty" },
          },
        },
        network: {
          type: DataTypes.STRING(255),
          allowNull: false,
          defaultValue: "mainnet",
          validate: {
            notEmpty: { msg: "network: Network must not be empty" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "INACTIVE", "SUSPENDED"]],
              msg: "status: Status must be either 'ACTIVE', 'INACTIVE', or 'SUSPENDED'",
            },
          },
        },
      },
      {
        sequelize,
        modelName: "ecosystemCustodialWallet",
        tableName: "ecosystem_custodial_wallet",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecosystemCustodialWalletIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecosystemCustodialWalletAddressKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "address" }],
          },
          {
            name: "custodialWalletMasterWalletIdIdx",
            using: "BTREE",
            fields: [{ name: "masterWalletId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecosystemCustodialWallet.belongsTo(models.ecosystemMasterWallet, {
      as: "masterWallet",
      foreignKey: "masterWalletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
