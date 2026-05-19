import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

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
            isUUID: {
              args: 4,
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
        channels: {
          type: DataTypes.JSON,
          allowNull: true,
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
