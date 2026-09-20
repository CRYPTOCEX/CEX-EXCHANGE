import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * ONE ON-CHAIN OPERATION, AND THE INTENT THAT WAS APPROVED FOR IT.
 *
 * Every signature by a staking key is preceded by the transaction firewall
 * (`staking/utils/real/firewall.ts`). The firewall decodes the instructions it
 * is about to sign, checks them against the allow-list for the kind, and stores
 * the digest of the APPROVED intent on this row before anything is broadcast.
 * A signature with no batch row, or with a digest that does not match what was
 * approved, is refused. SwissBorg lost 192,600 SOL in September 2025 to eight
 * `authorize` instructions hidden inside a provider-built unstake; the intent
 * digest is what makes that shape impossible here.
 *
 * `txHash` is persisted BEFORE polling begins. A broadcast that is not recorded
 * is the one failure this model cannot recover from, so the write happens first
 * and the poll happens second, always.
 *
 * KINDS
 *   GATHER    move a user's principal from their own deposit address into the
 *             staking wallet, signed with the USER's key
 *   DELEGATE  create and delegate stake accounts (Solana), or submit (Lido)
 *   EXIT      deactivate / requestWithdrawals
 *   CLAIM     withdraw from an inactive stake account / claimWithdrawals
 *   RETURN    move settled principal from the staking wallet back to the
 *             user's own deposit address
 *   REFUND    return a never-delegated gather to the user
 *   COMMISSION_EXIT   realise treasury shares to the Super Admin's address
 *   SWEEP     re-delegate rent/tips left in the wallet
 *
 * A batch is never FAILED once broadcast: an exit, claim or return that errors
 * is RETRYING and stays that way until it lands. Only PENDING (never
 * broadcast) can become FAILED.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingBatch
  extends Model<stakingBatchAttributes, stakingBatchCreationAttributes>
  implements stakingBatchAttributes
{
  id!: string;
  poolId!: string | null;
  chain!: string;
  network!: string;
  kind!:
    | "GATHER"
    | "DELEGATE"
    | "EXIT"
    | "CLAIM"
    | "RETURN"
    | "REFUND"
    | "COMMISSION_EXIT"
    | "SWEEP";
  status!: "PENDING" | "BROADCAST" | "CONFIRMED" | "RETRYING" | "FAILED";
  /** The signer: a staking wallet id, or null when the USER's key signs (GATHER). */
  stakingWalletId!: string | null;
  /** SHA-256 over the canonical decoded instruction list the firewall approved. */
  intentDigest!: string | null;
  /** JSON: the decoded instructions, exactly as approved. Never the key material. */
  intent!: string | null;
  txHash!: string | null;
  /** JSON: {blockhash, lastValidBlockHeight} for Solana, {nonce} for Ethereum — what a retry needs to know whether the first broadcast can still land. */
  broadcastMeta!: string | null;
  /** JSON: what the batch carries — position ids, tranche ids, splits — for the engine's own bookkeeping. */
  metadata!: string | null;
  /** Native fee actually paid, once known. */
  networkFee!: number;
  /** Total moved by this batch, in the chain's native unit. */
  amount!: number;
  attempts!: number;
  lastError!: string | null;
  broadcastAt!: Date | null;
  confirmedAt!: Date | null;
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingBatch {
    return stakingBatch.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        poolId: {
          type: DataTypes.UUID,
          allowNull: true,
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
          type: DataTypes.ENUM(
            "GATHER",
            "DELEGATE",
            "EXIT",
            "CLAIM",
            "RETURN",
            "REFUND",
            "COMMISSION_EXIT",
            "SWEEP",
            "LIQUID_EXIT"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
                  "GATHER",
                  "DELEGATE",
                  "EXIT",
                  "CLAIM",
                  "RETURN",
                  "REFUND",
                  "COMMISSION_EXIT",
                  "SWEEP",
                  "LIQUID_EXIT",
                ],
              ],
              msg: "kind: Must be a known batch kind",
            },
          },
        },
        status: {
          type: DataTypes.ENUM("PENDING", "BROADCAST", "CONFIRMED", "RETRYING", "FAILED"),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: {
              args: [["PENDING", "BROADCAST", "CONFIRMED", "RETRYING", "FAILED"]],
              msg: "status: Must be one of: PENDING, BROADCAST, CONFIRMED, RETRYING, FAILED",
            },
          },
        },
        stakingWalletId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        intentDigest: {
          type: DataTypes.STRING(128),
          allowNull: true,
        },
        intent: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        txHash: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        broadcastMeta: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        networkFee: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("networkFee"),
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("amount"),
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: { isInt: { msg: "attempts: Must be an integer" } },
        },
        lastError: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        broadcastAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        confirmedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingBatch",
        tableName: "staking_batches",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "staking_batches_status_kind_idx", fields: [{ name: "status" }, { name: "kind" }] },
          { name: "staking_batches_pool_idx", fields: [{ name: "poolId" }] },
          {
            // A broadcast hash is unique: the same transaction must never be
            // recorded twice, and a duplicate insert is how one return becomes
            // two credits.
            name: "staking_batches_tx_hash_key",
            unique: true,
            fields: [{ name: "txHash" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingBatch.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingBatch.belongsTo(models.stakingChainWallet, {
      foreignKey: "stakingWalletId",
      as: "stakingWallet",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
