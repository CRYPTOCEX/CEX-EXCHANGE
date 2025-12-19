/**
 * Bicrypto Payment Gateway - Block Checkout Support
 * @version 2.0.0
 */
(function() {
    'use strict';

    const { registerPaymentMethod } = wc.wcBlocksRegistry;
    const { getSetting } = wc.wcSettings;
    const { createElement, Fragment } = wp.element;
    const { decodeEntities } = wp.htmlEntities;

    // Get settings from server
    const settings = window.bicryptoBlocksData || getSetting('bicrypto_data', {});
    const defaultLabel = 'Pay with Bicrypto';
    const label = decodeEntities(settings.title) || defaultLabel;

    /**
     * Content component for the payment method
     */
    const ContentDisplay = () => {
        return createElement(
            Fragment,
            null,
            settings.testmode && createElement(
                'div',
                {
                    style: {
                        background: '#fff3cd',
                        borderLeft: '4px solid #ffc107',
                        padding: '10px 15px',
                        marginBottom: '15px',
                        fontSize: '0.9em',
                    },
                },
                createElement('strong', null, 'Test Mode'),
                ' - ',
                settings.i18n.testModeNotice
            ),
            createElement(
                'p',
                null,
                decodeEntities(settings.description || '')
            ),
            createElement(
                'p',
                { style: { color: '#666', fontSize: '0.9em' } },
                settings.i18n.redirectNotice
            )
        );
    };

    /**
     * Label component with icon
     */
    const Label = (props) => {
        const { PaymentMethodLabel } = props.components;

        const icon = settings.icon
            ? createElement('img', {
                src: settings.icon,
                alt: label,
                style: {
                    height: '24px',
                    marginRight: '10px',
                    verticalAlign: 'middle',
                },
                onError: (e) => { e.target.style.display = 'none'; },
            })
            : null;

        return createElement(
            Fragment,
            null,
            icon,
            createElement(PaymentMethodLabel, { text: label })
        );
    };

    /**
     * Payment method configuration
     */
    const bicryptoPaymentMethod = {
        name: 'bicrypto',
        label: createElement(Label, null),
        content: createElement(ContentDisplay, null),
        edit: createElement(ContentDisplay, null),
        canMakePayment: () => true,
        ariaLabel: label,
        supports: {
            features: settings.supports || ['products'],
        },
    };

    // Register the payment method
    registerPaymentMethod(bicryptoPaymentMethod);
})();
