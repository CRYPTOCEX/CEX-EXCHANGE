"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportArticle extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportArticle.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            question: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: { notEmpty: { msg: "question: Question must not be empty" } },
            },
            answer: {
                type: sequelize_1.DataTypes.TEXT("medium"),
                allowNull: false,
                defaultValue: "",
            },
            category: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
            productSlug: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
            status: {
                type: sequelize_1.DataTypes.ENUM("DRAFT", "PUBLISHED"),
                allowNull: false,
                defaultValue: "DRAFT",
            },
            isPolicyStub: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            sourceTicketId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            approvedBy: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            generatedBy: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportArticle",
            tableName: "ai_support_article",
            paranoid: true,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_article_status_idx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "ai_support_article_stub_idx",
                    using: "BTREE",
                    fields: [{ name: "isPolicyStub" }, { name: "status" }],
                },
            ],
        });
    }
}
exports.default = aiSupportArticle;
