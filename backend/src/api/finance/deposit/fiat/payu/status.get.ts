import { models } from '@b/db'
import { createError } from '@b/utils/error'
import {
  validatePayUConfig,
  makePayURequest,
  mapPayUStatus,
  parsePayUAmount,
  PayUVerifyResponse,
  PayUError,
  PAYU_CONFIG
} from './utils'

export const metadata = {
  summary: 'Checks PayU payment status',
  description: 'Queries current payment status with 1-hour expiration timeout and updates local records',
  operationId: 'checkPayUPaymentStatus',
  tags: ['Finance', 'Deposit', 'PayU'],
  requiresAuth: true,
  parameters: [
    {
      name: 'txnid',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
      },
      description: 'PayU transaction ID',
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
                  mihpayid: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  gateway: { type: 'string' },
                  payment_mode: { type: 'string' },
                  bank_name: { type: 'string' },
                  bank_ref_num: { type: 'string' },
                  card_type: { type: 'string' },
                  name_on_card: { type: 'string' },
                  payment_source: { type: 'string' },
                  error: { type: 'string' },
                  error_message: { type: 'string' },
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
      description: 'Bad request - Invalid transaction ID',
    },
    401: {
      description: 'Unauthorized - User not authenticated',
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
  const { txnid } = query

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: 'User not authenticated',
    })
  }

  if (!txnid) {
    throw createError({
      statusCode: 400,
      message: 'Transaction ID is required',
    })
  }

  try {
    // Validate PayU configuration
    validatePayUConfig()

    // Find the transaction
    const transaction = await models.transaction.findOne({
      where: {
        uuid: txnid,
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
    
    if (metadata.gateway !== 'payu') {
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
          lastStatusCheck: new Date().toISOString(),
        }),
      })

      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          mihpayid: metadata.mihpayid || '',
          status: 'EXPIRED',
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'payu',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          bank_ref_num: metadata.bankRefNum || '',
          card_type: metadata.cardType || '',
          name_on_card: metadata.nameOnCard || '',
          payment_source: metadata.paymentSource || '',
          error: metadata.error || '',
          error_message: metadata.errorMessage || '',
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
          mihpayid: metadata.mihpayid || '',
          status: transaction.status,
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'payu',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          bank_ref_num: metadata.bankRefNum || '',
          card_type: metadata.cardType || '',
          name_on_card: metadata.nameOnCard || '',
          payment_source: metadata.paymentSource || '',
          error: metadata.error || '',
          error_message: metadata.errorMessage || '',
          is_expired: isExpired,
          expires_at: expirationTime.toISOString(),
          callback_url: metadata.callbackUrl || '',
          last_updated: transaction.updatedAt,
        },
      }
    }

    // Query PayU for current status
    const statusRequest = {
      key: PAYU_CONFIG.MERCHANT_KEY,
      command: 'verify_payment',
      var1: txnid,
      hash: '', // Will be generated
    }

    // Generate hash for status request
    const statusHashString = `${PAYU_CONFIG.MERCHANT_KEY}|verify_payment|${txnid}|${PAYU_CONFIG.MERCHANT_SALT}`
    statusRequest.hash = require('crypto').createHash('sha512').update(statusHashString).digest('hex')

    const statusResponse = await makePayURequest<PayUVerifyResponse>(
      '/merchant/postservice.php?form=2',
      {
        method: 'POST',
        body: statusRequest,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (statusResponse.status !== 1) {
      // If API call fails, return current status
      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          mihpayid: metadata.mihpayid || '',
          status: transaction.status,
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'payu',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          bank_ref_num: metadata.bankRefNum || '',
          card_type: metadata.cardType || '',
          name_on_card: metadata.nameOnCard || '',
          payment_source: metadata.paymentSource || '',
          error: metadata.error || '',
          error_message: metadata.errorMessage || '',
          is_expired: isExpired,
          expires_at: expirationTime.toISOString(),
          callback_url: metadata.callbackUrl || '',
          last_updated: transaction.updatedAt,
        },
      }
    }

    // Get transaction details from response
    const transactionDetails = statusResponse.transaction_details[txnid]
    if (!transactionDetails) {
      // If no details found, return current status
      return {
        success: true,
        data: {
          transaction_id: transaction.uuid,
          mihpayid: metadata.mihpayid || '',
          status: transaction.status,
          amount: transaction.amount,
          currency: metadata.currency || 'INR',
          gateway: 'payu',
          payment_mode: metadata.paymentMode || '',
          bank_name: metadata.bankName || '',
          bank_ref_num: metadata.bankRefNum || '',
          card_type: metadata.cardType || '',
          name_on_card: metadata.nameOnCard || '',
          payment_source: metadata.paymentSource || '',
          error: metadata.error || '',
          error_message: metadata.errorMessage || '',
          is_expired: isExpired,
          expires_at: expirationTime.toISOString(),
          callback_url: metadata.callbackUrl || '',
          last_updated: transaction.updatedAt,
        },
      }
    }

    const payuStatus = transactionDetails.status
    const mappedStatus = mapPayUStatus(payuStatus)
    const txnAmount = parsePayUAmount(transactionDetails.amt || '0', metadata.currency || 'INR')

    // Update transaction with latest status if changed
    if (mappedStatus !== transaction.status) {
      await transaction.update({
        status: mappedStatus,
        referenceId: transactionDetails.mihpayid || transaction.referenceId,
        metadata: JSON.stringify({
          ...metadata,
          mihpayid: transactionDetails.mihpayid,
          bankRefNum: transactionDetails.bank_ref_num,
          paymentMode: transactionDetails.mode,
          bankCode: transactionDetails.bankcode,
          bankName: transactionDetails.bank_name,
          cardType: transactionDetails.card_type,
          nameOnCard: transactionDetails.name_on_card,
          cardNum: transactionDetails.cardnum,
          paymentSource: transactionDetails.payment_source,
          error: transactionDetails.error,
          errorMessage: transactionDetails.error_Message,
          payuStatusResponse: transactionDetails,
          lastStatusCheck: new Date().toISOString(),
        }),
      })
    }

    return {
      success: true,
      data: {
        transaction_id: transaction.uuid,
        mihpayid: transactionDetails.mihpayid || '',
        status: mappedStatus,
        amount: transaction.amount,
        currency: metadata.currency || 'INR',
        gateway: 'payu',
        payment_mode: transactionDetails.mode || '',
        bank_name: transactionDetails.bank_name || '',
        bank_ref_num: transactionDetails.bank_ref_num || '',
        card_type: transactionDetails.card_type || '',
        name_on_card: transactionDetails.name_on_card || '',
        payment_source: transactionDetails.payment_source || '',
        error: transactionDetails.error || '',
        error_message: transactionDetails.error_Message || '',
        is_expired: isExpired,
        expires_at: expirationTime.toISOString(),
        callback_url: metadata.callbackUrl || '',
        last_updated: new Date().toISOString(),
      },
    }
  } catch (error) {
    if (error.statusCode) {
      throw error
    }
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Status check failed',
    })
  }
} 