import { models, sequelize } from "@b/db";
import { Op } from "sequelize";
import { processRewards } from "@b/utils/affiliate";
import { sendOrderConfirmationEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import { createNotification } from "@b/utils/notifications";
import { createRecordResponses } from "@b/utils/query";
import { rateLimiters } from "@b/handler/Middleware";

export const metadata: OperationObject = {
  summary: "Creates a new order",
  description:
    "Processes a new order for the logged-in user, checking inventory, wallet balance, and applying any available discounts.",
  operationId: "createEcommerceOrder",
  tags: ["Ecommerce", "Orders"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            productId: { type: "string", description: "Product ID to order" },
            discountId: {
              type: "string",
              description: "Discount ID applied to the order",
              nullable: true,
            },
            amount: {
              type: "number",
              description: "Quantity of the product to purchase",
            },
            shippingAddress: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postalCode: { type: "string" },
                country: { type: "string" },
              },
              required: [
                "name",
                "email",
                "phone",
                "street",
                "city",
                "state",
                "postalCode",
                "country",
              ],
            },
          },
          required: ["productId", "amount"],
        },
      },
    },
  },
  responses: createRecordResponses("Order"),
};

export default async (data: Handler) => {
  // Apply rate limiting
  await rateLimiters.orderCreation(data);
  
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { productId, discountId, amount, shippingAddress } = body;

  // Validate amount
  if (!amount || amount <= 0 || !Number.isInteger(amount)) {
    throw createError({ statusCode: 400, message: "Invalid quantity" });
  }

  const transaction = await sequelize.transaction();

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const product = await models.ecommerceProduct.findByPk(productId, { transaction });
  if (!product) {
    await transaction.rollback();
    throw createError({ statusCode: 404, message: "Product not found" });
  }

  // Validate product is active
  if (!product.status) {
    await transaction.rollback();
    throw createError({ statusCode: 400, message: "Product is not available" });
  }

  // Check inventory for physical products
  if (product.type === "PHYSICAL" && product.inventoryQuantity < amount) {
    await transaction.rollback();
    throw createError({ statusCode: 400, message: "Insufficient inventory" });
  }

  // Get system settings for tax and shipping
  const systemSettings = await models.settings.findAll();
  const settings = systemSettings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  // Calculate base cost
  let subtotal = product.price * amount;
  let userDiscount: any = null;
  let discountAmount = 0;

  // Apply discount if applicable
  if (discountId && discountId !== "null") {
    userDiscount = await models.ecommerceUserDiscount.findOne({
      where: {
        userId: user.id,
        discountId: discountId,
      },
      include: [
        {
          model: models.ecommerceDiscount,
          as: "discount",
        },
      ],
    });

    if (!userDiscount) {
      throw createError({ statusCode: 404, message: "Discount not found" });
    }

    if (userDiscount.discount.type === "PERCENTAGE") {
      discountAmount = subtotal * (userDiscount.discount.percentage / 100);
    } else if (userDiscount.discount.type === "FIXED") {
      discountAmount = Math.min(userDiscount.discount.value, subtotal);
    }
    
    subtotal -= discountAmount;
  }

  // Calculate shipping cost for physical products
  let shippingCost = 0;
  if (product.type === "PHYSICAL" && settings.ecommerceShippingEnabled === "true") {
    shippingCost = parseFloat(settings.ecommerceDefaultShippingCost || "0");
  }

  // Calculate tax
  let taxAmount = 0;
  if (settings.ecommerceTaxEnabled === "true") {
    const taxRate = parseFloat(settings.ecommerceDefaultTaxRate || "0") / 100;
    taxAmount = subtotal * taxRate;
  }

  // Calculate total cost
  const cost = subtotal + shippingCost + taxAmount;

  // Check user wallet balance
  const wallet = await models.wallet.findOne({
    where: {
      userId: user.id,
      type: product.walletType,
      currency: product.currency,
    },
    transaction,
    lock: transaction.LOCK.UPDATE, // Lock the wallet for update to prevent race conditions
  });

  if (!wallet || wallet.balance < cost) {
    await transaction.rollback();
    throw createError({ statusCode: 400, message: "Insufficient balance" });
  }

  const newBalance = wallet.balance - cost;

  // Create order and order items
  const order = await models.ecommerceOrder.create(
    {
      userId: user.id,
      status: "PENDING",
    },
    { transaction }
  );

  await models.ecommerceOrderItem.create(
    {
      orderId: order.id,
      productId: productId,
      quantity: amount,
    },
    { transaction }
  );

  // Update product inventory with optimistic locking
  if (product.type === "PHYSICAL") {
    const [updatedRows] = await models.ecommerceProduct.update(
      { inventoryQuantity: sequelize.literal(`inventoryQuantity - ${amount}`) },
      { 
        where: { 
          id: productId, 
          inventoryQuantity: { [Op.gte]: amount } // Ensure inventory is still available
        },
        transaction 
      }
    );

    if (updatedRows === 0) {
      await transaction.rollback();
      throw createError({ statusCode: 400, message: "Product inventory changed during checkout" });
    }
  }

  await wallet.update({ balance: newBalance }, { transaction });

  // Create a transaction record
  const description = `Purchase of ${product.name} x${amount} (${(product.price * amount).toFixed(2)}${discountAmount > 0 ? ` - ${discountAmount.toFixed(2)} discount` : ''}${shippingCost > 0 ? ` + ${shippingCost.toFixed(2)} shipping` : ''}${taxAmount > 0 ? ` + ${taxAmount.toFixed(2)} tax` : ''}) = ${cost.toFixed(2)} ${product.currency}`;
  
  await models.transaction.create(
    {
      userId: user.id,
      walletId: wallet.id,
      type: "PAYMENT",
      status: "COMPLETED",
      amount: cost,
      description,
      referenceId: order.id,
    },
    { transaction }
  );

  // Update discount status if applicable
  if (userDiscount) {
    await userDiscount.update({ status: true }, { transaction });
  }

  // Create shipping address if product is physical
  if (product.type !== "DOWNLOADABLE" && shippingAddress) {
    await models.ecommerceShippingAddress.create(
      {
        userId: user.id,
        orderId: order.id,
        ...shippingAddress,
      },
      { transaction }
    );
  }

  // Update order status to completed
  await order.update({ status: "COMPLETED" }, { transaction });

  await transaction.commit();

  // Send order confirmation email and create notification
  try {
    await sendOrderConfirmationEmail(userPk, order, product);
    await createNotification({
      userId: user.id,
      relatedId: order.id,
      title: "Order Confirmation",
      message: `Your order for ${product.name} x${amount} has been confirmed.`,
      type: "system",
      link: `/ecommerce/orders/${order.id}`,
      actions: [
        {
          label: "View Order",
          link: `/ecommerce/orders/${order.id}`,
          primary: true,
        },
      ],
    });
  } catch (error) {
    console.error(
      "Error sending order confirmation email or creating notification:",
      error
    );
  }

  // Process rewards if applicable
  if (product.type === "DOWNLOADABLE") {
    try {
      await processRewards(
        user.id,
        cost,
        "ECOMMERCE_PURCHASE",
        wallet.currency
      );
    } catch (error) {
      console.error(`Error processing rewards: ${error.message}`);
    }
  }

  return {
    id: order.id,
    message: "Order created successfully",
  };
};
