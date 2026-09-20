import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * One retrievable passage.
 *
 * NO FULLTEXT INDEX, deliberately. The schema is created by Sequelize `alter`
 * sync, and `dropRedundantConstraints()` in `backend/src/db.ts` DROPs any index
 * whose name ends `_<digits>` when a same-named-without-suffix index covers the
 * same columns — WITHOUT comparing INDEX_TYPE. A FULLTEXT `text_2` beside a
 * BTREE `text` is silently destroyed on the next boot. `WITH PARSER ngram` is
 * also MySQL-only and breaks MariaDB, and this product supports both with no
 * stated version floor.
 *
 * Retrieval is a pure-JS BM25 index built in-process instead. The corpus is a
 * few thousand chunks — a linear scan over the postings is sub-millisecond.
 *
 * No `embedding` column in v1 either: Anthropic has no embeddings endpoint, and
 * there is no vector column portable across MySQL and MariaDB.
 */
export default class aiSupportChunk
  extends Model<aiSupportChunkAttributes, aiSupportChunkCreationAttributes>
  implements aiSupportChunkAttributes
{
  id!: string;
  sourceId!: string;
  ord!: number;
  /** "Staking › Admin › Pools › Create a pool" — indexed AND sent to the model. */
  breadcrumb?: string;
  title?: string;
  anchor?: string;
  text!: string;
  tokens!: number;
  citationUrl?: string;
  tags?: string[];
  weight!: number;
  /**
   * Who the passage was written FOR — not who may read it.
   *
   * Taken from the docs frontmatter `section`: Guides/Troubleshooting are
   * CUSTOMER, Admin/Reference/Install/Operate/Configure are OPERATOR. Operator
   * KB articles and FAQ rows are CUSTOMER, because they exist to answer a
   * customer's question even though an operator wrote them.
   *
   * Measured need: "when do I get my staking rewards?" retrieved
   * `staking/reference/api` — the admin endpoint listing — above
   * `staking/guides/rewards`, which contains the actual formula. Operator pages
   * are down-weighted for customer-facing retrieval rather than excluded,
   * because the same index has to serve admin-side surfaces where the reference
   * pages ARE the right answer.
   */
  audience!: "CUSTOMER" | "OPERATOR";

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof aiSupportChunk {
    return aiSupportChunk.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        sourceId: { type: DataTypes.UUID, allowNull: false },
        ord: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        breadcrumb: { type: DataTypes.STRING(512), allowNull: true },
        title: { type: DataTypes.STRING(255), allowNull: true },
        anchor: { type: DataTypes.STRING(191), allowNull: true },
        text: { type: DataTypes.TEXT("medium"), allowNull: false },
        tokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        citationUrl: { type: DataTypes.STRING(512), allowNull: true },
        tags: {
          type: DataTypes.JSON,
         allowNull: true,
          get(this: any) {
            /*
             * Guarded both ways: `typeof` stops an already-parsed value (prod
             * MySQL) being parsed a second time, and the try/catch stops a
             * corrupt value throwing inside a getter during an ordinary read.
             */
            const value = this.getDataValue("tags") as unknown;
            if (value == null) return [];
            if (typeof value === "string") {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return value;
          },
        },
        weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.0 },
        audience: {
          type: DataTypes.ENUM("CUSTOMER", "OPERATOR"),
          allowNull: false,
          defaultValue: "CUSTOMER",
        },
      },
      {
        sequelize,
        modelName: "aiSupportChunk",
        tableName: "ai_support_chunk",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_chunk_source_ord_idx",
            using: "BTREE",
            fields: [{ name: "sourceId" }, { name: "ord" }],
          },
          {
            // The BM25 index rebuilds only when this moves.
            name: "ai_support_chunk_updated_idx",
            using: "BTREE",
            fields: [{ name: "updatedAt" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    aiSupportChunk.belongsTo(models.aiSupportSource, {
      foreignKey: "sourceId",
      as: "source",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
