import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * fxExecutionAlert — thin alert/event row written by the fx alert dispatcher
 * (plan §8.3). Doubles as the Execution dashboard's alert history/inbox so a
 * missed email is still visible. The dispatcher's cross-process throttle
 * reads the latest row per (executionProviderId, alertKey) via the composite
 * index below — keep that index in sync with the throttle query.
 */
export default class fxExecutionAlert
  extends Model<fxExecutionAlertAttributes, fxExecutionAlertCreationAttributes>
  implements fxExecutionAlertAttributes
{
  id!: string;
  executionProviderId?: string;
  alertKey!: string;
  severity!: string;
  title!: string;
  message!: string;
  payload?: string;
  acknowledgedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxExecutionAlert {
    return fxExecutionAlert.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        executionProviderId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "fxExecutionProvider the alert concerns — NULL for global alerts",
        },
        alertKey: {
          type: DataTypes.STRING(64),
          allowNull: false,
          validate: {
            notEmpty: { msg: "alertKey: Alert key must not be empty" },
          },
          comment:
            "Stable machine key (ledger-drift, hedge-margin, orphan, cursor-stall, …) — throttle dimension",
        },
        severity: {
          type: DataTypes.STRING(12),
          allowNull: false,
          defaultValue: "warning",
          validate: {
            isIn: {
              args: [["info", "warning", "critical"]],
              msg: "severity: Must be info, warning or critical",
            },
          },
        },
        title: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "title: Title must not be empty" },
          },
          comment: "Human headline — also the notification/email subject",
        },
        message: {
          type: DataTypes.STRING(1000),
          allowNull: false,
          validate: {
            notEmpty: { msg: "message: Message must not be empty" },
          },
          comment: "Human body — also the notification/email message",
        },
        payload: {
          type: DataTypes.TEXT,
          allowNull: true,
          set(value) {
            this.setDataValue(
              "payload",
              value === null || value === undefined || typeof value === "string"
                ? (value as any)
                : JSON.stringify(value)
            );
          },
          get() {
            const value = this.getDataValue("payload");
            if (!value) return null;
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          },
          comment: "Structured context for the dashboard inbox (guarded TEXT-JSON)",
        },
        acknowledgedAt: {
          type: DataTypes.DATE(3),
          allowNull: true,
          comment: "Set when an operator acknowledges the alert in the inbox",
        },
      },
      {
        sequelize,
        modelName: "fxExecutionAlert",
        tableName: "fx_execution_alert",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxExecutionAlertThrottleIdx",
            using: "BTREE",
            fields: [
              { name: "executionProviderId" },
              { name: "alertKey" },
              { name: "createdAt" },
            ],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxExecutionAlert.belongsTo(models.fxExecutionProvider, {
      as: "executionProvider",
      foreignKey: "executionProviderId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
