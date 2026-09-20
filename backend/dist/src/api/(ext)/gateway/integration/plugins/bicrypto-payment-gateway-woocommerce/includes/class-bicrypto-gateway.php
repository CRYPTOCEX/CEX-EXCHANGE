<?php
/**
 * Bicrypto Payment Gateway Class
 *
 * @package Bicrypto_Gateway
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WC_Bicrypto_Gateway class
 */
class WC_Bicrypto_Gateway extends WC_Payment_Gateway {

    /**
     * API URL
     *
     * @var string
     */
    private $api_url;

    /**
     * Public API Key
     *
     * @var string
     */
    private $public_key;

    /**
     * Secret API Key
     *
     * @var string
     */
    private $secret_key;

    /**
     * Test mode
     *
     * @var bool
     */
    private $testmode;

    /**
     * Debug mode
     *
     * @var bool
     */
    private $debug;

    /**
     * Logger
     *
     * @var WC_Logger
     */
    private $log;

    /**
     * Constructor
     */
    public function __construct() {
        $this->id                 = 'bicrypto';
        $this->has_fields         = true;
        $this->method_title       = __('Bicrypto', 'bicrypto-gateway');
        $this->method_description = __('Accept FIAT, Crypto, and ECO token payments through Bicrypto. Customers select their preferred payment method on the Bicrypto checkout page.', 'bicrypto-gateway');
        $this->supports           = array(
            'products',
            'refunds',
        );

        // Load the settings
        $this->init_form_fields();
        $this->init_settings();

        // Define user set variables
        $this->title              = $this->get_option('title');
        $this->description        = $this->get_option('description');
        $this->testmode           = 'yes' === $this->get_option('testmode');
        $this->debug              = 'yes' === $this->get_option('debug');
        $this->api_url            = rtrim($this->get_option('api_url'), '/');
        $this->public_key         = $this->testmode ? $this->get_option('test_public_key') : $this->get_option('live_public_key');
        $this->secret_key         = $this->testmode ? $this->get_option('test_secret_key') : $this->get_option('live_secret_key');

        // Set icon from API URL or fallback to local
        $this->icon = $this->get_gateway_icon();

        // Logger
        if ($this->debug) {
            $this->log = wc_get_logger();
        }

        // Actions
        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_api_bicrypto_webhook', array($this, 'webhook_handler'));
        add_action('woocommerce_api_bicrypto_return', array($this, 'return_handler'));
    }

    /**
     * Get the gateway icon URL
     *
     * @return string
     */
    private function get_gateway_icon() {
        if (!empty($this->api_url)) {
            $icon_url = $this->api_url . '/img/logo/logo.png';
            return apply_filters('woocommerce_bicrypto_icon', $icon_url);
        }
        $local_icon = BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/images/icon.png';
        return apply_filters('woocommerce_bicrypto_icon', $local_icon);
    }

    /**
     * Logging method
     *
     * @param string $message Log message
     * @param string $level   Log level
     */
    public function log($message, $level = 'info') {
        if ($level === 'error' || $this->debug) {
            if (!$this->log) {
                $this->log = wc_get_logger();
            }
            if ($this->log) {
                $this->log->log($level, $message, array('source' => 'bicrypto-gateway'));
            }
        }
    }

    /**
     * Initialize gateway settings form fields
     */
    public function init_form_fields() {
        $webhook_url = add_query_arg('wc-api', 'bicrypto_webhook', home_url('/'));
        $return_url = add_query_arg('wc-api', 'bicrypto_return', home_url('/'));

        $this->form_fields = array(
            'enabled' => array(
                'title'   => __('Enable/Disable', 'bicrypto-gateway'),
                'type'    => 'checkbox',
                'label'   => __('Enable Bicrypto Payment Gateway', 'bicrypto-gateway'),
                'default' => 'no',
            ),
            'callback_urls' => array(
                'title'       => __('Callback URLs', 'bicrypto-gateway'),
                'type'        => 'title',
                'description' => sprintf(
                    '<div class="bicrypto-callback-urls">
                        <p><strong>%s</strong></p>
                        <div class="bicrypto-url-box">
                            <label>%s</label>
                            <code id="bicrypto-webhook-url">%s</code>
                            <button type="button" class="button bicrypto-copy-btn" data-target="bicrypto-webhook-url">%s</button>
                        </div>
                        <div class="bicrypto-url-box">
                            <label>%s</label>
                            <code id="bicrypto-return-url">%s</code>
                            <button type="button" class="button bicrypto-copy-btn" data-target="bicrypto-return-url">%s</button>
                        </div>
                    </div>',
                    __('Copy these URLs to your Bicrypto Merchant Dashboard:', 'bicrypto-gateway'),
                    __('Webhook URL:', 'bicrypto-gateway'),
                    esc_url($webhook_url),
                    __('Copy', 'bicrypto-gateway'),
                    __('Return URL:', 'bicrypto-gateway'),
                    esc_url($return_url),
                    __('Copy', 'bicrypto-gateway')
                ),
            ),
            'title' => array(
                'title'       => __('Title', 'bicrypto-gateway'),
                'type'        => 'text',
                'description' => __('Payment method title shown at checkout.', 'bicrypto-gateway'),
                'default'     => __('Pay with Bicrypto', 'bicrypto-gateway'),
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __('Description', 'bicrypto-gateway'),
                'type'        => 'textarea',
                'description' => __('Payment method description shown at checkout.', 'bicrypto-gateway'),
                'default'     => __('Pay securely using FIAT, Crypto, or ECO tokens from your Bicrypto wallet.', 'bicrypto-gateway'),
                'desc_tip'    => true,
            ),
            'api_settings' => array(
                'title'       => __('API Settings', 'bicrypto-gateway'),
                'type'        => 'title',
                'description' => '',
            ),
            'api_url' => array(
                'title'       => __('API URL', 'bicrypto-gateway'),
                'type'        => 'text',
                'description' => __('Your Bicrypto platform URL (e.g., https://yoursite.com)', 'bicrypto-gateway'),
                'default'     => '',
                'desc_tip'    => true,
                'custom_attributes' => array(
                    'autocomplete' => 'off',
                ),
            ),
            'testmode' => array(
                'title'       => __('Test mode', 'bicrypto-gateway'),
                'label'       => __('Enable Test Mode', 'bicrypto-gateway'),
                'type'        => 'checkbox',
                'description' => __('Use test API keys for testing payments.', 'bicrypto-gateway'),
                'default'     => 'yes',
                'desc_tip'    => true,
            ),
            'test_public_key' => array(
                'title'       => __('Test Public Key', 'bicrypto-gateway'),
                'type'        => 'text',
                'description' => __('Your test public API key.', 'bicrypto-gateway'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'test_secret_key' => array(
                'title'       => __('Test Secret Key', 'bicrypto-gateway'),
                'type'        => 'password',
                'description' => __('Your test secret API key.', 'bicrypto-gateway'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'live_public_key' => array(
                'title'       => __('Live Public Key', 'bicrypto-gateway'),
                'type'        => 'text',
                'description' => __('Your live public API key.', 'bicrypto-gateway'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'live_secret_key' => array(
                'title'       => __('Live Secret Key', 'bicrypto-gateway'),
                'type'        => 'password',
                'description' => __('Your live secret API key.', 'bicrypto-gateway'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'webhook_secret' => array(
                'title'       => __('Webhook Secret', 'bicrypto-gateway'),
                'type'        => 'password',
                'description' => __('Secret for verifying webhook signatures.', 'bicrypto-gateway'),
                'default'     => '',
                'desc_tip'    => true,
            ),
            'advanced_settings' => array(
                'title'       => __('Advanced Settings', 'bicrypto-gateway'),
                'type'        => 'title',
                'description' => __('Wallet types and payment expiration are configured in your Bicrypto merchant dashboard.', 'bicrypto-gateway'),
            ),
            'debug' => array(
                'title'       => __('Debug Log', 'bicrypto-gateway'),
                'type'        => 'checkbox',
                'label'       => __('Enable debug logging', 'bicrypto-gateway'),
                'default'     => 'no',
                'description' => sprintf(
                    __('Log events to %s', 'bicrypto-gateway'),
                    '<code>' . WC_Log_Handler_File::get_log_file_path('bicrypto-gateway') . '</code>'
                ),
            ),
            'connection_test' => array(
                'title'       => __('Connection Test', 'bicrypto-gateway'),
                'type'        => 'title',
                'description' => __('Test your API connection after saving settings.', 'bicrypto-gateway'),
            ),
        );
    }

    /**
     * Check if gateway is available
     *
     * @return bool
     */
    public function is_available() {
        if ('yes' !== $this->enabled) {
            return false;
        }

        if (empty($this->api_url) || empty($this->public_key) || empty($this->secret_key)) {
            return false;
        }

        // Check minimum order amount if set
        $min_amount = floatval($this->get_option('min_order_amount', 0));
        if ($min_amount > 0 && WC()->cart) {
            if (WC()->cart->get_total('edit') < $min_amount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Payment fields displayed at checkout
     */
    public function payment_fields() {
        // Show test mode notice
        if ($this->testmode) {
            echo '<div style="background:#fff3cd;border-left:4px solid #ffc107;padding:10px 15px;margin-bottom:15px;font-size:0.9em;">';
            echo '<strong>' . esc_html__('Test Mode', 'bicrypto-gateway') . '</strong> - ';
            echo esc_html__('Payments will not be processed.', 'bicrypto-gateway');
            echo '</div>';
        }

        // Show description
        if ($this->description) {
            echo '<p>' . wp_kses_post($this->description) . '</p>';
        }

        // Note: Wallet type selection happens on the Bicrypto checkout page
        echo '<p style="color:#666;font-size:0.9em;">';
        echo esc_html__('You will be redirected to the Bicrypto checkout page to complete your payment.', 'bicrypto-gateway');
        echo '</p>';
    }

    /**
     * Process the payment
     *
     * @param int $order_id Order ID
     * @return array
     */
    public function process_payment($order_id) {
        $order = wc_get_order($order_id);

        $this->log('Processing payment for order ' . $order_id);

        try {
            // Create payment on Bicrypto
            $payment = $this->create_payment($order);

            if (is_wp_error($payment)) {
                throw new Exception($payment->get_error_message());
            }

            if (!isset($payment['checkoutUrl']) || empty($payment['checkoutUrl'])) {
                throw new Exception(__('Payment gateway did not return checkout URL', 'bicrypto-gateway'));
            }

            // Store payment data in order meta
            $order->update_meta_data('_bicrypto_payment_id', $payment['id']);
            $order->update_meta_data('_bicrypto_checkout_url', $payment['checkoutUrl']);
            if (isset($payment['expiresAt'])) {
                $order->update_meta_data('_bicrypto_expires_at', $payment['expiresAt']);
            }
            $order->save();

            // Add order note
            $order->add_order_note(
                sprintf(
                    __('Bicrypto payment initiated. Payment ID: %s', 'bicrypto-gateway'),
                    $payment['id']
                )
            );

            // Update order status
            $order->update_status('bicrypto-pending', __('Awaiting Bicrypto payment.', 'bicrypto-gateway'));

            $this->log('Payment created - ID: ' . $payment['id']);

            // Empty the cart
            WC()->cart->empty_cart();

            // Redirect to Bicrypto checkout
            return array(
                'result'   => 'success',
                'redirect' => $payment['checkoutUrl'],
            );
        } catch (Exception $e) {
            $this->log('Payment error: ' . $e->getMessage(), 'error');
            wc_add_notice($e->getMessage(), 'error');
            throw new Exception($e->getMessage());
        }
    }

    /**
     * Create payment on Bicrypto
     *
     * @param WC_Order $order Order object
     * @return array|WP_Error
     */
    private function create_payment($order) {
        if (empty($this->api_url)) {
            return new WP_Error('api_error', __('API URL is not configured.', 'bicrypto-gateway'));
        }

        if (empty($this->secret_key)) {
            return new WP_Error('api_error', __('Secret key is not configured.', 'bicrypto-gateway'));
        }

        $endpoint = $this->api_url . '/api/gateway/v1/payment/create';

        $return_url = add_query_arg(array(
            'wc-api'   => 'bicrypto_return',
            'order_id' => $order->get_id(),
            'status'   => 'success',
        ), home_url('/'));

        $cancel_url = add_query_arg(array(
            'wc-api'   => 'bicrypto_return',
            'order_id' => $order->get_id(),
            'status'   => 'cancel',
        ), home_url('/'));

        // Build line items
        $line_items = array();
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            $line_item = array(
                'name'        => $item->get_name(),
                'description' => $product ? wp_strip_all_tags(substr($product->get_short_description(), 0, 200)) : '',
                'quantity'    => $item->get_quantity(),
                'unitPrice'   => floatval($order->get_item_subtotal($item, false, true)),
            );

            if ($product) {
                $image_id = $product->get_image_id();
                if ($image_id) {
                    $image_url = wp_get_attachment_image_url($image_id, 'thumbnail');
                    if ($image_url) {
                        $line_item['imageUrl'] = $image_url;
                    }
                }
            }

            $line_items[] = $line_item;
        }

        // Add shipping
        $shipping_total = floatval($order->get_shipping_total());
        if ($shipping_total > 0) {
            $line_items[] = array(
                'name'        => __('Shipping', 'bicrypto-gateway'),
                'description' => $order->get_shipping_method(),
                'quantity'    => 1,
                'unitPrice'   => $shipping_total,
            );
        }

        // Add fees
        foreach ($order->get_fees() as $fee) {
            $line_items[] = array(
                'name'        => $fee->get_name(),
                'description' => '',
                'quantity'    => 1,
                'unitPrice'   => floatval($fee->get_total()),
            );
        }

        // Add tax if not included in prices
        if (!wc_prices_include_tax()) {
            $tax_total = floatval($order->get_total_tax());
            if ($tax_total > 0) {
                $line_items[] = array(
                    'name'        => __('Tax', 'bicrypto-gateway'),
                    'description' => '',
                    'quantity'    => 1,
                    'unitPrice'   => $tax_total,
                );
            }
        }

        $request_body = array(
            'amount'          => floatval($order->get_total()),
            'currency'        => $order->get_currency(),
            'merchantOrderId' => (string) $order->get_id(),
            'description'     => sprintf(__('Order #%s from %s', 'bicrypto-gateway'), $order->get_order_number(), get_bloginfo('name')),
            'customerEmail'   => $order->get_billing_email(),
            'customerName'    => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'returnUrl'       => $return_url,
            'cancelUrl'       => $cancel_url,
            'lineItems'       => $line_items,
            'metadata'        => array(
                'order_id'       => $order->get_id(),
                'order_key'      => $order->get_order_key(),
                'customer_name'  => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                'customer_email' => $order->get_billing_email(),
                'source'         => 'woocommerce',
                'plugin_version' => BICRYPTO_GATEWAY_VERSION,
                'site_url'       => home_url(),
            ),
        );

        $this->log('API Request: ' . wp_json_encode($request_body));

        $response = wp_remote_post($endpoint, array(
            'method'  => 'POST',
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key'    => $this->secret_key,
                'User-Agent'   => 'WooCommerce/' . WC()->version . ' Bicrypto-Gateway/' . BICRYPTO_GATEWAY_VERSION,
            ),
            'body'    => wp_json_encode($request_body),
        ));

        if (is_wp_error($response)) {
            $this->log('API Error: ' . $response->get_error_message(), 'error');
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $raw_body = wp_remote_retrieve_body($response);

        $this->log('API Response (' . $code . '): ' . substr($raw_body, 0, 1000));

        if (empty($raw_body)) {
            return new WP_Error('api_error', __('Empty response from API.', 'bicrypto-gateway'));
        }

        $response_body = json_decode($raw_body, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('api_error', __('Invalid JSON response from API.', 'bicrypto-gateway'));
        }

        if ($code !== 200 && $code !== 201) {
            $message = isset($response_body['message']) ? $response_body['message'] : __('Failed to create payment', 'bicrypto-gateway');
            return new WP_Error('api_error', $message);
        }

        return $response_body;
    }

    /**
     * Get payment status from Bicrypto
     *
     * @param string $payment_id Payment ID
     * @return array|WP_Error
     */
    public function get_payment_status($payment_id) {
        $endpoint = $this->api_url . '/api/gateway/v1/payment/' . $payment_id;

        $response = wp_remote_get($endpoint, array(
            'timeout' => 30,
            'headers' => array(
                'X-API-Key' => $this->secret_key,
            ),
        ));

        if (is_wp_error($response)) {
            return $response;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        return $body;
    }

    /**
     * Handle return from Bicrypto
     */
    public function return_handler() {
        $order_id = isset($_GET['order_id']) ? absint($_GET['order_id']) : 0;
        $status = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';

        $this->log('Return handler - Order: ' . $order_id . ', Status: ' . $status);

        if (!$order_id) {
            wp_redirect(wc_get_checkout_url());
            exit;
        }

        $order = wc_get_order($order_id);

        if (!$order) {
            wp_redirect(wc_get_checkout_url());
            exit;
        }

        if ($status === 'success') {
            $payment_id = $order->get_meta('_bicrypto_payment_id');

            if ($payment_id) {
                // Check payment status
                $payment_status = $this->get_payment_status($payment_id);

                if (!is_wp_error($payment_status)) {
                    switch ($payment_status['status']) {
                        case 'COMPLETED':
                            if (!$order->has_status(array('completed', 'processing'))) {
                                $order->payment_complete($payment_id);
                                $order->add_order_note(__('Payment confirmed on return.', 'bicrypto-gateway'));
                            }
                            break;
                        case 'PENDING':
                            // Payment still pending, redirect to thank you page
                            // Webhook will handle the completion
                            break;
                        case 'FAILED':
                        case 'EXPIRED':
                            $order->update_status('failed', sprintf(__('Payment %s.', 'bicrypto-gateway'), strtolower($payment_status['status'])));
                            wc_add_notice(__('Payment failed. Please try again.', 'bicrypto-gateway'), 'error');
                            wp_redirect(wc_get_checkout_url());
                            exit;
                    }
                }
            }

            wp_redirect($this->get_return_url($order));
            exit;
        } elseif ($status === 'cancel') {
            // Restore cart
            if (WC()->session) {
                WC()->session->set('order_awaiting_payment', $order_id);
            }

            foreach ($order->get_items() as $item) {
                $product = $item->get_product();
                if ($product) {
                    WC()->cart->add_to_cart($product->get_id(), $item->get_quantity());
                }
            }

            $order->update_status('cancelled', __('Payment cancelled by customer.', 'bicrypto-gateway'));
            wc_add_notice(__('Payment was cancelled. Your cart has been restored.', 'bicrypto-gateway'), 'notice');
            wp_redirect(wc_get_checkout_url());
            exit;
        }

        wp_redirect(wc_get_checkout_url());
        exit;
    }

    /**
     * Handle webhook from Bicrypto
     */
    public function webhook_handler() {
        $handler = new WC_Bicrypto_Webhook_Handler($this);
        $handler->handle();
    }

    /**
     * Process refund
     *
     * @param int    $order_id Order ID
     * @param float  $amount   Refund amount
     * @param string $reason   Refund reason
     * @return bool|WP_Error
     */
    public function process_refund($order_id, $amount = null, $reason = '') {
        $order = wc_get_order($order_id);

        if (!$order) {
            return new WP_Error('invalid_order', __('Order not found.', 'bicrypto-gateway'));
        }

        $payment_id = $order->get_meta('_bicrypto_payment_id');

        if (!$payment_id) {
            return new WP_Error('no_payment_id', __('No Bicrypto payment ID found.', 'bicrypto-gateway'));
        }

        $this->log('Processing refund for order ' . $order_id . ', amount: ' . $amount);

        $endpoint = $this->api_url . '/api/gateway/v1/refund';

        $body = array(
            'paymentId'   => $payment_id,
            'amount'      => floatval($amount),
            'reason'      => 'REQUESTED_BY_CUSTOMER',
            'description' => $reason ?: __('Refund requested from WooCommerce', 'bicrypto-gateway'),
            'metadata'    => array(
                'order_id' => $order_id,
                'source'   => 'woocommerce_admin',
            ),
        );

        $response = wp_remote_post($endpoint, array(
            'method'  => 'POST',
            'timeout' => 30,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-API-Key'    => $this->secret_key,
            ),
            'body'    => wp_json_encode($body),
        ));

        if (is_wp_error($response)) {
            $this->log('Refund error: ' . $response->get_error_message(), 'error');
            return $response;
        }

        $code = wp_remote_retrieve_response_code($response);
        $response_body = json_decode(wp_remote_retrieve_body($response), true);

        $this->log('Refund response (' . $code . '): ' . wp_json_encode($response_body));

        if ($code !== 200 && $code !== 201) {
            $message = isset($response_body['message']) ? $response_body['message'] : __('Refund failed', 'bicrypto-gateway');
            return new WP_Error('refund_error', $message);
        }

        $refund_id = isset($response_body['id']) ? $response_body['id'] : '';
        $order->update_meta_data('_bicrypto_refund_id', $refund_id);
        $order->save();

        $order->add_order_note(
            sprintf(
                __('Refund of %s processed via Bicrypto. Refund ID: %s', 'bicrypto-gateway'),
                wc_price($amount),
                $refund_id
            )
        );

        return true;
    }
}
