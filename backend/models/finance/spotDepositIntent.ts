import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A CUSTOMER'S DECLARED INTENTION TO DEPOSIT TO SPOT, BEFORE THE COINS MOVE.
 *
 * A SPOT wallet is custodied on the exchange, and the platform holds ONE
 * deposit address per (currency, network) that every customer is shown. Nothing
 * on chain says which customer a transfer came from, so attribution used to be
 * "whoever pastes the hash first" — which anyone watching the public address
 * could do before the real sender. Every mode of `plans/done/SPOT-DEPOSIT-MODES.md`
 * shares this one table and one rule: A CREDIT NEEDS AN INTENT THAT PREDATES
 * THE DEPOSIT. Mode A (hash claim) checks a pasted hash against it, mode B
 * (amount match) matches the exchange's deposit list against its nudged amount,
 * and mode C (ecosystem custody) uses it to know which ECO deposits are for
 * Spot and must be swept to the exchange.
 *
 * `activeAmountKey` is mode B's uniqueness guarantee: `<currency>|<expectedAmount>`
 * while OPEN, NULL on every other status. MySQL has no partial unique index, so
 * the column is the index — two OPEN intents on one CURRENCY can never expect
 * the same amount, and the creator retries with the next nudge on ER_DUP_ENTRY.
 * The RAIL is deliberately not in the key: the matcher makes one
 * `fetchDeposits(currency)` call covering every rail and most providers report
 * no network on a deposit, so a reservation scoped to the rail reserved less
 * than the search relied on and one customer's deposit could be credited to
 * another rail's request. Modes A and C leave it NULL: two customers may
 * legitimately declare the same amount under A, and C declares no amount.
 *
 * The column is not the WHOLE reservation, only the part a database can hold.
 * A figure a customer was told to send stays attributable for
 * `INTENT_MATCH_WINDOW_MS`, long after their request stopped being OPEN, so
 * `reservedExpectedAmounts` (utils/spot-deposit/intents.ts) also keeps the
 * nudge loop off figures held by requests that left OPEN unpaid.
 *
 * `walletId` is the wallet the deposit lands in FIRST: the customer's SPOT
 * wallet for A/B, their ECO wallet for C — that is the key the post-credit
 * ecosystem hook looks an intent up by, hence the (walletId, chain, status)
 * index.
 *
 * `metadata` carries what the console shows and the verifiers need but no
 * column is worth: the review reason, the exchange network id as the exchange
 * spells it, the exchange address a mode C sweep is sent to, sweep attempts,
 * amounts seen, hash submissions. It is a JSON column with a guarded getter
 * because MariaDB stores JSON as LONGTEXT and hands the string back.
 */
export default class spotDepositIntent
  extends Model<spotDepositIntentAttributes, spotDepositIntentCreationAttributes>
  implements spotDepositIntentAttributes
{
  id!: string;
  userId!: string;
  walletId?: string | null;
  currency!: string;
  network!: string;
  chain?: string | null;
  mode!: "hash_claim" | "amount_match" | "ecosystem_custody";
  declaredAmount?: number | null;
  expectedAmount?: number | null;
  address?: string | null;
  tag?: string | null;
  status!: "OPEN" | "MATCHED" | "SWEEPING" | "CREDITED" | "EXPIRED" | "CANCELLED" | "FAILED" | "REVIEW";
  activeAmountKey?: string | null;
  claimedTxid?: string | null;
  matchedDepositId?: string | null;
  sweepTransactionId?: string | null;
  spotTransactionId?: string | null;
  metadata?: Record<string, any> | null;
  expiresAt!: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof spotDepositIntent {
    return spotDepositIntent.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "The customer who declared the deposit",
        },
        walletId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The wallet the deposit lands in first: SPOT for hash_claim/amount_match, ECO for ecosystem_custody",
        },
        currency: { type: DataTypes.STRING(191), allowNull: false },
        network: {
          type: DataTypes.STRING(100),
          allowNull: false,
          comment: "The exchange's network id for the rail (TRC20, ERC20, BEP20, ...), upper-cased",
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: true,
          comment: "The ecosystem chain the customer's own address is on (ecosystem_custody only)",
        },
        mode: {
          type: DataTypes.ENUM("hash_claim", "amount_match", "ecosystem_custody"),
          allowNull: false,
          comment: "Decided at creation from the spotDepositMode setting and eligibility; never changes",
        },
        declaredAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "What the customer said they would send (hash_claim, amount_match)",
        },
        expectedAmount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: true,
          comment: "The exact amount to send: declared plus the uniqueness nudge (amount_match), declared (hash_claim), NULL (ecosystem_custody)",
        },
        address: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "The address the customer was shown: the exchange's for hash_claim/amount_match, their own for ecosystem_custody",
        },
        tag: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Memo/tag shown with the address, if the rail needs one",
        },
        status: {
          type: DataTypes.ENUM("OPEN", "MATCHED", "SWEEPING", "CREDITED", "EXPIRED", "CANCELLED", "FAILED", "REVIEW"),
          allowNull: false,
          defaultValue: "OPEN",
        },
        activeAmountKey: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment:
            "<currency>|<expectedAmount> while OPEN under amount_match, NULL otherwise. UNIQUE: the nudge's guarantee, enforced by the database and nowhere else. No rail in the key — the matcher searches per currency",
        },
        claimedTxid: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "The hash: pasted (hash_claim), found on the exchange (amount_match), or produced by the sweep (ecosystem_custody)",
        },
        matchedDepositId: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "The exchange's own id/txid for the deposit once matched",
        },
        sweepTransactionId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The platform-initiated ECO WITHDRAW row that moves the coins to the exchange (ecosystem_custody)",
        },
        spotTransactionId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "The SPOT DEPOSIT transaction row the intent was credited through",
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true,
          comment:
            "review reason, exchange network id and address, sweep attempts and resweepAt, amounts seen, hash submissions",
          get(this: spotDepositIntent) {
            return parseJsonColumn(this.getDataValue("metadata"));
          },
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "OPEN past this instant becomes EXPIRED (60 minutes after creation); matching keeps running for 7 days",
        },
      },
      {
        sequelize,
        modelName: "spotDepositIntent",
        tableName: "spot_deposit_intent",
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
            name: "uq_spot_deposit_intent_activeAmountKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "activeAmountKey" }],
          },
          {
            name: "idx_spot_deposit_intent_user_status",
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "status" }],
          },
          {
            // The mode B matcher's scan and the claim route's lookup.
            name: "idx_spot_deposit_intent_currency_network_status",
            using: "BTREE",
            fields: [{ name: "currency" }, { name: "network" }, { name: "status" }],
          },
          {
            // The mode C post-credit hook: "is there an OPEN intent for the
            // wallet this deposit just landed in, on this chain?"
            name: "idx_spot_deposit_intent_wallet_chain_status",
            using: "BTREE",
            fields: [{ name: "walletId" }, { name: "chain" }, { name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    spotDepositIntent.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    spotDepositIntent.belongsTo(models.wallet, {
      as: "wallet",
      foreignKey: "walletId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}

/**
 * Prod MySQL hands a DataTypes.JSON column back parsed; MariaDB stores it as
 * LONGTEXT and returns the raw string. Same guard as poolBackingSettlement.
 */
function parseJsonColumn(value: unknown): Record<string, any> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as Record<string, any>;
}
