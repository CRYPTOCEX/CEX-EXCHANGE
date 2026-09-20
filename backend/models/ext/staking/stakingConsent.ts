import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * WHAT THE USER WAS TOLD, VERBATIM, BEFORE THEIR COINS MOVED.
 *
 * Consent is a row, not a checkbox in a request body. The disclosure is
 * GENERATED from data the system holds — the custodian, the staking wallet
 * address, the validator set and their commissions, the platform commission and
 * how it is calculated, the gather and return fees, the activation delay, the
 * unbonding estimate and its worst case, the slashing policy, that it is not
 * insured, and the statements — so the text cannot drift from the terms. What
 * was generated is stored here verbatim with its hash, and
 * `stakingPosition.consentId` is NOT NULL for every REAL position.
 *
 * A stale version is refused at the stake door: if the disclosure the user was
 * shown is not the version the pool now publishes (a commission change bumps
 * it), the stake is refused and the user is shown the new text. Nothing here
 * is ever edited after the fact; a new consent is a new row.
 */
export default class stakingConsent
  extends Model<stakingConsentAttributes, stakingConsentCreationAttributes>
  implements stakingConsentAttributes
{
  id!: string;
  userId!: string;
  poolId!: string;
  activationId!: string | null;
  version!: string;
  /** SHA-256 of `text`, so a stored disclosure can be proven unmodified. */
  hash!: string;
  /** The disclosure exactly as the user saw it. */
  text!: string;
  /** JSON: the five acknowledgements the stake form required, each with its label. */
  acknowledgements!: string | null;
  acceptedAt!: Date;
  ip!: string | null;
  userAgent!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof stakingConsent {
    return stakingConsent.init(
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
        poolId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: { notNull: { msg: "poolId: Pool ID cannot be null" } },
        },
        activationId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        version: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: { notEmpty: { msg: "version: Version must not be empty" } },
        },
        hash: {
          type: DataTypes.STRING(128),
          allowNull: false,
          validate: { notEmpty: { msg: "hash: Hash must not be empty" } },
        },
        text: {
          type: DataTypes.TEXT("long"),
          allowNull: false,
          validate: { notEmpty: { msg: "text: Disclosure text must not be empty" } },
        },
        acknowledgements: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        acceptedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        ip: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING(512),
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingConsent",
        tableName: "staking_consents",
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          { name: "staking_consents_user_idx", fields: [{ name: "userId" }] },
          { name: "staking_consents_pool_idx", fields: [{ name: "poolId" }] },
          { name: "staking_consents_version_idx", fields: [{ name: "version" }] },
        ],
      }
    );
  }

  public static associate(models: any) {
    stakingConsent.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    stakingConsent.belongsTo(models.stakingPool, {
      foreignKey: "poolId",
      as: "pool",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingConsent.belongsTo(models.stakingChainActivation, {
      foreignKey: "activationId",
      as: "activation",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
    stakingConsent.hasMany(models.stakingPosition, {
      foreignKey: "consentId",
      as: "positions",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });
  }
}
