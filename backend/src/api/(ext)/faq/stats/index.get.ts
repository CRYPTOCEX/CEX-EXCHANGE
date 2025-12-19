import { models } from "@b/db";
import { Op, fn, col, literal } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get FAQ Statistics",
  description:
    "Retrieves statistics for the FAQ knowledge base including popular FAQs, trending searches, and category stats.",
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

export default async (data: Handler) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalFaqs,
    categoriesRaw,
    viewsSum,
    helpfulVotes,
    answeredQuestions,
    popularFaqs,
    searchStats,
    recentQuestions,
    categoryStats,
  ] = await Promise.all([
    // Total active FAQs
    models.faq.count({ where: { status: true } }),

    // Distinct categories
    models.faq.findAll({
      where: { status: true },
      attributes: [[fn("DISTINCT", col("category")), "category"]],
      raw: true,
    }),

    // Total views
    models.faq.sum("views", { where: { status: true } }),

    // Total helpful votes
    models.faqFeedback.count({ where: { isHelpful: true } }),

    // Answered questions
    models.faqQuestion.count({ where: { status: "ANSWERED" } }),

    // Popular FAQs by views
    models.faq.findAll({
      where: { status: true },
      order: [["views", "DESC"]],
      limit: 6,
      include: [
        {
          model: models.faqFeedback,
          as: "feedbacks",
          attributes: ["isHelpful"],
          required: false,
        },
      ],
    }),

    // Popular searches (last 7 days)
    models.faqSearch.findAll({
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
      attributes: [
        "query",
        [fn("COUNT", col("id")), "count"],
        [fn("AVG", col("resultCount")), "avgResults"],
      ],
      group: ["query"],
      order: [[literal("count"), "DESC"]],
      limit: 10,
      raw: true,
    }),

    // Recent questions
    models.faqQuestion.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
    }),

    // Category stats
    models.faq.findAll({
      where: { status: true },
      attributes: [
        "category",
        [fn("COUNT", col("id")), "faqCount"],
        [fn("SUM", col("views")), "totalViews"],
      ],
      group: ["category"],
      order: [[literal("faqCount"), "DESC"]],
      raw: true,
    }),
  ]);

  // Format popular FAQs
  const popularFaqsFormatted = popularFaqs.map((faq: any) => {
    const f = faq.toJSON();
    const feedbacks = f.feedbacks || [];
    const helpfulCount = feedbacks.filter((fb: any) => fb.isHelpful).length;
    const totalFeedbacks = feedbacks.length;
    return {
      id: f.id,
      question: f.question,
      answer:
        f.answer && typeof f.answer === "string"
          ? f.answer.replace(/<[^>]*>/g, "").substring(0, 150) + "..."
          : "",
      category: f.category,
      views: f.views || 0,
      helpfulCount,
      helpfulPercentage:
        totalFeedbacks > 0
          ? Math.round((helpfulCount / totalFeedbacks) * 100)
          : 0,
    };
  });

  // Format popular searches
  const popularSearchesFormatted = (searchStats as any[]).map((s) => ({
    query: s.query,
    count: parseInt(s.count),
    hasResults: parseFloat(s.avgResults) > 0,
  }));

  // Unanswered searches (0 results) - knowledge gaps
  const unansweredSearches = (searchStats as any[])
    .filter((s) => parseFloat(s.avgResults) === 0)
    .slice(0, 5)
    .map((s) => ({
      query: s.query,
      count: parseInt(s.count),
    }));

  // Format categories with icons
  const categoriesWithStats = (categoryStats as any[]).map((c) => ({
    name: c.category,
    faqCount: parseInt(c.faqCount),
    totalViews: parseInt(c.totalViews) || 0,
    icon: getCategoryIcon(c.category),
  }));

  // Format recent questions
  const recentQuestionsFormatted = recentQuestions.map((q: any) => ({
    id: q.id,
    question:
      q.question.length > 100 ? q.question.substring(0, 100) + "..." : q.question,
    status: q.status,
    createdAt: q.createdAt,
    timeAgo: getTimeAgo(q.createdAt),
  }));

  return {
    stats: {
      totalFaqs,
      totalCategories: (categoriesRaw as any[]).length,
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
};

function getCategoryIcon(category: string): string {
  if (!category) return "help-circle";
  const iconMap: Record<string, string> = {
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

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
