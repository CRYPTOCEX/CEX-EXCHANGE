import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";
import { createUserCacheHooks } from "../init";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A user's Transfer PIN — the lightweight second credential guarding wallet
 * transfers, for the majority of accounts that never enroll in 2FA.
 *
 * ── WHY ITS OWN TABLE AND NOT A COLUMN ON `user` ─────────────────────────────
 * `user` has NO `defaultScope` excluding secrets — `password` is only kept out
 * of responses by each read site remembering to exclude it, and exactly two
 * files in the tree actually do. A second secret on that model would inherit
 * the same audit-every-serialiser burden, and the first place that forgot would
 * publish a hash. The counters below need columns of their own anyway.
 *
 * ── WHY `paranoid: false` ────────────────────────────────────────────────────
 * `userId` is UNIQUE. A soft-deleted row keeps its UNIQUE value while the
 * default scope hides it, so a user who cleared their PIN and set a new one
 * would pass the availability check and then hit ER_DUP_ENTRY as a raw 500 —
 * the trap already documented on `user.email`. Nothing here is worth an audit
 * trail that a real delete would lose, and the "cleared" state is modelled by
 * `enabled: false` rather than by a tombstone, so the row is created once and
 * updated forever.
 *
 * ── WHY THE LOCKOUT LIVES IN THE DATABASE ────────────────────────────────────
 * Four digits is 10,000 possibilities. The Redis request limiter in front of
 * the verify route deliberately FAILS OPEN (a store blip must not strand a
 * user mid-transfer), so it cannot be the thing standing between an attacker
 * and an exhaustive search. These two columns can't fail open: the read that
 * checks them is the same read that fetches the hash.
 */
export default class transferPin
  extends Model<transferPinAttributes, transferPinCreationAttributes>
  implements transferPinAttributes
{
  id!: string;
  userId!: string;
  pinHash!: string;
  enabled!: boolean;
  failedAttempts!: number;
  lockoutCount!: number;
  lockedUntil?: Date | null;
  lastVerifiedAt?: Date | null;
  lastChangedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  // transferPin belongsTo user via userId
  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, string>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof transferPin {
    return transferPin.init(
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
        },
        // Argon2 digest of the PIN. Never the PIN itself, and never returned by
        // any endpoint — the status route reports `hasPin`, never this column.
        pinHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: { msg: "pinHash: PIN hash cannot be empty" },
          },
        },
        // `false` is "the user cleared their PIN". The row survives so the
        // UNIQUE index never sees a second insert for this user.
        enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        // Incremented ATOMICALLY (SET x = x + 1) before each guess is checked,
        // never read-then-written — see `verifyTransferPin`.
        failedAttempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        // How many times this PIN has been locked since it was last entered
        // correctly. Drives the escalating lockout: without it, a fixed window
        // hands an attacker a fresh five guesses forever, which walks a
        // four-digit space in a few weeks of unattended grinding. Reset only by
        // a correct PIN or a proof-carrying PIN change.
        lockoutCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        // Set once `failedAttempts` crosses the threshold; cleared by a correct
        // PIN or by re-setting the PIN through the proof-carrying door.
        lockedUntil: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastVerifiedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastChangedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "transferPin",
        tableName: "transfer_pin",
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
            name: "transferPinUserIdKey",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }],
          },
        ],
        hooks: {
          ...createUserCacheHooks(),
        },
      }
    );
  }

  public static associate(models: any) {
    transferPin.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
