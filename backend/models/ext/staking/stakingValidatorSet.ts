import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A policy-screened set of validators a REAL pool delegates to (Solana).
 *
 * `policy` is the JSON snapshot of the thresholds the set was evaluated
 * against (see `STAKING_VALIDATOR_POLICY` in `staking/utils/real/validators.ts`:
 * at least eight validators, none in the superminority, inflation commission at
 * most 5 percent, MEV commission at most 10 percent, skip rate and vote credits
 * within bounds, at most 15 percent of the pool per validator, at least two
 * ASNs). `lastEvaluation` is the per-validator verdict from the last refresh;
 * `healthy` is whether the set as a whole passed. A set that is not healthy
 * still receives no NEW delegation, and its breaches open incidents; it is
 * never the reason an exit waits.
 */
export default class stakingValidatorSet
  extends Model<stakingValidatorSetAttributes, stakingValidatorSetCreationAttributes>
  implements stakingValidatorSetAttributes
{
  id!: string;
  chain!: string;
  network!: string;
  name!: string;
  status!: "ACTIVE" | "RETIRED";
  /** JSON: the policy thresholds this set is held to. */
  policy!: string | null;
  lastEvaluatedAt!: Date | null;
  /** JSON: the last per-validator verdict list. */
  lastEvaluation!: string | null;
  healthy!: boolean;
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingValidatorSet {
    return stakingValidatorSet.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
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
        name: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "name: Name must not be empty" },
            len: { args: [2, 191], msg: "name: Length must be between 2 and 191 characters" },
          },
        },
        status: {
          type: DataTypes.ENUM("ACTIVE", "RETIRED"),
          allowNull: false,
          defaultValue: "ACTIVE",
          validate: {
            isIn: { args: [["ACTIVE", "RETIRED"]], msg: "status: Must be one of: ACTIVE, RETIRED" },
          },
        },
        policy: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        lastEvaluatedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastEvaluation: {
          type: DataTypes.TEXT("long"),
          allowNull: true,
        },
        healthy: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingValidatorSet",
        tableName: "staking_validator_sets",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "staking_validator_sets_chain_network_idx",
            fields: [{ name: "chain" }, { name: "network" }],
          },
          { name: "staking_validator_sets_status_idx", fields: [{ name: "status" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingValidatorSet.hasMany(models.stakingValidator, {
      foreignKey: "validatorSetId",
      as: "validators",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    stakingValidatorSet.hasMany(models.stakingPool, {
      foreignKey: "validatorSetId",
      as: "pools",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingValidatorSet.hasMany(models.stakingChainActivation, {
      foreignKey: "validatorSetId",
      as: "activations",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
