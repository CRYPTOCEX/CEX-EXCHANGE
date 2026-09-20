import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * THE PLATFORM'S OWN EXIT FROM AN ON-CHAIN POOL.
 *
 * Commission on observed rewards is minted as shares held on the pool
 * (`stakingPool.treasuryShares`), so it earns and is slashed exactly as every
 * holder's shares are, and no consent-less position row exists for it.
 * Realising it is an EXIT like any other: the shares are queued here, the
 * engine deactivates or requests enough stake to cover them in the same FIFO
 * batch as the users' exits, settlement burns them from the treasury at
 * min(request price, current price) — AFTER every user exit ahead of it in
 * the queue — and the coins are paid from the staking wallet to the
 * platform's own custody address for that chain. Never to a user, never to
 * an address the batch does not name, never from a FROZEN wallet.
 *
 * One row per request; at most one open request per pool at a time.
 *
 *   QUEUED     asked for; waiting for the next exit batch
 *   UNBONDING  the exit batch that covers it is out; coins not back yet
 *   SETTLED    shares burned, amount fixed, waiting for the payout transfer
 *   PAID       the transfer to the platform's address confirmed
 *   FAILED     refused before broadcast; the shares stay in the treasury
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingCommissionExit
  extends Model<stakingCommissionExitAttributes, stakingCommissionExitCreationAttributes>
  implements stakingCommissionExitAttributes
{
  id!: string;
  poolId!: string;
  chain!: string;
  network!: string;
  status!: "QUEUED" | "UNBONDING" | "SETTLED" | "PAID" | "FAILED";
  /** Treasury shares this exit burns. */
  shares!: number;
  /** The share price when it was asked for; settlement pays the lower of this and the price when the coins are back. */
  requestSharePrice!: number;
  /** shares × requestSharePrice, for the ledger. */
  requestedValue!: number;
  settledAmount!: number | null;
  settledAt!: Date | null;
  /** The platform's own address on the chain the payout goes to. Named at request time; the firewall allows no other. */
  destination!: string | null;
  exitBatchId!: string | null;
  payoutBatchId!: string | null;
  txHash!: string | null;
  networkFee!: number;
  failureReason!: string | null;
  requestedBy!: string | null;
  requestedAt!: Date;
  paidAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingCommissionExit {
    return stakingCommissionExit.init(
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
        status: {
          type: DataTypes.ENUM("QUEUED", "UNBONDING", "SETTLED", "PAID", "FAILED"),
          allowNull: false,
          defaultValue: "QUEUED",
          validate: {
            isIn: {
              args: [["QUEUED", "UNBONDING", "SETTLED", "PAID", "FAILED"]],
              msg: "status: Must be one of: QUEUED, UNBONDING, SETTLED, PAID, FAILED",
            },
          },
        },
        shares: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("shares"),
        },
        requestSharePrice: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 1,
          get: decimalGetter("requestSharePrice"),
        },
        requestedValue: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("requestedValue"),
        },
        settledAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get: decimalGetter("settledAmount"),
        },
        settledAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        destination: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        exitBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        payoutBatchId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        txHash: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        networkFee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("networkFee"),
        },
        failureReason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        requestedBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        requestedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        paidAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingCommissionExit",
        tableName: "staking_commission_exits",
        timestamps: true,
        paranoid: false,
        indexes: [
          { name: "staking_commission_exits_pool_status_idx", fields: [{ name: "poolId" }, { name: "status" }] },
          { name: "staking_commission_exits_payout_idx", fields: [{ name: "payoutBatchId" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingCommissionExit.belongsTo(models.stakingPool, {
      as: "pool",
      foreignKey: "poolId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
