"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class mlmBinaryNode extends sequelize_1.Model {
    static initModel(sequelize) {
        return mlmBinaryNode.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            referralId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "referralId: Referral ID must be a valid UUID",
                    },
                },
            },
            parentId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "parentId: Parent ID must be a valid UUID when provided",
                    },
                },
            },
            leftChildId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "leftChildId: Left Child ID must be a valid UUID when provided",
                    },
                },
            },
            rightChildId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "rightChildId: Right Child ID must be a valid UUID when provided",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "mlmBinaryNode",
            tableName: "mlm_binary_node",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "mlmBinaryNodeReferralIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "referralId" }],
                },
                {
                    name: "mlmBinaryNodeParentIdFkey",
                    using: "BTREE",
                    fields: [{ name: "parentId" }],
                },
                {
                    name: "mlmBinaryNodeLeftChildIdFkey",
                    using: "BTREE",
                    fields: [{ name: "leftChildId" }],
                },
                {
                    name: "mlmBinaryNodeRightChildIdFkey",
                    using: "BTREE",
                    fields: [{ name: "rightChildId" }],
                },
            ],
        });
    }
    static associate(models) {
        mlmBinaryNode.belongsTo(models.mlmBinaryNode, {
            as: "parent",
            foreignKey: "parentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmBinaryNode.hasMany(models.mlmBinaryNode, {
            as: "nodes",
            foreignKey: "parentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmBinaryNode.belongsTo(models.mlmBinaryNode, {
            as: "leftChild",
            foreignKey: "leftChildId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmBinaryNode.hasMany(models.mlmBinaryNode, {
            as: "leftChildBinaryNodes",
            foreignKey: "leftChildId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmBinaryNode.belongsTo(models.mlmBinaryNode, {
            as: "rightChild",
            foreignKey: "rightChildId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmBinaryNode.hasMany(models.mlmBinaryNode, {
            as: "rightChildBinaryNodes",
            foreignKey: "rightChildId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmBinaryNode.belongsTo(models.mlmReferral, {
            as: "referral",
            foreignKey: "referralId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = mlmBinaryNode;
