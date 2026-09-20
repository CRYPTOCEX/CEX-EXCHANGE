import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";

/**
 * fxRoutingRule — priority-ordered order-placement routing overrides
 * (first match wins; NULL dimension = wildcard). A table, not settings
 * JSON: rules reference FK-shaped things, need an audit-stable id
 * (fxOrder.routingRuleId), and routing topology is operator-confidential
 * (the settings table is world-readable via /api/settings).
 * Evaluated ONLY at placement — rule changes never re-route open positions.
 */
export default class fxRoutingRule
  extends Model<fxRoutingRuleAttributes, fxRoutingRuleCreationAttributes>
  implements fxRoutingRuleAttributes
{
  id!: string;
  priority!: number;
  enabled?: boolean;
  target!: string;
  executionProviderId?: string;
  instrumentId?: string;
  symbolGroupId?: string;
  assetClass?: string;
  accountGroupId?: string;
  accountId?: string;
  side?: string;
  minAmount?: number;
  maxAmount?: number;
  note?: string;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(sequelize: Sequelize.Sequelize): typeof fxRoutingRule {
    return fxRoutingRule.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        priority: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 100,
          comment: "Evaluation order — ASC, first match wins",
        },
        enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: true,
        },
        target: {
          type: DataTypes.STRING(12),
          allowNull: false,
          validate: {
            isIn: {
              args: [["INTERNAL", "EXTERNAL"]],
              msg: "target: Must be INTERNAL or EXTERNAL",
            },
          },
        },
        executionProviderId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Required at the app level when target=EXTERNAL",
        },
        instrumentId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Match dimension — NULL = wildcard",
        },
        symbolGroupId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Match dimension — NULL = wildcard",
        },
        assetClass: {
          type: DataTypes.STRING(20),
          allowNull: true,
          validate: {
            isIn: {
              args: [["FOREX", "STOCK", "COMMODITY", "INDEX", "CRYPTO"]],
              msg: "assetClass: Must be one of FOREX, STOCK, COMMODITY, INDEX, CRYPTO",
            },
          },
          comment: "Match dimension — NULL = wildcard",
        },
        accountGroupId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Match dimension — NULL = wildcard",
        },
        accountId: {
          type: DataTypes.UUID,
          allowNull: true,
          comment: "Match dimension — NULL = wildcard",
        },
        side: {
          type: DataTypes.STRING(4),
          allowNull: true,
          validate: {
            isIn: {
              args: [["BUY", "SELL"]],
              msg: "side: Must be BUY or SELL (UPPERCASE)",
            },
          },
          comment: "Match dimension — NULL = wildcard",
        },
        minAmount: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Match dimension: amount >= minAmount when set",
        },
        maxAmount: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          comment: "Match dimension: amount <= maxAmount when set",
        },
        note: {
          type: DataTypes.STRING(191),
          allowNull: true,
          comment: "Operator label shown in the rules table",
        },
      },
      {
        sequelize,
        modelName: "fxRoutingRule",
        tableName: "fx_routing_rule",
        timestamps: true,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            name: "fxRoutingRuleEnabledPriorityIdx",
            using: "BTREE",
            fields: [{ name: "enabled" }, { name: "priority" }],
          },
        ],
      }
    );
  }
  public static associate(models: any) {
    fxRoutingRule.belongsTo(models.fxExecutionProvider, {
      as: "executionProvider",
      foreignKey: "executionProviderId",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  }
}
