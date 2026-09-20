import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Reason for snapshot creation
 */
export type SnapshotReason = "AUTO" | "MANUAL" | "PRE_CHANGE";

// ============================================
// TYPE INTERFACES
// ============================================

export interface binaryAiEngineSnapshotAttributes {
  id: string;
  engineId: string;
  name: string | null;
  description: string | null;
  configData: Record<string, any>;
  configSnapshot: Record<string, any>;
  performanceSnapshot: Record<string, any> | null;
  tierData: Record<string, any>[] | null;
  reason: SnapshotReason;
  createdBy: string;
  notes: string | null;
  isAutomatic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface binaryAiEngineSnapshotCreationAttributes
  extends Optional<
    binaryAiEngineSnapshotAttributes,
    | "id"
    | "name"
    | "description"
    | "configData"
    | "performanceSnapshot"
    | "tierData"
    | "reason"
    | "createdBy"
    | "notes"
    | "isAutomatic"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * Binary AI Engine Snapshot - Configuration snapshots for rollback
 *
 * This model stores complete configuration snapshots that can be used
 * to rollback to a previous known-good state.
 *
 * Business Rules:
 * - Snapshots are created before any configuration change (PRE_CHANGE)
 * - Snapshots can be created manually by admins
 * - Auto snapshots are created periodically for safety
 * - Snapshots include both engine config and tier configurations
 *
 * Related Models:
 * - binaryAiEngine (N:1) - Parent engine
 */
export default class binaryAiEngineSnapshot
  extends Model<
    binaryAiEngineSnapshotAttributes,
    binaryAiEngineSnapshotCreationAttributes
  >
  implements binaryAiEngineSnapshotAttributes
{
  /** Unique identifier (UUID v4) */
  id!: string;
  /** Reference to the parent engine */
  engineId!: string;
  /** Optional name for the snapshot */
  name!: string | null;
  /** Description of the snapshot */
  description!: string | null;
  /** Full engine configuration at time of snapshot */
  configData!: Record<string, any>;
  /** Config snapshot data */
  configSnapshot!: Record<string, any>;
  /** Performance snapshot data */
  performanceSnapshot!: Record<string, any> | null;
  /** User tier configurations at time of snapshot */
  tierData!: Record<string, any>[] | null;
  /** Why the snapshot was created */
  reason!: SnapshotReason;
  /** Who created the snapshot (SYSTEM or admin ID) */
  createdBy!: string;
  /** Optional notes about the snapshot */
  notes!: string | null;
  /** Whether snapshot was created automatically */
  isAutomatic!: boolean;

  createdAt?: Date;
  updatedAt?: Date;

  // Associations
  engine?: any;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof binaryAiEngineSnapshot {
    return binaryAiEngineSnapshot.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        engineId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notEmpty: { msg: "engineId: Engine ID must not be empty" },
            isUUID: { args: ANY_UUID_VERSION, msg: "engineId: Must be a valid UUID" },
          },
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        configData: {
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
          get(this: binaryAiEngineSnapshot) {
            const value = this.getDataValue("configData") as unknown;
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
        configSnapshot: {
          type: DataTypes.JSON,
          allowNull: false,
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
          get(this: binaryAiEngineSnapshot) {
            const value = this.getDataValue("configSnapshot") as unknown;
            if (value == null) return {};
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return {};
              }
            }
            return value;
          },
        },
        performanceSnapshot: {
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
          get(this: binaryAiEngineSnapshot) {
            const value = this.getDataValue("performanceSnapshot") as unknown;
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
        tierData: {
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
          get(this: binaryAiEngineSnapshot) {
            const value = this.getDataValue("tierData") as unknown;
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
        isAutomatic: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        reason: {
          type: DataTypes.ENUM("AUTO", "MANUAL", "PRE_CHANGE"),
          allowNull: false,
          defaultValue: "MANUAL",
        },
        createdBy: {
          type: DataTypes.STRING(100),
          allowNull: false,
          defaultValue: "SYSTEM",
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "binaryAiEngineSnapshot",
        tableName: "binary_ai_engine_snapshot",
        timestamps: true,
        indexes: [
          { fields: ["engineId"] },
          { fields: ["createdAt"] },
          { fields: ["reason"] },
        ],
      }
    );
  }

  public static associate(models: any) {
    // Snapshot belongs to engine
    binaryAiEngineSnapshot.belongsTo(models.binaryAiEngine, {
      foreignKey: "engineId",
      as: "engine",
      onDelete: "CASCADE",
    });
  }
}
