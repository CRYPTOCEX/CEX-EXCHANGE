import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A PERIODIC STATEMENT OF WHAT A USER HELD AND WHAT IT EARNED.
 *
 * Every regulator surveyed that permits custodial staking requires the
 * custodian to give the customer a periodic record: what was staked, what the
 * network paid, what the platform took, and what is held at the period end.
 * The statements cron writes one row per user per period from the observations
 * and the earning rows; the user downloads it from the statements page.
 *
 * `content` is CSV in this version. The format is a per-operator regulatory
 * question and the column is `format` so a later PDF writer needs no migration.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingStatement
  extends Model<stakingStatementAttributes, stakingStatementCreationAttributes>
  implements stakingStatementAttributes
{
  id!: string;
  userId!: string;
  /** `YYYY-MM` for a monthly statement. Unique with the user. */
  period!: string;
  periodStart!: Date;
  periodEnd!: Date;
  format!: "CSV";
  /** The statement itself. Generated once and never regenerated. */
  content!: string;
  /** SHA-256 of `content`. */
  hash!: string;
  /** Denominated per currency; the JSON below carries the per-pool detail. */
  totalStaked!: number;
  totalRewards!: number;
  totalCommission!: number;
  /** JSON: per-pool rows, so the page can render without parsing the CSV. */
  summary!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingStatement {
    return stakingStatement.init(
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
          validate: { notNull: { msg: "userId: User ID cannot be null" } },
        },
        period: {
          type: DataTypes.STRING(32),
          allowNull: false,
          validate: { notEmpty: { msg: "period: Period must not be empty" } },
        },
        periodStart: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        periodEnd: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        format: {
          type: DataTypes.ENUM("CSV"),
          allowNull: false,
          defaultValue: "CSV",
        },
        content: {
          type: DataTypes.TEXT("long"),
          allowNull: false,
        },
        hash: {
          type: DataTypes.STRING(128),
          allowNull: false,
        },
        totalStaked: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("totalStaked"),
        },
        totalRewards: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("totalRewards"),
        },
        totalCommission: {
          type: DataTypes.DECIMAL(36, 18),
          allowNull: false,
          defaultValue: 0,
          get: decimalGetter("totalCommission"),
        },
        summary: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingStatement",
        tableName: "staking_statements",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            // One statement per user per period, so a re-run of the cron
            // cannot produce a second copy of the same month.
            name: "staking_statements_user_period_key",
            unique: true,
            fields: [{ name: "userId" }, { name: "period" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingStatement.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
