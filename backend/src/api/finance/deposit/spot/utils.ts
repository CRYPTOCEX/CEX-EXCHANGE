import { models } from "@b/db";

export function parseTransactionMetadata(metadata: string | object) {
  if (!metadata) return {};
  
  if (typeof metadata === "string") {
    try {
      // Unescape the string if it's not valid JSON
      let metadataStr = metadata;
      if (!isValidJSON(metadataStr)) {
        metadataStr = unescapeString(metadataStr);
      }
      // Parse the unescaped string
      let parsedMetadata = JSON.parse(metadataStr);

      // If the parsed metadata is still a string, parse it again
      if (typeof parsedMetadata === "string") {
        try {
          parsedMetadata = JSON.parse(parsedMetadata.trim());
        } catch (error) {
          console.error(
            "Error parsing transaction metadata on second attempt:",
            parsedMetadata,
            error.message
          );
          return {};
        }
      }
      return parsedMetadata;
    } catch (error) {
      console.error(
        "Error parsing transaction metadata on first attempt:",
        metadata,
        error.message
      );
      return {};
    }
  }
  
  return metadata || {};
}

export function parseMetadataAndMapChainToXt(metadata: string | object) {
  const parsedMetadata = parseTransactionMetadata(metadata);
  const xtChain = mapToXtNetwork(parsedMetadata.chain);
  
  return {
    metadata: parsedMetadata,
    xtChain
  };
}

export function mapToXtNetwork(chain: string): string | null {
  if (!chain) return null;
  
  const chainMapping: Record<string, string> = {
    'TRC20': 'Tron',
    'TRX': 'Tron',
    'ERC20': 'Ethereum', 
    'ETH': 'Ethereum',
    'BEP20': 'BNB Smart Chain',
    'BSC': 'BNB Smart Chain',
    'BNB': 'BNB Smart Chain',
    'POLYGON': 'Polygon',
    'MATIC': 'Polygon',
    'ARBITRUM': 'ARB',
    'ARB': 'ARB',
    'OPTIMISM': 'OPT',
    'OPT': 'OPT',
    'AVAX': 'AVAX C-Chain',
    'AVALANCHE': 'AVAX C-Chain',
    'SOL': 'SOL-SOL',
    'SOLANA': 'SOL-SOL',
    'BTC': 'Bitcoin',
    'BITCOIN': 'Bitcoin',
    'LTC': 'Litecoin',
    'LITECOIN': 'Litecoin',
    'DOGE': 'Dogecoin',
    'DOGECOIN': 'Dogecoin',
    'BASE': 'BASE',
    'ETC': 'Ethereum Classic',
    'BCH': 'Bitcoin Cash'
  };
  
  return chainMapping[chain.toUpperCase()] || null;
}

function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

function unescapeString(str: string): string {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
} 