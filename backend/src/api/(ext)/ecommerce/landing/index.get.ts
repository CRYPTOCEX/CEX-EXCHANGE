import { models } from "@b/db";
import { Op, fn, col } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get Ecommerce Landing Page Data",
  description:
    "Retrieves optimized data for the ecommerce landing page including stats, best sellers, deals, and recent reviews.",
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

export default async (data: Handler) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    productsCount,
    categoriesCount,
    ordersCount,
    completedOrders,
    reviewStats,
    allProducts,
    activeDiscounts,
    recentReviews,
    categories,
  ] = await Promise.all([
    // Basic counts
    models.ecommerceProduct.count({ where: { status: true } }),
    models.ecommerceCategory.count({ where: { status: true } }),
    models.ecommerceOrder.count(),

    // Completed orders for revenue calculation
    models.ecommerceOrder.findAll({
      where: { status: "COMPLETED" },
      include: [
        {
          model: models.ecommerceOrderItem,
          as: "ecommerceOrderItems",
          include: [{ model: models.ecommerceProduct, as: "product" }],
        },
      ],
    }),

    // Review stats
    models.ecommerceReview.findAll({
      where: { status: true },
      attributes: [
        [fn("AVG", col("rating")), "avgRating"],
        [fn("COUNT", col("id")), "totalCount"],
      ],
      raw: true,
    }),

    // All active products with reviews
    models.ecommerceProduct.findAll({
      where: { status: true },
      include: [
        { model: models.ecommerceCategory, as: "category" },
        {
          model: models.ecommerceReview,
          as: "ecommerceReviews",
          where: { status: true },
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    }),

    // Active discounts
    models.ecommerceDiscount.findAll({
      where: {
        status: true,
        validUntil: { [Op.gt]: now },
      },
      include: [
        {
          model: models.ecommerceProduct,
          as: "product",
          where: { status: true },
        },
      ],
    }),

    // Recent reviews
    models.ecommerceReview.findAll({
      where: { status: true },
      include: [
        {
          model: models.ecommerceProduct,
          as: "product",
          attributes: ["id", "name", "slug", "image"],
        },
        {
          model: models.user,
          as: "user",
          attributes: ["firstName", "avatar"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 6,
    }),

    // Categories with products
    models.ecommerceCategory.findAll({
      where: { status: true },
      include: [
        {
          model: models.ecommerceProduct,
          as: "ecommerceProducts",
          where: { status: true },
          required: false,
        },
      ],
    }),
  ]);

  // Calculate revenue and track product sales
  let totalRevenue = 0;
  const productSalesCount: Record<string, number> = {};

  completedOrders.forEach((order: any) => {
    order.ecommerceOrderItems?.forEach((item: any) => {
      const price = item.product?.price || 0;
      totalRevenue += price * item.quantity;
      const pid = item.productId;
      productSalesCount[pid] = (productSalesCount[pid] || 0) + item.quantity;
    });
  });

  // Process products with ratings and sales data
  const processedProducts = allProducts.map((product: any) => {
    const p = product.toJSON();
    const reviews = p.ecommerceReviews || [];
    const rating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
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

  // Best sellers (top 4 by sales)
  const bestSellers = [...processedProducts]
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 4)
    .filter((p) => p.totalSold > 0)
    .map((p) => ({
      ...p,
      badge: "bestseller",
    }));

  // Top rated (top 4 by rating, min 1 review)
  const topRated = [...processedProducts]
    .filter((p) => p.reviewsCount >= 1)
    .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
    .slice(0, 4)
    .map((p) => ({
      ...p,
      badge: "top_rated",
    }));

  // New arrivals (last 30 days)
  const newArrivals = processedProducts
    .filter((p) => p.isNew)
    .slice(0, 4)
    .map((p) => ({
      ...p,
      badge: "new",
      daysAgo: Math.floor(
        (now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }));

  // Featured products (mix of different badges)
  const featuredIds = new Set<string>();
  const featuredProducts: any[] = [];

  // Add bestsellers first
  bestSellers.forEach((p) => {
    if (!featuredIds.has(p.id)) {
      featuredIds.add(p.id);
      featuredProducts.push({ ...p, badge: "bestseller" });
    }
  });

  // Add new arrivals
  newArrivals.forEach((p) => {
    if (!featuredIds.has(p.id) && featuredProducts.length < 8) {
      featuredIds.add(p.id);
      featuredProducts.push({ ...p, badge: "new" });
    }
  });

  // Add top rated
  topRated.forEach((p) => {
    if (!featuredIds.has(p.id) && featuredProducts.length < 8) {
      featuredIds.add(p.id);
      featuredProducts.push({ ...p, badge: "top_rated" });
    }
  });

  // Fill remaining with other products
  processedProducts.forEach((p) => {
    if (!featuredIds.has(p.id) && featuredProducts.length < 8) {
      featuredIds.add(p.id);
      const badge = p.isLowStock ? "low_stock" : null;
      featuredProducts.push({ ...p, badge });
    }
  });

  // Active deals
  const activeDeals = activeDiscounts.map((d: any) => {
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

  // Categories with stats
  const categoriesWithStats = categories.map((cat: any) => {
    const c = cat.toJSON();
    const prods = c.ecommerceProducts || [];
    const prices = prods.map((p: any) => p.price).filter((p: number) => p > 0);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      productCount: prods.length,
      avgPrice:
        prices.length > 0
          ? Math.round(
              (prices.reduce((a: number, b: number) => a + b, 0) / prices.length) *
                100
            ) / 100
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

  // Format recent reviews
  const reviewsFormatted = recentReviews.map((r: any) => {
    const review = r.toJSON();
    return {
      id: review.id,
      product: review.product,
      user: {
        firstName: review.user?.firstName || "Anonymous",
        avatar: review.user?.avatar,
      },
      rating: review.rating,
      comment: review.comment,
      timeAgo: getTimeAgo(review.createdAt),
    };
  });

  // Unique buyers count
  const uniqueBuyers = new Set(completedOrders.map((o: any) => o.userId)).size;

  const rStats = reviewStats[0] as any;

  return {
    stats: {
      products: productsCount,
      categories: categoriesCount,
      orders: ordersCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRating: Math.round(parseFloat(rStats?.avgRating || 0) * 10) / 10,
      totalReviews: parseInt(rStats?.totalCount || 0),
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

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
