"use strict";
const { v4: uuidv4 } = require("uuid");

const DepositGateways = [
  {
    id: 'stripe',
    name: 'Stripe',
    title: 'Stripe',
    description: 'Global payment processing platform',
    image: "/img/gateways/stripe.png",
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'ISK', 'MYR', 'SGD', 'HKD', 'NZD', 'THB', 'PHP', 'TWD', 'KRW', 'INR', 'BRL', 'MXN'],
    fixedFee: '0.30',
    percentageFee: '2.9',
    minAmount: '0.50',
    maxAmount: '999999.99',
    type: 'FIAT',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    title: 'PayPal',
    description: 'Digital payment platform',
    image: "/img/gateways/paypal.png",
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'HKD', 'SGD', 'TWD', 'THB', 'PHP', 'MYR', 'BRL', 'MXN', 'NZD', 'RUB', 'INR'],
    fixedFee: '0.30',
    percentageFee: '2.9',
    minAmount: '0.01',
    maxAmount: '10000.00',
    type: 'FIAT',
  },
  {
    id: '2checkout',
    name: '2Checkout',
    title: '2Checkout',
    description: 'Global payment platform',
    image: "/img/gateways/2checkout.png",
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'ISK', 'MYR', 'SGD', 'HKD', 'NZD', 'THB', 'PHP', 'TWD', 'KRW', 'INR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'BOB', 'PYG', 'ZAR', 'ILS', 'TRY', 'RUB', 'UAH', 'CNY'],
    fixedFee: '0.30',
    percentageFee: '3.5',
    minAmount: '0.01',
    maxAmount: '99999.99',
    type: 'FIAT',
  },
  {
    id: 'adyen',
    name: 'Adyen',
    title: 'Adyen',
    description: 'Global payment company',
    image: "/img/gateways/adyen.png",
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'ISK', 'MYR', 'SGD', 'HKD', 'NZD', 'THB', 'PHP', 'TWD', 'KRW', 'INR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'BOB', 'PYG', 'ZAR', 'ILS', 'TRY', 'RUB', 'UAH', 'CNY'],
    fixedFee: '0.12',
    percentageFee: '1.4',
    minAmount: '0.01',
    maxAmount: '999999.99',
    type: 'FIAT',
  },
  {
    id: 'authorizenet',
    name: 'Authorize.Net',
    title: 'Authorize.Net',
    description: 'Payment gateway service',
    image: "/img/gateways/authorizenet.png",
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'CAD', 'GBP', 'EUR', 'AUD'],
    fixedFee: '0.30',
    percentageFee: '2.9',
    minAmount: '1.00',
    maxAmount: '99999.99',
    type: 'FIAT',
  },
  {
    id: 'dlocal',
    name: 'dLocal',
    title: 'dLocal',
    description: 'Emerging market payment platform',
    image: "/img/gateways/dlocal.png",
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'EUR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'BOB', 'PYG', 'CNY', 'INR', 'THB', 'MYR', 'SGD', 'PHP', 'IDR', 'VND', 'TRY', 'ZAR', 'EGP', 'NGN', 'KES', 'GHS', 'MAD', 'TND', 'DZD'],
    fixedFee: '0.50',
    percentageFee: '3.5',
    minAmount: '1.00',
    maxAmount: '50000.00',
    type: 'FIAT',
  },
  {
    id: 'eway',
    name: 'eWAY',
    title: 'eWAY',
    description: 'Australian payment gateway',
    image: "/img/gateways/eway.png",
    status: false,
    version: '0.0.1',
    currencies: ['AUD', 'NZD', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'SGD', 'HKD', 'MYR'],
    fixedFee: '0.30',
    percentageFee: '2.9',
    minAmount: '1.00',
    maxAmount: '99999.99',
    type: 'FIAT',
  },
  {
    id: 'ipay88',
    name: 'iPay88',
    title: 'iPay88',
    description: 'Southeast Asian payment gateway',
    image: "/img/gateways/ipay88.png",
    status: false,
    version: '0.0.1',
    currencies: ['MYR', 'SGD', 'THB', 'PHP', 'IDR', 'VND', 'USD', 'CNY', 'HKD'],
    fixedFee: '0.50',
    percentageFee: '3.5',
    minAmount: '1.00',
    maxAmount: '50000.00',
    type: 'FIAT',
  },
  {
    id: 'klarna',
    name: 'Klarna',
    title: 'Klarna',
    description: 'Buy now, pay later service',
    image: "/img/gateways/klarna.png",
    status: false,
    version: '0.0.1',
    currencies: ['SEK', 'NOK', 'DKK', 'EUR', 'GBP', 'USD', 'CAD', 'AUD', 'CHF', 'PLN', 'CZK'],
    fixedFee: '0.30',
    percentageFee: '3.29',
    minAmount: '1.00',
    maxAmount: '10000.00',
    type: 'FIAT',
  },
  {
    id: 'payfast',
    name: 'PayFast',
    title: 'PayFast',
    description: 'South Africa\'s leading payment platform with 18+ payment methods and multi-currency support',
    image: '/img/gateways/payfast.png',
    status: false,
    version: '0.0.1',
    currencies: ['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'ISK', 'JPY', 'CNY', 'HKD', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW', 'TWD', 'INR', 'ILS', 'TRY'],
    fixedFee: '2.00',
    percentageFee: '3.2',
    minAmount: '1.00',
    maxAmount: '100000.00',
    type: 'FIAT',
  },
  {
    id: 'mollie',
    name: 'Mollie',
    title: 'Mollie',
    description: 'European payment provider with local payment methods',
    image: '/img/gateways/mollie.png',
    status: false,
    version: '0.0.1',
    currencies: ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'AUD', 'CAD', 'JPY', 'HKD', 'SGD', 'NZD', 'ZAR', 'BGN', 'RON', 'HUF', 'ISK', 'ILS', 'MYR', 'PHP', 'THB', 'TWD'],
    fixedFee: '0.25',
    percentageFee: '2.8',
    minAmount: '0.01',
    maxAmount: '10000.00',
    type: 'FIAT',
  },
  {
    id: 'paysafe',
    name: 'Paysafe',
    title: 'Paysafe',
    description: 'Global payment platform with 260+ payment methods, digital wallets, and comprehensive fraud protection across 120+ markets',
    image: '/img/gateways/paysafe.png',
    status: false,
    version: '0.0.1',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'ISK', 'JPY', 'CNY', 'HKD', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW', 'TWD', 'INR', 'ILS', 'TRY', 'ZAR', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'ARS', 'UYU', 'BOB', 'PYG', 'NZD', 'FJD', 'WST', 'TOP', 'VUV', 'SBD', 'PGK'],
    fixedFee: '0.25',
    percentageFee: '2.9',
    minAmount: '0.50',
    maxAmount: '999999.99',
    type: 'FIAT',
  },
  {
    id: 'paystack',
    name: 'Paystack',
    title: 'Paystack',
    description: 'Leading African payment gateway supporting cards, mobile money, and bank transfers across Nigeria, Ghana, South Africa, Kenya, Côte d\'Ivoire, and Egypt',
    image: '/img/gateways/paystack.png',
    status: false,
    version: '0.0.1',
    currencies: ['NGN', 'GHS', 'ZAR', 'KES', 'XOF', 'EGP', 'USD'],
    fixedFee: {
      NGN: 100, // NGN 1.00 fixed fee
      GHS: 0,
      ZAR: 100, // R1.00 fixed fee (in cents)
      KES: 0,
      XOF: 0,
      EGP: 250, // EGP 2.50 fixed fee (in piastres)
      USD: 0,
    },
    percentageFee: {
      NGN: 1.5, // 1.5% + NGN 100
      GHS: 1.95, // 1.95%
      ZAR: 2.9, // 2.9% + R1.00
      KES: 2.9, // 2.9%
      XOF: 3.2, // 3.2%
      EGP: 2.7, // 2.7% + EGP 2.50
      USD: 3.9, // 3.9% (Nigeria and Kenya only)
    },
    minAmount: {
      NGN: 1.00,
      GHS: 1.00,
      ZAR: 1.00,
      KES: 1.00,
      XOF: 1.00,
      EGP: 1.00,
      USD: 1.00,
    },
    maxAmount: {
      NGN: 10000000.00,
      GHS: 10000000.00,
      ZAR: 10000000.00,
      KES: 10000000.00,
      XOF: 10000000.00,
      EGP: 10000000.00,
      USD: 10000000.00,
    },
    type: 'FIAT',
  },
  {
    id: uuidv4(),
    name: 'PayU',
    title: 'PayU',
    description: "Global payment platform serving 17 countries with 300+ payment methods including cards, wallets, UPI, EMI, net banking, and local payment solutions",
    alias: 'payu',
    image: '/img/gateways/payu.png',
    version: '0.0.1',
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'PLN', 'CZK', 'RON', 'HUF', 'UAH', 'TRY', 'BRL', 'COP', 'PEN', 'ARS', 'CLP', 'MXN', 'ZAR'],
    fixedFee: {
      INR: 0, // No fixed fee for most payment methods
      USD: 0,
      EUR: 0,
      GBP: 0,
      PLN: 0,
      CZK: 0,
      RON: 0,
      HUF: 0,
      UAH: 0,
      TRY: 0,
      BRL: 0,
      COP: 0,
      PEN: 0,
      ARS: 0,
      CLP: 0,
      MXN: 0,
      ZAR: 0,
    },
    percentageFee: {
      INR: 1.9, // Credit Cards: 1.9-2.5%, Debit Cards: 0.9-1.5%, UPI: 0%, Net Banking: 1.2%
      USD: 3.5, // International cards
      EUR: 2.8, // European market rates
      GBP: 2.9,
      PLN: 2.5, // Polish market
      CZK: 2.7, // Czech market
      RON: 2.6, // Romanian market
      HUF: 2.8, // Hungarian market
      UAH: 3.2, // Ukrainian market
      TRY: 3.0, // Turkish market
      BRL: 3.8, // Brazilian market
      COP: 3.5, // Colombian market
      PEN: 3.3, // Peruvian market
      ARS: 4.2, // Argentinian market
      CLP: 3.7, // Chilean market
      MXN: 3.4, // Mexican market
      ZAR: 2.9, // South African market
    },
    minAmount: {
      INR: 1.00,
      USD: 1.00,
      EUR: 1.00,
      GBP: 1.00,
      PLN: 4.00, // ~1 USD equivalent
      CZK: 25.00, // ~1 USD equivalent
      RON: 5.00, // ~1 USD equivalent
      HUF: 350.00, // ~1 USD equivalent
      UAH: 37.00, // ~1 USD equivalent
      TRY: 27.00, // ~1 USD equivalent
      BRL: 5.00, // ~1 USD equivalent
      COP: 4000.00, // ~1 USD equivalent
      PEN: 4.00, // ~1 USD equivalent
      ARS: 350.00, // ~1 USD equivalent
      CLP: 800.00, // ~1 USD equivalent
      MXN: 18.00, // ~1 USD equivalent
      ZAR: 15.00, // ~1 USD equivalent
    },
    maxAmount: {
      INR: 10000000.00, // 1 Crore INR
      USD: 100000.00,
      EUR: 100000.00,
      GBP: 100000.00,
      PLN: 400000.00, // ~100k USD equivalent
      CZK: 2500000.00, // ~100k USD equivalent
      RON: 500000.00, // ~100k USD equivalent
      HUF: 35000000.00, // ~100k USD equivalent
      UAH: 3700000.00, // ~100k USD equivalent
      TRY: 2700000.00, // ~100k USD equivalent
      BRL: 500000.00, // ~100k USD equivalent
      COP: 400000000.00, // ~100k USD equivalent
      PEN: 400000.00, // ~100k USD equivalent
      ARS: 35000000.00, // ~100k USD equivalent
      CLP: 80000000.00, // ~100k USD equivalent
      MXN: 1800000.00, // ~100k USD equivalent
      ZAR: 1500000.00, // ~100k USD equivalent
    },
    type: 'FIAT',
    status: false,
  },
  {
    id: uuidv4(),
    name: 'Paytm',
    title: 'Paytm',
    description: "India's leading payment gateway with 300+ million users supporting comprehensive payment methods including UPI, cards, net banking, wallets, and EMI",
    alias: 'paytm',
    image: '/img/gateways/paytm.png',
    version: '0.0.1',
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'JPY', 'CNY', 'CHF', 'QAR'],
    fixedFee: {
      INR: 0, // No fixed fee for most payment methods
      USD: 0,
      EUR: 0,
      GBP: 0,
      AUD: 0,
      CAD: 0,
      SGD: 0,
      AED: 0,
      JPY: 0,
      CNY: 0,
      CHF: 0,
      QAR: 0,
    },
    percentageFee: {
      INR: 0.0, // UPI: 0%, RuPay Debit: 0%, Debit Cards: 0.40%, Credit Cards: 1.40-1.99%, International: 3.50%
      USD: 3.5, // International cards
      EUR: 3.5,
      GBP: 3.5,
      AUD: 3.5,
      CAD: 3.5,
      SGD: 3.5,
      AED: 3.5,
      JPY: 3.5,
      CNY: 3.5,
      CHF: 3.5,
      QAR: 3.5,
    },
    minAmount: {
      INR: 1.00,
      USD: 1.00,
      EUR: 1.00,
      GBP: 1.00,
      AUD: 1.00,
      CAD: 1.00,
      SGD: 1.00,
      AED: 1.00,
      JPY: 100.00, // Yen has different minimum
      CNY: 1.00,
      CHF: 1.00,
      QAR: 1.00,
    },
    maxAmount: {
      INR: 10000000.00, // 1 Crore INR
      USD: 100000.00,
      EUR: 100000.00,
      GBP: 100000.00,
      AUD: 100000.00,
      CAD: 100000.00,
      SGD: 100000.00,
      AED: 100000.00,
      JPY: 10000000.00, // 10 Million Yen
      CNY: 100000.00,
      CHF: 100000.00,
      QAR: 100000.00,
    },
    type: 'FIAT',
    status: false,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check database schema to determine column types
    let columnTypes = {};
    try {
      const tableInfo = await queryInterface.describeTable('deposit_gateway');
      columnTypes = {
        fixedFee: tableInfo.fixedFee?.type || 'TEXT',
        percentageFee: tableInfo.percentageFee?.type || 'TEXT',
        minAmount: tableInfo.minAmount?.type || 'TEXT',
        maxAmount: tableInfo.maxAmount?.type || 'TEXT',
      };
    } catch (error) {
      console.log('Could not determine column types, using defaults');
      columnTypes = {
        fixedFee: 'TEXT',
        percentageFee: 'TEXT',
        minAmount: 'TEXT',
        maxAmount: 'TEXT',
      };
    }

    // Helper function to process fee/amount fields based on column type
    const processField = (value, fieldName) => {
      if (value === null || value === undefined) {
        return fieldName === 'maxAmount' ? null : 0;
      }

      const columnType = columnTypes[fieldName];
      const isNumericColumn = columnType.includes('DOUBLE') || columnType.includes('DECIMAL') || columnType.includes('FLOAT');

      if (typeof value === 'object' && value !== null) {
        if (isNumericColumn) {
          // For numeric columns, use the first non-zero value or default
          const currencies = ['USD', 'EUR', 'NGN', 'GHS', 'ZAR', 'KES', 'XOF', 'EGP'];
          
          // First try to find a non-zero value
          for (const currency of currencies) {
            if (value[currency] !== undefined && value[currency] !== 0) {
              return parseFloat(value[currency]) || (fieldName === 'maxAmount' ? null : 0);
            }
          }
          
          // If all values are zero, use the first available value
          for (const currency of currencies) {
            if (value[currency] !== undefined) {
              return parseFloat(value[currency]) || (fieldName === 'maxAmount' ? null : 0);
            }
          }
          
          return fieldName === 'maxAmount' ? null : 0;
        } else {
          // For text columns, store as JSON
          return JSON.stringify(value);
        }
      } else if (typeof value === 'string') {
        return isNumericColumn ? (parseFloat(value) || (fieldName === 'maxAmount' ? null : 0)) : value;
      } else if (typeof value === 'number') {
        return value;
      }

      return fieldName === 'maxAmount' ? null : 0;
    };

    // Fetch existing deposit gateway names to compare against
    const existingGateways = await queryInterface.sequelize.query(
      "SELECT name FROM deposit_gateway",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const existingNames = new Set(
      existingGateways.map((gateway) => gateway.name)
    );

    // Filter out DepositGateways that already exist in the database by name
    const newGateways = DepositGateways.filter(
      (gateway) => !existingNames.has(gateway.name)
    ).map((gateway) => {
      // Process the gateway data for database insertion
      const processedGateway = { ...gateway };
      
      // Ensure we have an ID
      if (!processedGateway.id) {
        processedGateway.id = uuidv4();
      }
      
      // Convert arrays to JSON strings for database storage
      if (Array.isArray(processedGateway.currencies)) {
        processedGateway.currencies = JSON.stringify(processedGateway.currencies);
      }
      
      // Handle numeric/object fields based on column type
      processedGateway.fixedFee = processField(processedGateway.fixedFee, 'fixedFee');
      processedGateway.percentageFee = processField(processedGateway.percentageFee, 'percentageFee');
      processedGateway.minAmount = processField(processedGateway.minAmount, 'minAmount');
      processedGateway.maxAmount = processField(processedGateway.maxAmount, 'maxAmount');
      
      // Ensure proper defaults for optional fields
      processedGateway.productId = processedGateway.productId || null;
      processedGateway.status = processedGateway.status !== undefined ? processedGateway.status : true;
      processedGateway.version = processedGateway.version || '1.0.0';
      
      return processedGateway;
    });

    // Only insert new gateways that do not exist
    if (newGateways.length > 0) {
      console.log(`Inserting ${newGateways.length} new deposit gateways with column types:`, columnTypes);
      await queryInterface.bulkInsert("deposit_gateway", newGateways, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("deposit_gateway", null, {});
  },
};
