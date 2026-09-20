import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A price level a user asked to be told about.
 *
 * Alerts existed only in the browser before this table: the chart engine kept
 * them in localStorage and evaluated them against the tick stream of whichever
 * tab happened to be open. So an alert died with the tab, did not follow the
 * user to another device, and could not fire at 3am — which is the only time
 * anybody actually wants one.
 *
 * Evaluated by the `evaluatePriceAlerts` cron against the same rules the
 * browser uses (`api/exchange/alert/rules.ts`), and delivered through
 * NotificationService, whose PRICE_ALERT template had been written for years
 * with nothing to produce it.
 */
export default class exchangePriceAlert
  extends Model<
    exchangePriceAlertAttributes,
    exchangePriceAlertCreationAttributes
  >
  implements exchangePriceAlertAttributes
{
  id!: string;
  userId!: string;
  symbol!: string;
  type!: "SPOT" | "ECO" | "FUTURES";
  condition!: "CROSSES_ABOVE" | "CROSSES_BELOW" | "CROSSES";
  targetPrice!: number;
  status!: "ACTIVE" | "TRIGGERED" | "EXPIRED" | "DISABLED";
  isRepeating!: boolean;
  note?: string;
  armedPrice?: number;
  lastPrice?: number;
  triggeredPrice?: number;
  triggeredAt?: Date;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // exchangePriceAlert belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, string>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof exchangePriceAlert {
    return exchangePriceAlert.init(
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
          comment: "ID of the user who armed this alert",
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
          comment: "Trading symbol being watched, e.g. BTC/USDT",
        },
        // A spot market and a futures market share a symbol, and they do not
        // share a price. Without this the evaluator would have no way to know
        // which feed to price the alert from.
        type: {
          type: DataTypes.ENUM("SPOT", "ECO", "FUTURES"),
          allowNull: false,
          defaultValue: "SPOT",
          comment: "Which market family the symbol belongs to",
        },
        condition: {
          type: DataTypes.ENUM("CROSSES_ABOVE", "CROSSES_BELOW", "CROSSES"),
          allowNull: false,
          defaultValue: "CROSSES_ABOVE",
          comment: "Direction of crossing that fires the alert",
        },
        // DOUBLE, matching exchangeOrder.price. DECIMAL would arrive back from
        // Sequelize as a STRING, and every comparison in the evaluator is
        // numeric — a string target would compare lexicographically and fire
        // an alert on "9" > "10".
        targetPrice: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "targetPrice: Must be a numeric value" },
            min: { args: [0], msg: "targetPrice: Must be greater than zero" },
          },
          comment: "The price level being watched",
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "TRIGGERED", "EXPIRED", "DISABLED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          comment: "Only ACTIVE alerts are evaluated",
        },
        // Named `isRepeating`, not `repeat`: REPEAT is a reserved word in
        // MySQL, so a raw query touching this column would have to remember to
        // quote it and one that forgot would be a syntax error at runtime.
        isRepeating: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Re-arms after firing instead of retiring",
        },
        note: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Optional user note shown with the notification",
        },
        // What the market was doing when the trader set the level. Shown in
        // the list so they can see whether they armed above or below the
        // market — the difference between an alert that fires on the next move
        // and one that waits for a reversal.
        armedPrice: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Market price at the moment the alert was created",
        },
        /*
         * THE CROSSING BASELINE, AND WHY IT IS PER-ROW.
         *
         * A crossing needs a previous price, and the obvious place to keep one
         * is per symbol — one number for BTC/USDT that every alert on it
         * shares. That is wrong in a way that only shows up in production: an
         * alert armed a second ago would inherit a baseline from before it
         * existed, so arming "notify me above 70,000" while the price is
         * already at 71,000 fires instantly, reporting a crossing that
         * happened before the trader typed the number.
         *
         * Seeded from `armedPrice`, so an alert's history starts when the
         * trader's intent did. NULL means "never evaluated": the first tick
         * arms it and deliberately does not fire.
         *
         * It costs no more writes than the shared version. Every alert on a
         * symbol sees the same price on a tick, so the ones whose baseline
         * advances are updated in a single statement per symbol.
         */
        lastPrice: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Previous observed price; the baseline a crossing is measured from",
        },
        triggeredPrice: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Price that fired the alert",
        },
        triggeredAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "When the alert last fired; also gates the re-arm cooldown",
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Optional moment after which the alert stops watching",
        },
      },
      {
        sequelize,
        modelName: "exchangePriceAlert",
        tableName: "exchange_price_alert",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "exchangePriceAlertUserIdForeign",
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
          // The evaluator's only query is "every ACTIVE alert, grouped by
          // market family". Without this it is a full scan of every alert
          // anybody has ever created, every tick.
          {
            name: "exchangePriceAlertStatusTypeIdx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "type" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    exchangePriceAlert.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
