import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, literal, col } from "sequelize";

export const metadata = {
  summary: "Get FAQ Analytics",
  description:
    "Retrieves aggregated analytics data for FAQs for admin purposes.",
  operationId: "getFAQAnalytics",
  tags: ["FAQ", "Admin", "Analytics"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Analytics data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalFaqs: { type: "number" },
              activeFaqs: { type: "number" },
              totalViews: { type: "number" },
              averageRating: { type: "number" },
              positiveRatingPercentage: { type: "number" },
              negativeRatingPercentage: { type: "number" },
              viewsComparison: {
                type: "object",
                properties: {
                  current: { type: "number" },
                  previous: { type: "number" },
                  delta: { type: "number" },
                  percentageChange: { type: "number" },
                },
              },
              feedbackComparison: {
                type: "object",
                properties: {
                  positive: {
                    type: "object",
                    properties: {
                      current: { type: "number" },
                      previous: { type: "number" },
                      delta: { type: "number" },
                      percentageChange: { type: "number" },
                    },
                  },
                  negative: {
                    type: "object",
                    properties: {
                      current: { type: "number" },
                      previous: { type: "number" },
                      delta: { type: "number" },
                      percentageChange: { type: "number" },
                    },
                  },
                },
              },
              mostViewedFaqs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    views: { type: "number" },
                    category: { type: "string" },
                    positiveRating: { type: "number" },
                  },
                },
              },
              categoryDistribution: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    count: { type: "number" },
                    percentage: { type: "number" },
                  },
                },
              },
              topSearchQueries: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    count: { type: "number" },
                    averageResults: { type: "number" },
                  },
                },
              },
              feedbackOverTime: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    positive: { type: "number" },
                    negative: { type: "number" },
                  },
                },
              },
              viewsOverTime: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    month: { type: "string" },
                    views: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "access.faq",
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Pre-calculate year boundaries for time-series queries.
    const currentYear = new Date().getFullYear();
    const startYear = new Date(`${currentYear}-01-01`);
    const endYear = new Date(`${currentYear}-12-31`);

    // --- Combined FAQ Aggregates ---
    // Instead of 3 separate queries, fetch total FAQs, active FAQs, and total views in one go.
    const faqAggregates = await models.faq.findOne({
      attributes: [
        [fn("COUNT", col("id")), "totalFaqs"],
        [
          fn("SUM", literal("CASE WHEN status = true THEN 1 ELSE 0 END")),
          "activeFaqs",
        ],
        [fn("SUM", col("views")), "totalViews"],
      ],
      raw: true,
    });
    const totalFaqs = parseInt(faqAggregates?.totalFaqs || "0", 10);
    const activeFaqs = parseInt(faqAggregates?.activeFaqs || "0", 10);
    const totalViews = parseInt(faqAggregates?.totalViews || "0", 10);

    // --- Run Independent Queries Concurrently ---
    const [
      feedbackData, // overall feedback aggregation
      mostViewedFaqsRaw, // top FAQs by views
      categoryCounts, // FAQ category distribution
      topSearchQueriesRaw, // top search queries
      feedbackOverTimeRaw, // feedback counts grouped by day
      viewsOverTimeRaw, // total views grouped by month for FAQs
      feedbackMonthlyRaw, // feedback counts grouped by month for comparisons
    ] = await Promise.all([
      models.faqFeedback.findAll({
        attributes: [
          [
            fn("SUM", literal("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
            "helpfulCount",
          ],
          [
            fn("SUM", literal("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
            "notHelpfulCount",
          ],
          [fn("COUNT", col("id")), "totalFeedback"],
        ],
        raw: true,
      }),
      models.faq.findAll({
        attributes: ["id", "question", "views", "category"],
        order: [["views", "DESC"]],
        limit: 5,
        raw: true,
      }),
      models.faq.findAll({
        attributes: ["category", [fn("COUNT", col("id")), "count"]],
        group: ["category"],
        raw: true,
      }),
      models.faqSearch.findAll({
        attributes: [
          "query",
          [fn("COUNT", col("query")), "count"],
          [fn("AVG", col("resultCount")), "averageResults"],
        ],
        group: ["query"],
        order: [[literal("count"), "DESC"]],
        limit: 10,
        raw: true,
      }),
      models.faqFeedback.findAll({
        attributes: [
          [fn("DATE", col("createdAt")), "date"],
          [
            fn("SUM", literal("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
            "positive",
          ],
          [
            fn("SUM", literal("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
            "negative",
          ],
        ],
        group: [fn("DATE", col("createdAt"))],
        order: [[literal("date"), "ASC"]],
        raw: true,
      }),
      models.faq.findAll({
        attributes: [
          [fn("DATE_FORMAT", col("createdAt"), "%Y-%m-01"), "month"],
          [fn("SUM", col("views")), "views"],
        ],
        where: {
          createdAt: { [Op.between]: [startYear, endYear] },
        },
        group: [fn("DATE_FORMAT", col("createdAt"), "%Y-%m-01")],
        order: [[literal("month"), "ASC"]],
        raw: true,
      }),
      models.faqFeedback.findAll({
        attributes: [
          [fn("DATE_FORMAT", col("createdAt"), "%Y-%m-01"), "month"],
          [
            fn("SUM", literal("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
            "positive",
          ],
          [
            fn("SUM", literal("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
            "negative",
          ],
        ],
        where: {
          createdAt: { [Op.between]: [startYear, endYear] },
        },
        group: [fn("DATE_FORMAT", col("createdAt"), "%Y-%m-01")],
        order: [[literal("month"), "ASC"]],
        raw: true,
      }),
    ]);

    // --- Overall Feedback Aggregation ---
    const fb = feedbackData[0] || {};
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

    // --- Most Viewed FAQs & Their Feedback ---
    const faqIds = mostViewedFaqsRaw.map((faq: any) => faq.id);
    const feedbackAggregated = faqIds.length
      ? await models.faqFeedback.findAll({
          attributes: [
            "faqId",
            [
              fn("SUM", literal("CASE WHEN isHelpful THEN 1 ELSE 0 END")),
              "positiveCount",
            ],
            [
              fn("SUM", literal("CASE WHEN NOT isHelpful THEN 1 ELSE 0 END")),
              "negativeCount",
            ],
            [fn("COUNT", col("id")), "totalFeedback"],
          ],
          where: { faqId: { [Op.in]: faqIds } },
          group: ["faqId"],
          raw: true,
        })
      : [];

    // Build a quick lookup map for FAQ feedback.
    const feedbackMap = feedbackAggregated.reduce((acc: any, curr: any) => {
      acc[curr.faqId] = {
        positiveCount: parseInt(curr.positiveCount, 10),
        negativeCount: parseInt(curr.negativeCount, 10),
        totalFeedback: parseInt(curr.totalFeedback, 10),
      };
      return acc;
    }, {});

    const mostViewedFaqs = mostViewedFaqsRaw.map((faq: any) => {
      const fb = feedbackMap[faq.id] || { positiveCount: 0, totalFeedback: 0 };
      const positiveRating =
        fb.totalFeedback > 0 ? (fb.positiveCount / fb.totalFeedback) * 100 : 0;
      return {
        id: faq.id,
        title: faq.question,
        views: faq.views,
        category: faq.category,
        positiveRating,
      };
    });

    // --- Category Distribution ---
    const categoryDistribution = categoryCounts.map((row: any) => {
      const count = parseInt(row.count, 10);
      const percentage = totalFaqs ? (count / totalFaqs) * 100 : 0;
      return { category: row.category, count, percentage };
    });

    // --- Top Search Queries ---
    const topSearchQueries = topSearchQueriesRaw.map((row: any) => ({
      query: row.query,
      count: parseInt(row.count, 10),
      averageResults: parseFloat(row.averageResults),
    }));

    // --- Feedback Over Time (daily) ---
    const feedbackOverTime = feedbackOverTimeRaw.map((row: any) => ({
      date: row.date,
      positive: parseInt(row.positive, 10),
      negative: parseInt(row.negative, 10),
    }));

    // --- Views Over Time (monthly) ---
    // Convert raw views data into a lookup map for O(1) access.
    const viewsMap = viewsOverTimeRaw.reduce((acc: any, row: any) => {
      acc[row.month] = parseInt(row.views, 10);
      return acc;
    }, {});
    const viewsOverTime: { month: string; views: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${currentYear}-${m.toString().padStart(2, "0")}-01`;
      viewsOverTime.push({ month: monthStr, views: viewsMap[monthStr] || 0 });
    }

    // --- Monthly Feedback for Comparisons ---
    const feedbackMapMonthly = feedbackMonthlyRaw.reduce(
      (acc: any, row: any) => {
        acc[row.month] = {
          positive: parseInt(row.positive, 10),
          negative: parseInt(row.negative, 10),
        };
        return acc;
      },
      {}
    );
    const feedbackMonthly: {
      month: string;
      positive: number;
      negative: number;
    }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${currentYear}-${m.toString().padStart(2, "0")}-01`;
      feedbackMonthly.push({
        month: monthStr,
        positive: feedbackMapMonthly[monthStr]?.positive || 0,
        negative: feedbackMapMonthly[monthStr]?.negative || 0,
      });
    }

    // --- Compute Monthly Comparisons for Views & Feedback ---
    const currentDate = new Date();
    const currentMonthNumber = currentDate.getMonth() + 1; // 0-indexed, so add 1
    const currentMonthStr = `${currentYear}-${currentMonthNumber.toString().padStart(2, "0")}-01`;
    const previousMonthStr =
      currentMonthNumber > 1
        ? `${currentYear}-${(currentMonthNumber - 1).toString().padStart(2, "0")}-01`
        : null;

    const currentViewsMonth =
      viewsOverTime.find((v) => v.month === currentMonthStr)?.views || 0;
    const previousViewsMonth = previousMonthStr
      ? viewsOverTime.find((v) => v.month === previousMonthStr)?.views || 0
      : 0;
    const viewsDelta = currentViewsMonth - previousViewsMonth;
    const viewsPercentageChange = previousViewsMonth
      ? (viewsDelta / previousViewsMonth) * 100
      : currentViewsMonth > 0
        ? 100
        : 0;

    const currentFeedback = feedbackMonthly.find(
      (row) => row.month === currentMonthStr
    ) || { positive: 0, negative: 0 };
    const previousFeedback = previousMonthStr
      ? feedbackMonthly.find((row) => row.month === previousMonthStr) || {
          positive: 0,
          negative: 0,
        }
      : { positive: 0, negative: 0 };

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
  } catch (error) {
    console.error("Error fetching FAQ analytics:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch analytics data",
    });
  }
};
