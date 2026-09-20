<?php
/**
 * Bicrypto Webhook Handler Class
 *
 * @package Bicrypto_Gateway
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WC_Bicrypto_Webhook_Handler class
 */
class WC_Bicrypto_Webhook_Handler {

    /**
     * Gateway instance
     *
     * @var WC_Bicrypto_Gateway
     */
    private $gateway;

    /**
     * Constructor
     *
     * @param WC_Bicrypto_Gateway $gateway Gateway instance
     */
    public function __construct($gateway) {
        $this->gateway = $gateway;
    }

    /**
     * Handle incoming webhook
     */
    public function handle() {
        $payload = file_get_contents('php://input');
        $signature = isset($_SERVER['HTTP_X_WEBHOOK_SIGNATURE']) ? sanitize_text_field($_SERVER['HTTP_X_WEBHOOK_SIGNATURE']) : '';

        $this->gateway->log('Webhook received: ' . $payload);

        // Verify signature if webhook secret is configured
        if (!$this->verify_signature($payload, $signature)) {
            $this->gateway->log('Webhook signature verification failed', 'error');
            status_header(401);
            exit(wp_json_encode(array('error' => 'Invalid signature')));
        }

        $data = json_decode($payload, true);

        if (!$data || !isset($data['event'])) {
            $this->gateway->log('Invalid webhook payload', 'error');
            status_header(400);
            exit(wp_json_encode(array('error' => 'Invalid payload')));
        }

        $event = sanitize_text_field($data['event']);
        $payment_data = isset($data['data']) ? $data['data'] : array();

        $this->gateway->log('Processing webhook event: ' . $event);

        // Process event
        $result = $this->process_event($event, $payment_data);

        if (is_wp_error($result)) {
            $this->gateway->log('Webhook processing failed: ' . $result->get_error_message(), 'error');
            status_header(400);
            exit(wp_json_encode(array('error' => $result->get_error_message())));
        }

        status_header(200);
        exit(wp_json_encode(array('success' => true, 'message' => 'Webhook processed')));
    }

    /**
     * Verify webhook signature
     *
     * @param string $payload   Raw payload
     * @param string $signature Signature from header
     * @return bool
     */
    private function verify_signature($payload, $signature) {
        $webhook_secret = $this->gateway->get_option('webhook_secret');

        // If no secret configured, skip verification (not recommended for production)
        if (empty($webhook_secret)) {
            $this->gateway->log('Warning: Webhook secret not configured, skipping signature verification', 'warning');
            return true;
        }

        if (empty($signature)) {
            return false;
        }

        $expected_signature = hash_hmac('sha256', $payload, $webhook_secret);

        return hash_equals($expected_signature, $signature);
    }

    /**
     * Process webhook event
     *
     * @param string $event        Event type
     * @param array  $payment_data Payment data
     * @return bool|WP_Error
     */
    private function process_event($event, $payment_data) {
        switch ($event) {
            case 'payment.completed':
                return $this->handle_payment_completed($payment_data);

            case 'payment.failed':
                return $this->handle_payment_failed($payment_data);

            case 'payment.cancelled':
                return $this->handle_payment_cancelled($payment_data);

            case 'payment.expired':
                return $this->handle_payment_expired($payment_data);

            case 'payment.pending':
                return $this->handle_payment_pending($payment_data);

            case 'refund.completed':
                return $this->handle_refund_completed($payment_data);

            case 'refund.failed':
                return $this->handle_refund_failed($payment_data);

            default:
                $this->gateway->log('Unknown webhook event: ' . $event);
                return true; // Don't fail for unknown events
        }
    }

    /**
     * Get order from payment data
     *
     * @param array $payment_data Payment data
     * @return WC_Order|WP_Error
     */
    private function get_order($payment_data) {
        // Try to get order ID from metadata
        $order_id = isset($payment_data['metadata']['order_id']) ? absint($payment_data['metadata']['order_id']) : 0;

        if ($order_id) {
            $order = wc_get_order($order_id);
            if ($order) {
                // Verify order key if present
                if (isset($payment_data['metadata']['order_key'])) {
                    if ($order->get_order_key() !== $payment_data['metadata']['order_key']) {
                        return new WP_Error('invalid_order', 'Order key mismatch');
                    }
                }
                return $order;
            }
        }

        // Fallback: Try to find by payment ID
        $payment_id = isset($payment_data['id']) ? sanitize_text_field($payment_data['id']) : '';
        if ($payment_id) {
            $orders = wc_get_orders(array(
                'meta_key'   => '_bicrypto_payment_id',
                'meta_value' => $payment_id,
                'limit'      => 1,
            ));

            if (!empty($orders)) {
                return $orders[0];
            }
        }

        // Fallback: Try to find by merchant order ID
        $merchant_order_id = isset($payment_data['merchantOrderId']) ? absint($payment_data['merchantOrderId']) : 0;
        if ($merchant_order_id) {
            $order = wc_get_order($merchant_order_id);
            if ($order) {
                return $order;
            }
        }

        return new WP_Error('order_not_found', 'Order not found');
    }

    /**
     * Handle payment completed event
     *
     * @param array $payment_data Payment data
     * @return bool|WP_Error
     */
    private function handle_payment_completed($payment_data) {
        $order = $this->get_order($payment_data);

        if (is_wp_error($order)) {
            return $order;
        }

        // Check if already processed
        if ($order->has_status(array('completed', 'processing'))) {
            $this->gateway->log('Order already processed: ' . $order->get_id());
            return true;
        }

        $payment_id = isset($payment_data['id']) ? sanitize_text_field($payment_data['id']) : '';
        $transaction_id = isset($payment_data['transactionId']) ? sanitize_text_field($payment_data['transactionId']) : $payment_id;
        $wallet_type = isset($payment_data['walletType']) ? sanitize_text_field($payment_data['walletType']) : '';
        $currency = isset($payment_data['currency']) ? sanitize_text_field($payment_data['currency']) : '';
        $amount = isset($payment_data['amount']) ? floatval($payment_data['amount']) : 0;

        // Complete payment
        $order->payment_complete($transaction_id);

        // Update meta
        $order->update_meta_data('_bicrypto_transaction_id', $transaction_id);
        if ($wallet_type) {
            $order->update_meta_data('_bicrypto_payment_wallet_type', $wallet_type);
        }
        if ($currency) {
            $order->update_meta_data('_bicrypto_payment_currency', $currency);
        }
        $order->save();

        // Add detailed order note
        $note = sprintf(
            __('Bicrypto payment completed.%sPayment ID: %s%sTransaction ID: %s', 'bicrypto-gateway'),
            "\n",
            $payment_id,
            "\n",
            $transaction_id
        );

        if ($wallet_type) {
            $note .= sprintf("\n" . __('Wallet Type: %s', 'bicrypto-gateway'), $wallet_type);
        }

        if ($currency && $amount) {
            $note .= sprintf("\n" . __('Paid: %s %s', 'bicrypto-gateway'), $amount, $currency);
        }

        $order->add_order_note($note);

        $this->gateway->log('Payment completed for order: ' . $order->get_id());

        // Trigger action for extensions
        do_action('bicrypto_payment_completed', $order, $payment_data);

        return true;
    }

    /**
     * Handle payment failed event
     *
     * @param array $payment_data Payment data
     * @return bool|WP_Error
     */
    private function handle_payment_failed($payment_data) {
        $order = $this->get_order($payment_data);

        if (is_wp_error($order)) {
            return $order;
        }

        if ($order->has_status(array('failed', 'cancelled'))) {
            return true;
        }

        $reason = isset($payment_data['failureReason']) ? sanitize_text_field($payment_data['failureReason']) : '';
        $note = __('Bicrypto payment failed.', 'bicrypto-gateway');
        if ($reason) {
            $note .= ' ' . sprintf(__('Reason: %s', 'bicrypto-gateway'), $reason);
        }

        $order->update_status('failed', $note);

        $this->gateway->log('Payment failed for order: ' . $order->get_id());

        do_action('bicrypto_payment_failed', $order, $payment_data);

        return true;
    }

    /**
     * Handle payment cancelled event
     *
     * @param array $payment_data Payment data
     * @return bool|WP_Error
     */
    private function handle_payment_cancelled($payment_data) {
        $order = $this->get_order($payment_data);

        if (is_wp_error($order)) {
            return $order;
        }

        if ($order->has_status('cancelled')) {
            return true;
        }

        $order->update_status('cancelled', __('Payment cancelled via Bicrypto.', 'bicrypto-gateway'));

        $this->gateway->log('Payment cancelled for order: ' . $order->get_id());

        do_action('bicrypto_payment_cancelled', $order, $payment_data);

        return true;
    }

    /**
     * Handle payment expired event
     *
     * @param array $payment_data Payment data
     * @return bool|WP_Error
     */
    private function handle_payment_expired($payment_data) {
        $order = $this->get_order($payment_data);

        if (is_wp_error($order)) {
            return $order;
        }

        if ($order->has_status(array('failed', 'cancelled'))) {
            return true;
        }

        $order->update_status('failed', __('Payment expired.', 'bicrypto-gateway'));

        $this->gateway->log('Payment expired for order: ' . $order->get_id());

        do_action('bicrypto_payment_expired', $order, $payment_data);

        return true;
    }

    /**
     * Handle payment pending event
     *
     * @param array $payment_data Payment data
     * @return bool|WP_Error
     */
    private function handle_payment_pending($payment_data) {
        $order = $this->get_order($payment_data);

        if (is_wp_error($order)) {
            return $order;
        }

        // Update status to our custom pending status
        if (!$order->has_status(array('bicrypto-pending', 'processing', 'completed'))) {
            $order->update_status('bicrypto-pending', __('Awaiting Bicrypto payment confirmation.', 'bicrypto-gateway'));
        }

        $this->gateway->log('Payment pending for order: ' . $order->get_id());

        return true;
    }

    /**
     * Handle refund completed event
     *
     * @param array $refund_data Refund data
     * @return bool|WP_Error
     */
    private function handle_refund_completed($refund_data) {
        $payment_id = isset($refund_data['paymentId']) ? sanitize_text_field($refund_data['paymentId']) : '';

        if (!$payment_id) {
            return new WP_Error('invalid_refund', 'Missing payment ID');
        }

        // Find order by payment ID
        $orders = wc_get_orders(array(
            'meta_key'   => '_bicrypto_payment_id',
            'meta_value' => $payment_id,
            'limit'      => 1,
        ));

        if (empty($orders)) {
            return new WP_Error('order_not_found', 'Order not found for refund');
        }

        $order = $orders[0];
        $refund_amount = isset($refund_data['amount']) ? floatval($refund_data['amount']) : 0;
        $refund_id = isset($refund_data['id']) ? sanitize_text_field($refund_data['id']) : '';

        // Check if this refund was initiated from WooCommerce
        $existing_refund_id = $order->get_meta('_bicrypto_refund_id');
        if ($existing_refund_id === $refund_id) {
            $this->gateway->log('Refund already processed (initiated from WooCommerce): ' . $refund_id);
            return true;
        }

        // Create WooCommerce refund for externally initiated refunds
        $refund = wc_create_refund(array(
            'order_id'       => $order->get_id(),
            'amount'         => $refund_amount,
            'reason'         => sprintf(__('Refund via Bicrypto. Refund ID: %s', 'bicrypto-gateway'), $refund_id),
            'refund_payment' => false, // Already processed on Bicrypto
        ));

        if (is_wp_error($refund)) {
            $this->gateway->log('Failed to create refund: ' . $refund->get_error_message(), 'error');
            return $refund;
        }

        $order->add_order_note(
            sprintf(
                __('Refund processed via Bicrypto webhook.%sAmount: %s%sRefund ID: %s', 'bicrypto-gateway'),
                "\n",
                wc_price($refund_amount),
                "\n",
                $refund_id
            )
        );

        $this->gateway->log('Refund completed for order: ' . $order->get_id());

        do_action('bicrypto_refund_completed', $order, $refund_data, $refund);

        return true;
    }

    /**
     * Handle refund failed event
     *
     * @param array $refund_data Refund data
     * @return bool|WP_Error
     */
    private function handle_refund_failed($refund_data) {
        $payment_id = isset($refund_data['paymentId']) ? sanitize_text_field($refund_data['paymentId']) : '';

        if (!$payment_id) {
            return new WP_Error('invalid_refund', 'Missing payment ID');
        }

        $orders = wc_get_orders(array(
            'meta_key'   => '_bicrypto_payment_id',
            'meta_value' => $payment_id,
            'limit'      => 1,
        ));

        if (!empty($orders)) {
            $order = $orders[0];
            $reason = isset($refund_data['failureReason']) ? sanitize_text_field($refund_data['failureReason']) : __('Unknown error', 'bicrypto-gateway');

            $order->add_order_note(
                sprintf(__('Bicrypto refund failed: %s', 'bicrypto-gateway'), $reason)
            );

            $this->gateway->log('Refund failed for order: ' . $order->get_id() . ' - Reason: ' . $reason, 'error');

            do_action('bicrypto_refund_failed', $order, $refund_data);
        }

        return true;
    }
}
