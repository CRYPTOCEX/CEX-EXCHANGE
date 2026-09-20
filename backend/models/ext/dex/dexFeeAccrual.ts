import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import {
  CHAIN_ADDRESS_COLUMN_WIDTH,
  CHAIN_TX_ID_COLUMN_WIDTH,
  DEX_VM_VALUES,
  isAddressValidForVm,
  isTxIdValidForVm,
  normalizeChainAddressValue,
  normalizeChainTxIdValue,
  SIGNED_RAW_AMOUNT_RE,
} from "@b/utils/dex/units";

/**
 * APPEND-ONLY revenue record. The nearest analogue on this platform is
 * ecosystemPrivateLedger.offchainDifference: value that accrued on chain and
 * that the platform has not swept.
 *
 * This is NOT adminProfit and NOT a wallet credit. collectPlatformFee credits
 * a Super-Admin WALLET and writes an adminProfit row whose transactionId is
 * NOT NULL over transaction.walletId NOT NULL — there is no record-only path
 * through it, so using it here would mint custodial balance for fees the
 * platform never took custody of. The root eslint config bans that import
 * across the dex tree.
 *
 * A reorg writes a NEGATIVE ROW, never an UPDATE: the original accrual is
 * evidence of what the receipt said at the time, and overwriting it destroys
 * the only proof of why the number moved.
 *
 * See dexChain.ts for the terse-validate and JSON-in-TEXT conventions.
 */
export default class dexFeeAccrual
  extends Model<dexFeeAccrualAttributes, dexFeeAccrualCreationAttributes>
  implements dexFeeAccrualAttributes
{
  id!: string;
  swapId!: string;
  userId?: string | null;
  chainId!: number;
  vm!: string;
  tokenId?: string | null;
  tokenAddress!: string;
  tokenSymbol!: string;
  tokenDecimals!: number;
  feeRecipient!: string;
  amountRaw!: string;
  amountDisplay!: number;
  amountUsd?: number | null;
  feeBps!: number;
  feeSide!: string;
  verification!: string;
  logIndex?: number | null;
  usdRateSource?: string | null;
  sweepStatus!: string;
  sweepSubmittedAt?: Date | null;
  sweepAttempts!: number;
  creditedTransactionId?: string | null;
  adminProfitId?: string | null;
  creditedAmount?: number | null;
  roundingResidueRaw?: string | null;
  reversalOfId?: string | null;
  sweepFailureReason?: string | null;
  sweptAt?: Date | null;
  sweepTxHash?: string | null;
  metadata?: string | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof dexFeeAccrual {
    return dexFeeAccrual.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        swapId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Nullable so revenue survives an account deletion",
        },
        chainId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        tokenId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        /**
         * Which virtual machine, denormalised from the chain registry.
         *
         * Revenue accrues on every chain the addon swaps on, so this table had
         * the same three EVM-only assumptions as the swap table: STRING(42) with
         * the EVM regex and an unconditional case fold on both addresses, and
         * the EVM hash regex on the sweep id. An accrual on a Solana, TRON or
         * TON swap could not be written at all — which means the revenue for
         * those chains would simply not be recorded.
         */
        vm: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "EVM",
          validate: { isIn: [[...DEX_VM_VALUES]] },
        },
        tokenAddress: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: {
            addressMatchesVm(value: any) {
              if (!isAddressValidForVm((this as any).vm, String(value ?? ""))) {
                throw new Error(
                  `dexFeeAccrual.tokenAddress is not a valid ${(this as any).vm ?? "EVM"} address`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue("tokenAddress", normalizeChainAddressValue(value));
          },
          comment: "Denormalised — the revenue report must survive a delist",
        },
        tokenSymbol: {
          type: DataTypes.STRING(32),
          allowNull: false,
          comment: "Denormalised — the revenue report must survive a delist",
        },
        tokenDecimals: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 0, max: 36 },
          comment:
            "Denormalised. Without it a swept accrual cannot be re-derived from amountRaw once the token row is gone",
        },
        feeRecipient: {
          type: DataTypes.STRING(CHAIN_ADDRESS_COLUMN_WIDTH),
          allowNull: false,
          validate: {
            addressMatchesVm(value: any) {
              if (!isAddressValidForVm((this as any).vm, String(value ?? ""))) {
                throw new Error(
                  `dexFeeAccrual.feeRecipient is not a valid ${(this as any).vm ?? "EVM"} address`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue("feeRecipient", normalizeChainAddressValue(value));
          },
          comment:
            "Where the value actually landed — the platform holds the key, not a wallet row. On SVM this is a TOKEN ACCOUNT for the fee mint, not a wallet: SPL fees can only arrive in an account that already exists for that mint",
        },
        amountRaw: {
          // 79, not 78: a uint256 is 78 digits and a REVERSAL row prefixes it
          // with '-'. At 78 the reversal of the largest representable fee
          // would be truncated on write.
          type: DataTypes.STRING(79),
          allowNull: false,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment:
            "The ONLY signed raw column in this addon: a reorg reversal is a negative row rather than a deletion",
        },
        amountDisplay: {
          type: DataTypes.DECIMAL(38, 18),
          allowNull: false,
          get() {
            const v = this.getDataValue("amountDisplay");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "display/aggregation only — LOSSY, never authoritative. Signed, like amountRaw",
        },
        amountUsd: {
          type: DataTypes.DECIMAL(20, 8),
          allowNull: true,
          get() {
            const v = this.getDataValue("amountUsd");
            return v === null || v === undefined ? null : Number(v);
          },
          comment: "USD snapshot at confirmation — display/aggregation only, LOSSY",
        },
        feeBps: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        feeSide: {
          type: DataTypes.STRING(8),
          allowNull: false,
          validate: { isIn: [["SELL", "BUY"]] },
        },
        verification: {
          type: DataTypes.STRING(16),
          allowNull: false,
          validate: { isIn: [["RECEIPT", "ESTIMATED", "REVERSAL"]] },
          comment:
            "RECEIPT = proved by a Transfer log; ESTIMATED = arithmetic from the quote; REVERSAL = a negative correction. An operator reading a revenue report has to know which rows are evidence and which are inference",
        },
        logIndex: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: "Which Transfer log in the receipt proved this accrual. NULL for ESTIMATED and REVERSAL rows",
        },
        usdRateSource: {
          type: DataTypes.STRING(24),
          allowNull: true,
          validate: { isIn: [["MARKETDATA", "USD_RATES"]] },
          comment:
            "Where amountUsd came from. NULL means amountUsd is NULL — which means UNPRICED, and is NOT the same as zero",
        },
        /**
         * The sweep lifecycle.
         *
         *   ACCRUED         earned on chain, sitting at the fee recipient
         *   SWEEP_SUBMITTED the operator moved it and told us the tx hash
         *   SWEPT           confirmed, credited, and an adminProfit row exists
         *   UNRECOVERABLE   we refuse to credit it — see sweep.ts
         *
         * The platform never holds the fee-recipient key, so the sweep is an
         * OBSERVATION of a transfer the operator made themselves, not an action
         * we take.
         */
        sweepStatus: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "ACCRUED",
          validate: {
            isIn: [["ACCRUED", "SWEEP_SUBMITTED", "SWEPT", "UNRECOVERABLE"]],
          },
        },
        sweepSubmittedAt: { type: DataTypes.DATE, allowNull: true },
        sweepAttempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment:
            "collectPlatformFee returns null on failure rather than throwing, so a failed settle must be counted here and retried — never marked SWEPT",
        },
        creditedTransactionId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The wallet transaction the sweep credited",
        },
        adminProfitId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The adminProfit row of type DEX_SWAP this accrual settled into",
        },
        creditedAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          get() {
            const v = this.getDataValue("creditedAmount");
            return v === null || v === undefined ? null : Number(v);
          },
          comment:
            "What actually reached collectPlatformFee after 8dp rounding. LOSSY BY DEFINITION — the residue is in roundingResidueRaw",
        },
        roundingResidueRaw: {
          type: DataTypes.STRING(79),
          allowNull: true,
          validate: { is: SIGNED_RAW_AMOUNT_RE },
          comment:
            "amountRaw minus creditedAmount re-expanded. The chain and the ledger reconcile only if this is carried; roundToPrecision would otherwise eat it silently",
        },
        reversalOfId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment:
            "Set on a REVERSAL row: the accrual it negates. UNIQUE, so one reversal per accrual is a database fact rather than a code convention",
        },
        sweepFailureReason: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment:
            "WHY a row is UNRECOVERABLE. A machine code, not prose: the console maps it to an explanation and a remedy, and the operator never has to read a log to learn which of four things went wrong",
        },
        sweptAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Landing zone for the future sweep tool — this addon never moves the funds itself",
        },
        sweepTxHash: {
          type: DataTypes.STRING(CHAIN_TX_ID_COLUMN_WIDTH),
          allowNull: true,
          validate: {
            txIdMatchesVm(value: any) {
              if (value === null || value === undefined || value === "") return;
              if (!isTxIdValidForVm((this as any).vm, String(value))) {
                throw new Error(
                  `dexFeeAccrual.sweepTxHash is not a valid ${(this as any).vm ?? "EVM"} transaction id`
                );
              }
            },
          },
          set(value: any) {
            this.setDataValue("sweepTxHash", normalizeChainTxIdValue(value));
          },
        },
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value: any) {
            this.setDataValue(
              "metadata",
              typeof value === "string" ? value : JSON.stringify(value)
            );
          },
          get() {
            const v = this.getDataValue("metadata");
            return typeof v === "string" ? JSON.parse(v) : (v ?? null);
          },
        },
      },
      {
        sequelize,
        modelName: "dexFeeAccrual",
        tableName: "dex_fee_accrual",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // An accrual derives from ONE specific log in ONE specific
            // receipt, so re-running the sweep over an already-CONFIRMED swap
            // cannot double-count. Reversals carry logIndex = NULL and MySQL
            // treats NULLs as distinct, which is exactly right: a reversal is
            // not the accrual and must be allowed to sit beside it.
            name: "dexFeeAccrualSwapLogKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "swapId" }, { name: "logIndex" }],
          },
          {
            // The revenue rollup: per chain, per token, over a date range.
            name: "dexFeeAccrualRollupIdx",
            using: "BTREE",
            fields: [{ name: "chainId" }, { name: "tokenAddress" }, { name: "createdAt" }],
          },
          {
            /*
              ONE REVERSAL PER ACCRUAL, as a database fact.

              The existing UNIQUE (swapId, logIndex) cannot enforce it: reversal
              rows carry logIndex = NULL and MySQL treats NULLs as distinct, so
              a double reversal would satisfy it every time. Unique on
              reversalOfId works because it is NULL for every NON-reversal row —
              MySQL permits unlimited NULLs in a unique index — so normal
              accruals are unconstrained and reversals are capped at one.

              Same reasoning as the swap idempotency living on an index rather
              than in a handler: two writers racing both pass a pre-flight
              check, and only the index is the serialisation point.
            */
            name: "dexFeeAccrualReversalOfKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "reversalOfId" }],
          },
          {
            // The settle cron's driving index.
            name: "dexFeeAccrualSweepIdx",
            using: "BTREE",
            fields: [{ name: "sweepStatus" }, { name: "chainId" }, { name: "tokenAddress" }],
          },
          {
            name: "dexFeeAccrualSweptIdx",
            using: "BTREE",
            fields: [{ name: "sweptAt" }],
          },
          {
            name: "dexFeeAccrualUserIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    // RESTRICT: the accrual is the evidence that a specific transaction earned
    // it, so it can never outlive the swap it points at.
    dexFeeAccrual.belongsTo(models.dexSwap, {
      as: "swap",
      foreignKey: "swapId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    dexFeeAccrual.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    dexFeeAccrual.belongsTo(models.dexToken, {
      as: "token",
      foreignKey: "tokenId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
