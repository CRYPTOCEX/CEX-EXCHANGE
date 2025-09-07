import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePaysafeConfig,
  makeApiRequest,
  mapPaysafeStatus,
  parsePaysafeAmount,
  PaysafePayment,
  PaysafeError
} from './utils'

export const metadata = {
  summary: 'Checks Paysafe payment status',
  description: 'Queries current payment status from Paysafe and updates local transaction record',
  operationId: 'checkPaysafePaymentStatus',
  tags: ['Finance', 'Deposit', 'Paysafe'],
  requiresAuth: true,
  parameters: [
    {
      name: 'reference',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
        description: 'Transaction reference number',
      },
    },
    {
      name: 'payment_id',
      in: 'query',
      required: false,
      schema: {
        type: 'string',
        description: 'Paysafe payment ID (optional)',
      },
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
                  transaction_id: { type: 'string' },
                  reference: { type: 'string' },
                  status: { type: 'string' },
                  gateway_status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  payment_id: { type: 'string' },
                  gateway_transaction_id: { type: 'string' },
                  created_at: { type: 'string' },
                  updated_at: { type: 'string' },
                  expires_at: { type: 'string' },
                  is_expired: { type: 'boolean' },
                  checkout_url: { type: 'string' },
                  return_url: { type: 'string' },
                  processor: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request - Invalid parameters',
    },
    401: {
      description: 'Unauthorized',
    },
    404: {
      description: 'Transaction not found',
    },
    500: {
      description: 'Internal server error',
    },
  },
}

export default async (data: Handler) => {
  const { user, query } = data
  const { reference, payment_id } = query

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!reference) {
    throw createError({
      statusCode: 400,
      message: 'Transaction reference is required',
    })
  }

  try {
    // Validate Paysafe configuration
    validatePaysafeConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: reference,
        userId: user.id,
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Check if transaction has expired (1 hour timeout)
    const createdAt = new Date(transaction.createdAt)
    const expiresAt = new Date(createdAt.getTime() + (60 * 60 * 1000)) // 1 hour
    const isExpired = new Date() > expiresAt

    // If expired and still pending, mark as expired
    if (isExpired && transaction.status === 'PENDING') {
      await transaction.update({
        status: 'EXPIRED',
        metadata: {
          ...transaction.metadata,
          expiredAt: new Date().toISOString(),
        },
      })
    }

    let paymentDetails: PaysafePayment | null = null
    let gatewayStatus = transaction.metadata?.gatewayStatus || 'UNKNOWN'
    let gatewayTransactionId = transaction.metadata?.gatewayTransactionId || null
    let processor = transaction.metadata?.processorId || 'PAYSAFE'

    // Try to get latest status from Paysafe if not expired
    if (!isExpired && transaction.status === 'PENDING') {
      try {
        if (payment_id) {
          // Get payment by ID
          paymentDetails = await makeApiRequest<PaysafePayment>(
            `payments/${payment_id}`,
            { method: 'GET' }
          )
        } else {
          // Get payment by merchant reference
          const paymentsResponse = await makeApiRequest<PaysafePayment[]>(
            `payments?merchantRefNum=${reference}`,
            { method: 'GET' }
          )
          
          if (Array.isArray(paymentsResponse) && paymentsResponse.length > 0) {
            paymentDetails = paymentsResponse[0]
          }
        }

        if (paymentDetails) {
          const mappedStatus = mapPaysafeStatus(paymentDetails.status)
          gatewayStatus = paymentDetails.status
          gatewayTransactionId = paymentDetails.gatewayReconciliationId || paymentDetails.id
          processor = paymentDetails.gatewayResponse?.processor || 'PAYSAFE'

          // Update transaction if status changed
          if (transaction.status !== mappedStatus) {
            await transaction.update({
              status: mappedStatus,
              metadata: {
                ...transaction.metadata,
                paymentId: paymentDetails.id,
                gatewayTransactionId: gatewayTransactionId,
                gatewayStatus: gatewayStatus,
                processorId: processor,
                lastStatusCheck: new Date().toISOString(),
                gatewayResponse: paymentDetails.gatewayResponse,
              },
            })
            
            // Update local transaction object for response
            transaction.status = mappedStatus
          }
        }
      } catch (apiError) {
        console.error('Failed to get payment status from Paysafe:', apiError)
        // Don't fail the request if API call fails, just use local data
      }
    }

    // Build response URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const checkoutUrl = transaction.metadata?.checkoutUrl || `${baseUrl}/user/wallet/deposit`
    const returnUrl = `${baseUrl}/user/wallet/deposit/paysafe/verify`

    return {
      success: true,
      data: {
        transaction_id: transaction.id,
        reference: transaction.uuid,
        status: transaction.status,
        gateway_status: gatewayStatus,
        amount: transaction.amount,
        currency: transaction.metadata?.currency || 'USD',
        payment_id: transaction.metadata?.paymentId || payment_id || null,
        gateway_transaction_id: gatewayTransactionId,
        created_at: transaction.createdAt?.toISOString(),
        updated_at: transaction.updatedAt?.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_expired: isExpired,
        checkout_url: checkoutUrl,
        return_url: returnUrl,
        processor: processor,
        payment_handle_id: transaction.metadata?.paymentHandleId || null,
        payment_handle_token: transaction.metadata?.paymentHandleToken || null,
        gateway_response: transaction.metadata?.gatewayResponse || null,
        last_status_check: transaction.metadata?.lastStatusCheck || null,
        webhook_events: {
          last_event_id: transaction.metadata?.webhookEventId || null,
          last_event_type: transaction.metadata?.webhookEventType || null,
          last_event_time: transaction.metadata?.webhookEventTime || null,
          last_webhook_update: transaction.metadata?.lastWebhookUpdate || null,
        },
      },
    }

  } catch (error) {
    console.error('Paysafe status check error:', error)
    
    if (error instanceof PaysafeError) {
      throw createError({
        statusCode: error.status,
        message: `Paysafe Error: ${error.message}`,
      })
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to check Paysafe payment status',
    })
  }
} 