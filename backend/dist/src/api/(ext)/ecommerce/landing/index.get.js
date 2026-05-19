"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Ecommerce Landing Page Data",
    description: "Retrieves optimized data for the ecommerce landing page including stats, best sellers, deals, and recent reviews.",
    operationId: "getEcommerceLandingData",
    tags: ["Ecommerce", "Landing"],
    requiresAuth: false,
    responses: {
        200: {
            description: "Landing page data retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            stats: { type: "object" },
                            featuredProducts: { type: "array" },
                            bestSellers: { type: "array" },
                            newArrivals: { type: "array" },
                            topRated: { type: "array" },
                            activeDeals: { type: "array" },
                            categoriesWithStats: { type: "array" },
                            recentReviews: { type: "array" },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [productsCount, categoriesCount, ordersCount, completedOrders, reviewStats, allProducts, activeDiscounts, recentReviews, categories,] = await Promise.all([
        db_1.models.ecommerceProduct.count({ where: { status: true } }),
        db_1.models.ecommerceCategory.count({ where: { status: true } }),
        db_1.models.ecommerceOrder.count(),
        db_1.models.ecommerceOrder.findAll({
            where: { status: "COMPLETED" },
            include: [
                {
                    model: db_1.models.ecommerceOrderItem,
                    as: "ecommerceOrderItems",
                    include: [{ model: db_1.models.ecommerceProduct, as: "product" }],
                },
            ],
        }),
        db_1.models.ecommerceReview.findAll({
            where: { status: true },
            attributes: [
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("rating")), "avgRating"],
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "totalCount"],
            ],
            raw: true,
        }),
        db_1.models.ecommerceProduct.findAll({
            where: { status: true },
            include: [
                { model: db_1.models.ecommerceCategory, as: "category" },
                {
                    model: db_1.models.ecommerceReview,
                    as: "ecommerceReviews",
                    where: { status: true },
                    required: false,
                },
            ],
            order: [["createdAt", "DESC"]],
        }),
        db_1.models.ecommerceDiscount.findAll({
            where: {
                status: true,
                validUntil: { [sequelize_1.Op.gt]: now },
            },
            include: [
                {
                    model: db_1.models.ecommerceProduct,
                    as: "product",
                    where: { status: true },
                },
            ],
        }),
        db_1.models.ecommerceReview.findAll({
            where: { status: true },
            include: [
                {
                    model: db_1.models.ecommerceProduct,
                    as: "product",
                    attributes: ["id", "name", "slug", "image"],
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["firstName", "avatar"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 6,
        }),
        db_1.models.ecommerceCategory.findAll({
            where: { status: true },
            include: [
                {
                    model: db_1.models.ecommerceProduct,
                    as: "ecommerceProducts",
                    where: { status: true },
                    required: false,
                },
            ],
        }),
    ]);
    let totalRevenue = 0;
    const productSalesCount = {};
    completedOrders.forEach((order) => {
        var _a;
        (_a = order.ecommerceOrderItems) === null || _a === void 0 ? void 0 : _a.forEach((item) => {
            var _a;
            const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
            totalRevenue += price * item.quantity;
            const pid = item.productId;
            productSalesCount[pid] = (productSalesCount[pid] || 0) + item.quantity;
        });
    });
    const processedProducts = allProducts.map((product) => {
        const p = product.toJSON();
        const reviews = p.ecommerceReviews || [];
        const rating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) /
                reviews.length
            : 0;
        const salesCount = productSalesCount[p.id] || 0;
        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            image: p.image,
            price: p.price,
            currency: p.currency,
            type: p.type,
            inventoryQuantity: p.inventoryQuantity,
            category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
            rating: Math.round(rating * 10) / 10,
            reviewsCount: reviews.length,
            totalSold: salesCount,
            isNew: new Date(p.createdAt) > thirtyDaysAgo,
            isLowStock: p.inventoryQuantity > 0 && p.inventoryQuantity <= 5,
            createdAt: p.createdAt,
        };
    });
    const bestSellers = [...processedProducts]
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 4)
        .filter((p) => p.totalSold > 0)
        .map((p) => ({
        ...p,
        badge: "bestseller",
    }));
    const topRated = [...processedProducts]
        .filter((p) => p.reviewsCount >= 1)
        .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
        .slice(0, 4)
        .map((p) => ({
        ...p,
        badge: "top_rated",
    }));
    const newArrivals = processedProducts
        .filter((p) => p.isNew)
        .slice(0, 4)
        .map((p) => ({
        ...p,
        badge: "new",
        daysAgo: Math.floor((now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    }));
    const featuredIds = new Set();
    const featuredProducts = [];
    bestSellers.forEach((p) => {
        if (!featuredIds.has(p.id)) {
            featuredIds.add(p.id);
            featuredProducts.push({ ...p, badge: "bestseller" });
        }
    });
    newArrivals.forEach((p) => {
        if (!featuredIds.has(p.id) && featuredProducts.length < 8) {
            featuredIds.add(p.id);
            featuredProducts.push({ ...p, badge: "new" });
        }
    });
    topRated.forEach((p) => {
        if (!featuredIds.has(p.id) && featuredProducts.length < 8) {
            featuredIds.add(p.id);
            featuredProducts.push({ ...p, badge: "top_rated" });
        }
    });
    processedProducts.forEach((p) => {
        if (!featuredIds.has(p.id) && featuredProducts.length < 8) {
            featuredIds.add(p.id);
            const badge = p.isLowStock ? "low_stock" : null;
            featuredProducts.push({ ...p, badge });
        }
    });
    const activeDeals = activeDiscounts.map((d) => {
        const disc = d.toJSON();
        const original = disc.product.price;
        const discounted = original * (1 - disc.percentage / 100);
        return {
            product: {
                id: disc.product.id,
                name: disc.product.name,
                slug: disc.product.slug,
                image: disc.product.image,
                price: original,
                currency: disc.product.currency,
            },
            discount: {
                code: disc.code,
                percentage: disc.percentage,
                validUntil: disc.validUntil,
            },
            originalPrice: original,
            discountedPrice: Math.round(discounted * 100) / 100,
        };
    });
    const categoriesWithStats = categories.map((cat) => {
        const c = cat.toJSON();
        const prods = c.ecommerceProducts || [];
        const prices = prods.map((p) => p.price).filter((p) => p > 0);
        return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            image: c.image,
            productCount: prods.length,
            avgPrice: prices.length > 0
                ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) *
                    100) / 100
                : 0,
            priceRange: {
                min: prices.length > 0 ? Math.min(...prices) : 0,
                max: prices.length > 0 ? Math.max(...prices) : 0,
            },
            topProduct: prods[0]
                ? { name: prods[0].name, slug: prods[0].slug, image: prods[0].image }
                : null,
        };
    });
    const reviewsFormatted = recentReviews.map((r) => {
        var _a, _b;
        const review = r.toJSON();
        return {
            id: review.id,
            product: review.product,
            user: {
                firstName: ((_a = review.user) === null || _a === void 0 ? void 0 : _a.firstName) || "Anonymous",
                avatar: (_b = review.user) === null || _b === void 0 ? void 0 : _b.avatar,
            },
            rating: review.rating,
            comment: review.comment,
            timeAgo: getTimeAgo(review.createdAt),
        };
    });
    const uniqueBuyers = new Set(completedOrders.map((o) => o.userId)).size;
    const rStats = reviewStats[0];
    return {
        stats: {
            products: productsCount,
            categories: categoriesCount,
            orders: ordersCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            avgRating: Math.round(parseFloat((rStats === null || rStats === void 0 ? void 0 : rStats.avgRating) || 0) * 10) / 10,
            totalReviews: parseInt((rStats === null || rStats === void 0 ? void 0 : rStats.totalCount) || 0),
            customersServed: uniqueBuyers,
            digitalProducts: processedProducts.filter((p) => p.type === "DOWNLOADABLE")
                .length,
            physicalProducts: processedProducts.filter((p) => p.type === "PHYSICAL")
                .length,
        },
        featuredProducts,
        bestSellers,
        newArrivals,
        topRated,
        activeDeals,
        categoriesWithStats,
        recentReviews: reviewsFormatted,
    };
};
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
