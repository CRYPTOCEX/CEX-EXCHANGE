/**
 * Bicrypto Gateway Checkout Scripts
 * @version 2.0.0
 */
(function($) {
    'use strict';

    var BicryptoCheckout = {
        init: function() {
            // No special checkout handling needed
            // Customer is redirected to Bicrypto checkout page
        }
    };

    $(document).ready(function() {
        BicryptoCheckout.init();
    });

    // Expose for external use
    window.BicryptoCheckout = BicryptoCheckout;
})(jQuery);
