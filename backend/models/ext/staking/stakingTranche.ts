import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A unit of delegated principal a REAL pool holds on-chain.
 *
 * Solana: one stake account (`stakeAccount`, derived with `createAccountWithSeed`
 * from the staking wallet and `seed`) delegated to one validator. Lido: a single
 * tranche of kind LIDO_SHARES per pool, whose `amount` is the stETH share
 * count the staking wallet holds for that pool.
 *
 * Lifecycle (Solana): CREATING → ACTIVATING (delegated, before the activation
 * epoch) → ACTIVE → DEACTIVATING (after `deactivate`, until
 * `deactivationEpoch < currentEpoch`) → INACTIVE (withdrawable) → WITHDRAWN.
 * FAILED is reachable only from CREATING (the create batch reverted; the coins
 * stayed in the staking wallet and the admin chooses retry or refund).
 *
 * `observedValue` is what the observer last read for the account
 * (`lamports` of the stake account for Solana; pooled ETH for Lido). The
 * pool's `onchainValue` is the sum over its live tranches plus what sits
 * unallocated in the wallet for that pool.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingTranche
  extends Model<stakingTrancheAttributes, stakingTrancheCreationAttributes>
  implements stakingTrancheAttributes
{
  id!: string;
  poolId!: string;
  chain!: string;
  network!: string;
  kind!: "SOLANA_STAKE_ACCOUNT" | "LIDO_SHARES";
  stakeAccount!: string | null;
  seed!: string | null;
  validatorId!: string | null;
  status!:
    | "CREATING"
    | "ACTIVATING"
    | "ACTIVE"
    | "DEACTIVATING"
    | "INACTIVE"
    | "WITHDRAWN"
    | "FAILED";
  /** Principal delegated, in the chain's native unit (SOL, or stETH shares for Lido). */
  amount!: number;
  observedValue!: number;
  activationEpoch!: number | null;
  deactivationEpoch!: number | null;
  lastObservedEpoch!: number | null;
  lastObservedAt!: Date | null;
  createBatchId!: string | null;
  exitBatchId!: string | null;
  withdrawBatchId!: string | null;
  failureReason!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingTranche {
    return stakingTranche.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: { notNull: { msg: "poolId: Pool ID cannot be null" } },
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
        kind: {
          type: DataTypes.ENUM("SOLANA_STAKE_ACCOUNT", "LIDO_SHARES"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["SOLANA_STAKE_ACCOUNT", "LIDO_SHARES"]],
              msg: "kind: Must be one of: SOLANA_STAKE_ACCOUNT, LIDO_SHARES",
            },
          },
        },
        stakeAccount: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        seed: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        validatorId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM(
            "CREATING",
            "ACTIVATING",
            "ACTIVE",
            "DEACTIVATING",
            "INACTIVE",
            "WITHDRAWN",
            "FAILED"
          ),
          allowNull: false,
          defaultValue: "CREATING",
          validate: {
            isIn: {
              args: [
                ["CREATING", "ACTIVATING", "ACTIVE", "DEACTIVATING", "INACTIVE", "WITHDRAWN", "FAILED"],
              ],
              msg: "status: Must be one of: CREATING, ACTIVATING, ACTIVE, DEACTIVATING, INACTIVE, WITHDRAWN, FAILED",
            },
          },
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("amount"),
          validate: { min: { args: [0], msg: "amount: Cannot be negative" } },
        },
        observedValue: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("observedValue"),
        },
        activationEpoch: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        deactivationEpoch: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        lastObservedEpoch: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        lastObservedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        exitBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        withdrawBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        failureReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingTranche",
        tableName: "staking_tranches",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "staking_tranches_pool_status_idx", fields: [{ name: "poolId" }, { name: "status" }] },
          { name: "staking_tranches_stake_account_idx", fields: [{ name: "stakeAccount" }] },
          { name: "staking_tranches_validator_idx", fields: [{ name: "validatorId" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingTranche.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingTranche.belongsTo(models.stakingValidator, {
      foreignKey: "validatorId",
      as: "validator",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
