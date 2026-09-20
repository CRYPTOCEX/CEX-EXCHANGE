import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class adminProfit
  extends Model<adminProfitAttributes, adminProfitCreationAttributes>
  implements adminProfitAttributes
{
  id!: string;
  // Optional AND nullable — `generate-model-types.ts` reads THIS declaration,
  // not the column definition below, so widening only the column leaves every
  // consumer still typed as `string`.
  transactionId?: string | null;
  type!:
    | "DEPOSIT"
    | "WITHDRAW"
    | "TRANSFER"
    | "BINARY_ORDER"
    | "EXCHANGE_ORDER"
    | "INVESTMENT"
    | "AI_INVESTMENT"
    | "FOREX_DEPOSIT"
    | "FOREX_WITHDRAW"
    | "FOREX_INVESTMENT"
    | "ICO_CONTRIBUTION"
    | "STAKING"
    | "P2P_TRADE"
    | "NFT_SALE"
    | "NFT_AUCTION"
    | "NFT_OFFER"
    | "GATEWAY_PAYMENT"
    | "TRADE"
    | "REFERRAL_REWARD"
    | "DEX_SWAP"
    | "DEX_LP_FEE"
    | "DEX_LISTING"
    | "POOL_BACKING";
  amount!: number;
  currency!: string;
  chain?: string | null;
  description?: string;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof adminProfit {
    return adminProfit.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        transactionId: {
          type: DataTypes.UUID,
          /*
            NULLABLE, and this was a real bug rather than a widening for
            convenience.

            `recordPlatformLoss` exists precisely for the case where the
            treasury has nothing to debit — it records the loss so the profit
            report nets out. But it had no transaction to name, `allowNull:
            false` plus the notNull validator made the create throw, and the
            caller's catch swallowed the throw as a WARNING. So every platform
            loss taken while the treasury was empty was silently dropped: the
            one case the function exists for was the one case it could not
            record. Affects binary payouts, investment WINs, affiliate reward
            claims and the forex/AI/staking settlements.

            The FK stays valid — MySQL foreign keys permit NULL children.

            AUTO-SYNC CANNOT APPLY THIS WIDEN. Sequelize's alter path emits
            `removeConstraint` before `changeColumn` for a column carrying a
            foreign key, the drop fails, and `isBenignConstraintError`
            (db.ts:752) swallows it as noise — so the column silently stays NOT
            NULL even under `DB_SYNC=always`. It was applied by hand, and the
            re-add needs `COLLATE utf8mb4_bin` explicitly: `transaction.id` is
            utf8mb4_bin, a bare MODIFY resets the column to the table default,
            and MySQL refuses a foreign key across mismatched collations
            (error 1822).
          */
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION,
              msg: "transactionId: Transaction ID must be a valid UUID",
            },
          },
          comment:
            "ID of the transaction that generated this profit; NULL for a platform loss " +
            "recorded when the treasury had nothing to debit",
        },
        // REFERRAL_REWARD is a platform PAYOUT, not a fee: recordPlatformLoss
        // writes it with a NEGATIVE amount so the profit report nets out instead
        // of presenting gross fees captured as if they were profit.
        type: {
          type: DataTypes.ENUM(
            "DEPOSIT",
            "WITHDRAW",
            "TRANSFER",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "AI_INVESTMENT",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FOREX_INVESTMENT",
            "ICO_CONTRIBUTION",
            "STAKING",
            "P2P_TRADE",
            "NFT_SALE",
            "NFT_AUCTION",
            "NFT_OFFER",
            "GATEWAY_PAYMENT",
            "TRADE",
            "REFERRAL_REWARD",
            /*
              APPENDED LAST, and the position is load-bearing. Appending to a
              MySQL ENUM is an in-place widen; inserting in the middle rewrites
              every existing row's stored ordinal.

              DEX_SWAP is written only by the DEX fee SWEEP — an observation of
              a transfer the operator made from their own fee-recipient address.
              It is never written at swap time, because the platform does not
              hold that money until it is swept. See dexFeeAccrual.
            */
            "DEX_SWAP",
            /*
              DEX_LP_FEE IS A SEPARATE TYPE, NOT A REUSE OF DEX_SWAP, and the
              difference is economic rather than cosmetic. DEX_SWAP is a fee
              charged to a USER on a trade we routed. DEX_LP_FEE is the yield on
              CAPITAL THE OPERATOR PUT AT RISK. Folding them makes it impossible
              to answer "is the liquidity position actually profitable" — which,
              given that impermanent loss can exceed fee income by a factor of
              two, is the only question about a position that matters.

              Only a V3 `collect()` ever produces one: a V2 burn returns
              principal and fees in one indistinguishable pair of Transfers, so
              V2 income is real and unbookable, permanently.

              AN LP POSITION IS NOT A REVENUE STREAM — IT IS AN ASSET WHOSE
              VALUE CHANGES. Nothing mark-to-market may be written here. This
              table is a REALISED-revenue ledger, and mixing "money we hold"
              with "money we might collect" is what stops a dashboard number
              being auditable.
            */
            "DEX_LP_FEE",
            /*
              The cheapest real revenue on a direct pair: it pays the operator
              WITHOUT taking a market position. Booked manually, like an ICO
              launch fee, with no on-chain observation behind it.
            */
            "DEX_LISTING",
            /*
              APPENDED LAST, after DEX_LISTING — same rule as DEX_SWAP above:
              an append is an in-place widen, an insert rewrites every stored
              ordinal.

              The cost of a pool-backing settlement (utils/pool-backing/engine.ts):
              the venue's deposit fee and the custody mover's gas, each booked
              NEGATIVE through recordPlatformLoss in its own asset, inside the
              settlement's DB transaction. Never a positive row.
            */
            "POOL_BACKING"
          ),
          allowNull: false,
          validate: {
            isIn: {
              args: [
                [
                  "DEPOSIT",
                  "WITHDRAW",
                  "TRANSFER",
                  "BINARY_ORDER",
                  "EXCHANGE_ORDER",
                  "INVESTMENT",
                  "AI_INVESTMENT",
                  "FOREX_DEPOSIT",
                  "FOREX_WITHDRAW",
                  "FOREX_INVESTMENT",
                  "ICO_CONTRIBUTION",
                  "STAKING",
                  "P2P_TRADE",
                  "NFT_SALE",
                  "NFT_AUCTION",
                  "NFT_OFFER",
                  "GATEWAY_PAYMENT",
                  "TRADE",
                  "REFERRAL_REWARD",
                  // Miss this one and the ENUM accepts the value while
                  // Sequelize refuses to write it — a failure that surfaces
                  // only at the first real sweep.
                  "DEX_SWAP",
                  "DEX_LP_FEE",
                  "DEX_LISTING",
                  "POOL_BACKING",
                ],
              ],
              msg: "type: Type must be one of the defined transaction types",
            },
          },
          comment: "Type of transaction that generated the admin profit",
        },
        amount: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          validate: {
            isDecimal: { msg: "amount: Amount must be a number" },
          },
          comment: "Profit amount earned by admin from this transaction",
        },
        currency: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "currency: Currency cannot be empty" },
          },
          comment: "Currency of the profit amount",
        },
        chain: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Blockchain network if applicable",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "Additional description of the profit source",
        },
      },
      {
        sequelize,
        modelName: "adminProfit",
        tableName: "admin_profit",
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
            name: "adminProfitTransactionIdForeign",
            using: "BTREE",
            fields: [{ name: "transactionId" }],
          },
          {
            name: "idx_admin_profit_type",
            using: "BTREE",
            fields: [{ name: "type" }],
          },
          {
            name: "idx_admin_profit_created_at",
            using: "BTREE",
            fields: [{ name: "createdAt" }],
          },
          {
            name: "idx_admin_profit_summary",
            using: "BTREE",
            fields: [{ name: "type" }, { name: "createdAt" }, { name: "currency" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    adminProfit.belongsTo(models.transaction, {
      as: "transaction",
      foreignKey: "transactionId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
