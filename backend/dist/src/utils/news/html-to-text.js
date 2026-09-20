"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.htmlToPlainText = htmlToPlainText;
exports.containsMarkup = containsMarkup;
exports.ensurePlainText = ensurePlainText;
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
const LIST_SEP = String.fromCharCode(1);
const BLOCK_SEP = String.fromCharCode(2);
function separatorRun(sentinel) {
    const cls = `[\\s${sentinel}]*`;
    return `${cls}${sentinel}${cls}`;
}
const LIST_RUN = new RegExp(separatorRun(LIST_SEP), "g");
const BLOCK_RUN = new RegExp(separatorRun(BLOCK_SEP), "g");
const DANGLING_LIST = new RegExp(`^${separatorRun(LIST_SEP)}` +
    `|${separatorRun(LIST_SEP)}$` +
    `|${separatorRun(LIST_SEP)}(?=${BLOCK_SEP})` +
    `|(?<=${BLOCK_SEP})${separatorRun(LIST_SEP)}`, "g");
const NAMED_ENTITIES = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ensp: " ",
    emsp: " ",
    thinsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    bull: "•",
    middot: "·",
    deg: "°",
    euro: "€",
    pound: "£",
    yen: "¥",
    cent: "¢",
    copy: "©",
    reg: "®",
    trade: "™",
};
const ENTITY_RE = /&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi;
function safeFromCodePoint(code, fallback) {
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff)
        return fallback;
    if (code >= 0xd800 && code <= 0xdfff)
        return fallback;
    try {
        return String.fromCodePoint(code);
    }
    catch (_a) {
        return fallback;
    }
}
function decodeEntities(text) {
    return text.replace(ENTITY_RE, (match, entity) => {
        var _a;
        const lower = entity.toLowerCase();
        if (lower.startsWith("#x")) {
            return safeFromCodePoint(Number.parseInt(entity.slice(2), 16), match);
        }
        if (lower.startsWith("#")) {
            return safeFromCodePoint(Number.parseInt(entity.slice(1), 10), match);
        }
        return (_a = NAMED_ENTITIES[lower]) !== null && _a !== void 0 ? _a : match;
    });
}
function collapseWhitespace(text) {
    return text
        .replace(/[^\S\n]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{2,}/g, "\n")
        .trim();
}
function applySeparators(text) {
    return (text
        .replace(DANGLING_LIST, "")
        .replace(LIST_RUN, "; ")
        .replace(BLOCK_RUN, "\n"));
}
function truncate(text, maxLen) {
    if (text.length <= maxLen)
        return text;
    const cut = text.slice(0, maxLen - 1);
    const lastSpace = cut.lastIndexOf(" ");
    const body = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
    return `${body.replace(/[\s;,.]+$/, "")}…`;
}
function htmlToPlainText(input, maxLen) {
    if (!input)
        return "";
    ENTITY_RE.lastIndex = 0;
    const needsWork = input.includes("<") || ENTITY_RE.test(input);
    ENTITY_RE.lastIndex = 0;
    if (!needsWork) {
        const plain = collapseWhitespace(input);
        return maxLen ? truncate(plain, maxLen) : plain;
    }
    const marked = input
        .replace(/<\s*\/\s*li\s*>/gi, LIST_SEP)
        .replace(/<\s*br\s*\/?\s*>/gi, BLOCK_SEP)
        .replace(/<\s*\/\s*(p|div|h[1-6]|tr|ul|ol|blockquote|section|article)\s*>/gi, BLOCK_SEP);
    const stripped = String(isomorphic_dompurify_1.default.sanitize(`<div>${marked}</div>`, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    }));
    const collapsed = collapseWhitespace(applySeparators(collapseWhitespace(decodeEntities(stripped))));
    return maxLen ? truncate(collapsed, maxLen) : collapsed;
}
function containsMarkup(text) {
    return !!text && /<[a-zA-Z!/]/.test(text);
}
function ensurePlainText(text, maxLen) {
    if (!text)
        return null;
    if (!containsMarkup(text))
        return text;
    return htmlToPlainText(text, maxLen) || null;
}
exports.default = htmlToPlainText;
