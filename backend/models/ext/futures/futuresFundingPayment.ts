import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../../user";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * One funding settlement against one position.
 *
 * Perpetual positions never accrued funding before this table existed, and
 * `hb/perpetual/funding-rate` served a hardcoded `lastFundingRate: "0"` to
 * every counterparty that asked. Rows here are written by the
 * `settleFuturesFunding` cron.
 *
 * The table is the LEDGER and the IDEMPOTENCY ANCHOR at once: the unique
 * (positionId, fundingTime) index is what stops a retried run, an overlapping
 * tick or a second node charging one trader twice for the same window.
 *
 * NOTE: `positionId` is deliberately NOT a foreign key. Positions live in
 * Scylla, not MySQL, and a liquidation rewrites a position's amount to zero —
 * so this row has to outlive the position it describes, which is exactly what
 * a trader disputing a charge needs it to do.
 */
export default class futuresFundingPayment
  extends Model<
    futuresFundingPaymentAttributes,
    futuresFundingPaymentCreationAttributes
  >
  implements futuresFundingPaymentAttributes
{
  id!: string;
  userId!: string;
  symbol!: string;
  positionId!: string;
  side!: "BUY" | "SELL";
  fundingTime!: Date;
  rate!: number;
  markPrice!: number;
  notional!: number;
  amount!: number;
  currency!: string;
  status!: "SETTLED" | "UNPAID" | "SKIPPED";
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;

  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, string>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof futuresFundingPayment {
    return futuresFundingPayment.init(
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
            isUUID: {
              args: ANY_UUID_VERSION,
              msg: "userId: User ID must be a valid UUID",
            },
          },
          comment: "Holder of the position that was funded",
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Perpetual market, e.g. BTC/USDT",
        },
        positionId: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Scylla position id — not a foreign key; positions are not in MySQL",
        },
        side: {
          type: DataTypes.ENUM("BUY", "SELL"),
          allowNull: false,
          comment: "Position side at settlement",
        },
        fundingTime: {
          type: DataTypes.DATE,
          allowNull: false,
          comment: "The window boundary this settlement belongs to",
        },
        rate: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment: "Fraction per interval; positive means longs paid shorts",
        },
        markPrice: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment: "Mark price the notional was measured at",
        },
        notional: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment: "markPrice x position size, in the quote currency",
        },
        // Signed, and it must stay signed: collapsing it to a magnitude with a
        // separate direction column would make every sum over this table
        // wrong by default, and a funding ledger's whole job is to sum to
        // roughly zero.
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          comment: "Signed quote amount: negative was paid, positive was received",
        },
        currency: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment: "Quote currency the payment moved in",
        },
        status: {
          type: DataTypes.ENUM("SETTLED", "UNPAID", "SKIPPED"),
          allowNull: false,
          defaultValue: "SETTLED",
          comment: "UNPAID: the wallet could not cover it. SKIPPED: below the currency's smallest unit",
        },
        note: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Why a settlement was not SETTLED",
        },
      },
      {
        sequelize,
        modelName: "futuresFundingPayment",
        tableName: "futures_funding_payment",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          // THE IDEMPOTENCY ANCHOR. One settlement per position per window,
          // enforced by the database rather than by the cron remembering — a
          // retry, an overlapping tick or a second node all lose this race
          // instead of charging the trader twice.
          {
            name: "futuresFundingPositionWindowKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "positionId" }, { name: "fundingTime" }],
          },
          // "Has this market settled this window yet?" — the question every
          // tick asks before it considers scanning the position table.
          {
            name: "futuresFundingSymbolWindowIdx",
            using: "BTREE",
            fields: [{ name: "symbol" }, { name: "fundingTime" }],
          },
          {
            name: "futuresFundingUserIdIdx",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    futuresFundingPayment.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
