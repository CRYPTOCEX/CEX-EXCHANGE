import type * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * Operator-authored escalation policy, evaluated in `priority` order.
 *
 * `matchType: REGEX` runs an operator-authored pattern against customer text on
 * the reply path. The evaluator compiles once, caches, and bounds the input
 * length — an accidental catastrophic-backtracking pattern would otherwise hang
 * every incoming message with no error.
 */
export default class aiSupportRule
  extends Model<aiSupportRuleAttributes, aiSupportRuleCreationAttributes>
  implements aiSupportRuleAttributes
{
  id!: string;
  name!: string;
  priority!: number;
  matchType!:
    | "KEYWORD"
    | "REGEX"
    | "INTENT"
    | "CONFIDENCE"
    | "TURN_COUNT"
    | "KYC_FEATURE"
    | "ALWAYS";
  matchValue?: string;
  action!: "ESCALATE" | "SUSPEND_AI" | "TAG" | "SET_IMPORTANCE" | "REFUSE";
  actionValue?: string;
  status!: boolean;

  createdAt!: Date;
  updatedAt!: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof aiSupportRule {
    return aiSupportRule.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        name: { type: DataTypes.STRING(191), allowNull: false },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
        },
        matchType: {
          type: DataTypes.ENUM(
            "KEYWORD",
            "REGEX",
            "INTENT",
            "CONFIDENCE",
            "TURN_COUNT",
            "KYC_FEATURE",
            "ALWAYS"
          ),
          allowNull: false,
          defaultValue: "KEYWORD",
        },
        matchValue: { type: DataTypes.TEXT, allowNull: true },
        action: {
          type: DataTypes.ENUM(
            "ESCALATE",
            "SUSPEND_AI",
            "TAG",
            "SET_IMPORTANCE",
            "REFUSE"
          ),
          allowNull: false,
          defaultValue: "ESCALATE",
        },
        actionValue: { type: DataTypes.STRING(191), allowNull: true },
        status: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: "aiSupportRule",
        tableName: "ai_support_rule",
        paranoid: false,
        timestamps: true,
        indexes: [
          { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
          {
            name: "ai_support_rule_status_priority_idx",
            using: "BTREE",
            fields: [{ name: "status" }, { name: "priority" }],
          },
        ],
      }
    );
  }
}
