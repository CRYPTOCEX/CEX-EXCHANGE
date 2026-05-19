"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get FAQ Statistics",
    description: "Retrieves statistics for the FAQ knowledge base including popular FAQs, trending searches, and category stats.",
    operationId: "getFAQStats",
    tags: ["FAQ", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "FAQ statistics retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            popularFaqs: { type: "array" },
                            popularSearches: { type: "array" },
                            categoriesWithStats: { type: "array" },
                            recentQuestions: { type: "array" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const [totalFaqs, categoriesRaw, viewsSum, helpfulVotes, answeredQuestions, popularFaqs, searchStats, recentQuestions, categoryStats,] = await Promise.all([
            db_1.models.faq.count({ where: { status: true } }),
            db_1.models.faq.findAll({
                where: { status: true },
                attributes: [[(0, sequelize_1.fn)("DISTINCT", (0, sequelize_1.col)("category")), "category"]],
                raw: true,
            }),
            db_1.models.faq.sum("views", { where: { status: true } }),
            db_1.models.faqFeedback.count({ where: { isHelpful: true } }),
            db_1.models.faqQuestion.count({ where: { status: "ANSWERED" } }),
            db_1.models.faq.findAll({
                where: { status: true },
                order: [["views", "DESC"]],
                limit: 6,
            }),
            db_1.models.faqSearch.findAll({
                where: {
                    createdAt: { [sequelize_1.Op.gte]: sevenDaysAgo },
                },
                attributes: [
                    "query",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
                    [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("resultCount")), "avgResults"],
                ],
                group: ["query"],
                order: [[(0, sequelize_1.literal)("count"), "DESC"]],
                limit: 10,
                raw: true,
            }),
            db_1.models.faqQuestion.findAll({
                order: [["createdAt", "DESC"]],
                limit: 5,
            }),
            db_1.models.faq.findAll({
                where: { status: true },
                attributes: [
                    "category",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "faqCount"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("views")), "totalViews"],
                ],
                group: ["category"],
                order: [[(0, sequelize_1.literal)("faqCount"), "DESC"]],
                raw: true,
            }),
        ]);
        const popularFaqsFormatted = await Promise.all(popularFaqs.map(async (faq) => {
            const f = faq.toJSON();
            const [helpfulCount, totalFeedbacks] = await Promise.all([
                db_1.models.faqFeedback.count({ where: { faqId: f.id, isHelpful: true } }),
                db_1.models.faqFeedback.count({ where: { faqId: f.id } }),
            ]);
            return {
                id: f.id,
                question: f.question,
                answer: f.answer && typeof f.answer === "string"
                    ? (() => {
                        const stripped = f.answer.replace(/<[^>]*?>/g, "").replace(/\s+/g, " ").trim();
                        return stripped.length > 150 ? stripped.substring(0, 150) + "..." : stripped;
                    })()
                    : "",
                category: f.category,
                views: f.views || 0,
                helpfulCount,
                helpfulPercentage: totalFeedbacks > 0
                    ? Math.round((helpfulCount / totalFeedbacks) * 100)
                    : 0,
            };
        }));
        const popularSearchesFormatted = searchStats.map((s) => ({
            query: s.query,
            count: parseInt(s.count),
            hasResults: parseFloat(s.avgResults) > 0,
        }));
        const unansweredSearches = searchStats
            .filter((s) => parseFloat(s.avgResults) === 0)
            .slice(0, 5)
            .map((s) => ({
            query: s.query,
            count: parseInt(s.count),
        }));
        const categoriesWithStats = categoryStats.map((c) => ({
            name: c.category,
            faqCount: parseInt(c.faqCount),
            totalViews: parseInt(c.totalViews) || 0,
            icon: getCategoryIcon(c.category),
        }));
        const recentQuestionsFormatted = recentQuestions
            .filter((q) => q.status === "ANSWERED")
            .map((q) => ({
            id: q.id,
            question: q.question.length > 100 ? q.question.substring(0, 100) + "..." : q.question,
            status: q.status,
            timeAgo: getTimeAgo(q.createdAt),
        }));
        return {
            stats: {
                totalFaqs,
                totalCategories: categoriesRaw.length,
                totalViews: viewsSum || 0,
                totalHelpfulVotes: helpfulVotes,
                questionsAnswered: answeredQuestions,
            },
            popularFaqs: popularFaqsFormatted,
            popularSearches: popularSearchesFormatted.filter((s) => s.hasResults),
            categoriesWithStats,
            recentQuestions: recentQuestionsFormatted,
            unansweredSearches,
        };
    }
    catch (error) {
        throw error;
    }
};
function getCategoryIcon(category) {
    if (!category)
        return "help-circle";
    const iconMap = {
        account: "user",
        security: "shield",
        trading: "trending-up",
        wallet: "wallet",
        deposit: "plus-circle",
        withdrawal: "minus-circle",
        general: "help-circle",
        kyc: "id-card",
        payment: "credit-card",
        support: "headphones",
        verification: "check-circle",
        fees: "percent",
        api: "code",
        mobile: "smartphone",
    };
    return iconMap[category.toLowerCase()] || "help-circle";
}
function getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60)
        return "just now";
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400)
        return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800)
        return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
}
