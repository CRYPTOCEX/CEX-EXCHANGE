=== Bicrypto Payment Gateway for WooCommerce ===
Contributors: bicrypto
Tags: woocommerce, payment gateway, bicrypto, crypto payments, fiat, cryptocurrency, eco tokens
Requires at least: 5.8
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 2.0.0
WC requires at least: 7.0
WC tested up to: 9.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accept FIAT, Cryptocurrency, and ECO token payments through Bicrypto payment gateway in your WooCommerce store.

== Description ==

Bicrypto Payment Gateway for WooCommerce allows you to accept multiple payment types from customers using their Bicrypto wallet balance. Customers can pay with:

* **FIAT Balance** - Traditional currency from their wallet
* **Cryptocurrency (SPOT)** - Bitcoin, Ethereum, and other cryptocurrencies
* **ECO Tokens** - Ecosystem-specific tokens

= How It Works =

1. Customer selects "Pay with Bicrypto" at WooCommerce checkout
2. Customer is redirected to the Bicrypto checkout page
3. On Bicrypto checkout, customer selects their preferred wallet type and completes payment
4. Customer is redirected back to WooCommerce with payment confirmation

= Key Features =

* **Seamless Checkout** - Customers are redirected to Bicrypto's secure checkout page
* **Test & Live Mode** - Safely test before going live
* **Automatic Status Updates** - Webhooks for real-time payment status
* **Refund Support** - Process refunds directly from WooCommerce
* **WooCommerce Blocks** - Full support for block-based checkout
* **HPOS Compatible** - Works with High-Performance Order Storage
* **Admin Dashboard** - View payment details and sync status
* **Debug Logging** - Comprehensive logs for troubleshooting
* **Custom Order Status** - "Awaiting Bicrypto Payment" status
* **Cart Restoration** - Restores cart on cancelled payments

= Requirements =

* WordPress 5.8 or higher
* WooCommerce 7.0 or higher
* PHP 7.4 or higher
* A Bicrypto merchant account with API keys
* SSL certificate (HTTPS) for secure payments

== Installation ==

1. Upload the `bicrypto-payment-gateway-woocommerce` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to WooCommerce > Settings > Payments > Bicrypto
4. Configure your API keys and settings
5. Enable the payment gateway

= Quick Setup =

1. Log in to your Bicrypto merchant dashboard
2. Generate API keys (test and/or live)
3. Copy the Webhook URL from WooCommerce settings to Bicrypto
4. Configure allowed wallet types
5. Test with a small order in test mode
6. Switch to live mode when ready

== Configuration ==

= API Settings =

* **API URL**: Your Bicrypto platform URL (e.g., https://yoursite.com)
* **Test Mode**: Enable for testing with test API keys
* **Test/Live Keys**: Your API public and secret keys

= Payment Settings =

* **Allowed Wallet Types**: Choose which wallet types customers can use
  * FIAT - Traditional currency
  * SPOT - Cryptocurrency
  * ECO - Ecosystem tokens
* **Payment Expiration**: Time before payment expires (5-1440 minutes)

= Webhooks =

Add this URL to your Bicrypto merchant dashboard:

`https://yoursite.com/?wc-api=bicrypto_webhook`

Supported webhook events:
* payment.completed
* payment.failed
* payment.cancelled
* payment.expired
* refund.completed
* refund.failed

== Frequently Asked Questions ==

= Where do I get my API keys? =

Log in to your Bicrypto merchant dashboard and navigate to Settings > API Keys.

= How do I test the integration? =

1. Enable Test Mode in the plugin settings
2. Use your test API keys
3. Place a test order
4. Complete payment on the Bicrypto test checkout

= Can customers choose their wallet type? =

Yes! Customers select their preferred wallet type (FIAT, Crypto, or ECO tokens) on the Bicrypto checkout page after being redirected from your store. Wallet types and payment settings are configured in your Bicrypto merchant dashboard.

= What happens if a payment expires? =

The order will be marked as failed and the customer can place a new order.

= How do refunds work? =

Refunds can be processed from the WooCommerce order page. The refund will be sent to the customer's original wallet.

= Is WooCommerce Blocks supported? =

Yes, full support for the block-based checkout is included.

== Screenshots ==

1. Checkout with wallet type selector
2. Admin settings page
3. Order details with payment information
4. Connection test results

== Changelog ==

= 2.0.0 =
* Simplified checkout flow - redirects to Bicrypto checkout page
* Wallet type selection moved to Bicrypto checkout page
* Payment settings configured in Bicrypto merchant dashboard
* Added custom order status "Awaiting Bicrypto Payment"
* Added admin column for Bicrypto payment status
* Added payment sync functionality from admin
* Added comprehensive webhook handler
* Added cart restoration on cancelled payments
* Added scheduled check for pending payments
* Added copy buttons for callback URLs
* Added admin logs viewer
* Improved WooCommerce Blocks integration
* Improved error handling and logging
* Improved security with nonce verification
* Updated to support WooCommerce 9.0
* Updated to support WordPress 6.5

= 1.0.0 =
* Initial release
* Payment processing support
* Webhook handling for payment status updates
* Refund support
* Test and Live mode support

== Upgrade Notice ==

= 2.0.0 =
Major update with wallet type selection, improved admin features, and better WooCommerce Blocks support. Test in staging before upgrading production.

= 1.0.0 =
Initial release of the Bicrypto Payment Gateway for WooCommerce.

== Support ==

For support, please visit:
* Documentation: https://docs.bicrypto.io/woocommerce
* Support Portal: https://support.bicrypto.io

== Privacy ==

This plugin sends customer data (email, name, order details) to your Bicrypto platform to process payments. Please ensure your privacy policy covers this data transfer.
