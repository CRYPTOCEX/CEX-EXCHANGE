import * as Sequelize from "sequelize";
import { DataTypes, Model, Optional } from "sequelize";

export interface nftMetadataBackupAttributes {
  id: string;
  backupId: string;
  type: string;
  size: number;
  checksum: string;
  locations: Record<string, string>;
  encrypted: boolean;
  compressed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface nftMetadataBackupCreationAttributes
  extends Optional<nftMetadataBackupAttributes, "id" | "createdAt" | "updatedAt"> {}

/**
 * NFT Metadata Backup - Stores backup metadata for NFT metadata files
 */
export default class nftMetadataBackup
  extends Model<nftMetadataBackupAttributes, nftMetadataBackupCreationAttributes>
  implements nftMetadataBackupAttributes
{
  id!: string;
  backupId!: string;
  type!: string;
  size!: number;
  checksum!: string;
  locations!: Record<string, string>;
  encrypted!: boolean;
  compressed!: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof nftMetadataBackup {
    return nftMetadataBackup.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        backupId: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        size: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        checksum: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        locations: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
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
          get(this: nftMetadataBackup) {
            const value = this.getDataValue("locations") as unknown;
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
        encrypted: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        compressed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize,
        modelName: "nftMetadataBackup",
        tableName: "nft_metadata_backup",
        timestamps: true,
        indexes: [
          { fields: ["backupId"], unique: true },
          { fields: ["type"] },
          { fields: ["createdAt"] },
        ],
      }
    );
  }

  public static associate(_models: any) {
    // No associations for now
  }
}
