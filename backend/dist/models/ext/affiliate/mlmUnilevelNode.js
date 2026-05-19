"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class mlmUnilevelNode extends sequelize_1.Model {
    static initModel(sequelize) {
        return mlmUnilevelNode.init({
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
                        msg: "parentId: Parent ID must be a valid UUID",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "mlmUnilevelNode",
            tableName: "mlm_unilevel_node",
            timestamps: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "mlmUnilevelNodeReferralIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "referralId" }],
                },
                {
                    name: "mlmUnilevelNodeParentIdFkey",
                    using: "BTREE",
                    fields: [{ name: "parentId" }],
                },
            ],
        });
    }
    static associate(models) {
        mlmUnilevelNode.belongsTo(models.mlmUnilevelNode, {
            as: "parent",
            foreignKey: "parentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmUnilevelNode.hasMany(models.mlmUnilevelNode, {
            as: "unilevelNodes",
            foreignKey: "parentId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmUnilevelNode.belongsTo(models.mlmReferral, {
            as: "referral",
            foreignKey: "referralId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = mlmUnilevelNode;
