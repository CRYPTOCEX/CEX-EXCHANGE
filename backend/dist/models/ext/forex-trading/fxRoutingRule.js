"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class fxRoutingRule extends sequelize_1.Model {
    static initModel(sequelize) {
        return fxRoutingRule.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            priority: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                comment: "Evaluation order — ASC, first match wins",
            },
            enabled: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
            },
            target: {
                type: sequelize_1.DataTypes.STRING(12),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["INTERNAL", "EXTERNAL"]],
                        msg: "target: Must be INTERNAL or EXTERNAL",
                    },
                },
            },
            executionProviderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Required at the app level when target=EXTERNAL",
            },
            instrumentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Match dimension — NULL = wildcard",
            },
            symbolGroupId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Match dimension — NULL = wildcard",
            },
            assetClass: {
                type: sequelize_1.DataTypes.STRING(20),
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
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Match dimension — NULL = wildcard",
            },
            accountId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                comment: "Match dimension — NULL = wildcard",
            },
            side: {
                type: sequelize_1.DataTypes.STRING(4),
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
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Match dimension: amount >= minAmount when set",
            },
            maxAmount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                comment: "Match dimension: amount <= maxAmount when set",
            },
            note: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Operator label shown in the rules table",
            },
        }, {
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
        });
    }
    static associate(models) {
        fxRoutingRule.belongsTo(models.fxExecutionProvider, {
            as: "executionProvider",
            foreignKey: "executionProviderId",
            onDelete: "SET NULL",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = fxRoutingRule;
