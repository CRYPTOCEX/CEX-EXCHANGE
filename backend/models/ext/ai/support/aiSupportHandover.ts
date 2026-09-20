import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Append-only log of every state transition.
 *
 * Mirrors `adminAuditLog`: no `updatedAt`, no soft delete, and NO foreign key on
 * `actorId` — the actor may be the AI (which has no user row by design), the
 * system, the customer, or a staff member, and a FK cannot express that union.
 */
export default class aiSupportHandover
  extends Model<aiSupportHandoverAttributes, aiSupportHandoverCreationAttributes>
  implements aiSupportHandoverAttributes
{
  id!: string;
  sessionId!: string;
  fromState?: string;
  toState!: string;
  actor!: "AI" | "HUMAN" | "SYSTEM" | "USER";
  actorId?: string;
  reason?: string;
  note?: string;
  createdAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportHandover {
    return aiSupportHandover.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sessionId: { type: DataTypes.UUID, allowNull: false },
        fromState: { type: DataTypes.STRING(32), allowNull: true },
        toState: { type: DataTypes.STRING(32), allowNull: false },
        actor: {
          type: DataTypes.ENUM("AI", "HUMAN", "SYSTEM", "USER"),
          allowNull: false,
          defaultValue: "SYSTEM",
        },
        actorId: { type: DataTypes.UUID, allowNull: true },
        reason: { type: DataTypes.STRING(96), allowNull: true },
        note: { type: DataTypes.TEXT, allowNull: true },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "aiSupportHandover",
        tableName: "ai_support_handover",
        paranoid: false,
        timestamps: false,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_handover_session_idx",
            using: "BTREE",
            fields: [{ name: "sessionId" }, { name: "createdAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportHandover.belongsTo(models.aiSupportSession, {
      foreignKey: "sessionId",
      as: "session",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
