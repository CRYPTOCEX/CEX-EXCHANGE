<?php
/**
 * Bicrypto Admin Class
 *
 * @package Bicrypto_Gateway
 * @version 2.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * WC_Bicrypto_Admin class
 */
class WC_Bicrypto_Admin {

    /**
     * Constructor
     */
    public function __construct() {
        // Add Bicrypto column to orders list
        add_filter('manage_edit-shop_order_columns', array($this, 'add_order_column'), 20);
        add_filter('manage_woocommerce_page_wc-orders_columns', array($this, 'add_order_column'), 20);
        add_action('manage_shop_order_posts_custom_column', array($this, 'render_order_column'), 10, 2);
        add_action('manage_woocommerce_page_wc-orders_custom_column', array($this, 'render_order_column_hpos'), 10, 2);

        // Add meta box to order page
        add_action('add_meta_boxes', array($this, 'add_order_meta_box'));

        // Add admin menu for logs
        add_action('admin_menu', array($this, 'add_admin_menu'));

        // Add quick actions
        add_filter('woocommerce_admin_order_actions', array($this, 'add_order_actions'), 10, 2);

        // Handle AJAX actions
        add_action('wp_ajax_bicrypto_sync_payment', array($this, 'ajax_sync_payment'));
        add_action('wp_ajax_bicrypto_retry_payment', array($this, 'ajax_retry_payment'));
    }

    /**
     * Add Bicrypto column to orders list
     *
     * @param array $columns Columns
     * @return array
     */
    public function add_order_column($columns) {
        $new_columns = array();
        foreach ($columns as $key => $column) {
            $new_columns[$key] = $column;
            if ('order_status' === $key) {
                $new_columns['bicrypto_status'] = __('Bicrypto', 'bicrypto-gateway');
            }
        }
        return $new_columns;
    }

    /**
     * Render Bicrypto column content
     *
     * @param string $column  Column name
     * @param int    $post_id Post ID
     */
    public function render_order_column($column, $post_id) {
        if ('bicrypto_status' !== $column) {
            return;
        }

        $order = wc_get_order($post_id);
        $this->output_column_content($order);
    }

    /**
     * Render Bicrypto column content (HPOS)
     *
     * @param string   $column Column name
     * @param WC_Order $order  Order object
     */
    public function render_order_column_hpos($column, $order) {
        if ('bicrypto_status' !== $column) {
            return;
        }

        $this->output_column_content($order);
    }

    /**
     * Output column content
     *
     * @param WC_Order $order Order object
     */
    private function output_column_content($order) {
        if (!$order) {
            return;
        }

        if ($order->get_payment_method() !== 'bicrypto') {
            echo '—';
            return;
        }

        $payment_id = $order->get_meta('_bicrypto_payment_id');
        $wallet_type = $order->get_meta('_bicrypto_wallet_type');

        if (!$payment_id) {
            echo '<span class="bicrypto-status bicrypto-status-none">' . esc_html__('No payment', 'bicrypto-gateway') . '</span>';
            return;
        }

        $status_class = '';
        $status_text = '';

        if ($order->has_status(array('completed', 'processing'))) {
            $status_class = 'completed';
            $status_text = __('Paid', 'bicrypto-gateway');
        } elseif ($order->has_status('bicrypto-pending')) {
            $status_class = 'pending';
            $status_text = __('Awaiting', 'bicrypto-gateway');
        } elseif ($order->has_status('failed')) {
            $status_class = 'failed';
            $status_text = __('Failed', 'bicrypto-gateway');
        } elseif ($order->has_status('cancelled')) {
            $status_class = 'cancelled';
            $status_text = __('Cancelled', 'bicrypto-gateway');
        } else {
            $status_class = 'unknown';
            $status_text = __('Unknown', 'bicrypto-gateway');
        }

        echo '<div class="bicrypto-order-status">';
        echo '<span class="bicrypto-status bicrypto-status-' . esc_attr($status_class) . '">' . esc_html($status_text) . '</span>';
        if ($wallet_type) {
            echo '<small class="bicrypto-wallet-type">' . esc_html($wallet_type) . '</small>';
        }
        echo '</div>';

        // Add inline styles
        $this->output_column_styles();
    }

    /**
     * Output column styles (once)
     */
    private function output_column_styles() {
        static $styles_output = false;
        if ($styles_output) {
            return;
        }
        $styles_output = true;

        echo '<style>
            .bicrypto-order-status {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .bicrypto-status {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
            }
            .bicrypto-status-completed { background: #d4edda; color: #155724; }
            .bicrypto-status-pending { background: #fff3cd; color: #856404; }
            .bicrypto-status-failed { background: #f8d7da; color: #721c24; }
            .bicrypto-status-cancelled { background: #e2e3e5; color: #383d41; }
            .bicrypto-status-unknown { background: #f8f9fa; color: #6c757d; }
            .bicrypto-status-none { background: #f8f9fa; color: #6c757d; }
            .bicrypto-wallet-type {
                color: #666;
                font-size: 10px;
            }
        </style>';
    }

    /**
     * Add meta box to order page
     */
    public function add_order_meta_box() {
        $screen = wc_get_container()->get(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)->custom_orders_table_usage_is_enabled()
            ? wc_get_page_screen_id('shop-order')
            : 'shop_order';

        add_meta_box(
            'bicrypto-payment-details',
            __('Bicrypto Payment Details', 'bicrypto-gateway'),
            array($this, 'render_order_meta_box'),
            $screen,
            'side',
            'default'
        );
    }

    /**
     * Render order meta box
     *
     * @param WP_Post|WC_Order $post_or_order Post or order object
     */
    public function render_order_meta_box($post_or_order) {
        $order = $post_or_order instanceof WC_Order ? $post_or_order : wc_get_order($post_or_order->ID);

        if (!$order || $order->get_payment_method() !== 'bicrypto') {
            echo '<p>' . esc_html__('This order was not paid with Bicrypto.', 'bicrypto-gateway') . '</p>';
            return;
        }

        $payment_id = $order->get_meta('_bicrypto_payment_id');
        $wallet_type = $order->get_meta('_bicrypto_wallet_type');
        $transaction_id = $order->get_meta('_bicrypto_transaction_id');
        $checkout_url = $order->get_meta('_bicrypto_checkout_url');
        $expires_at = $order->get_meta('_bicrypto_expires_at');
        $refund_id = $order->get_meta('_bicrypto_refund_id');

        echo '<table class="bicrypto-payment-details" style="width: 100%;">';

        if ($payment_id) {
            echo '<tr><td><strong>' . esc_html__('Payment ID', 'bicrypto-gateway') . '</strong></td></tr>';
            echo '<tr><td><code style="word-break: break-all;">' . esc_html($payment_id) . '</code></td></tr>';
        }

        if ($transaction_id && $transaction_id !== $payment_id) {
            echo '<tr><td><strong>' . esc_html__('Transaction ID', 'bicrypto-gateway') . '</strong></td></tr>';
            echo '<tr><td><code style="word-break: break-all;">' . esc_html($transaction_id) . '</code></td></tr>';
        }

        if ($wallet_type) {
            echo '<tr><td><strong>' . esc_html__('Wallet Type', 'bicrypto-gateway') . '</strong></td></tr>';
            echo '<tr><td>' . esc_html($wallet_type) . '</td></tr>';
        }

        if ($expires_at) {
            $expires_timestamp = strtotime($expires_at);
            $is_expired = $expires_timestamp < time();
            echo '<tr><td><strong>' . esc_html__('Expires At', 'bicrypto-gateway') . '</strong></td></tr>';
            echo '<tr><td style="' . ($is_expired ? 'color: #dc3545;' : '') . '">';
            echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $expires_timestamp));
            if ($is_expired) {
                echo ' <em>(' . esc_html__('Expired', 'bicrypto-gateway') . ')</em>';
            }
            echo '</td></tr>';
        }

        if ($refund_id) {
            echo '<tr><td><strong>' . esc_html__('Refund ID', 'bicrypto-gateway') . '</strong></td></tr>';
            echo '<tr><td><code>' . esc_html($refund_id) . '</code></td></tr>';
        }

        echo '</table>';

        // Action buttons
        echo '<div style="margin-top: 15px;">';

        if ($payment_id && $order->has_status(array('bicrypto-pending', 'pending'))) {
            echo '<button type="button" class="button bicrypto-sync-payment" data-order-id="' . esc_attr($order->get_id()) . '">';
            echo esc_html__('Sync Payment Status', 'bicrypto-gateway');
            echo '</button> ';
        }

        if ($checkout_url && $order->has_status(array('bicrypto-pending', 'pending'))) {
            echo '<a href="' . esc_url($checkout_url) . '" target="_blank" class="button">';
            echo esc_html__('View Checkout', 'bicrypto-gateway');
            echo '</a>';
        }

        echo '</div>';

        // Add JavaScript for sync button
        ?>
        <script>
            jQuery(document).ready(function($) {
                $('.bicrypto-sync-payment').on('click', function() {
                    var $btn = $(this);
                    var orderId = $btn.data('order-id');

                    $btn.prop('disabled', true).text('<?php echo esc_js(__('Syncing...', 'bicrypto-gateway')); ?>');

                    $.ajax({
                        url: ajaxurl,
                        type: 'POST',
                        data: {
                            action: 'bicrypto_sync_payment',
                            order_id: orderId,
                            nonce: '<?php echo wp_create_nonce('bicrypto_admin'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                location.reload();
                            } else {
                                alert(response.data.message || '<?php echo esc_js(__('Sync failed', 'bicrypto-gateway')); ?>');
                                $btn.prop('disabled', false).text('<?php echo esc_js(__('Sync Payment Status', 'bicrypto-gateway')); ?>');
                            }
                        },
                        error: function() {
                            alert('<?php echo esc_js(__('Request failed', 'bicrypto-gateway')); ?>');
                            $btn.prop('disabled', false).text('<?php echo esc_js(__('Sync Payment Status', 'bicrypto-gateway')); ?>');
                        }
                    });
                });
            });
        </script>
        <?php
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            __('Bicrypto Gateway Logs', 'bicrypto-gateway'),
            __('Bicrypto Logs', 'bicrypto-gateway'),
            'manage_woocommerce',
            'bicrypto-gateway-logs',
            array($this, 'render_logs_page')
        );
    }

    /**
     * Render logs page
     */
    public function render_logs_page() {
        $log_file = WC_Log_Handler_File::get_log_file_path('bicrypto-gateway');
        $logs = '';

        if (file_exists($log_file)) {
            $logs = file_get_contents($log_file);
            // Limit to last 500 lines
            $lines = explode("\n", $logs);
            $lines = array_slice($lines, -500);
            $logs = implode("\n", $lines);
        }

        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Bicrypto Gateway Logs', 'bicrypto-gateway'); ?></h1>

            <p>
                <?php echo esc_html__('Recent log entries from the Bicrypto payment gateway.', 'bicrypto-gateway'); ?>
                <a href="<?php echo esc_url(admin_url('admin.php?page=wc-settings&tab=checkout&section=bicrypto')); ?>">
                    <?php echo esc_html__('Gateway Settings', 'bicrypto-gateway'); ?>
                </a>
            </p>

            <?php if (empty($logs)): ?>
                <p><em><?php echo esc_html__('No log entries found. Enable debug mode in gateway settings to start logging.', 'bicrypto-gateway'); ?></em></p>
            <?php else: ?>
                <textarea id="bicrypto-logs" readonly style="width: 100%; height: 600px; font-family: monospace; font-size: 12px; background: #1e1e1e; color: #d4d4d4; padding: 15px;"><?php echo esc_textarea($logs); ?></textarea>

                <p>
                    <button type="button" class="button" onclick="document.getElementById('bicrypto-logs').scrollTop = document.getElementById('bicrypto-logs').scrollHeight;">
                        <?php echo esc_html__('Scroll to Bottom', 'bicrypto-gateway'); ?>
                    </button>
                </p>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Add order actions
     *
     * @param array    $actions Actions
     * @param WC_Order $order   Order
     * @return array
     */
    public function add_order_actions($actions, $order) {
        if ($order->get_payment_method() !== 'bicrypto') {
            return $actions;
        }

        $payment_id = $order->get_meta('_bicrypto_payment_id');

        if ($payment_id && $order->has_status(array('bicrypto-pending', 'pending'))) {
            $actions['bicrypto_sync'] = array(
                'url'    => wp_nonce_url(
                    admin_url('admin-ajax.php?action=bicrypto_sync_payment&order_id=' . $order->get_id()),
                    'bicrypto_sync_' . $order->get_id()
                ),
                'name'   => __('Sync Bicrypto', 'bicrypto-gateway'),
                'action' => 'bicrypto_sync',
            );
        }

        return $actions;
    }

    /**
     * AJAX: Sync payment status
     */
    public function ajax_sync_payment() {
        check_ajax_referer('bicrypto_admin', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(array('message' => __('Permission denied', 'bicrypto-gateway')));
        }

        $order_id = isset($_REQUEST['order_id']) ? absint($_REQUEST['order_id']) : 0;
        $order = wc_get_order($order_id);

        if (!$order) {
            wp_send_json_error(array('message' => __('Order not found', 'bicrypto-gateway')));
        }

        $payment_id = $order->get_meta('_bicrypto_payment_id');
        if (!$payment_id) {
            wp_send_json_error(array('message' => __('No payment ID found', 'bicrypto-gateway')));
        }

        $gateway = WC()->payment_gateways->payment_gateways()['bicrypto'] ?? null;
        if (!$gateway) {
            wp_send_json_error(array('message' => __('Gateway not available', 'bicrypto-gateway')));
        }

        $status = $gateway->get_payment_status($payment_id);

        if (is_wp_error($status)) {
            wp_send_json_error(array('message' => $status->get_error_message()));
        }

        // Update order based on status
        switch ($status['status']) {
            case 'COMPLETED':
                $order->payment_complete($payment_id);
                $order->add_order_note(__('Payment synced: Completed', 'bicrypto-gateway'));
                break;
            case 'FAILED':
            case 'EXPIRED':
                $order->update_status('failed', sprintf(__('Payment synced: %s', 'bicrypto-gateway'), $status['status']));
                break;
            case 'CANCELLED':
                $order->update_status('cancelled', __('Payment synced: Cancelled', 'bicrypto-gateway'));
                break;
            case 'PENDING':
                $order->add_order_note(__('Payment synced: Still pending', 'bicrypto-gateway'));
                break;
        }

        wp_send_json_success(array(
            'message' => sprintf(__('Status: %s', 'bicrypto-gateway'), $status['status']),
            'status' => $status['status'],
        ));
    }
}
