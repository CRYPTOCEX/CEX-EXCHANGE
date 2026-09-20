"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildItem = buildItem;
const html_to_text_1 = require("../html-to-text");
const coerce_1 = require("./coerce");
function buildItem(input) {
    var _a;
    const headline = (0, html_to_text_1.htmlToPlainText)(String((_a = input.headline) !== null && _a !== void 0 ? _a : ""), coerce_1.HEADLINE_MAX);
    if (!headline)
        return null;
    const publishedAt = (0, coerce_1.toEpochMs)(input.publishedAt);
    if (publishedAt === null)
        return null;
    const summary = input.summary
        ? (0, html_to_text_1.htmlToPlainText)(String(input.summary), coerce_1.SUMMARY_MAX) || undefined
        : undefined;
    return {
        externalId: input.externalId === null || input.externalId === undefined
            ? undefined
            : String(input.externalId),
        publishedAt,
        headline,
        summary,
        url: (0, coerce_1.safeHttpUrl)(input.url),
        imageUrl: (0, coerce_1.safeHttpUrl)(input.imageUrl),
        category: input.category,
        relatedSymbols: (0, coerce_1.normaliseSymbolTags)(input.relatedSymbols),
    };
}
