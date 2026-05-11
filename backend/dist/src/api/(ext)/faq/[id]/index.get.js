"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get FAQ by ID",
    description: "Retrieves a single FAQ entry by its ID, including its related FAQs, computed helpfulCount from feedback, and increments the view count.",
    operationId: "getFAQById",
    tags: ["FAQ"],
    logModule: "FAQ",
    logTitle: "Get FAQ by ID",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "FAQ ID",
        },
    ],
    responses: {
        200: {
            description: "FAQ retrieved successfully with related FAQs, helpfulCount and updated view count embedded",
            content: { "application/json": { schema: { type: "object" } } },
        },
        404: { description: "FAQ not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching FAQ by ID: ${params.id}`);
    const faq = await db_1.models.faq.findByPk(params.id);
    if (!faq) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "FAQ not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Incrementing view count");
    await db_1.models.faq.increment("views", { where: { id: params.id } });
    await faq.reload();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing related FAQ IDs");
    let relatedFaqIds = [];
    if (faq.relatedFaqIds) {
        if (typeof faq.relatedFaqIds === "string") {
            try {
                relatedFaqIds = JSON.parse(faq.relatedFaqIds);
            }
            catch (e) {
                relatedFaqIds = [];
            }
        }
        else if (Array.isArray(faq.relatedFaqIds)) {
            relatedFaqIds = faq.relatedFaqIds;
        }
    }
    let relatedFaqs = [];
    if (relatedFaqIds.length > 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${relatedFaqIds.length} related FAQs`);
        relatedFaqs = await db_1.models.faq.findAll({
            where: {
                id: relatedFaqIds,
                status: true,
            },
            limit: 10,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating helpful count from feedback");
    const helpfulCount = await db_1.models.faqFeedback.count({
        where: {
            faqId: faq.id,
            isHelpful: true,
        },
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building response data");
    const faqData = faq.toJSON();
    faqData.relatedFaqs = relatedFaqs;
    faqData.helpfulCount = helpfulCount;
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`FAQ retrieved successfully (views: ${faq.views}, helpful: ${helpfulCount})`);
    return faqData;
};
