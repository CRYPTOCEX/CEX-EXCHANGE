"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportRule extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportRule.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            priority: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
            },
            matchType: {
                type: sequelize_1.DataTypes.ENUM("KEYWORD", "REGEX", "INTENT", "CONFIDENCE", "TURN_COUNT", "KYC_FEATURE", "ALWAYS"),
                allowNull: false,
                defaultValue: "KEYWORD",
            },
            matchValue: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            action: {
                type: sequelize_1.DataTypes.ENUM("ESCALATE", "SUSPEND_AI", "TAG", "SET_IMPORTANCE", "REFUSE"),
                allowNull: false,
                defaultValue: "ESCALATE",
            },
            actionValue: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
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
        });
    }
}
exports.default = aiSupportRule;
