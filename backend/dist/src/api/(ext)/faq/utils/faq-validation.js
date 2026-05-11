"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHTML = sanitizeHTML;
exports.validateEmail = validateEmail;
exports.validateFAQQuestion = validateFAQQuestion;
exports.validateFAQAnswer = validateFAQAnswer;
exports.validateCategory = validateCategory;
exports.validateTags = validateTags;
exports.validateFeedbackComment = validateFeedbackComment;
exports.validatePagePath = validatePagePath;
exports.sanitizeInput = sanitizeInput;
exports.validateAndSanitizeFAQ = validateAndSanitizeFAQ;
const validator_1 = __importDefault(require("validator"));
function sanitizeHTML(html) {
    if (!html || typeof html !== 'string')
        return '';
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    sanitized = sanitized.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
    sanitized = sanitized.replace(/(href|src)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '$1=""');
    sanitized = sanitized.replace(/<\/?(?:iframe|embed|object|form|input|button)\b[^>]*>/gi, '');
    return sanitized;
}
function validateEmail(email, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating email address');
    const errors = [];
    if (!email || typeof email !== 'string') {
        errors.push('Email is required');
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Email validation failed: Email is required');
        return { isValid: false, errors };
    }
    const trimmedEmail = email.trim();
    if (!validator_1.default.isEmail(trimmedEmail)) {
        errors.push('Invalid email format');
    }
    if (trimmedEmail.length > 254) {
        errors.push('Email is too long');
    }
    if (errors.length > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Email validation failed: ${errors.join(', ')}`);
    }
    else {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'Email validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validateFAQQuestion(question, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating FAQ question');
    const errors = [];
    if (!question || typeof question !== 'string') {
        errors.push('Question is required');
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Question validation failed: Question is required');
        return { isValid: false, errors };
    }
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 10) {
        errors.push('Question must be at least 10 characters long');
    }
    if (trimmedQuestion.length > 500) {
        errors.push('Question must not exceed 500 characters');
    }
    if (errors.length > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Question validation failed: ${errors.join(', ')}`);
    }
    else {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'Question validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validateFAQAnswer(answer, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating FAQ answer');
    const errors = [];
    if (!answer || typeof answer !== 'string') {
        errors.push('Answer is required');
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Answer validation failed: Answer is required');
        return { isValid: false, errors };
    }
    const trimmedAnswer = answer.trim();
    if (trimmedAnswer.length < 20) {
        errors.push('Answer must be at least 20 characters long');
    }
    if (trimmedAnswer.length > 10000) {
        errors.push('Answer must not exceed 10000 characters');
    }
    if (errors.length > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Answer validation failed: ${errors.join(', ')}`);
    }
    else {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'Answer validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validateCategory(category, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating category name');
    const errors = [];
    if (!category || typeof category !== 'string') {
        errors.push('Category is required');
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Category validation failed: Category is required');
        return { isValid: false, errors };
    }
    const trimmedCategory = category.trim();
    if (trimmedCategory.length < 2) {
        errors.push('Category must be at least 2 characters long');
    }
    if (trimmedCategory.length > 50) {
        errors.push('Category must not exceed 50 characters');
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedCategory)) {
        errors.push('Category contains invalid characters');
    }
    if (errors.length > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Category validation failed: ${errors.join(', ')}`);
    }
    else {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'Category validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validateTags(tags, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating tags array');
    const errors = [];
    if (!Array.isArray(tags)) {
        errors.push('Tags must be an array');
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Tags validation failed: Tags must be an array');
        return { isValid: false, errors };
    }
    if (tags.length > 10) {
        errors.push('Maximum 10 tags allowed');
    }
    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (typeof tag !== 'string') {
            errors.push(`Tag at index ${i} must be a string`);
            continue;
        }
        const trimmedTag = tag.trim();
        if (trimmedTag.length < 2) {
            errors.push(`Tag "${tag}" must be at least 2 characters long`);
        }
        if (trimmedTag.length > 30) {
            errors.push(`Tag "${tag}" must not exceed 30 characters`);
        }
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedTag)) {
            errors.push(`Tag "${tag}" contains invalid characters`);
        }
    }
    if (errors.length > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Tags validation failed: ${errors.join(', ')}`);
    }
    else {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'Tags validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validateFeedbackComment(comment, ctx) {
    var _a, _b, _c, _d, _e;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating feedback comment');
    const errors = [];
    if (comment === undefined || comment === null) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Feedback comment validation successful (optional field)');
        return { isValid: true, errors: [] };
    }
    if (typeof comment !== 'string') {
        errors.push('Comment must be a string');
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, 'Comment validation failed: Comment must be a string');
        return { isValid: false, errors };
    }
    if (comment.length > 1000) {
        errors.push('Comment must not exceed 1000 characters');
    }
    if (errors.length > 0) {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, `Comment validation failed: ${errors.join(', ')}`);
    }
    else {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, 'Comment validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validatePagePath(pagePath, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Validating page path');
    const errors = [];
    if (!pagePath || typeof pagePath !== 'string') {
        errors.push('Page path is required');
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Page path validation failed: Page path is required');
        return { isValid: false, errors };
    }
    const trimmedPath = pagePath.trim();
    if (!trimmedPath.startsWith('/')) {
        errors.push('Page path must start with /');
    }
    if (trimmedPath.length > 200) {
        errors.push('Page path must not exceed 200 characters');
    }
    if (!/^[a-zA-Z0-9\-_/.()\[\]]+$/.test(trimmedPath)) {
        errors.push('Page path contains invalid characters');
    }
    if (errors.length > 0) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, `Page path validation failed: ${errors.join(', ')}`);
    }
    else {
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'Page path validation successful');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function sanitizeInput(input, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Sanitizing input string');
    if (!input || typeof input !== 'string') {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, 'Input sanitization complete (empty input)');
        return '';
    }
    const sanitized = validator_1.default.escape(input.trim());
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, 'Input sanitization successful');
    return sanitized;
}
function validateAndSanitizeFAQ(data, ctx) {
    var _a, _b, _c, _d;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, 'Starting FAQ data validation and sanitization');
    const errors = [];
    const questionValidation = validateFAQQuestion(data.question, ctx);
    if (!questionValidation.isValid) {
        errors.push(...questionValidation.errors);
    }
    const answerValidation = validateFAQAnswer(data.answer, ctx);
    if (!answerValidation.isValid) {
        errors.push(...answerValidation.errors);
    }
    const categoryValidation = validateCategory(data.category, ctx);
    if (!categoryValidation.isValid) {
        errors.push(...categoryValidation.errors);
    }
    if (data.tags !== undefined) {
        const tagsValidation = validateTags(data.tags, ctx);
        if (!tagsValidation.isValid) {
            errors.push(...tagsValidation.errors);
        }
    }
    const pagePathValidation = validatePagePath(data.pagePath, ctx);
    if (!pagePathValidation.isValid) {
        errors.push(...pagePathValidation.errors);
    }
    if (errors.length > 0) {
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, `FAQ validation failed with ${errors.length} error(s)`);
        return { isValid: false, errors };
    }
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, 'Sanitizing FAQ data');
    const sanitized = {
        question: sanitizeInput(data.question, ctx),
        answer: sanitizeHTML(data.answer),
        category: sanitizeInput(data.category, ctx),
        tags: data.tags ? data.tags.map((tag) => sanitizeInput(tag, ctx)) : [],
        pagePath: data.pagePath ? data.pagePath.trim() : data.pagePath,
        status: typeof data.status === 'boolean' ? data.status : true,
        order: typeof data.order === 'number' ? data.order : 0,
        image: data.image ? sanitizeInput(data.image, ctx) : undefined
    };
    (_d = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _d === void 0 ? void 0 : _d.call(ctx, 'FAQ validation and sanitization completed successfully');
    return {
        isValid: true,
        errors: [],
        sanitized
    };
}
