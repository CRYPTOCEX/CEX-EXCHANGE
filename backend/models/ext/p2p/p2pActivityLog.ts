import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

export default class p2pActivityLog
  extends Model<p2pActivityLogAttributes, p2pActivityLogCreationAttributes>
  implements p2pActivityLogAttributes
{
  id!: string;
  userId?: string | null;
  type!: string;
  action!: string;
  details?: string;
  relatedEntity?: string;
  relatedEntityId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof p2pActivityLog {
    return p2pActivityLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "Type must not be empty" } },
        },
        action: {
          type: DataTypes.STRING(50),
          allowNull: false,
          validate: { notEmpty: { msg: "Action must not be empty" } },
        },
        details: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        relatedEntity: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        relatedEntityId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "p2pActivityLog",
        tableName: "p2p_activity_logs",
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            // The reputation cron does two findOne lookups per user against
            // this table — the latest REPUTATION_UPDATE and whether a
            // REPUTATION_MILESTONE exists — so the lookup is always pinned
            // to one user and narrowed by type/action before it is ordered
            // by time. Leading with userId is what keeps each of those a
            // per-user range rather than a scan of a log that grows by a row
            // per active user per hour; createdAt trails so the ORDER BY is
            // satisfied from the index instead of a filesort.
            name: "p2p_activity_log_user_type_action_created",
            using: "BTREE",
            fields: [
              { name: "userId" },
              { name: "type" },
              { name: "action" },
              { name: "createdAt" },
            ],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    p2pActivityLog.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
