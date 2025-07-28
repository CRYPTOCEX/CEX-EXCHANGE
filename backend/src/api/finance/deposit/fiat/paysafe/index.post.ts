import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePaysafeConfig,
  isCurrencySupported,
  formatPaysafeAmount,
  generatePaysafeReference,
  makeApiRequest,
  buildWebhookUrl,
  buildReturnUrl,
  buildCancelUrl,
  getAvailablePaymentMethods,
  getPaymentMethodDisplayName,
  getRegionFromCurrency,
  PAYSAFE_PAYMENT_TYPES,
  PaysafePaymentHandleRequest,
  PaysafePaymentHandle,
  PaysafeError
} from './utils'

export const metadata = {
  summary: 'Creates a Paysafe payment session',
  description: 'Initiates a payment with Paysafe using Payment Handles API and returns checkout URL for various payment methods',
  operationId: 'createPaysafePayment',
  tags: ['Finance', 'Deposit', 'Paysafe'],
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
              example: 'USD',
            },
            paymentType: {
              type: 'string',
              description: 'Preferred payment method type',
              enum: ['CARD', 'PAYPAL', 'VENMO', 'SKRILL', 'NETELLER', 'APPLEPAY', 'GOOGLEPAY', 'ACH', 'EFT', 'PAYSAFECARD', 'PAYSAFECASH'],
              default: 'CARD',
            },
            locale: {
              type: 'string',
              description: 'User locale for payment page',
              example: 'en_US',
            },
          },
          required: ['amount', 'currency'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Paysafe payment session created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  transaction_id: { type: 'string' },
                  payment_handle_id: { type: 'string' },
                  payment_handle_token: { type: 'string' },
                  checkout_url: { type: 'string' },
                  reference: { type: 'string' },
                  status: { type: 'string' },
                  gateway: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  payment_type: { type: 'string' },
                  expires_at: { type: 'string' },
                  available_methods: {
                    type: 'object',
                    additionalProperties: { type: 'string' }
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'Payment gateway not found',
    },
    500: {
      description: 'Internal server error',
    },
  },
}

export default async (data: Handler) => {
  const { user, body } = data
  const { amount, currency, paymentType = 'CARD', locale = 'en_US' } = body

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!amount || amount <= 0) {
    throw createError({
      statusCode: 400,
      message: 'Invalid amount provided',
    })
  }

  if (!currency) {
    throw createError({
      statusCode: 400,
      message: 'Currency is required',
    })
  }

  const currencyCode = currency.toUpperCase()

  try {
    // Validate Paysafe configuration
    validatePaysafeConfig()

    // Check if currency is supported
    if (!isCurrencySupported(currencyCode)) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currencyCode} is not supported by Paysafe`,
      })
    }

    // Get gateway configuration
    const gateway = await models.depositGateway.findOne({
      where: { id: 'paysafe' },
    })

    if (!gateway || !gateway.status) {
      throw createError({
        statusCode: 400,
        message: 'Paysafe payment gateway is not available',
      })
    }

    // Check currency support in gateway
    const supportedCurrencies = JSON.parse(gateway.currencies || '[]')
    if (!supportedCurrencies.includes(currencyCode)) {
      throw createError({
        statusCode: 400,
        message: `Currency ${currencyCode} is not supported`,
      })
    }

    // Validate amount limits
    const minAmount = gateway.getMinAmount(currency)
    const maxAmount = gateway.getMaxAmount(currency)

    if (amount < minAmount) {
      throw createError({
        statusCode: 400,
        message: `Minimum amount is ${minAmount} ${currencyCode}`,
      })
    }

          if (maxAmount !== null && amount > maxAmount) {
      throw createError({
        statusCode: 400,
        message: `Maximum amount is ${maxAmount} ${currencyCode}`,
      })
    }

    // Generate unique reference
    const reference = generatePaysafeReference()

    // Create pending transaction
    const transaction = await models.transaction.create({
      uuid: reference,
      userId: user.id,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: amount,
      fee: 0, // Paysafe fees are typically deducted from merchant account
      description: `Paysafe deposit - ${amount} ${currencyCode}`,
      metadata: {
        gateway: 'paysafe',
        currency: currencyCode,
        originalAmount: amount,
        paymentType: paymentType,
        locale: locale,
      }
    })

    // Get user profile data
    const profile = await models.user.findByPk(user.id, {
      attributes: ['firstName', 'lastName', 'email', 'phone']
    })

    // Prepare payment handle request
    const paymentHandleRequest: PaysafePaymentHandleRequest = {
      merchantRefNum: reference,
      transactionType: 'PAYMENT',
      amount: formatPaysafeAmount(amount, currencyCode),
      currencyCode: currencyCode,
      paymentType: paymentType,
      customerIp: data.remoteAddress || '127.0.0.1',
      billingDetails: {
        street: profile?.firstName || 'N/A',
        city: 'N/A',
        zip: '00000',
        country: getRegionFromCurrency(currencyCode),
      },
      customer: {
        merchantCustomerId: user.id,
        firstName: profile?.firstName || 'Customer',
        lastName: profile?.lastName || 'User',
        email: profile?.email || `user${user.id}@example.com`,
        phone: profile?.phone || '+1234567890',
        ip: data.remoteAddress || '127.0.0.1',
      },
      merchantDescriptor: {
        dynamicDescriptor: 'Paysafe Payment',
        phone: '+1234567890',
      },
      returnLinks: [
        {
          rel: 'on_completed',
          href: buildReturnUrl(),
          method: 'GET',
        },
        {
          rel: 'on_failed',
          href: buildCancelUrl(),
          method: 'GET',
        },
        {
          rel: 'default',
          href: buildReturnUrl(),
          method: 'GET',
        },
      ],
      webhookUrl: buildWebhookUrl(),
    }

    // Create payment handle
    const paymentHandle = await makeApiRequest<PaysafePaymentHandle>(
      'paymenthandles',
      {
        method: 'POST',
        body: paymentHandleRequest,
      }
    )

    // Update transaction with payment handle details
    await transaction.update({
      metadata: {
        ...transaction.metadata,
        paymentHandleId: paymentHandle.id,
        paymentHandleToken: paymentHandle.paymentHandleToken,
        gatewayId: paymentHandle.gatewayResponse?.id,
        processorId: paymentHandle.gatewayResponse?.processor,
      }
    })

    // Get checkout URL from payment handle
    const checkoutLink = paymentHandle.links?.find(link => 
      link.rel === 'redirect_payment' || link.rel === 'checkout'
    )

    if (!checkoutLink) {
      throw createError({
        statusCode: 500,
        message: 'No checkout URL received from Paysafe',
      })
    }

    // Get available payment methods for this currency
    const availableMethods = getAvailablePaymentMethods(currencyCode)
    const methodsDisplay = availableMethods.reduce((acc, method) => {
      acc[method] = getPaymentMethodDisplayName(method)
      return acc
    }, {} as Record<string, string>)

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (paymentHandle.timeToLiveSeconds * 1000)).toISOString()

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        payment_handle_id: paymentHandle.id,
        payment_handle_token: paymentHandle.paymentHandleToken,
        checkout_url: checkoutLink.href,
        reference: reference,
        status: 'PENDING',
        gateway: 'paysafe',
        amount: amount,
        currency: currencyCode,
        payment_type: paymentType,
        expires_at: expiresAt,
        available_methods: methodsDisplay,
        processor: paymentHandle.gatewayResponse?.processor || 'PAYSAFE',
        gateway_response: {
          id: paymentHandle.gatewayResponse?.id,
          processor: paymentHandle.gatewayResponse?.processor,
          action: paymentHandle.action,
          execution_mode: paymentHandle.executionMode,
          usage: paymentHandle.usage,
        },
      },
    }

  } catch (error) {
    console.error('Paysafe payment creation error:', error)
    
    if (error instanceof PaysafeError) {
      throw createError({
        statusCode: error.status,
        message: `Paysafe Error: ${error.message}`,
      })
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create Paysafe payment',
    })
  }
} 