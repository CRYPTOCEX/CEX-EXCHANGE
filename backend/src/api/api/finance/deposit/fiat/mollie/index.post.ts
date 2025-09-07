import { createError } from '@b/utils/error'
import { models } from '@b/db'
import {
  makeApiRequest,
  validateMollieConfig,
  isCurrencySupported,
  formatMollieAmount,
  generateMollieReference,
  buildWebhookUrl,
  buildReturnUrl,
  getMollieLocale,
  MolliePayment,
  MolliePaymentRequest,
  getAvailablePaymentMethods,
} from './utils'

export const metadata = {
  summary: 'Creates a Mollie payment session',
  description: 'Initiates a payment with Mollie and returns checkout URL',
  operationId: 'createMolliePayment',
  tags: ['Finance', 'Deposit', 'Mollie'],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Payment amount',
              minimum: 0.01,
            },
            currency: {
              type: 'string',
              description: 'Payment currency code',
              example: 'EUR',
            },
            method: {
              type: 'string',
              description: 'Preferred payment method (optional)',
              example: 'creditcard',
            },
            locale: {
              type: 'string',
              description: 'User locale for payment page',
              example: 'en',
            },
          },
          required: ['amount', 'currency'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment session created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  transactionId: { type: 'string' },
                  paymentId: { type: 'string' },
                  checkoutUrl: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  expiresAt: { type: 'string' },
                  availableMethods: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Bad request - invalid parameters' },
    401: { description: 'Unauthorized' },
    500: { description: 'Internal server error' },
  },
}

interface RequestBody {
  amount: number
  currency: string
  method?: string
  locale?: string
}

interface Handler {
  body: RequestBody
  user?: any
}

export default async (data: Handler) => {
  const { body, user } = data

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  // Validate required fields
  if (!body.amount || !body.currency) {
    throw createError({
      statusCode: 400,
      message: 'Amount and currency are required',
    })
  }

  // Validate configuration
  validateMollieConfig()

  // Validate currency support
  if (!isCurrencySupported(body.currency)) {
    throw createError({
      statusCode: 400,
      message: `Currency ${body.currency} is not supported by Mollie`,
    })
  }

  // Validate amount
  if (body.amount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Amount must be greater than 0',
    })
  }

  const { amount, currency, method, locale = 'en' } = body

  try {
    // Get gateway configuration
    const gateway = await models.depositGateway.findOne({
      where: { id: 'mollie' },
    })

    if (!gateway || !gateway.status) {
      throw createError({
        statusCode: 400,
        message: 'Mollie payment gateway is not available',
      })
    }

    // Check currency support in gateway
    const supportedCurrencies = JSON.parse(gateway.currencies || '[]')
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currency} is not supported`,
      })
    }

    // Validate amount limits
    const minAmount = gateway.getMinAmount(currency)
    const maxAmount = gateway.getMaxAmount(currency)

    if (amount < minAmount) {
      throw createError({
        statusCode: 400,
        message: `Minimum amount is ${minAmount} ${currency}`,
      })
    }

    if (maxAmount !== null && amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Maximum amount is ${maxAmount} ${currency}`,
      })
    }

    // Generate unique reference
    const reference = generateMollieReference()

    // Create transaction record
    const transaction = await models.transaction.create({
      uuid: reference,
      userId: user.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: amount,
      fee: 0, // Fee will be calculated by Mollie
      description: `Mollie deposit - ${amount} ${currency}`,
      metadata: {
        gateway: 'mollie',
        currency: currency,
        method: method || 'auto',
        locale: locale,
      },
    })

    // Get available payment methods for currency
    const availableMethods = getAvailablePaymentMethods(currency)

    // Validate specific method if provided
    if (method && !availableMethods.includes(method)) {
      throw createError({
        statusCode: 400,
        message: `Payment method ${method} is not available for ${currency}`,
      })
    }

    // Prepare Mollie payment request
    const mollieAmount = formatMollieAmount(amount * 100, currency) // Convert to minor units
    const mollieLocale = getMollieLocale(locale)

    const paymentRequest: MolliePaymentRequest = {
      amount: {
        currency: currency.toUpperCase(),
        value: mollieAmount,
      },
      description: `Deposit ${amount} ${currency.toUpperCase()}`,
      redirectUrl: `${buildReturnUrl()}?transaction=${transaction.uuid}`,
      webhookUrl: buildWebhookUrl(),
      metadata: {
        transactionId: transaction.uuid,
        userId: user.id,
        platform: 'v5',
        type: 'deposit',
      },
      locale: mollieLocale,
    }

    // Add specific payment method if requested
    if (method) {
      paymentRequest.method = method
    }

    // Add consumer information if available
    if (user.firstName && user.lastName) {
      paymentRequest.consumerName = `${user.firstName} ${user.lastName}`
    }

    // Create payment with Mollie
    const molliePayment = await makeApiRequest<MolliePayment>('/payments', {
      method: 'POST',
      body: paymentRequest,
    })

    if (!molliePayment.id || !molliePayment._links?.checkout?.href) {
      throw createError({
        statusCode: 500,
        message: 'Failed to create Mollie payment session',
      })
    }

    // Update transaction with Mollie payment ID
    await models.transaction.update(
      {
        referenceId: molliePayment.id,
        metadata: {
          ...transaction.metadata,
          molliePaymentId: molliePayment.id,
          mollieStatus: molliePayment.status,
          expiresAt: molliePayment.expiresAt,
          checkoutUrl: molliePayment._links.checkout.href,
        },
      },
      {
        where: { uuid: transaction.uuid },
      }
    )

    return {
      success: true,
      data: {
        transactionId: transaction.uuid,
        paymentId: molliePayment.id,
        checkoutUrl: molliePayment._links.checkout.href,
        amount: amount,
        currency: currency.toUpperCase(),
        status: molliePayment.status,
        expiresAt: molliePayment.expiresAt,
        availableMethods: availableMethods,
      },
    }
  } catch (error) {
    console.error('Mollie payment creation error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create Mollie payment',
    })
  }
} 