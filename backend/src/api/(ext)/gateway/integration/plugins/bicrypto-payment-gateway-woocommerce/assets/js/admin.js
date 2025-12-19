/**
 * Bicrypto Gateway Admin Scripts
 * @version 2.0.0
 */
(function($) {
    'use strict';

    var BicryptoAdmin = {
        init: function() {
            this.initCopyButtons();
            this.initConnectionTest();
            this.initModeToggle();
        },

        /**
         * Initialize copy buttons for URLs
         */
        initCopyButtons: function() {
            $(document).on('click', '.bicrypto-copy-btn', function(e) {
                e.preventDefault();

                var $btn = $(this);
                var targetId = $btn.data('target');
                var $target = $('#' + targetId);
                var text = $target.text();

                navigator.clipboard.writeText(text).then(function() {
                    var originalText = $btn.text();
                    $btn.text('Copied!').addClass('copied');
                    setTimeout(function() {
                        $btn.text(originalText).removeClass('copied');
                    }, 2000);
                }).catch(function() {
                    // Fallback for older browsers
                    var $temp = $('<textarea>');
                    $('body').append($temp);
                    $temp.val(text).select();
                    document.execCommand('copy');
                    $temp.remove();

                    var originalText = $btn.text();
                    $btn.text('Copied!').addClass('copied');
                    setTimeout(function() {
                        $btn.text(originalText).removeClass('copied');
                    }, 2000);
                });
            });
        },

        /**
         * Initialize connection test functionality
         */
        initConnectionTest: function() {
            var $connectionSection = $('h2:contains("Connection Test")');

            if ($connectionSection.length) {
                var testButtonHtml = '<table class="form-table"><tbody>' +
                    '<tr valign="top">' +
                    '<th scope="row" class="titledesc">' +
                    '<label>' + bicryptoGateway.testConnectionText + '</label>' +
                    '</th>' +
                    '<td class="forminp">' +
                    '<button type="button" id="bicrypto-test-connection" class="button button-primary" style="margin-right: 10px;">' +
                    '<span class="dashicons dashicons-admin-plugins" style="line-height: 1.4; margin-right: 5px;"></span>' +
                    bicryptoGateway.testConnectionText +
                    '</button>' +
                    '<span class="description">Validates your API key and checks permissions.</span>' +
                    '<div id="bicrypto-test-result" style="margin-top: 15px;"></div>' +
                    '</td>' +
                    '</tr>' +
                    '</tbody></table>';
                $connectionSection.next('p').after(testButtonHtml);
            }

            $(document).on('click', '#bicrypto-test-connection', this.handleConnectionTest);
        },

        /**
         * Handle connection test button click
         */
        handleConnectionTest: function(e) {
            e.preventDefault();

            var $button = $(this);
            var $result = $('#bicrypto-test-result');

            // Get current values from form
            var testMode = $('#woocommerce_bicrypto_testmode').is(':checked');
            var apiUrl = $('#woocommerce_bicrypto_api_url').val();
            var secretKey = testMode
                ? $('#woocommerce_bicrypto_test_secret_key').val()
                : $('#woocommerce_bicrypto_live_secret_key').val();

            if (!apiUrl) {
                $result.html('<div class="notice notice-error inline"><p>' + bicryptoGateway.i18n.enterApiUrl + '</p></div>');
                return;
            }

            if (!secretKey) {
                var modeText = testMode ? bicryptoGateway.i18n.testMode : bicryptoGateway.i18n.liveMode;
                $result.html('<div class="notice notice-error inline"><p>' + bicryptoGateway.i18n.enterSecretKey.replace('%s', modeText) + '</p></div>');
                return;
            }

            // Disable button and show loading
            $button.prop('disabled', true).html('<span class="bicrypto-spinner"></span>' + bicryptoGateway.testingText);
            $result.html('<p><span class="bicrypto-spinner"></span> Testing connection...</p>');

            // Make AJAX request
            $.ajax({
                url: bicryptoGateway.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'bicrypto_test_connection',
                    nonce: bicryptoGateway.nonce,
                    api_url: apiUrl,
                    secret_key: secretKey
                },
                success: function(response) {
                    if (response.success) {
                        var html = '<div class="notice notice-success inline" style="margin: 0;"><p><strong>' + response.data.message + '</strong></p>';

                        if (response.data.merchant) {
                            html += '<p><strong>Merchant:</strong> ' + response.data.merchant.name + '</p>';
                        }

                        if (response.data.mode) {
                            var modeClass = response.data.mode === 'LIVE' ? 'bicrypto-mode-live' : 'bicrypto-mode-test';
                            html += '<p><strong>Mode:</strong> <span class="bicrypto-mode-indicator ' + modeClass + '">' + response.data.mode + '</span></p>';
                        }

                        if (response.data.walletTypes && response.data.walletTypes.length) {
                            html += '<p><strong>Wallet Types:</strong> ';
                            response.data.walletTypes.forEach(function(type) {
                                html += '<span class="bicrypto-permission-badge">' + type + '</span>';
                            });
                            html += '</p>';
                        }

                        if (response.data.permissions) {
                            var perms = response.data.permissions;
                            if (perms.includes('*')) {
                                html += '<p><strong>Permissions:</strong> <span class="bicrypto-permission-badge full-access">Full Access</span></p>';
                            } else {
                                html += '<p><strong>Permissions:</strong></p><div style="margin-left: 0;">';
                                var permLabels = {
                                    'payment.create': 'Create Payments',
                                    'payment.read': 'Read Payments',
                                    'payment.cancel': 'Cancel Payments',
                                    'refund.create': 'Create Refunds',
                                    'refund.read': 'Read Refunds'
                                };
                                perms.forEach(function(perm) {
                                    html += '<span class="bicrypto-permission-badge">' + (permLabels[perm] || perm) + '</span>';
                                });
                                html += '</div>';

                                // Check for required permissions
                                if (!perms.includes('payment.create')) {
                                    html += '<p style="color: #dc3545; margin-top: 10px;"><strong>Warning:</strong> Missing "payment.create" permission - payments will fail!</p>';
                                }
                            }
                        }

                        html += '</div>';
                        $result.html(html);
                    } else {
                        $result.html('<div class="notice notice-error inline" style="margin: 0;"><p><strong>' + bicryptoGateway.i18n.connectionFailed + '</strong></p><p>' + response.data.message + '</p></div>');
                    }
                },
                error: function(xhr, status, error) {
                    $result.html('<div class="notice notice-error inline" style="margin: 0;"><p><strong>Request Failed</strong></p><p>' + error + '</p></div>');
                },
                complete: function() {
                    $button.prop('disabled', false).html('<span class="dashicons dashicons-admin-plugins" style="line-height: 1.4; margin-right: 5px;"></span>' + bicryptoGateway.testConnectionText);
                }
            });
        },

        /**
         * Initialize mode toggle (show/hide test/live keys)
         */
        initModeToggle: function() {
            var $testMode = $('#woocommerce_bicrypto_testmode');

            function toggleKeys() {
                var isTestMode = $testMode.is(':checked');

                // Toggle visibility of key fields
                $('#woocommerce_bicrypto_test_public_key, #woocommerce_bicrypto_test_secret_key')
                    .closest('tr')
                    .toggle(isTestMode);

                $('#woocommerce_bicrypto_live_public_key, #woocommerce_bicrypto_live_secret_key')
                    .closest('tr')
                    .toggle(!isTestMode);
            }

            $testMode.on('change', toggleKeys);
            toggleKeys(); // Initial state
        }
    };

    $(document).ready(function() {
        BicryptoAdmin.init();
    });
})(jQuery);
