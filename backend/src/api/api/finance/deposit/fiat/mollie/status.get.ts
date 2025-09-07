import { createError } from '@b/utils/error'
import { models } from '@b/db'
import {
  makeApiRequest,
  validateMollieConfig,
  mapMollieStatus,
  MolliePayment,
} from './utils'

export const metadata = {
  summary: 'Checks Mollie payment status',
  description: 'Retrieves current payment status from Mollie API and updates local records',
  operationId: 'checkMolliePaymentStatus',
  tags: ['Finance', 'Deposit', 'Mollie'],
  requiresAuth: true,
  parameters: [
    {
      name: 'transactionId',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'Transaction UUID',
    },
  ],
  responses: {
    200: {
      description: 'Payment status retrieved successfully',
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
                  molliePaymentId: { type: 'string' },
                  status: { type: 'string' },
                  mollieStatus: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  method: { type: 'string' },
                  createdAt: { type: 'string' },
                  expiresAt: { type: 'string' },
                  paidAt: { type: 'string' },
                  isCancelable: { type: 'boolean' },
                  checkoutUrl: { type: 'string' },
                  details: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    400: { description: 'Bad request' },
    401: { description: 'Unauthorized' },
    404: { description: 'Transaction not found' },
    500: { description: 'Internal server error' },
  },
}

interface Query {
  transactionId: string
}

interface Handler {
  query: Query
  user?: any
}

export default async (data: Handler) => {
  const { query, user } = data

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    })
  }

  if (!query.transactionId) {
    throw createError({
      statusCode: 400,
      message: 'Transaction ID is required',
    })
  }

  validateMollieConfig()

  try {
    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: query.transactionId,
        userId: user.id,
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Get Mollie payment ID
    const molliePaymentId = transaction.referenceId || transaction.metadata?.molliePaymentId

    if (!molliePaymentId) {
      throw createError({
        statusCode: 400,
        message: 'Mollie payment ID not found for this transaction',
      })
    }

    try {
      // Fetch current status from Mollie
      const molliePayment = await makeApiRequest<MolliePayment>(`/payments/${molliePaymentId}`)

      if (!molliePayment) {
        throw createError({
          statusCode: 404,
          message: 'Payment not found at Mollie',
        })
      }

      // Update local transaction if status changed
      const currentMollieStatus = transaction.metadata?.mollieStatus
      if (currentMollieStatus !== molliePayment.status) {
        const newStatus = mapMollieStatus(molliePayment.status)
        
        await models.transaction.update(
          {
            status: newStatus,
            metadata: {
              ...transaction.metadata,
              molliePaymentId: molliePayment.id,
              mollieStatus: molliePayment.status,
              lastStatusCheck: new Date().toISOString(),
            },
          },
          {
            where: { uuid: transaction.uuid },
          }
        )
      }

      return {
        success: true,
        data: {
          transactionId: transaction.uuid,
          molliePaymentId: molliePayment.id,
          status: mapMollieStatus(molliePayment.status),
          mollieStatus: molliePayment.status,
          amount: parseFloat(molliePayment.amount.value),
          currency: molliePayment.amount.currency,
          method: molliePayment.method || 'unknown',
          createdAt: molliePayment.createdAt,
          expiresAt: molliePayment.expiresAt || null,
          paidAt: molliePayment.status === 'paid' ? molliePayment.createdAt : null,
          isCancelable: molliePayment.isCancelable,
          checkoutUrl: molliePayment._links?.checkout?.href || null,
          details: molliePayment.details || {},
        },
      }
    } catch (mollieError) {
      // If Mollie API fails, return local data
      console.warn('Failed to fetch from Mollie API:', mollieError.message)
      
      return {
        success: true,
        data: {
          transactionId: transaction.uuid,
          molliePaymentId: molliePaymentId,
          status: transaction.status,
          mollieStatus: transaction.metadata?.mollieStatus || 'unknown',
          amount: transaction.amount,
          currency: transaction.metadata?.currency || 'EUR',
          method: transaction.metadata?.method || 'unknown',
          createdAt: transaction.createdAt,
          expiresAt: transaction.metadata?.expiresAt || null,
          paidAt: transaction.status === 'COMPLETED' ? transaction.updatedAt : null,
          isCancelable: false,
          checkoutUrl: transaction.metadata?.checkoutUrl || null,
          details: {},
          note: 'Status retrieved from local database due to API unavailability',
        },
      }
    }
  } catch (error) {
    console.error('Mollie status check error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to check Mollie payment status',
    })
  }
} 