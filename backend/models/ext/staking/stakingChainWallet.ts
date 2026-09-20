import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * THE STAKING KEY. One per chain and network, and NEVER a second
 * `ecosystemMasterWallet` row.
 *
 * Every master-wallet reader in the ecosystem addon keys by chain alone
 * (`getMasterWalletByChain(chain)`), so a second row for the same chain could
 * be picked up by the customer-withdrawal path and sign a withdrawal. The
 * master wallet is the withdrawal treasury and must never carry delegation
 * risk; the staking wallet is the delegation key and must never sign a
 * customer withdrawal. Separate table, separate readers, same envelope.
 *
 * `data` holds exactly what `ecosystemMasterWallet.data` holds: the JSON the
 * chain service's `createWallet()` returned, encrypted with `encrypt()` from
 * `@b/utils/encrypt` (AES-256-GCM, `iv:authTag:cipher` in hex, key from the
 * unlocked vault). It is decrypted only inside the signer, never returned by a
 * route, and never logged.
 *
 * `status` FROZEN is a kill switch that stops the wallet SIGNING NEW
 * DELEGATIONS. A frozen wallet still signs returns and refunds: a regulator's
 * "no new funds" order must never hold a customer's exit.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingChainWallet
  extends Model<stakingChainWalletAttributes, stakingChainWalletCreationAttributes>
  implements stakingChainWalletAttributes
{
  id!: string;
  /** Ecosystem chain symbol: "SOL", "ETH". */
  chain!: string;
  /** The chain's network name as the ecosystem env names it: mainnet, devnet, sepolia, hoodi. */
  network!: string;
  /** Native currency the wallet holds and delegates. */
  currency!: string;
  address!: string;
  /** Encrypted key material. See the header. */
  data!: string;
  role!: "STAKING";
  status!: "ACTIVE" | "FROZEN";
  /** Last observed native balance, for display and the gas-reserve alert only. */
  balance!: number;
  /** Below this native balance the reconciler opens a LOW_GAS incident. */
  gasReserveFloor!: number;
  lastObservedAt!: Date | null;
  frozenAt!: Date | null;
  frozenBy!: string | null;
  frozenReason!: string | null;
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingChainWallet {
    return stakingChainWallet.init(
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
          validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
        },
        network: {
          type: DataTypes.STRING(32),
          allowNull: false,
          validate: { notEmpty: { msg: "network: Network must not be empty" } },
        },
        currency: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "currency: Currency must not be empty" } },
        },
        address: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: { notEmpty: { msg: "address: Address must not be empty" } },
        },
        data: {
          type: DataTypes.TEXT,
          allowNull: false,
          validate: { notEmpty: { msg: "data: Encrypted key material must not be empty" } },
        },
        role: {
          type: DataTypes.ENUM("STAKING"),
          allowNull: false,
          defaultValue: "STAKING",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "FROZEN"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: { args: [["ACTIVE", "FROZEN"]], msg: "status: Must be one of: ACTIVE, FROZEN" },
          },
        },
        balance: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("balance"),
        },
        gasReserveFloor: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("gasReserveFloor"),
        },
        lastObservedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        frozenAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        frozenBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        frozenReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingChainWallet",
        tableName: "staking_chain_wallets",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "staking_chain_wallets_chain_network_key",
            unique: true,
            fields: [{ name: "chain" }, { name: "network" }],
          },
          { name: "staking_chain_wallets_status_idx", fields: [{ name: "status" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingChainWallet.hasMany(models.stakingPool, {
      foreignKey: "stakingWalletId",
      as: "pools",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingChainWallet.hasMany(models.stakingChainActivation, {
      foreignKey: "stakingWalletId",
      as: "activations",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
