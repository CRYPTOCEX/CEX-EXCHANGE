"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class faqSearch extends sequelize_1.Model {
    static initModel(sequelize) {
        return faqSearch.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                },
            },
            query: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "query: Search query must not be empty" },
                },
            },
            resultCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    isInt: { msg: "resultCount: Must be an integer" },
                    min: { args: [0], msg: "resultCount: Cannot be negative" },
                },
            },
            category: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "faqSearch",
            tableName: "faq_searches",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "faq_searches_query_idx", fields: [{ name: "query", length: 255 }] },
                { name: "faq_searches_userId_idx", fields: [{ name: "userId" }] },
            ],
        });
    }
    static associate(models) {
        faqSearch.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = faqSearch;
