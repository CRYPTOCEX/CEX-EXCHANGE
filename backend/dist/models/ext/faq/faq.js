"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function toStringArray(value) {
    if (Array.isArray(value))
        return value.filter((v) => typeof v === "string");
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return [];
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed)
                ? parsed.filter((v) => typeof v === "string")
                : [];
        }
        catch (_a) {
            return [];
        }
    }
    return [];
}
class faq extends sequelize_1.Model {
    static initModel(sequelize) {
        return faq.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            question: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "question: Question must not be empty" },
                },
            },
            answer: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "answer: Answer must not be empty" },
                },
            },
            image: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
            category: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "category: Category must not be empty" },
                },
            },
            tags: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
                get() {
                    return toStringArray(this.getDataValue("tags"));
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            order: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "order: Must be an integer" },
                    min: { args: [0], msg: "order: Cannot be negative" },
                },
            },
            pagePath: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "pagePath: Page path must not be empty" },
                },
            },
            relatedFaqIds: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: [],
                get() {
                    return toStringArray(this.getDataValue("relatedFaqIds"));
                },
            },
            views: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "views: Must be an integer" },
                    min: { args: [0], msg: "views: Cannot be negative" },
                },
            },
        }, {
            sequelize,
            modelName: "faq",
            tableName: "faqs",
            paranoid: true,
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    fields: [{ name: "id" }],
                },
                {
                    name: "faqs_category_idx",
                    fields: [{ name: "category" }],
                },
                {
                    name: "faqs_pagePath_idx",
                    fields: [{ name: "pagePath" }],
                },
                {
                    name: "faqs_order_idx",
                    fields: [{ name: "order" }],
                },
                {
                    name: "faqs_status_idx",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        faq.hasMany(models.faqFeedback, {
            foreignKey: "faqId",
            as: "feedbacks",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = faq;
