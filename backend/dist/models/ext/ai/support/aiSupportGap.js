"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportGap extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportGap.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            normalisedQuestion: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
            },
            sampleQuestion: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            count: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
            firstSeen: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            lastSeen: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
            bestScore: { type: sequelize_1.DataTypes.FLOAT, allowNull: true },
            status: {
                type: sequelize_1.DataTypes.ENUM("OPEN", "DRAFTED", "RESOLVED", "IGNORED"),
                allowNull: false,
                defaultValue: "OPEN",
            },
            articleId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        }, {
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
        });
    }
}
exports.default = aiSupportGap;
