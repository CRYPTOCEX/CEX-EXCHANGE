import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class ecosystemUtxo
  extends Model<ecosystemUtxoAttributes, ecosystemUtxoCreationAttributes>
  implements ecosystemUtxoAttributes
{
  id!: string;
  walletId!: string;
  transactionId!: string;
  index!: number;
  amount!: number;
  script!: string;
  status!: "UNSPENT" | "LOCKED" | "SPENT";
  lockedTxId?: string | null;
  origin?: "DEPOSIT" | "CHANGE" | "CONSOLIDATION" | "SYNC";
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecosystemUtxo {
    return ecosystemUtxo.init(
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
            notNull: { msg: "walletId: Wallet ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION,
              msg: "walletId: Wallet ID must be a valid UUID",
            },
          },
        },
        transactionId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "transactionId: Transaction ID must not be empty",
            },
          },
        },
        index: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "index: Index must be an integer" },
          },
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "amount: Amount must be a number" },
          },
        },
        script: {
          type: DataTypes.STRING(1000),
          allowNull: false,
          defaultValue: 'N/A',
        },
        status: {
          type: DataTypes.ENUM("UNSPENT", "LOCKED", "SPENT"),
          allowNull: false,
          defaultValue: "UNSPENT",
          comment:
            "UNSPENT=available, LOCKED=reserved for in-flight withdrawal, SPENT=confirmed on-chain",
          validate: {
            isIn: {
              args: [["UNSPENT", "LOCKED", "SPENT"]],
              msg: "status: Status must be UNSPENT, LOCKED, or SPENT",
            },
          },
        },
        lockedTxId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "ECOSYS-06: the broadcast txid that reserved (LOCKED) this UTXO for an in-flight withdrawal; lets LOCKED->SPENT promotion be scoped to a single withdrawal so concurrent same-wallet withdrawals cannot promote each other's inputs.",
        },
        origin: {
          type: DataTypes.ENUM("DEPOSIT", "CHANGE", "CONSOLIDATION", "SYNC"),
          allowNull: false,
          defaultValue: "DEPOSIT",
          comment:
            "How this UTXO row was recorded. CHANGE/CONSOLIDATION rows are platform-produced outputs (withdrawal change, consolidation output) and must never be credited as user deposits by the deposit flow.",
        },
      },
      {
        sequelize,
        modelName: "ecosystemUtxo",
        tableName: "ecosystem_utxo",
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
            name: "ecosystemUtxoWalletIdIdx",
            using: "BTREE",
            fields: [{ name: "walletId" }],
          },
          {
            name: "idx_status_wallet_locked",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "walletId" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    ecosystemUtxo.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
