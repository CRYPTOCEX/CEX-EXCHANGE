/**
 * Blockchain utility functions for wallet detection and interaction
 */

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Detect if a Web3 provider (like MetaMask) is available
 */
export async function detectProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  // Check for MetaMask or other injected providers
  if (window.ethereum) {
    return window.ethereum;
  }

  // Wait a bit for provider to be injected
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (window.ethereum) {
        clearInterval(checkInterval);
        resolve(window.ethereum);
      }
    }, 100);

    // Timeout after 3 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(null);
    }, 3000);
  });
}

/**
 * Request wallet connection
 */
export async function requestAccount() {
  const provider = await detectProvider();
  
  if (!provider) {
    throw new Error("No Web3 provider detected");
  }

  try {
    const accounts = await provider.request({ 
      method: "eth_requestAccounts" 
    });
    return accounts[0];
  } catch (error) {
    throw error;
  }
}

/**
 * Get connected accounts
 */
export async function getAccounts() {
  const provider = await detectProvider();
  
  if (!provider) {
    return [];
  }

  try {
    const accounts = await provider.request({ 
      method: "eth_accounts" 
    });
    return accounts;
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
}

/**
 * Get current network/chain ID
 */
export async function getChainId() {
  const provider = await detectProvider();
  
  if (!provider) {
    return null;
  }

  try {
    const chainId = await provider.request({ 
      method: "eth_chainId" 
    });
    return chainId;
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
}