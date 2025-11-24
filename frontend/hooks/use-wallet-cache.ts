import { useCallback } from 'react';

/**
 * Hook for managing wallet cache to prevent duplicate API calls
 */
export function useWalletCache() {
  const clearCache = useCallback((pattern?: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      if (pattern) {
        // Clear specific cache entries matching pattern
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.includes(pattern)) {
            sessionStorage.removeItem(key);
          }
        });
        console.log(`[Wallet Cache] Cleared cache entries matching: ${pattern}`);
      } else {
        // Clear all wallet cache entries
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith('wallet_') || key.startsWith('trade_wallet_')) {
            sessionStorage.removeItem(key);
          }
        });
        console.log('[Wallet Cache] Cleared all wallet cache entries');
      }
    } catch (error) {
      console.error('[Wallet Cache] Error clearing cache:', error);
    }
  }, []);

  const getCachedWallet = useCallback((currency: string, type: 'binary' | 'trade' = 'binary') => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cacheKey = type === 'binary' ? `wallet_${currency}` : `trade_wallet_${currency}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (30 seconds)
        if (now - timestamp < 30000) {
          return data;
        } else {
          // Remove expired cache
          sessionStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('[Wallet Cache] Error reading cache:', error);
    }
    
    return null;
  }, []);

  const setCachedWallet = useCallback((currency: string, data: any, type: 'binary' | 'trade' = 'binary') => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheKey = type === 'binary' ? `wallet_${currency}` : `trade_wallet_${currency}`;
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[Wallet Cache] Error setting cache:', error);
    }
  }, []);

  return {
    clearCache,
    getCachedWallet,
    setCachedWallet
  };
}

// Utility function to clear wallet cache on order completion or balance changes
export const clearWalletCacheOnUpdate = (currency?: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (currency) {
      // Clear cache for specific currency
      sessionStorage.removeItem(`wallet_${currency}`);
      sessionStorage.removeItem(`trade_wallet_${currency}`);
      console.log(`[Wallet Cache] Cleared cache for ${currency}`);
    } else {
      // Clear all wallet cache
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('wallet_') || key.startsWith('trade_wallet_')) {
          sessionStorage.removeItem(key);
        }
      });
      console.log('[Wallet Cache] Cleared all wallet cache on update');
    }
  } catch (error) {
    console.error('[Wallet Cache] Error clearing cache on update:', error);
  }
}; 