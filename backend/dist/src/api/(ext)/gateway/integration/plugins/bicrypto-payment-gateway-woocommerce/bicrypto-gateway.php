<?php
/**
 * Plugin Name: Bicrypto Payment Gateway for WooCommerce
 * Plugin URI: https://bicrypto.io
 * Description: Accept FIAT, Crypto, and ECO token payments through Bicrypto payment gateway in your WooCommerce store.
 * Version: 2.0.0
 * Author: Bicrypto
 * Author URI: https://bicrypto.io
 * License: GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: bicrypto-gateway
 * Domain Path: /languages
 * Requires at least: 5.8
 * Tested up to: 6.5
 * WC requires at least: 7.0
 * WC tested up to: 9.0
 */

if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BICRYPTO_GATEWAY_VERSION', '2.0.0');
define('BICRYPTO_GATEWAY_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BICRYPTO_GATEWAY_PLUGIN_URL', plugin_dir_url(__FILE__));
define('BICRYPTO_GATEWAY_PLUGIN_FILE', __FILE__);

/**
 * Check if WooCommerce is active
 */
function bicrypto_gateway_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', 'bicrypto_gateway_woocommerce_missing_notice');
        return false;
    }
    return true;
}

/**
 * WooCommerce missing notice
 */
function bicrypto_gateway_woocommerce_missing_notice() {
    ?>
    <div class="error">
        <p><?php _e('Bicrypto Payment Gateway requires WooCommerce to be installed and active.', 'bicrypto-gateway'); ?></p>
    </div>
    <?php
}

/**
 * Initialize the gateway
 */
function bicrypto_gateway_init() {
    if (!bicrypto_gateway_check_woocommerce()) {
        return;
    }

    // Load text domain
    load_plugin_textdomain('bicrypto-gateway', false, dirname(plugin_basename(__FILE__)) . '/languages');

    // Include the gateway class
    require_once BICRYPTO_GATEWAY_PLUGIN_DIR . 'includes/class-bicrypto-gateway.php';
    require_once BICRYPTO_GATEWAY_PLUGIN_DIR . 'includes/class-bicrypto-webhook-handler.php';
    require_once BICRYPTO_GATEWAY_PLUGIN_DIR . 'includes/class-bicrypto-admin.php';

    // Add the gateway to WooCommerce
    add_filter('woocommerce_payment_gateways', 'bicrypto_add_gateway_class');

    // Initialize admin features
    if (is_admin()) {
        new WC_Bicrypto_Admin();
    }
}
add_action('plugins_loaded', 'bicrypto_gateway_init', 11);

/**
 * Add gateway class to WooCommerce
 */
function bicrypto_add_gateway_class($gateways) {
    $gateways[] = 'WC_Bicrypto_Gateway';
    return $gateways;
}

/**
 * Add settings link to plugin page
 */
function bicrypto_gateway_plugin_links($links) {
    $plugin_links = array(
        '<a href="' . admin_url('admin.php?page=wc-settings&tab=checkout&section=bicrypto') . '">' . __('Settings', 'bicrypto-gateway') . '</a>',
        '<a href="' . admin_url('admin.php?page=bicrypto-gateway-logs') . '">' . __('Logs', 'bicrypto-gateway') . '</a>',
    );
    return array_merge($plugin_links, $links);
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'bicrypto_gateway_plugin_links');

/**
 * Add meta links to plugin page
 */
function bicrypto_gateway_plugin_row_meta($links, $file) {
    if (plugin_basename(__FILE__) === $file) {
        $row_meta = array(
            'docs' => '<a href="https://docs.bicrypto.io/woocommerce" target="_blank">' . __('Documentation', 'bicrypto-gateway') . '</a>',
            'support' => '<a href="https://support.bicrypto.io" target="_blank">' . __('Support', 'bicrypto-gateway') . '</a>',
        );
        return array_merge($links, $row_meta);
    }
    return $links;
}
add_filter('plugin_row_meta', 'bicrypto_gateway_plugin_row_meta', 10, 2);

/**
 * Declare HPOS and Block Checkout compatibility
 */
add_action('before_woocommerce_init', function() {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('cart_checkout_blocks', __FILE__, true);
    }
});

/**
 * Register payment method for WooCommerce Blocks
 */
add_action('woocommerce_blocks_loaded', 'bicrypto_gateway_blocks_support');
function bicrypto_gateway_blocks_support() {
    if (!class_exists('Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType')) {
        return;
    }

    require_once BICRYPTO_GATEWAY_PLUGIN_DIR . 'includes/class-bicrypto-blocks-support.php';

    add_action(
        'woocommerce_blocks_payment_method_type_registration',
        function(Automattic\WooCommerce\Blocks\Payments\PaymentMethodRegistry $payment_method_registry) {
            $payment_method_registry->register(new WC_Bicrypto_Blocks_Support());
        }
    );
}

/**
 * AJAX handler for testing connection
 */
add_action('wp_ajax_bicrypto_test_connection', 'bicrypto_ajax_test_connection');
function bicrypto_ajax_test_connection() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'bicrypto_test_connection')) {
        wp_send_json_error(array('message' => __('Security check failed.', 'bicrypto-gateway')));
    }

    // Check permissions
    if (!current_user_can('manage_woocommerce')) {
        wp_send_json_error(array('message' => __('Permission denied.', 'bicrypto-gateway')));
    }

    $api_url = isset($_POST['api_url']) ? sanitize_text_field($_POST['api_url']) : '';
    $secret_key = isset($_POST['secret_key']) ? sanitize_text_field($_POST['secret_key']) : '';

    if (empty($api_url) || empty($secret_key)) {
        wp_send_json_error(array('message' => __('API URL and Secret Key are required.', 'bicrypto-gateway')));
    }

    // Test the connection by calling the validate endpoint
    $endpoint = rtrim($api_url, '/') . '/api/gateway/v1/validate';

    $response = wp_remote_get($endpoint, array(
        'timeout' => 30,
        'headers' => array(
            'X-API-Key' => $secret_key,
            'Content-Type' => 'application/json',
        ),
    ));

    if (is_wp_error($response)) {
        wp_send_json_error(array(
            'message' => sprintf(__('Connection failed: %s', 'bicrypto-gateway'), $response->get_error_message()),
        ));
    }

    $status_code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status_code === 200) {
        $result = array(
            'message' => __('Connection successful!', 'bicrypto-gateway'),
            'merchant' => isset($body['merchant']) ? $body['merchant'] : null,
            'permissions' => isset($body['permissions']) ? $body['permissions'] : null,
            'mode' => isset($body['mode']) ? $body['mode'] : null,
            'walletTypes' => isset($body['walletTypes']) ? $body['walletTypes'] : null,
            'currencies' => isset($body['currencies']) ? $body['currencies'] : null,
        );
        wp_send_json_success($result);
    } elseif ($status_code === 401) {
        wp_send_json_error(array('message' => __('Invalid API key.', 'bicrypto-gateway')));
    } elseif ($status_code === 403) {
        $msg = isset($body['message']) ? $body['message'] : __('Access denied.', 'bicrypto-gateway');
        wp_send_json_error(array('message' => $msg));
    } else {
        $msg = isset($body['message']) ? $body['message'] : __('Unknown error occurred.', 'bicrypto-gateway');
        wp_send_json_error(array('message' => sprintf(__('Error (%d): %s', 'bicrypto-gateway'), $status_code, $msg)));
    }
}

/**
 * AJAX handler for fetching available wallets
 */
add_action('wp_ajax_bicrypto_get_wallets', 'bicrypto_ajax_get_wallets');
add_action('wp_ajax_nopriv_bicrypto_get_wallets', 'bicrypto_ajax_get_wallets');
function bicrypto_ajax_get_wallets() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'bicrypto_checkout')) {
        wp_send_json_error(array('message' => __('Security check failed.', 'bicrypto-gateway')));
    }

    $gateway = WC()->payment_gateways->payment_gateways()['bicrypto'] ?? null;
    if (!$gateway) {
        wp_send_json_error(array('message' => __('Gateway not available.', 'bicrypto-gateway')));
    }

    $wallets = $gateway->get_available_wallets();
    if (is_wp_error($wallets)) {
        wp_send_json_error(array('message' => $wallets->get_error_message()));
    }

    wp_send_json_success($wallets);
}

/**
 * AJAX handler for checking payment status
 */
add_action('wp_ajax_bicrypto_check_payment_status', 'bicrypto_ajax_check_payment_status');
add_action('wp_ajax_nopriv_bicrypto_check_payment_status', 'bicrypto_ajax_check_payment_status');
function bicrypto_ajax_check_payment_status() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'bicrypto_checkout')) {
        wp_send_json_error(array('message' => __('Security check failed.', 'bicrypto-gateway')));
    }

    $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
    if (!$order_id) {
        wp_send_json_error(array('message' => __('Invalid order ID.', 'bicrypto-gateway')));
    }

    $order = wc_get_order($order_id);
    if (!$order) {
        wp_send_json_error(array('message' => __('Order not found.', 'bicrypto-gateway')));
    }

    // Verify order belongs to current user or session
    if (is_user_logged_in()) {
        if ($order->get_user_id() !== get_current_user_id()) {
            wp_send_json_error(array('message' => __('Access denied.', 'bicrypto-gateway')));
        }
    } else {
        // For guest checkout, verify by order key
        $order_key = isset($_POST['order_key']) ? sanitize_text_field($_POST['order_key']) : '';
        if ($order->get_order_key() !== $order_key) {
            wp_send_json_error(array('message' => __('Access denied.', 'bicrypto-gateway')));
        }
    }

    $gateway = WC()->payment_gateways->payment_gateways()['bicrypto'] ?? null;
    if (!$gateway) {
        wp_send_json_error(array('message' => __('Gateway not available.', 'bicrypto-gateway')));
    }

    $payment_id = $order->get_meta('_bicrypto_payment_id');
    if (!$payment_id) {
        wp_send_json_error(array('message' => __('Payment not found.', 'bicrypto-gateway')));
    }

    $status = $gateway->get_payment_status($payment_id);
    if (is_wp_error($status)) {
        wp_send_json_error(array('message' => $status->get_error_message()));
    }

    wp_send_json_success(array(
        'status' => $status['status'],
        'order_status' => $order->get_status(),
        'redirect_url' => $status['status'] === 'COMPLETED' ? $gateway->get_return_url($order) : null,
    ));
}

/**
 * Enqueue admin scripts for gateway settings
 */
add_action('admin_enqueue_scripts', 'bicrypto_gateway_admin_scripts');
function bicrypto_gateway_admin_scripts($hook) {
    // Only load on WooCommerce settings page
    if ('woocommerce_page_wc-settings' !== $hook) {
        return;
    }

    // Check if we're on the Bicrypto section
    if (!isset($_GET['section']) || $_GET['section'] !== 'bicrypto') {
        return;
    }

    wp_enqueue_style(
        'bicrypto-gateway-admin',
        BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/css/admin.css',
        array(),
        BICRYPTO_GATEWAY_VERSION
    );

    wp_enqueue_script(
        'bicrypto-gateway-admin',
        BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/js/admin.js',
        array('jquery'),
        BICRYPTO_GATEWAY_VERSION,
        true
    );

    wp_localize_script('bicrypto-gateway-admin', 'bicryptoGateway', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('bicrypto_test_connection'),
        'testingText' => __('Testing...', 'bicrypto-gateway'),
        'testConnectionText' => __('Test Connection', 'bicrypto-gateway'),
        'i18n' => array(
            'connectionSuccess' => __('Connection successful!', 'bicrypto-gateway'),
            'connectionFailed' => __('Connection failed', 'bicrypto-gateway'),
            'enterApiUrl' => __('Please enter the API URL first.', 'bicrypto-gateway'),
            'enterSecretKey' => __('Please enter the Secret Key first.', 'bicrypto-gateway'),
            'testMode' => __('Test', 'bicrypto-gateway'),
            'liveMode' => __('Live', 'bicrypto-gateway'),
        ),
    ));
}

/**
 * Enqueue frontend scripts
 */
add_action('wp_enqueue_scripts', 'bicrypto_gateway_frontend_scripts');
function bicrypto_gateway_frontend_scripts() {
    if (!is_checkout() && !is_wc_endpoint_url('order-pay')) {
        return;
    }

    $gateway = WC()->payment_gateways ? (WC()->payment_gateways->payment_gateways()['bicrypto'] ?? null) : null;
    if (!$gateway || !$gateway->is_available()) {
        return;
    }

    wp_enqueue_style(
        'bicrypto-gateway-checkout',
        BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/css/checkout.css',
        array(),
        BICRYPTO_GATEWAY_VERSION
    );

    wp_enqueue_script(
        'bicrypto-gateway-checkout',
        BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/js/checkout.js',
        array('jquery'),
        BICRYPTO_GATEWAY_VERSION,
        true
    );

    wp_localize_script('bicrypto-gateway-checkout', 'bicryptoCheckout', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('bicrypto_checkout'),
        'i18n' => array(
            'selectWallet' => __('Select a wallet to pay with', 'bicrypto-gateway'),
            'loading' => __('Loading wallets...', 'bicrypto-gateway'),
            'error' => __('Failed to load wallets', 'bicrypto-gateway'),
            'noWallets' => __('No wallets available', 'bicrypto-gateway'),
            'insufficientBalance' => __('Insufficient balance', 'bicrypto-gateway'),
        ),
    ));
}

/**
 * Add custom order status for Bicrypto payments
 */
add_action('init', 'bicrypto_gateway_register_order_status');
function bicrypto_gateway_register_order_status() {
    register_post_status('wc-bicrypto-pending', array(
        'label' => _x('Awaiting Bicrypto Payment', 'Order status', 'bicrypto-gateway'),
        'public' => true,
        'exclude_from_search' => false,
        'show_in_admin_all_list' => true,
        'show_in_admin_status_list' => true,
        'label_count' => _n_noop(
            'Awaiting Bicrypto <span class="count">(%s)</span>',
            'Awaiting Bicrypto <span class="count">(%s)</span>',
            'bicrypto-gateway'
        ),
    ));
}

add_filter('wc_order_statuses', 'bicrypto_gateway_add_order_status');
function bicrypto_gateway_add_order_status($order_statuses) {
    $new_order_statuses = array();
    foreach ($order_statuses as $key => $status) {
        $new_order_statuses[$key] = $status;
        if ('wc-pending' === $key) {
            $new_order_statuses['wc-bicrypto-pending'] = _x('Awaiting Bicrypto Payment', 'Order status', 'bicrypto-gateway');
        }
    }
    return $new_order_statuses;
}

/**
 * Add order status colors
 */
add_action('admin_head', 'bicrypto_gateway_order_status_colors');
function bicrypto_gateway_order_status_colors() {
    echo '<style>
        .order-status.status-bicrypto-pending {
            background: #f8dda7;
            color: #94660c;
        }
    </style>';
}

/**
 * Schedule cron for checking pending payments
 */
register_activation_hook(__FILE__, 'bicrypto_gateway_activate');
function bicrypto_gateway_activate() {
    if (!wp_next_scheduled('bicrypto_check_pending_payments')) {
        wp_schedule_event(time(), 'hourly', 'bicrypto_check_pending_payments');
    }
}

register_deactivation_hook(__FILE__, 'bicrypto_gateway_deactivate');
function bicrypto_gateway_deactivate() {
    wp_clear_scheduled_hook('bicrypto_check_pending_payments');
}

add_action('bicrypto_check_pending_payments', 'bicrypto_gateway_check_pending_payments');
function bicrypto_gateway_check_pending_payments() {
    $gateway = WC()->payment_gateways ? (WC()->payment_gateways->payment_gateways()['bicrypto'] ?? null) : null;
    if (!$gateway) {
        return;
    }

    // Get orders with bicrypto-pending status older than 1 hour
    $orders = wc_get_orders(array(
        'status' => array('bicrypto-pending', 'pending'),
        'payment_method' => 'bicrypto',
        'date_created' => '<' . (time() - HOUR_IN_SECONDS),
        'limit' => 50,
    ));

    foreach ($orders as $order) {
        $payment_id = $order->get_meta('_bicrypto_payment_id');
        if (!$payment_id) {
            continue;
        }

        $status = $gateway->get_payment_status($payment_id);
        if (is_wp_error($status)) {
            continue;
        }

        switch ($status['status']) {
            case 'COMPLETED':
                $order->payment_complete($payment_id);
                $order->add_order_note(__('Payment confirmed via status check.', 'bicrypto-gateway'));
                break;
            case 'FAILED':
            case 'EXPIRED':
                $order->update_status('failed', sprintf(__('Payment %s.', 'bicrypto-gateway'), strtolower($status['status'])));
                break;
            case 'CANCELLED':
                $order->update_status('cancelled', __('Payment cancelled.', 'bicrypto-gateway'));
                break;
        }
    }
}
