import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One validator inside a validator set. `voteAccount` is the Solana vote
 * account the pool delegates to; `weight` is its share of NEW delegation
 * relative to the other ACTIVE members (the delegate job splits a tranche by
 * weight, each piece at or above the chain's minimum delegation).
 *
 * `lastHealth` is the JSON the policy engine read from `getVoteAccounts` on
 * the last refresh (activated stake, commission, epoch credits, delinquency,
 * superminority membership); `breach` names the first policy rule it failed,
 * or is null. A SUSPENDED validator receives no new delegation but its
 * existing stake accounts keep running until an exit or a rebalance moves
 * them; REMOVED is terminal.
 */
function decimalGetter(field: string) {
  return function (this: Model): number {
    const raw = this.getDataValue(field as never) as unknown;
    if (raw === null || raw === undefined) return raw as never;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : (0 as number);
  };
}

export default class stakingValidator
  extends Model<stakingValidatorAttributes, stakingValidatorCreationAttributes>
  implements stakingValidatorAttributes
{
  id!: string;
  validatorSetId!: string;
  chain!: string;
  voteAccount!: string;
  identity!: string | null;
  name!: string | null;
  weight!: number;
  commissionPercent!: number | null;
  mevCommissionPercent!: number | null;
  asn!: string | null;
  status!: "ACTIVE" | "SUSPENDED" | "REMOVED";
  lastHealth!: string | null;
  lastHealthAt!: Date | null;
  breach!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingValidator {
    return stakingValidator.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        validatorSetId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: { notNull: { msg: "validatorSetId: Validator set ID cannot be null" } },
        },
        chain: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "chain: Chain must not be empty" } },
        },
        voteAccount: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: { notEmpty: { msg: "voteAccount: Vote account must not be empty" } },
        },
        identity: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        name: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
        weight: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          validate: {
            isInt: { msg: "weight: Must be an integer" },
            min: { args: [1], msg: "weight: Must be at least 1" },
          },
        },
        commissionPercent: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: true,
          get: decimalGetter("commissionPercent"),
        },
        mevCommissionPercent: {
          type: DataTypes.DECIMAL(10, 8),
          allowNull: true,
          get: decimalGetter("mevCommissionPercent"),
        },
        asn: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "SUSPENDED", "REMOVED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: {
              args: [["ACTIVE", "SUSPENDED", "REMOVED"]],
              msg: "status: Must be one of: ACTIVE, SUSPENDED, REMOVED",
            },
          },
        },
        lastHealth: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        lastHealthAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        breach: {
          type: DataTypes.STRING(191),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingValidator",
        tableName: "staking_validators",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "staking_validators_set_vote_key",
            unique: true,
            fields: [{ name: "validatorSetId" }, { name: "voteAccount" }],
          },
          { name: "staking_validators_status_idx", fields: [{ name: "status" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingValidator.belongsTo(models.stakingValidatorSet, {
      foreignKey: "validatorSetId",
      as: "validatorSet",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    stakingValidator.hasMany(models.stakingTranche, {
      foreignKey: "validatorId",
      as: "tranches",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
