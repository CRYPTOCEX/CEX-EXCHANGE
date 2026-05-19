"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get FAQ Analytics Data",
    description: "Retrieves comprehensive analytics data for the FAQ system including total FAQs, views, feedback ratings, category distribution, top search queries, and time-series data for feedback and views.",
    operationId: "getFaqAnalytics",
    tags: ["Admin", "FAQ", "Analytics"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Analytics data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            totalFaqs: { type: "number", description: "Total number of FAQs" },
                            activeFaqs: { type: "number", description: "Number of active FAQs" },
                            totalViews: { type: "number", description: "Total FAQ views" },
                            averageRating: { type: "number", description: "Average rating (0-1)" },
                            positiveRatingPercentage: { type: "number" },
                            negativeRatingPercentage: { type: "number" },
                            viewsComparison: {
                                type: "object",
                                description: "Current vs previous month views comparison",
                            },
                            feedbackComparison: {
                                type: "object",
                                description: "Positive and negative feedback comparison",
                            },
                            mostViewedFaqs: {
                                type: "array",
                                description: "Top 5 most viewed FAQs",
                                items: { type: "object" },
                            },
                            categoryDistribution: {
                                type: "array",
                                description: "FAQ count by category",
                                items: { type: "object" },
                            },
                            topSearchQueries: {
                                type: "array",
                                description: "Top 10 search queries",
                                items: { type: "object" },
                            },
                            feedbackOverTime: {
                                type: "array",
                                description: "Daily feedback counts",
                                items: { type: "object" },
                            },
                            viewsOverTime: {
                                type: "array",
                                description: "Monthly views data",
                                items: { type: "object" },
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "access.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Get FAQ analytics",
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ analytics data");
        const currentYear = new Date().getFullYear();
        const startYear = new Date(`${currentYear}-01-01`);
        const endYear = new Date(`${currentYear}-12-31`);
        const faqAggregates = await db_1.models.faq.findOne({
            attributes: [
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalFaqs"],
                [
                    (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN status = true THEN 1 ELSE 0 END")),
                    "activeFaqs",
                ],
                [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("views")), "totalViews"],
            ],
            raw: true,
        });
        const totalFaqs = parseInt((faqAggregates === null || faqAggregates === void 0 ? void 0 : faqAggregates.totalFaqs) || "0", 10);
        const activeFaqs = parseInt((faqAggregates === null || faqAggregates === void 0 ? void 0 : faqAggregates.activeFaqs) || "0", 10);
        const totalViews = parseInt((faqAggregates === null || faqAggregates === void 0 ? void 0 : faqAggregates.totalViews) || "0", 10);
        const [feedbackData, mostViewedFaqsRaw, categoryCounts, topSearchQueriesRaw, feedbackOverTimeRaw, viewsOverTimeRaw, feedbackMonthlyRaw,] = await Promise.all([
            db_1.models.faqFeedback.findAll({
                attributes: [
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
                        "helpfulCount",
                    ],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
                        "notHelpfulCount",
                    ],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalFeedback"],
                ],
                raw: true,
            }),
            db_1.models.faq.findAll({
                attributes: ["id", "question", "views", "category"],
                order: [["views", "DESC"]],
                limit: 5,
                raw: true,
            }),
            db_1.models.faq.findAll({
                attributes: ["category", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"]],
                group: ["category"],
                raw: true,
            }),
            db_1.models.faqSearch.findAll({
                attributes: [
                    "query",
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("query")), "count"],
                    [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("resultCount")), "averageResults"],
                ],
                group: ["query"],
                order: [[(0, sequelize_1.literal)("count"), "DESC"]],
                limit: 10,
                raw: true,
            }),
            db_1.models.faqFeedback.findAll({
                attributes: [
                    [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
                        "positive",
                    ],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
                        "negative",
                    ],
                ],
                group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt"))],
                order: [[(0, sequelize_1.literal)("date"), "ASC"]],
                raw: true,
            }),
            db_1.models.faq.findAll({
                attributes: [
                    [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m-01"), "month"],
                    [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("views")), "views"],
                ],
                where: {
                    createdAt: { [sequelize_1.Op.between]: [startYear, endYear] },
                },
                group: [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m-01")],
                order: [[(0, sequelize_1.literal)("month"), "ASC"]],
                raw: true,
            }),
            db_1.models.faqFeedback.findAll({
                attributes: [
                    [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m-01"), "month"],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
                        "positive",
                    ],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
                        "negative",
                    ],
                ],
                where: {
                    createdAt: { [sequelize_1.Op.between]: [startYear, endYear] },
                },
                group: [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m-01")],
                order: [[(0, sequelize_1.literal)("month"), "ASC"]],
                raw: true,
            }),
        ]);
        const fb = (feedbackData[0] || {});
        const helpfulCount = parseInt(fb.helpfulCount || "0", 10);
        const notHelpfulCount = parseInt(fb.notHelpfulCount || "0", 10);
        const totalFeedback = parseInt(fb.totalFeedback || "0", 10);
        const averageRating = totalFeedback ? helpfulCount / totalFeedback : 0;
        const positiveRatingPercentage = totalFeedback
            ? (helpfulCount / totalFeedback) * 100
            : 0;
        const negativeRatingPercentage = totalFeedback
            ? (notHelpfulCount / totalFeedback) * 100
            : 0;
        const faqIds = mostViewedFaqsRaw.map((faq) => faq.id);
        const feedbackAggregated = faqIds.length
            ? await db_1.models.faqFeedback.findAll({
                attributes: [
                    "faqId",
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
                        "positiveCount",
                    ],
                    [
                        (0, sequelize_1.fn)("SUM", (0, sequelize_1.literal)("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
                        "negativeCount",
                    ],
                    [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalFeedback"],
                ],
                where: { faqId: { [sequelize_1.Op.in]: faqIds } },
                group: ["faqId"],
                raw: true,
            })
            : [];
        const feedbackMap = feedbackAggregated.reduce((acc, curr) => {
            acc[curr.faqId] = {
                positiveCount: parseInt(curr.positiveCount, 10),
                negativeCount: parseInt(curr.negativeCount, 10),
                totalFeedback: parseInt(curr.totalFeedback, 10),
            };
            return acc;
        }, {});
        const mostViewedFaqs = mostViewedFaqsRaw.map((faq) => {
            const fb = feedbackMap[faq.id] || { positiveCount: 0, totalFeedback: 0 };
            const positiveRating = fb.totalFeedback > 0 ? (fb.positiveCount / fb.totalFeedback) * 100 : 0;
            return {
                id: faq.id,
                title: faq.question,
                views: faq.views,
                category: faq.category,
                positiveRating,
            };
        });
        const categoryDistribution = categoryCounts.map((row) => {
            const count = parseInt(row.count, 10);
            const percentage = totalFaqs ? (count / totalFaqs) * 100 : 0;
            return { category: row.category, count, percentage };
        });
        const topSearchQueries = topSearchQueriesRaw.map((row) => ({
            query: row.query,
            count: parseInt(row.count, 10),
            averageResults: parseFloat(row.averageResults),
        }));
        const feedbackOverTime = feedbackOverTimeRaw.map((row) => ({
            date: row.date,
            positive: parseInt(row.positive, 10),
            negative: parseInt(row.negative, 10),
        }));
        const viewsMap = viewsOverTimeRaw.reduce((acc, row) => {
            acc[row.month] = parseInt(row.views, 10);
            return acc;
        }, {});
        const viewsOverTime = [];
        for (let m = 1; m <= 12; m++) {
            const monthStr = `${currentYear}-${m.toString().padStart(2, "0")}-01`;
            viewsOverTime.push({ month: monthStr, views: viewsMap[monthStr] || 0 });
        }
        const feedbackMapMonthly = feedbackMonthlyRaw.reduce((acc, row) => {
            acc[row.month] = {
                positive: parseInt(row.positive, 10),
                negative: parseInt(row.negative, 10),
            };
            return acc;
        }, {});
        const feedbackMonthly = [];
        for (let m = 1; m <= 12; m++) {
            const monthStr = `${currentYear}-${m.toString().padStart(2, "0")}-01`;
            feedbackMonthly.push({
                month: monthStr,
                positive: ((_a = feedbackMapMonthly[monthStr]) === null || _a === void 0 ? void 0 : _a.positive) || 0,
                negative: ((_b = feedbackMapMonthly[monthStr]) === null || _b === void 0 ? void 0 : _b.negative) || 0,
            });
        }
        const currentDate = new Date();
        const currentMonthNumber = currentDate.getMonth() + 1;
        const currentMonthStr = `${currentYear}-${currentMonthNumber.toString().padStart(2, "0")}-01`;
        const previousMonthStr = currentMonthNumber > 1
            ? `${currentYear}-${(currentMonthNumber - 1).toString().padStart(2, "0")}-01`
            : `${currentYear - 1}-12-01`;
        const currentViewsMonth = ((_c = viewsOverTime.find((v) => v.month === currentMonthStr)) === null || _c === void 0 ? void 0 : _c.views) || 0;
        const previousViewsMonth = ((_d = viewsOverTime.find((v) => v.month === previousMonthStr)) === null || _d === void 0 ? void 0 : _d.views) || 0;
        const viewsDelta = currentViewsMonth - previousViewsMonth;
        const viewsPercentageChange = previousViewsMonth
            ? (viewsDelta / previousViewsMonth) * 100
            : currentViewsMonth > 0
                ? 100
                : 0;
        const currentFeedback = feedbackMonthly.find((row) => row.month === currentMonthStr) || { positive: 0, negative: 0 };
        const previousFeedback = feedbackMonthly.find((row) => row.month === previousMonthStr) || {
            positive: 0,
            negative: 0,
        };
        const positiveDelta = currentFeedback.positive - previousFeedback.positive;
        const positivePercentageChange = previousFeedback.positive
            ? (positiveDelta / previousFeedback.positive) * 100
            : currentFeedback.positive > 0
                ? 100
                : 0;
        const negativeDelta = currentFeedback.negative - previousFeedback.negative;
        const negativePercentageChange = previousFeedback.negative
            ? (negativeDelta / previousFeedback.negative) * 100
            : currentFeedback.negative > 0
                ? 100
                : 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ analytics retrieved successfully");
        return {
            totalFaqs,
            activeFaqs,
            totalViews,
            averageRating,
            positiveRatingPercentage,
            negativeRatingPercentage,
            viewsComparison: {
                current: currentViewsMonth,
                previous: previousViewsMonth,
                delta: viewsDelta,
                percentageChange: viewsPercentageChange,
            },
            feedbackComparison: {
                positive: {
                    current: currentFeedback.positive,
                    previous: previousFeedback.positive,
                    delta: positiveDelta,
                    percentageChange: positivePercentageChange,
                },
                negative: {
                    current: currentFeedback.negative,
                    previous: previousFeedback.negative,
                    delta: negativeDelta,
                    percentageChange: negativePercentageChange,
                },
            },
            mostViewedFaqs,
            categoryDistribution,
            topSearchQueries,
            feedbackOverTime,
            viewsOverTime,
        };
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error instanceof Error
                ? error.message
                : "Failed to fetch analytics data",
        });
    }
};
