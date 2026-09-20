import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A native app install that can receive push.
 *
 * WHY THIS TABLE EXISTS, when push tokens already "work"
 * ---------------------------------------------------------------------------
 * Tokens have lived in `user.settings.pushTokens` — a JSON blob — in five
 * accepted shapes (array of strings, array of objects, object keyed by device
 * id with string values, the same keyed by object values, plus a separate
 * `webPushSubscriptions` array). `PushChannel.categorizeTokens` reads all five.
 * That is fine for a browser subscription and wrong for a native install, for
 * reasons that are properties of the blob rather than of the code:
 *
 *   - `PushChannel.addDeviceToken` is a read-modify-write of the whole settings
 *     object (`findByPk` -> spread -> `save`). Two registrations landing
 *     together — the ordinary case when an app is opened on two devices, or a
 *     request is retried — lose one of the two writes.
 *   - It early-returns when the token is byte-identical, so `platform`,
 *     `appVersion` and any notion of "last seen" can never be refreshed for a
 *     device that is simply still installed.
 *   - `api/user/push/subscribe.post.ts` answers `deviceId: deviceId ||
 *     "auto-generated"` — the literal string, not the id it generated. A client
 *     that does not supply its own id can therefore never name its own row
 *     again, so its entry can only be replaced by a delivery failure.
 *   - Nothing is queryable. "Which devices does this user have", "revoke this
 *     one", "how many installs are on the old app version" are all full scans
 *     of a TEXT column.
 *
 * WHAT STAYS IN THE BLOB
 * ---------------------------------------------------------------------------
 * Web Push. This table is native installs only, which is why `platform` has no
 * `web` member: a browser subscription in a table called `mobileDevice` would
 * be a category error, and the migration deliberately leaves those entries
 * where they are. `PushChannel` keeps reading the blob for them.
 *
 * `revokedAt` VS `deletedAt`
 * ---------------------------------------------------------------------------
 * They are different events and both are kept. `revokedAt` is the domain fact —
 * the user signed out, or revoked this device from another one — and the row
 * survives it so the history remains answerable. `deletedAt` is the ordinary
 * paranoid tombstone. The model is paranoid deliberately: `getFiltered` applies
 * `deletedAt IS NULL` by default, and a model without the column 500s the
 * moment anyone points a DataTable at it.
 */
export default class mobileDevice
  extends Model<mobileDeviceAttributes, mobileDeviceCreationAttributes>
  implements mobileDeviceAttributes
{
  id!: string;
  userId!: string;
  deviceId!: string;
  platform!: "ios" | "android";
  pushToken!: string;
  appVersion?: string | null;
  locale?: string | null;
  lastSeenAt!: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof mobileDevice {
    return mobileDevice.init(
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
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
          },
        },
        deviceId: {
          // The client's own stable install identifier. 191 rather than 255
          // because it is half of a composite index: utf8mb4 is 4 bytes per
          // character, and 191 is the length that keeps the classic
          // 767-byte-per-column assumption satisfied on older row formats.
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "deviceId: Device identifier must not be empty" },
          },
        },
        platform: {
          type: DataTypes.ENUM("ios", "android"),
          allowNull: false,
        },
        pushToken: {
          // TEXT, not STRING(n). Google documents no maximum for an FCM
          // registration token, and a token silently truncated to fit is a
          // device that stops receiving push with nothing to show for it. The
          // column is never indexed, so there is no length ceiling to respect:
          // a stale token is pruned via the row that produced it, not by
          // searching for its value.
          type: DataTypes.TEXT,
          allowNull: false,
          validate: {
            notEmpty: { msg: "pushToken: Push token must not be empty" },
          },
        },
        appVersion: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        locale: {
          type: DataTypes.STRING(16),
          allowNull: true,
        },
        lastSeenAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "mobileDevice",
        tableName: "mobile_device",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            // The re-registration contract. One row per install per account, so
            // an app that reopens UPDATES its row instead of appending another
            // — which is the defect the settings blob could not avoid. Also
            // serves lookups by `userId` alone as a left prefix, so no separate
            // single-column index is declared.
            name: "mobileDeviceUserDeviceIdx",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "deviceId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    mobileDevice.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
