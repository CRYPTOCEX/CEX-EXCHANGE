"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class p2pTraderRelation extends sequelize_1.Model {
    static initModel(sequelize) {
        return p2pTraderRelation.init({
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
                    notNull: { msg: "userId cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId must be a valid UUID" },
                },
            },
            traderId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "traderId cannot be null" },
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "traderId must be a valid UUID" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("FOLLOW", "BLOCK"),
                allowNull: false,
                validate: {
                    isIn: { args: [["FOLLOW", "BLOCK"]], msg: "type must be FOLLOW or BLOCK" },
                },
            },
            note: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "p2pTraderRelation",
            tableName: "p2p_trader_relations",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "uq_p2p_relation_user_trader_type",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "traderId" }, { name: "type" }],
                },
                {
                    name: "idx_p2p_relation_user_type",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "type" }],
                },
                {
                    name: "idx_p2p_relation_trader_type",
                    using: "BTREE",
                    fields: [{ name: "traderId" }, { name: "type" }],
                },
            ],
        });
    }
    static associate(models) {
        p2pTraderRelation.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        p2pTraderRelation.belongsTo(models.user, {
            as: "trader",
            foreignKey: "traderId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = p2pTraderRelation;
