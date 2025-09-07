import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePaytmConfig,
  generateChecksumHash,
  makePaytmRequest,
  mapPaytmStatus,
  parsePaytmAmount,
  PaytmVerifyResponse,
  PaytmError,
  PAYTM_CONFIG
} from './utils'

export const metadata = {
  summary: 'Checks Paytm payment status',
  description: 'Queries current payment status with 1-hour expiration timeout and updates local transaction records',
  operationId: 'checkPaytmPaymentStatus',
  tags: ['Finance', 'Deposit', 'Paytm'],
  requiresAuth: true,
  parameters: [
    {
      name: 'orderId',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
        description: 'Paytm order ID',
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
                  order_id: { type: 'string' },
                  txn_id: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  payment_mode: { type: 'string' },
                  bank_name: { type: 'string' },
                  gateway_name: { type: 'string' },
                  bank_txn_id: { type: 'string' },
                  txn_date: { type: 'string' },
                  is_expired: { type: 'boolean' },
                  expires_at: { type: 'string' },
                  callback_url: { type: 'string' },
                  last_updated: { type: 'string' },
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
  const { orderId } = query

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!orderId) {
    throw createError({
      statusCode: 400,
      message: 'Order ID is required',
    })
  }

  try {
    // Validate Paytm configuration
    validatePaytmConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: orderId,
        userId: user.id,
        type: 'DEPOSIT',
      },
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        message: 'Transaction not found',
      })
    }

    // Parse transaction metadata
    const metadata = JSON.parse(transaction.metadata || '{}')
    
    if (metadata.gateway !== 'paytm') {
      throw createError({
        statusCode: 400,
        message: 'Invalid gateway for this transaction',
      })
    }

    // Check if transaction has expired (1 hour timeout)
    const createdAt = new Date(transaction.createdAt)
    const expirationTime = new Date(createdAt.getTime() + 60 * 60 * 1000) // 1 hour
    const isExpired = new Date() > expirationTime

    // If expired and still pending, mark as expired
    if (isExpired && transaction.status === 'PENDING') {
      await transaction.update({
        status: 'EXPIRED',
        metadata: JSON.stringify({
          ...metadata,
          expiredAt: new Date().toISOString(),
          reason: 'Payment timeout after 1 hour',
        }),
      })

      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          order_id: orderId,
          txn_id: metadata.txnId || '',
          status: 'EXPIRED',
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'paytm',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          gateway_name: metadata.gatewayName || '',
          bank_txn_id: metadata.bankTxnId || '',
          txn_date: metadata.txnDate || '',
          is_expired: true,
          expires_at: expirationTime.toISOString(),
          callback_url: metadata.callbackUrl || '',
          last_updated: new Date().toISOString(),
        },
      }
    }

    // If transaction is already completed or failed, return current status
    if (transaction.status !== 'PENDING') {
      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          order_id: orderId,
          txn_id: metadata.txnId || '',
          status: transaction.status,
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'paytm',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          gateway_name: metadata.gatewayName || '',
          bank_txn_id: metadata.bankTxnId || '',
          txn_date: metadata.txnDate || '',
          is_expired: isExpired,
          expires_at: expirationTime.toISOString(),
          callback_url: metadata.callbackUrl || '',
          last_updated: transaction.updatedAt,
        },
      }
    }

    // Query Paytm for current status
    const statusRequest = {
      body: {
        mid: PAYTM_CONFIG.MID,
        orderId: orderId,
      }
    }

    // Generate checksum for status request
    const checksum = generateChecksumHash(statusRequest.body, PAYTM_CONFIG.MERCHANT_KEY)
    statusRequest.body['checksumHash'] = checksum

    const statusResponse = await makePaytmRequest<PaytmVerifyResponse>(
      '/merchant-status/api/v1/getPaymentStatus',
      {
        method: 'POST',
        body: statusRequest,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const paytmStatus = statusResponse.body.resultInfo.resultStatus
    const mappedStatus = mapPaytmStatus(paytmStatus)
    const txnAmount = parsePaytmAmount(statusResponse.body.txnAmount || '0', metadata.currency || 'INR')

    // Update transaction with latest status if changed
    if (mappedStatus !== transaction.status) {
      await transaction.update({
        status: mappedStatus,
        referenceId: statusResponse.body.txnId || transaction.referenceId,
        metadata: JSON.stringify({
          ...metadata,
          txnId: statusResponse.body.txnId,
          bankTxnId: statusResponse.body.bankTxnId,
          paymentMode: statusResponse.body.paymentMode,
          bankName: statusResponse.body.bankName,
          gatewayName: statusResponse.body.gatewayName,
          txnDate: statusResponse.body.txnDate,
          paytmStatusResponse: statusResponse.body,
          lastStatusCheck: new Date().toISOString(),
        }),
      })
    }

    return {
      success: true,
      data: {
        transaction_id: transaction.uuid,
        order_id: orderId,
        txn_id: statusResponse.body.txnId || '',
        status: mappedStatus,
        amount: txnAmount,
        currency: statusResponse.body.currency || metadata.currency || 'INR',
        gateway: 'paytm',
        payment_mode: statusResponse.body.paymentMode || '',
        bank_name: statusResponse.body.bankName || '',
        gateway_name: statusResponse.body.gatewayName || '',
        bank_txn_id: statusResponse.body.bankTxnId || '',
        txn_date: statusResponse.body.txnDate || '',
        is_expired: isExpired,
        expires_at: expirationTime.toISOString(),
        callback_url: metadata.callbackUrl || '',
        last_updated: new Date().toISOString(),
      },
    }

  } catch (error) {
    if (error instanceof PaytmError) {
      throw createError({
        statusCode: error.status,
        message: error.message,
      })
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to check Paytm payment status',
    })
  }
} 