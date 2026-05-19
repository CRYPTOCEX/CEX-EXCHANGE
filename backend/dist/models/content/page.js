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
class page extends sequelize_1.Model {
    static initModel(sequelize) {
        return page.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the page",
            },
            slug: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                unique: "pageSlugKey",
                validate: {
                    notEmpty: { msg: "slug: Slug cannot be empty" },
                    isSlugFormat: (value) => {
                        if (!/^[a-z0-9-_/]+$/.test(value)) {
                            throw new Error("slug: Slug must contain only lowercase letters, numbers, hyphens, underscores, and forward slashes");
                        }
                    },
                },
                comment: "URL-friendly slug for the page (used in the page URL)",
            },
            path: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                defaultValue: "",
                comment: "Full path/route for the page in the website structure",
            },
            title: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "title: Title cannot be empty" },
                    len: {
                        args: [1, 255],
                        msg: "title: Title must be between 1 and 255 characters",
                    },
                },
                comment: "Title of the page displayed to users and in browser tabs",
            },
            content: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: false,
                defaultValue: "",
                validate: {
                    isValidContent: function (value) {
                        if (this.isBuilderPage && !value) {
                            return;
                        }
                        if (!this.isBuilderPage && !value) {
                            throw new Error("content: Content cannot be empty for non-builder pages");
                        }
                    },
                },
                comment: "Main content/body of the page (HTML or Markdown)",
            },
            description: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Brief description of the page content",
            },
            image: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "URL path to the page's featured image",
            },
            order: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Display order for page sorting and navigation",
            },
            visits: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: "Number of times this page has been visited",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PUBLISHED", "DRAFT"),
                allowNull: false,
                defaultValue: "DRAFT",
                validate: {
                    isIn: {
                        args: [["PUBLISHED", "DRAFT"]],
                        msg: "status: Status must be either PUBLISHED or DRAFT",
                    },
                },
                comment: "Publication status of the page (PUBLISHED or DRAFT)",
            },
            isHome: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                validate: {
                    isUniqueHome: async function (value) {
                        if (value === true) {
                            if (this.id) {
                                const existing = await page.findOne({
                                    where: { id: this.id },
                                });
                                if (existing && existing.isHome === true) {
                                    return;
                                }
                            }
                            const where = { isHome: true };
                            if (this.id) {
                                where.id = { [Sequelize.Op.ne]: this.id };
                            }
                            if (this.constructor.options.paranoid) {
                                where.deletedAt = null;
                            }
                            const existingHomePage = await page.findOne({ where });
                            if (existingHomePage) {
                                throw new Error("isHome: Only one page can be marked as home page");
                            }
                        }
                    },
                },
                comment: "Indicates if this page is the site's homepage (only one allowed)",
            },
            isBuilderPage: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Indicates if this page was created using the page builder",
            },
            template: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
                comment: "Template name used for this page layout",
            },
            category: {
                type: sequelize_1.DataTypes.STRING(100),
                allowNull: true,
                comment: "Category classification for organizing pages",
            },
            seoTitle: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 255],
                        msg: "seoTitle: SEO title must be less than 255 characters",
                    },
                },
                comment: "SEO optimized title for search engines",
            },
            seoDescription: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: "seoDescription: SEO description must be less than 500 characters",
                    },
                },
                comment: "SEO meta description for search engine results",
            },
            seoKeywords: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "SEO keywords for search engine optimization",
            },
            ogImage: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Open Graph image URL for social media sharing",
            },
            ogTitle: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Open Graph title for social media sharing",
            },
            ogDescription: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "Open Graph description for social media sharing",
            },
            settings: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
                validate: {
                    isValidJSON: (value) => {
                        if (value) {
                            try {
                                JSON.parse(value);
                            }
                            catch (error) {
                                throw new Error("settings: Settings must be valid JSON");
                            }
                        }
                    },
                },
                comment: "JSON string containing page-level configuration settings",
            },
            customCss: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
                comment: "Custom CSS styles specific to this page",
            },
            customJs: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
                comment: "Custom JavaScript code specific to this page",
            },
            lastModifiedBy: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Username or ID of the last person to modify this page",
            },
            publishedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Date and time when the page was first published",
            },
        }, {
            sequelize,
            modelName: "page",
            tableName: "page",
            timestamps: true,
            paranoid: true,
            hooks: {
                beforeSave: async (instance) => {
                    if (!instance.path && instance.slug) {
                        instance.path =
                            instance.slug === "home" ? "/" : `/${instance.slug}`;
                    }
                    if (instance.status === "PUBLISHED" && !instance.publishedAt) {
                        instance.publishedAt = new Date();
                    }
                    if (!instance.seoTitle && instance.title) {
                        instance.seoTitle = instance.title;
                    }
                    if (!instance.seoDescription && instance.description) {
                        instance.seoDescription = instance.description;
                    }
                },
            },
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "pageSlugKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "slug" }],
                },
                {
                    name: "pageStatusIndex",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
                {
                    name: "pageIsHomeIndex",
                    using: "BTREE",
                    fields: [{ name: "isHome" }],
                },
                {
                    name: "pageIsBuilderIndex",
                    using: "BTREE",
                    fields: [{ name: "isBuilderPage" }],
                },
                {
                    name: "pageOrderIndex",
                    using: "BTREE",
                    fields: [{ name: "order" }],
                },
                {
                    name: "pagePublishedAtIndex",
                    using: "BTREE",
                    fields: [{ name: "publishedAt" }],
                },
            ],
        });
    }
}
exports.default = page;
