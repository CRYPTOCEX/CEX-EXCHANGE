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
    'TRC20': 'TRX',
    'ERC20': 'ETH', 
    'BEP20': 'BSC',
    'POLYGON': 'MATIC',
    'ARBITRUM': 'ARBITRUM',
    'OPTIMISM': 'OPTIMISM',
    'AVAX': 'AVAX',
    'SOL': 'SOL',
    'BTC': 'BTC',
    'LTC': 'LTC',
    'DOGE': 'DOGE'
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