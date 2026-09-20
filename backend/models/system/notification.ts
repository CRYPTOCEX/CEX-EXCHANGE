import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class notification
  extends Model<notificationAttributes, notificationCreationAttributes>
  implements notificationAttributes
{
  id!: string;
  userId!: string;
  relatedId?: string;
  title!: string;
  type!: string;
  message!: string;
  details?: string;
  link?: string;
  actions?: any;
  read!: boolean;
  idempotencyKey?: string;
  /**
   * THE EVENT THIS NOTIFICATION ANNOUNCES.
   *
   * MIRRORED, NOT USED. Nothing in this codebase reads or writes it; migration
   * M-013 (`0213_m013_notification_event_key`) adds the column and the Rust
   * notifier writes it. It is declared here because `Model.sync({alter})` issues
   * `removeColumn` for every physical column the model does not describe
   * (`src/db.ts`), so without this declaration the next Node boot would delete
   * the column and every deep link keyed on it.
   *
   * Spelled `eventKey`, NOT `event_key`, and with no `field:` mapping. This
   * table names its columns after its attributes with exactly one exception —
   * `idempotencyKey` above — and a mirror that copied the exception would leave
   * Sequelize looking for a column the migration never created.
   */
  eventKey?: string | null;
  channels?: any;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof notification {
    return notification.init(
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
            isUUID: { args: ANY_UUID_VERSION,
              msg: "userId: Must be a valid UUID",
            },
          },
        },
        relatedId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "title: Notification title must not be empty",
            },
          },
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "type: Notification type must not be empty",
            },
          },
        },
        message: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: "message: Notification message must not be empty",
            },
          },
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        link: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        actions: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: notification) {
            const value = this.getDataValue("actions") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        read: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        idempotencyKey: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: "idempotency_key",
        },
        // The mirrored M-013 column. See the field declaration above for why it is
        // here and why nothing in this tree touches it. `varchar(64)`, nullable,
        // and the migration's own COMMENT text.
        eventKey: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment:
            "Stable machine name of the event this notification announces, for deep links and push eligibility. NULL means the producer did not declare one; readers fall back to type/title.",
        },
        channels: {
          type: DataTypes.JSON,
          allowNull: true,
          /*
           * Guarded getter. Prod MySQL delivers a DataTypes.JSON column ALREADY
           * PARSED; local MariaDB stores it as LONGTEXT and hands back the raw
           * STRING, so without this the same endpoint serves an object to one
           * install and a JSON string to another. `Array.isArray("[...]")` is
           * false and `(x || []).map` throws, so the consumer either dies or —
           * worse — silently renders nothing. The `typeof` guard is
           * load-bearing: an unguarded JSON.parse works locally and 500s on
           * prod with `"[object Object]" is not valid JSON`.
           */
          get(this: notification) {
            const value = this.getDataValue("channels") as unknown;
            if (value == null) return null;
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            return value;
          },
        },
        priority: {
          type: DataTypes.ENUM("LOW", "NORMAL", "HIGH", "URGENT"),
          allowNull: true,
          defaultValue: "NORMAL",
        },
      },
      {
        sequelize,
        modelName: "notification",
        tableName: "notification",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "userId_index",
            fields: [{ name: "userId" }],
          },
          {
            name: "type_index",
            fields: [{ name: "type" }],
          },
          {
            name: "idempotency_key_index",
            fields: [{ name: "idempotency_key" }],
          },
          {
            // The socket feed and the REST route both read one user's
            // notifications newest-first; userId leads so createdAt supplies
            // the ordering in-index instead of a filesort per user.
            name: "notification_user_created",
            fields: [{ name: "userId" }, { name: "createdAt" }],
          },
        ],
        hooks: {
          beforeValidate: (instance: notification) => {
            // Convert type to lowercase to support case-insensitive input
            if (instance.type) {
              instance.type = instance.type.toLowerCase();
            }
          },
        },
      }
    );
  }

  public static associate(models: any) {
    // Associate the notification with the user that receives it
    notification.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
