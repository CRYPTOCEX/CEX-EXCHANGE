import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ecosystemCustomChain
 *
 * DB-driven registry for custom EVM-compatible chains that admins can add from
 * the dashboard WITHOUT a code change. Rows in this table are hydrated at
 * server boot (and on every write) into the in-memory `chainConfigs`,
 * `CHAIN_CONFIG`, `EVM_CHAINS` structures and into `process.env` so the rest of
 * the ecosystem (provider, transactions, deposits, withdrawals, balances,
 * wallet generation) treats them like any built-in EVM chain.
 *
 * Built-in chains (ETH, BSC, RSK, ...) stay hardcoded — this table is additive
 * and only carries operator-defined chains.
 */
export default class ecosystemCustomChain
  extends Model<
    ecosystemCustomChainAttributes,
    ecosystemCustomChainCreationAttributes
  >
  implements ecosystemCustomChainAttributes
{
  id!: string;
  chain!: string;
  name!: string;
  chainId!: number;
  currency!: string;
  decimals!: number;
  network!: string;
  rpcUrl!: string;
  rpcWssUrl?: string | null;
  explorerUrl?: string | null;
  explorerApiUrl?: string | null;
  explorerApiKey?: string | null;
  confirmations!: number;
  precision!: number;
  icon?: string | null;
  status!: boolean;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof ecosystemCustomChain {
    return ecosystemCustomChain.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "chain: Chain symbol must not be empty" },
            is: {
              args: ["^[A-Z0-9]{2,20}$", ""],
              msg: "chain: Symbol must be 2-20 uppercase letters/digits (e.g. PBX)",
            },
          },
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
          },
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            isInt: { msg: "chainId: Chain ID must be an integer" },
            min: { args: [1], msg: "chainId: Chain ID must be positive" },
          },
        },
        currency: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency symbol must not be empty" },
          },
        },
        decimals: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 18,
        },
        network: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: "mainnet",
        },
        rpcUrl: {
          type: DataTypes.STRING(512),
          allowNull: false,
          validate: {
            isUrl: { msg: "rpcUrl: RPC URL must be a valid URL" },
          },
        },
        rpcWssUrl: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        explorerUrl: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        explorerApiUrl: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        explorerApiKey: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
        confirmations: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 12,
        },
        precision: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 8,
        },
        icon: {
          type: DataTypes.STRING(1000),
          allowNull: true,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "ecosystemCustomChain",
        tableName: "ecosystem_custom_chain",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "ecosystemCustomChainChainKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "chain" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {}
}
