// License API Configuration
export const LICENSE_CONFIG = {
  // Default license API configuration
  API_URL: process.env.APP_LICENSE_API_URL || 'http://localhost/v5/license',
  API_KEY: process.env.API_LICENSE_API_KEY || 'CF30BB9297634F7075F6',
  
  // Extension to Product ID mappings
  EXTENSION_MAPPINGS: {
    "ai_investment": "B96677A0",
    "ecosystem": "EB4AADC3", 
    "forex": "F8C1C44E",
    "ico": "61433370",
    "staking": "5868429E",
    "knowledge_base": "90AC59FB",
    "ecommerce": "6FCAE834",
    "wallet_connect": "F47D081C",
    "p2p": "DBFE65CA",
    "mlm": "D29FD60F",
    "mailwizard": "02B81D43",
    "swap": "C4160F60",
    "futures": "A94B6354",
    "nft": "C472374E",
    "payment_gateway": "B80789E1"
  }
};

// Helper function to get license configuration
export function getLicenseConfig() {
  return {
    apiUrl: LICENSE_CONFIG.API_URL,
    apiKey: LICENSE_CONFIG.API_KEY,
    extensionMappings: LICENSE_CONFIG.EXTENSION_MAPPINGS
  };
} 