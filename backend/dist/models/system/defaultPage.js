"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class defaultPage extends sequelize_1.Model {
    static initModel(sequelize) {
        return defaultPage.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
            },
            pageId: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
                validate: {
                    isIn: [['home', 'about', 'privacy', 'terms', 'contact']],
                },
            },
            pageSource: {
                type: sequelize_1.DataTypes.ENUM('default', 'builder'),
                allowNull: false,
                defaultValue: 'default',
                comment: 'Source type: default for regular pages, builder for builder-created pages',
            },
            type: {
                type: sequelize_1.DataTypes.ENUM('variables', 'content'),
                allowNull: false,
            },
            title: {
                type: sequelize_1.DataTypes.STRING,
                allowNull: false,
            },
            variables: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
                comment: 'Structured data for home page editing (texts, images, etc.)',
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                defaultValue: "",
                comment: 'HTML/markdown content for legal pages',
            },
            meta: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: {},
                comment: 'SEO metadata and other page settings',
            },
            status: {
                type: sequelize_1.DataTypes.ENUM('active', 'draft'),
                allowNull: false,
                defaultValue: 'active',
            },
        }, {
            sequelize,
            modelName: "defaultPage",
            tableName: "default_pages",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['pageId', 'pageSource'],
                    name: 'unique_page_source'
                },
                {
                    fields: ['status'],
                },
                {
                    fields: ['type'],
                },
            ],
        });
    }
}
exports.default = defaultPage;
