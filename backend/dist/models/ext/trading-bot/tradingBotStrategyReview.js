"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const Sequelize = __importStar(require("sequelize"));
const sequelize_1 = require("sequelize");
class tradingBotStrategyReview extends sequelize_1.Model {
    static async updateStrategyRating(strategyId) {
        const { models } = require("@b/db");
        const result = await tradingBotStrategyReview.findOne({
            where: { strategyId, status: "APPROVED" },
            attributes: [
                [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
                [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
            ],
            raw: true,
        });
        await models.tradingBotStrategy.update({
            avgRating: (result === null || result === void 0 ? void 0 : result.avgRating) || null,
            totalRatings: (result === null || result === void 0 ? void 0 : result.count) || 0,
        }, { where: { id: strategyId } });
    }
    static initModel(sequelize) {
        return tradingBotStrategyReview.init({
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
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            strategyId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "strategyId: Strategy ID must not be empty" },
                    isUUID: { args: 4, msg: "strategyId: Must be a valid UUID" },
                },
            },
            rating: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: { args: [1], msg: "rating: Must be at least 1" },
                    max: { args: [5], msg: "rating: Must be at most 5" },
                },
            },
            title: {
                type: sequelize_1.DataTypes.STRING(200),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title must not be empty" },
                    len: {
                        args: [1, 200],
                        msg: "title: Title must be between 1 and 200 characters",
                    },
                },
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "content: Content must not be empty" },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "APPROVED", "REJECTED"]],
                        msg: "status: Must be a valid status",
                    },
                },
            },
            adminNote: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "tradingBotStrategyReview",
            tableName: "trading_bot_strategy_review",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "tradingBotStrategyReviewStrategyStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "strategyId" }, { name: "status" }],
                },
                {
                    name: "tradingBotStrategyReviewUserStrategyIdx",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "strategyId" }],
                },
            ],
            hooks: {
                afterUpdate: async (review) => {
                    if (review.changed("status")) {
                        await tradingBotStrategyReview.updateStrategyRating(review.strategyId);
                    }
                },
                afterCreate: async (review) => {
                    if (review.status === "APPROVED") {
                        await tradingBotStrategyReview.updateStrategyRating(review.strategyId);
                    }
                },
            },
        });
    }
    static associate(models) {
        tradingBotStrategyReview.belongsTo(models.user, {
            as: "reviewer",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        tradingBotStrategyReview.belongsTo(models.tradingBotStrategy, {
            as: "strategy",
            foreignKey: "strategyId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = tradingBotStrategyReview;
