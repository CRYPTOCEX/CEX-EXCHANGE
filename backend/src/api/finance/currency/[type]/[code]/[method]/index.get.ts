import { createError } from "@b/utils/error";
import ExchangeManager from "@b/utils/exchange";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { sanitizeErrorMessage } from "@b/api/exchange/utils";
import { baseCurrencySchema, baseResponseSchema } from "../../../utils";

/**
 * Validates deposit address response from exchange API
 * Checks for empty objects, null/undefined values, and missing address data
 * @param response - The response from the exchange API
 * @param methodKey - Optional method key to check specific method response
 * @returns boolean indicating if the response is valid
 */
export function validateDepositAddressResponse(response: any, methodKey?: string): boolean {
  if (!response) return false;
  
  // Check if response is an empty object
  if (typeof response === 'object' && Object.keys(response).length === 0) {
    return false;
  }
  
  // If methodKey is provided, check the specific method response
  if (methodKey && response[methodKey]) {
    const methodResponse = response[methodKey];
    if (typeof methodResponse === 'object' && Object.keys(methodResponse).length === 0) {
      return false;
    }
    // Check if the method response has an address field
    if (methodResponse && typeof methodResponse === 'object' && !methodResponse.address) {
      return false;
    }
  } else if (!methodKey) {
    // For direct responses, check if it has address field
    if (typeof response === 'object' && !response.address && !response.tag && !response.memo) {
      return false;
    }
  }
  
  return true;
}

export const metadata: OperationObject = {
  summary: "Retrieves a single currency by its ID",
  description: "This endpoint retrieves a single currency by its ID.",
  operationId: "getCurrencyById",
  tags: ["Finance", "Currency"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "type",
      in: "path",
      required: true,
      schema: {
        type: "string",
        enum: ["SPOT"],
      },
    },
    {
      index: 1,
      name: "code",
      in: "path",
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      index: 2,
      name: "method",
      in: "path",
      required: false,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description: "Currency retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...baseResponseSchema,
              data: {
                type: "object",
                properties: baseCurrencySchema,
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Currency"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  const { type, code, method } = params;
  if (!type || !code) throw createError(400, "Invalid type or code");

  if (type !== "SPOT") throw createError(400, "Invalid type");

  const exchange = await ExchangeManager.startExchange();
  const provider = await ExchangeManager.getProvider();
  if (!exchange) throw createError(500, "Exchange not found");
  if (!provider) throw createError(500, "Exchange provider not found");

  /**
   * KuCoin-specific network mapping: Maps chain names to network IDs
   * This is needed because KuCoin's API expects network IDs, not chain names
   */
  const getKuCoinNetworkId = async (currency: string, chainName: string): Promise<string> => {
    try {
      // For KuCoin, the network IDs are actually the token standard names (ERC20, BEP20, etc.)
      // not the blockchain names (eth, bsc, etc.), so we should try the original name first
      
      // Fetch currency data from exchange to get available networks
      const currencies = await exchange.fetchCurrencies();
      const currencyData = Object.values(currencies).find((c: any) => c.id === currency || c.code === currency) as any;
      
      if (currencyData && currencyData.networks) {
        const availableNetworks = Object.keys(currencyData.networks);
        
        // First, check if the original chain name is directly available
        if (availableNetworks.includes(chainName)) {
          console.log(`[KuCoin] Network mapping: ${chainName} -> ${chainName}`);
          return chainName;
        }
        
        // If not found, try common mappings (blockchain names to token standards)
        const chainMappings: { [key: string]: string } = {
          'ETH': 'ERC20',
          'ETHEREUM': 'ERC20',
          'BSC': 'BEP20',
          'BINANCE': 'BEP20',
          'TRX': 'TRC20',
          'TRON': 'TRC20',
          'POLYGON': 'POLYGON',
          'MATIC': 'POLYGON',
          'ARBITRUM': 'ARBITRUM',
          'OPTIMISM': 'OPTIMISM',
          'BASE': 'BASE',
          'AVALANCHE': 'AVAX',
          'AVAX': 'AVAX'
        };
        
        // Try mapping blockchain names to token standards
        const mappedName = chainMappings[chainName.toUpperCase()];
        if (mappedName && availableNetworks.includes(mappedName)) {
          console.log(`[KuCoin] Network mapping: ${chainName} -> ${mappedName}`);
          return mappedName;
        }
        
        // If still not found, try case-insensitive search
        const caseInsensitiveMatch = availableNetworks.find(net => 
          net.toLowerCase() === chainName.toLowerCase()
        );
        if (caseInsensitiveMatch) {
          console.log(`[KuCoin] Network mapping: ${chainName} -> ${caseInsensitiveMatch}`);
          return caseInsensitiveMatch;
        }
        
        // Last resort: try to find by network info properties
        for (const [networkId, networkInfo] of Object.entries(currencyData.networks)) {
          const network = networkInfo as any;
          if (
            network.name === chainName ||
            network.network === chainName ||
            (network.name && network.name.toUpperCase() === chainName.toUpperCase()) ||
            (network.network && network.network.toUpperCase() === chainName.toUpperCase())
          ) {
            console.log(`[KuCoin] Network mapping: ${chainName} -> ${networkId}`);
            return networkId;
          }
        }
      }
      
      console.log(`[KuCoin] No mapping found for ${chainName}, using as-is`);
      return chainName;
    } catch (error) {
      console.error(`[KuCoin] Error in network mapping:`, error);
      // Return the original chain name as fallback
      return chainName;
    }
  };

  /**
   * Universal network mapping function for all exchanges
   * Different exchanges may use different network ID formats
   */
  const getExchangeNetworkId = async (currency: string, chainName: string, provider: string): Promise<string> => {
    try {
      // Fetch currency data from exchange to get available networks
      const currencies = await exchange.fetchCurrencies();
      let currencyData: any;
      
      // Different exchanges may use 'id' or 'code' for currency identification
      switch (provider) {
        case "xt":
          currencyData = Object.values(currencies).find((c: any) => c.code === currency);
          break;
        default:
          currencyData = Object.values(currencies).find((c: any) => c.id === currency || c.code === currency);
          break;
      }
      
      if (currencyData && currencyData.networks) {
        const availableNetworks = Object.keys(currencyData.networks);
        console.log(`[${provider}] Available networks for ${currency}:`, availableNetworks);
        
        // First, check if the original chain name is directly available
        if (availableNetworks.includes(chainName)) {
          console.log(`[${provider}] Network mapping: ${chainName} -> ${chainName}`);
          return chainName;
        }
        
        // Try common mappings based on exchange type
        let chainMappings: { [key: string]: string } = {};
        
        if (provider === 'kucoin') {
          // KuCoin uses token standards as network IDs
          chainMappings = {
            'ETH': 'ERC20',
            'ETHEREUM': 'ERC20',
            'BSC': 'BEP20',
            'BINANCE': 'BEP20',
            'TRX': 'TRC20',
            'TRON': 'TRC20',
            'POLYGON': 'POLYGON',
            'MATIC': 'POLYGON',
            'ARBITRUM': 'ARBITRUM',
            'OPTIMISM': 'OPTIMISM',
            'BASE': 'BASE',
            'AVALANCHE': 'AVAX',
            'AVAX': 'AVAX'
          };
        } else if (provider === 'binance') {
          // Binance typically uses the chain name directly, but with some variations
          chainMappings = {
            'ETH': 'ETH',
            'ETHEREUM': 'ETH',
            'BSC': 'BSC',
            'BINANCE': 'BSC',
            'BNB': 'BSC',
            'TRX': 'TRX',
            'TRON': 'TRX',
            'POLYGON': 'MATIC',
            'MATIC': 'MATIC',
            'ARBITRUM': 'ARBITRUM',
            'OPTIMISM': 'OPTIMISM',
            'BASE': 'BASE',
            'AVALANCHE': 'AVAXC',
            'AVAX': 'AVAXC'
          };
        } else if (provider === 'xt') {
          // XT exchange mapping patterns
          chainMappings = {
            'ETH': 'ERC20',
            'ETHEREUM': 'ERC20', 
            'BSC': 'BEP20',
            'BINANCE': 'BEP20',
            'BNB': 'BEP20',
            'TRX': 'TRC20',
            'TRON': 'TRC20',
            'POLYGON': 'POLYGON',
            'MATIC': 'POLYGON',
            'ARBITRUM': 'ARBITRUM',
            'OPTIMISM': 'OPTIMISM',
            'BASE': 'BASE',
            'AVALANCHE': 'AVAX',
            'AVAX': 'AVAX'
          };
        }
        
        // Try mapping blockchain names to exchange-specific network IDs
        const mappedName = chainMappings[chainName.toUpperCase()];
        if (mappedName && availableNetworks.includes(mappedName)) {
          console.log(`[${provider}] Network mapping: ${chainName} -> ${mappedName}`);
          return mappedName;
        }
        
        // If still not found, try case-insensitive search
        const caseInsensitiveMatch = availableNetworks.find(net => 
          net.toLowerCase() === chainName.toLowerCase()
        );
        if (caseInsensitiveMatch) {
          console.log(`[${provider}] Network mapping: ${chainName} -> ${caseInsensitiveMatch}`);
          return caseInsensitiveMatch;
        }
        
        // Try partial matches for common patterns
        const partialMatch = availableNetworks.find(net => {
          const netUpper = net.toUpperCase();
          const chainUpper = chainName.toUpperCase();
          return netUpper.includes(chainUpper) || chainUpper.includes(netUpper);
        });
        if (partialMatch) {
          console.log(`[${provider}] Network mapping (partial): ${chainName} -> ${partialMatch}`);
          return partialMatch;
        }
        
        // Last resort: try to find by network info properties
        for (const [networkId, networkInfo] of Object.entries(currencyData.networks)) {
          const network = networkInfo as any;
          if (
            network.name === chainName ||
            network.network === chainName ||
            (network.name && network.name.toUpperCase() === chainName.toUpperCase()) ||
            (network.network && network.network.toUpperCase() === chainName.toUpperCase())
          ) {
            console.log(`[${provider}] Network mapping (by properties): ${chainName} -> ${networkId}`);
            return networkId;
          }
        }
        
        console.log(`[${provider}] No mapping found for ${chainName} in available networks:`, availableNetworks);
      } else {
        console.log(`[${provider}] No currency data or networks found for ${currency}`);
      }
      
      console.log(`[${provider}] No mapping found for ${chainName}, using as-is`);
      return chainName;
    } catch (error) {
      console.error(`[${provider}] Error in network mapping:`, error);
      // Return the original chain name as fallback
      return chainName;
    }
  };

  try {
    let networkToUse = method;

    // Handle network mapping for all supported exchanges
    if (method && ['kucoin', 'binance', 'xt'].includes(provider)) {
      if (provider === 'kucoin') {
        // Keep the existing KuCoin-specific logic for backwards compatibility
        networkToUse = await getKuCoinNetworkId(code, method as string);
      } else {
        // Use universal mapping for Binance and XT (method is guaranteed to be non-null here due to outer if check)
        networkToUse = await getExchangeNetworkId(code, method as string, provider);
      }
      
      // Add detailed currency network logging for debugging
      try {
        const currencies = await exchange.fetchCurrencies();
        let currencyData: any;
        
        switch (provider) {
          case "xt":
            currencyData = Object.values(currencies).find((c: any) => c.code === code);
            break;
          default:
            currencyData = Object.values(currencies).find((c: any) => c.id === code || c.code === code);
            break;
        }
        
        if (currencyData && currencyData.networks) {
          Object.entries(currencyData.networks).forEach(([networkId, networkInfo]: [string, any]) => {
            // Only log if this is the network we're trying to use
            if (networkId === networkToUse) {
              console.log(`[${provider}] Using network ${networkId} for ${code}: deposit=${networkInfo.deposit}, active=${networkInfo.active}`);
            }
          });
        }
      } catch (debugError) {
        // Silent - not critical for functionality
      }
    }

    let depositAddress;
    
    // Special handling for KuCoin which requires complex network mapping and multiple fallback methods
    if (provider === 'kucoin') {
      try {
        // Method 1: Try fetchDepositAddressesByNetwork first (if supported)
        if (!depositAddress && exchange.has['fetchDepositAddressesByNetwork']) {
          try {
            const result = await exchange.fetchDepositAddressesByNetwork(code, networkToUse);
            
            // Check if we got a valid response
            if (result && typeof result === 'object' && Object.keys(result).length > 0) {
              // Extract the address from the network-specific response
              const networkResponse = result[networkToUse] || result;
              if (networkResponse && (networkResponse.address || networkResponse.Address)) {
                depositAddress = networkResponse;
                console.log(`[${provider}] Method 1 Success: fetchDepositAddressesByNetwork for ${code}/${networkToUse}`);
              }
            }
          } catch (method1Error) {
            console.log(`[${provider}] Method 1 Failed: fetchDepositAddressesByNetwork - ${method1Error.message}`);
          }
        }
        
        // Method 2: Try fetchDepositAddresses if first method failed
        if (!depositAddress && exchange.has['fetchDepositAddresses']) {
          try {
            const allAddresses = await exchange.fetchDepositAddresses(code);
            
            if (allAddresses && typeof allAddresses === 'object') {
              // Look for the specific network
              const networkAddress = allAddresses[networkToUse];
              if (networkAddress && (networkAddress.address || networkAddress.Address)) {
                depositAddress = networkAddress;
                console.log(`[${provider}] Method 2 Success: fetchDepositAddresses for ${code}/${networkToUse}`);
              }
            }
          } catch (method2Error) {
            console.log(`[${provider}] Method 2 Failed: fetchDepositAddresses - ${method2Error.message}`);
          }
        }
        
        // Method 3: Try createDepositAddress (some exchanges require creating new addresses)
        if (!depositAddress && exchange.has['createDepositAddress']) {
          try {
            const result = await exchange.createDepositAddress(code, { network: networkToUse });
            
            if (result && (result.address || result.Address)) {
              depositAddress = result;
              console.log(`[${provider}] Method 3 Success: createDepositAddress for ${code}/${networkToUse}`);
            }
          } catch (createError) {
            console.log(`[${provider}] Method 3 Failed: createDepositAddress - ${createError.message}`);
          }
        }
        
        // Method 4: Try fetchDepositAddress with network parameter
        if (!depositAddress && exchange.has['fetchDepositAddress']) {
          try {
            const result = await exchange.fetchDepositAddress(code, { network: networkToUse });
            
            if (result && (result.address || result.Address)) {
              depositAddress = result;
              console.log(`[${provider}] Method 4 Success: fetchDepositAddress with network for ${code}/${networkToUse}`);
            }
          } catch (method3Error) {
            console.log(`[${provider}] Method 4 Failed: fetchDepositAddress with network - ${method3Error.message}`);
          }
        }
        
        // Method 5: Try fetchDepositAddress without network parameter as last resort
        if (!depositAddress && exchange.has['fetchDepositAddress']) {
          try {
            const simpleAddress = await exchange.fetchDepositAddress(code);
            
            if (simpleAddress && (simpleAddress.address || simpleAddress.Address)) {
              depositAddress = simpleAddress;
              console.log(`[${provider}] Method 5 Success: fetchDepositAddress simple for ${code}`);
            }
          } catch (method4Error) {
            console.log(`[${provider}] Method 5 Failed: fetchDepositAddress simple - ${method4Error.message}`);
          }
        }
        
        if (!depositAddress) {
          console.log(`[${provider}] All methods failed to generate deposit address for ${code}/${networkToUse}`);
          throw new Error(`${provider} exchange does not support deposit address generation for ${code}/${networkToUse}. Available methods: ${Object.keys(exchange.has).filter(method => method.includes('Deposit')).join(', ')}`);
        }
          
      } catch (kucoinError) {
        console.error(`[${provider}] Error during deposit address fetching:`, kucoinError);
        throw kucoinError;
      }
    } else {
      // Use the original working logic for Binance, XT and other exchanges
  try {
    if (exchange.has["fetchDepositAddressesByNetwork"]) {
          depositAddress = await exchange.fetchDepositAddressesByNetwork(code, networkToUse);
          
          if (!depositAddress || !validateDepositAddressResponse(depositAddress, networkToUse)) {
            throw new Error("fetchDepositAddressesByNetwork returned invalid data");
          }
          
          // Extract address from network-specific response
          const networkResponse = depositAddress[networkToUse] || depositAddress;
          if (networkResponse && (networkResponse.address || networkResponse.Address)) {
            depositAddress = networkResponse;
          }
    } else if (exchange.has["fetchDepositAddresses"]) {
      const depositAddresses = await exchange.fetchDepositAddresses(code);
          if (!depositAddresses) throw new Error("fetchDepositAddresses returned no data");

          depositAddress = depositAddresses[networkToUse];
          if (!depositAddress) throw new Error(`No address found for network ${networkToUse}`);
    } else if (exchange.has["fetchDepositAddress"]) {
          let network = networkToUse;
          
          // Apply network mapping for XT exchange
      if (provider === "xt") {
        network = handleNetworkMapping(network);
      }
          
          depositAddress = await exchange.fetchDepositAddress(code, { network });
          if (!depositAddress) throw new Error("fetchDepositAddress returned no data");
        } else {
          throw new Error(`Exchange ${provider} does not support any deposit address methods`);
        }
      } catch (error: any) {
        console.error(`[${provider}] Error during deposit address fetching:`, error);
        throw error;
      }
    }

    // Validate the response
    if (!validateDepositAddressResponse(depositAddress, networkToUse)) {
      throw createError(500, sanitizeErrorMessage("Deposit address generation failed. The exchange returned invalid or empty address data. Please try again later or contact support."));
    }

    // Return the address with trx: true flag for compatibility
    return { ...depositAddress, trx: true };
  } catch (error: any) {
    // If it's already a createError with statusCode, preserve it
    if (error.statusCode) {
      throw error;
    }
    
    console.error(`[Exchange Error] ${provider} - ${code}/${method}:`, error);
    const message = sanitizeErrorMessage(error.message);
    throw createError(404, message);
  }
};

/**
 * Handle network mapping for XT exchange (from original working code)
 */
export function handleNetworkMapping(network: string) {
  switch (network) {
    case "TRON":
      return "TRX";
    case "ETH":
      return "ERC20";
    case "BSC":
      return "BEP20";
    case "POLYGON":
      return "MATIC";
    default:
      return network;
  }
}

export function handleNetworkMappingReverse(network: string) {
  switch (network) {
    case "TRX":
      return "TRON";
    case "ERC20":
      return "ETH";
    case "BEP20":
      return "BSC";
    case "MATIC":
      return "POLYGON";
    default:
      return network;
  }
}
