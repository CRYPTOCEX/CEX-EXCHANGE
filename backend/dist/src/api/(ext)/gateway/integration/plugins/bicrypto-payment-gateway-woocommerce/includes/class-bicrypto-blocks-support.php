<?php
/**
 * Bicrypto Blocks Support
 *
 * @package Bicrypto_Gateway
 * @version 2.0.0
 */

use Automattic\WooCommerce\Blocks\Payments\Integrations\AbstractPaymentMethodType;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Bicrypto Blocks integration
 */
final class WC_Bicrypto_Blocks_Support extends AbstractPaymentMethodType {

    /**
     * Payment method name/id/slug
     *
     * @var string
     */
    protected $name = 'bicrypto';

    /**
     * Gateway instance
     *
     * @var WC_Bicrypto_Gateway
     */
    private $gateway;

    /**
     * Initializes the payment method type
     */
    public function initialize() {
        $this->settings = get_option('woocommerce_bicrypto_settings', array());
        $gateways = WC()->payment_gateways->payment_gateways();
        $this->gateway = isset($gateways[$this->name]) ? $gateways[$this->name] : null;
    }

    /**
     * Returns if this payment method should be active
     *
     * @return boolean
     */
    public function is_active() {
        if (!$this->gateway) {
            return false;
        }
        return $this->gateway->is_available();
    }

    /**
     * Returns an array of scripts/handles to be registered for this payment method
     *
     * @return array
     */
    public function get_payment_method_script_handles() {
        $asset_path = BICRYPTO_GATEWAY_PLUGIN_DIR . 'assets/blocks/checkout.asset.php';
        $version = BICRYPTO_GATEWAY_VERSION;
        $dependencies = array('wc-blocks-registry', 'wc-settings', 'wp-element', 'wp-html-entities', 'wp-i18n');

        if (file_exists($asset_path)) {
            $asset = require $asset_path;
            $version = isset($asset['version']) ? $asset['version'] : $version;
            $dependencies = isset($asset['dependencies']) ? $asset['dependencies'] : $dependencies;
        }

        wp_register_script(
            'wc-bicrypto-blocks-integration',
            BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/blocks/checkout.js',
            $dependencies,
            $version,
            true
        );

        // Add inline script for localization
        wp_add_inline_script(
            'wc-bicrypto-blocks-integration',
            'window.bicryptoBlocksData = ' . wp_json_encode($this->get_payment_method_data()) . ';',
            'before'
        );

        return array('wc-bicrypto-blocks-integration');
    }

    /**
     * Returns an array of key=>value pairs of data made available to the payment methods script
     *
     * @return array
     */
    public function get_payment_method_data() {
        // Get icon from API URL or use fallback
        $api_url = $this->get_setting('api_url');
        $icon = !empty($api_url)
            ? rtrim($api_url, '/') . '/img/logo/logo.png'
            : BICRYPTO_GATEWAY_PLUGIN_URL . 'assets/images/icon.png';

        return array(
            'title'       => $this->get_setting('title'),
            'description' => $this->get_setting('description'),
            'supports'    => array_filter($this->gateway ? $this->gateway->supports : array(), array($this->gateway, 'supports')),
            'icon'        => $icon,
            'testmode'    => $this->get_setting('testmode') === 'yes',
            'i18n' => array(
                'testModeNotice' => __('Test Mode - Payments will not be processed.', 'bicrypto-gateway'),
                'redirectNotice' => __('You will be redirected to the Bicrypto checkout page to complete your payment.', 'bicrypto-gateway'),
            ),
        );
    }
}
