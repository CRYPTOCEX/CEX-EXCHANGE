import { DataTypes, Model, Sequelize } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * Mirror of a platform user's identity inside TransFi.
 *
 * TransFi will not create an order until the payer exists on its side as a
 * screened `UX-` identity, so a deposit needs a stable local mapping from our
 * user id to that one. This lives in its own table rather than in
 * `user.profile` (a TEXT JSON blob) for two reasons:
 *
 *  - `transfiUserId` must be queryable and UNIQUE. A JSON blob is neither, and
 *    the platform already pays for that mistake elsewhere — the spot reconciler
 *    has to page rows in JS because the state it filters on lives in
 *    `transaction.metadata`.
 *  - The screening lifecycle needs its own columns. TransFi's user creation is
 *    asynchronous and can be rejected, so "do we have an id" and "is that id
 *    usable" are different questions that both have to be answerable in SQL.
 *
 * CRITICAL: the existence of a row here is what stops us calling
 * POST /v3/users/individual again. That endpoint is an UPSERT keyed on identity,
 * and when the incoming payload fails TransFi's email risk check it flips the
 * MATCHED EXISTING user to `user_rejected` — verified live on 2026-08-01, where
 * a call carrying a disposable email plus an existing user's phone number
 * downgraded a previously-approved identity. So this table is a safety
 * mechanism, not just a cache.
 */
export default class transfiUser
  extends Model<transfiUserAttributes, transfiUserCreationAttributes>
  implements transfiUserAttributes
{
  id!: string;
  userId!: string;
  transfiUserId!: string;
  /**
   * TransFi's own top-level `status`, verbatim (e.g. `user_active`,
   * `user_rejected`). Stored raw rather than mapped because TransFi ships values
   * absent from its docs and a narrowing enum here would reject them at the DB
   * layer, losing the only record of what happened.
   */
  status!: string;
  basicKycStatus?: string | null;
  standardKycStatus?: string | null;
  advancedKycStatus?: string | null;
  /** The email we registered, which may differ from the current platform email. */
  email?: string | null;
  /** TransFi's rejection reason, when it supplied one. */
  failureMessage?: string | null;
  /** Last time we reconciled this row against GET /v3/users/individual. */
  lastSyncedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize): typeof transfiUser {
    return transfiUser.init(
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
          unique: "transfiUserUserIdKey",
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "Platform user this TransFi identity belongs to",
        },
        transfiUserId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: "transfiUserTransfiUserIdKey",
          validate: {
            is: {
              args: /^UX-[A-Za-z0-9]+$/,
              msg: "transfiUserId: Must be a TransFi user id of the form UX-...",
            },
          },
          comment: "TransFi identity id (UX-...)",
        },
        status: {
          type: DataTypes.STRING(64),
          allowNull: false,
          defaultValue: "unknown",
          comment: "TransFi top-level user status, verbatim",
        },
        basicKycStatus: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "TransFi basicKycStatus, verbatim",
        },
        standardKycStatus: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "TransFi standardKycStatus, verbatim",
        },
        advancedKycStatus: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: "TransFi advancedKycStatus, verbatim",
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: "Email registered with TransFi for this identity",
        },
        failureMessage: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "TransFi rejection/failure reason, when supplied",
        },
        lastSyncedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: "Last reconciliation against TransFi",
        },
      },
      {
        sequelize,
        modelName: "transfiUser",
        tableName: "transfi_user",
        timestamps: true,
        paranoid: false,
        indexes: [
          {
            name: "transfiUserUserIdKey",
            unique: true,
            fields: [{ name: "userId" }],
          },
          {
            name: "transfiUserTransfiUserIdKey",
            unique: true,
            fields: [{ name: "transfiUserId" }],
          },
          {
            name: "transfiUserStatusIdx",
            fields: [{ name: "status" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    transfiUser.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
