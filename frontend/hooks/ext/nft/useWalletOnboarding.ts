import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useWalletOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage(
    "nft-wallet-onboarding-completed",
    false
  );
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  
  useEffect(() => {
    checkWalletConnection();
  }, []);
  
  const checkWalletConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      const accounts = await window.ethereum.request({ 
        method: "eth_accounts" 
      }).catch(() => []);
      
      setWalletConnected(accounts.length > 0);
      
      // Show onboarding if wallet not connected and hasn't completed before
      if (accounts.length === 0 && !hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    } else if (!hasCompletedOnboarding) {
      // No wallet detected and hasn't completed onboarding
      setShowOnboarding(true);
    }
  };
  
  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  };
  
  const skipOnboarding = () => {
    setShowOnboarding(false);
  };
  
  const resetOnboarding = () => {
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
  };
  
  return {
    showOnboarding,
    walletConnected,
    hasCompletedOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    checkWalletConnection
  };
}