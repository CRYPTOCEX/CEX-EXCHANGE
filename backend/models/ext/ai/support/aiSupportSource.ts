import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A registered body of knowledge the agent may retrieve from.
 *
 * `weight` is a deliberate operator override: an operator-authored KB article
 * outranks the shipped product documentation, because the docs describe
 * MashDiv's software while the operator's own articles describe the operator's
 * fees, limits and policies — which is what support tickets are actually about.
 */
export default class aiSupportSource
  extends Model<aiSupportSourceAttributes, aiSupportSourceCreationAttributes>
  implements aiSupportSourceAttributes
{
  id!: string;
  kind!: "DOCS_PACK" | "DOCS_REMOTE" | "FAQ" | "ARTICLE" | "CRAWL";
  title!: string;
  /** Pack filename, remote URL, or the internal table this source mirrors. */
  locator?: string;
  productSlug?: string;
  version?: string;
  checksum?: string;
  chunkCount!: number;
  weight!: number;
  status!: boolean;
  lastIndexedAt?: Date;
  error?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportSource {
    return aiSupportSource.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        kind: {
          type: DataTypes.ENUM(
            "DOCS_PACK",
            "DOCS_REMOTE",
            "FAQ",
            "ARTICLE",
            "CRAWL"
          ),
          allowNull: false,
          defaultValue: "DOCS_PACK",
        },
        title: { type: DataTypes.STRING(191), allowNull: false },
        locator: { type: DataTypes.STRING(255), allowNull: true },
        productSlug: { type: DataTypes.STRING(96), allowNull: true },
        version: { type: DataTypes.STRING(32), allowNull: true },
        checksum: { type: DataTypes.STRING(64), allowNull: true },
        chunkCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        weight: {
          type: DataTypes.FLOAT,
          allowNull: false,
          defaultValue: 1.0,
        },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lastIndexedAt: { type: DataTypes.DATE, allowNull: true },
        error: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportSource",
        tableName: "ai_support_source",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_source_kind_status_idx",
            using: "BTREE",
            fields: [{ name: "kind" }, { name: "status" }],
          },
          {
            name: "ai_support_source_product_idx",
            using: "BTREE",
            fields: [{ name: "productSlug" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportSource.hasMany(models.aiSupportChunk, {
      foreignKey: "sourceId",
      as: "chunks",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
