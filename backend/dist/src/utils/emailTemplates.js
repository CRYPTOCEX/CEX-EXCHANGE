"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_TEMPLATES = void 0;
exports.loadEmailTemplate = loadEmailTemplate;
exports.replaceTemplateVariables = replaceTemplateVariables;
exports.processStandaloneTemplate = processStandaloneTemplate;
exports.getAvailableTemplates = getAvailableTemplates;
exports.validateTemplateVariables = validateTemplateVariables;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const error_1 = require("../utils/error");
const console_1 = require("./console");
function getEmailTemplatesPath() {
    const templatePaths = [
        path_1.default.resolve(process.cwd(), "backend", "email", "templates"),
        path_1.default.resolve(__dirname, "../../../email", "templates"),
        path_1.default.resolve(process.cwd(), "email", "templates"),
        path_1.default.resolve(__dirname, "../../email", "templates"),
    ];
    for (const templatePath of templatePaths) {
        if (fs_1.default.existsSync(templatePath)) {
            console_1.logger.debug("EMAIL", `Templates directory found at: ${templatePath}`);
            return templatePath;
        }
    }
    console_1.logger.warn("EMAIL", `No email templates directory found. Tried paths: ${templatePaths.join(", ")}`);
    return templatePaths[0];
}
function loadEmailTemplate(templateName) {
    const templatesDir = getEmailTemplatesPath();
    const templatePath = path_1.default.join(templatesDir, `${templateName}.html`);
    try {
        return fs_1.default.readFileSync(templatePath, "utf-8");
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Email template '${templateName}' not found at ${templatePath}`,
        });
    }
}
function replaceTemplateVariables(template, variables) {
    if (typeof template !== "string") {
        console_1.logger.error("EMAIL", "Template is not a string");
        return "";
    }
    return Object.entries(variables).reduce((acc, [key, value]) => {
        if (value === undefined) {
            console_1.logger.warn("EMAIL", `Variable ${key} is undefined`);
            return acc;
        }
        return acc.replace(new RegExp(`%${key}%`, "g"), String(value));
    }, template);
}
function processStandaloneTemplate(templateName, variables) {
    const template = loadEmailTemplate(templateName);
    return replaceTemplateVariables(template, variables);
}
function getAvailableTemplates() {
    const templatesDir = getEmailTemplatesPath();
    try {
        return fs_1.default
            .readdirSync(templatesDir)
            .filter((file) => file.endsWith(".html"))
            .map((file) => file.replace(".html", ""));
    }
    catch (error) {
        console_1.logger.error("EMAIL", "Error reading templates directory", error);
        return [];
    }
}
function validateTemplateVariables(template, providedVariables) {
    const variablePattern = /%([A-Z_]+)%/g;
    const requiredVariables = new Set();
    let match;
    while ((match = variablePattern.exec(template)) !== null) {
        requiredVariables.add(match[1]);
    }
    const missingVariables = Array.from(requiredVariables).filter((variable) => !(variable in providedVariables) || providedVariables[variable] === undefined);
    return {
        isValid: missingVariables.length === 0,
        missingVariables,
    };
}
exports.EMAIL_TEMPLATES = {
    GENERAL: "generalTemplate",
    WELCOME: "welcome",
    NOTIFICATION: "notification",
};
