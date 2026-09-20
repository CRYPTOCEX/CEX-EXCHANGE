"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportGlossary extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportGlossary.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            term: { type: sequelize_1.DataTypes.STRING(96), allowNull: false, unique: true },
            canonical: { type: sequelize_1.DataTypes.STRING(96), allowNull: false },
            definition: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            forbidden: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("forbidden");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        }, {
            sequelize,
            modelName: "aiSupportGlossary",
            tableName: "ai_support_glossary",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_glossary_term_uq",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "term" }],
                },
            ],
        });
    }
}
exports.default = aiSupportGlossary;
