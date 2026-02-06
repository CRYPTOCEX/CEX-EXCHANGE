"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class postTag extends sequelize_1.Model {
    static initModel(sequelize) {
        return postTag.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the post-tag relationship",
            },
            postId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "postId: Post ID must be a valid UUID" },
                },
                comment: "ID of the blog post",
            },
            tagId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: { args: 4, msg: "tagId: Tag ID must be a valid UUID" },
                },
                comment: "ID of the tag associated with the post",
            },
        }, {
            sequelize,
            modelName: "postTag",
            tableName: "post_tag",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "postTagPostIdForeign",
                    using: "BTREE",
                    fields: [{ name: "postId" }],
                },
                {
                    name: "postTagTagIdForeign",
                    using: "BTREE",
                    fields: [{ name: "tagId" }],
                },
            ],
        });
    }
    static associate(models) {
        postTag.belongsTo(models.post, {
            as: "post",
            foreignKey: "postId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        postTag.belongsTo(models.tag, {
            as: "tag",
            foreignKey: "tagId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = postTag;
