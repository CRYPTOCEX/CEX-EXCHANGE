import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * A question the knowledge base could not answer.
 *
 * Sorted by count descending, this table IS the answer to "what should I
 * document next" — the twenty questions the operator's own documentation does
 * not cover, ranked by how often customers ask them.
 */
export default class aiSupportGap
  extends Model<aiSupportGapAttributes, aiSupportGapCreationAttributes>
  implements aiSupportGapAttributes
{
  id!: string;
  /** Lowercased, stop-worded, sorted-token form. The dedupe key. */
  normalisedQuestion!: string;
  /** The most recent verbatim phrasing, for the admin to read. */
  sampleQuestion?: string;
  count!: number;
  firstSeen!: Date;
  lastSeen!: Date;
  /** Best retrieval score seen. Near-misses are the easiest gaps to close. */
  bestScore?: number;
  status!: "OPEN" | "DRAFTED" | "RESOLVED" | "IGNORED";
  articleId?: string;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiSupportGap {
    return aiSupportGap.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        normalisedQuestion: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        sampleQuestion: { type: DataTypes.TEXT, allowNull: true },
        count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        firstSeen: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        lastSeen: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        bestScore: { type: DataTypes.FLOAT, allowNull: true },
        status: {
          type: DataTypes.ENUM("OPEN", "DRAFTED", "RESOLVED", "IGNORED"),
          allowNull: false,
          defaultValue: "OPEN",
        },
        articleId: { type: DataTypes.UUID, allowNull: true },
      },
      {
        sequelize,
        modelName: "aiSupportGap",
        tableName: "ai_support_gap",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_gap_question_uq",
            unique: true,
            using: "BTREE",
            fields: [{ name: "normalisedQuestion" }],
          },
          {
            name: "ai_support_gap_status_count_idx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "count" }],
          },
        ],
      }
    );
  }
}
