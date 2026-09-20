import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

export default class stakingAdminActivity
  extends Model<
    stakingAdminActivityAttributes,
    stakingAdminActivityCreationAttributes
  >
  implements stakingAdminActivityAttributes
{
  // Primary key
  id!: string;

  // Foreign key (nullable: automated/system activities have no acting user)
  userId!: string | null;

  // Activity action: create, update, delete, approve, reject, distribute
  action!: "create" | "update" | "delete" | "approve" | "reject" | "distribute";

  // Activity type: pool, position, earnings, settings, withdrawal
  type!: "pool" | "position" | "earnings" | "settings" | "withdrawal";

  // Related entity ID (for example, pool or position id)
  relatedId!: string;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  // Model initialization
  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof stakingAdminActivity {
    return stakingAdminActivity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          // Nullable so automated/system processes (e.g. the staking reward
          // cron) can record audit activity without a real acting user. The
          // isUUID validator only runs for non-null values, so passing null is
          // accepted; passing a non-UUID sentinel like "SYSTEM" is not.
          //
          // THIS DECLARATION IS NOT ENOUGH ON ITS OWN — run
          // `node backend/scripts/fix-staking-activity-system-actor.mjs --apply`
          // on any install created before it. The diff sync in src/db.ts
          // fingerprints columns from the MODEL and compares
          // definition-against-definition, never against what MySQL reports, so
          // once the manifest recorded `allowNull: true` here the column
          // counted as unchanged forever and the ALTER was skipped on every
          // subsequent boot. Databases where the original ALTER never landed
          // kept `NOT NULL`, every cron audit row was rejected, and the
          // best-effort try/catch around the write turned that into one log
          // line instead of a visible failure — so the staking activity feed
          // silently showed admin actions only, and nothing at all from the
          // engine that moves most of the money.
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
          },
        },
        action: {
          type: DataTypes.ENUM(
            "create",
            "update",
            "delete",
            "approve",
            "reject",
            "distribute"
          ),
          allowNull: false,
          validate: {
            notEmpty: { msg: "action: Action is required" },
          },
        },
        type: {
          type: DataTypes.ENUM(
            "pool",
            "position",
            "earnings",
            "settings",
            "withdrawal"
          ),
          allowNull: false,
          validate: {
            notEmpty: { msg: "type: Type is required" },
          },
        },
        relatedId: {
          type: DataTypes.UUID,
          /*
            NULLABLE, because not every admin action is about a row.

            Changing `stakingMode` switches which PRODUCT the platform sells.
            It relates to no pool and no position — it relates to the whole
            addon — and requiring a UUID here forced that entry either to
            invent one or, as it did, to go unrecorded entirely, which is what
            D5 asks for and did not get.
          */
          allowNull: true,
          validate: {
            isUUID: { args: ANY_UUID_VERSION, msg: "relatedId: Must be a valid UUID" },
          },
        },
        /*
          WHAT CHANGED, in the entry's own words.

          An action, a type and an id say that somebody updated a setting. They
          do not say WHICH setting, from what to what, or what was open at the
          time — and those are the only three things anyone reviewing a product
          switch afterwards actually wants. Free-form JSON rather than columns
          because each action kind has different facts worth keeping.
        */
        metadata: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "stakingAdminActivity",
        tableName: "staking_admin_activities",
        paranoid: true, // Enable soft deletes
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            fields: [{ name: "id" }],
          },
          {
            name: "staking_admin_activities_action_idx",
            fields: [{ name: "action" }],
          },
          {
            name: "staking_admin_activities_type_idx",
            fields: [{ name: "type" }],
          },
          {
            name: "staking_admin_activities_relatedId_idx",
            fields: [{ name: "relatedId" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    this.belongsTo(models.user, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
