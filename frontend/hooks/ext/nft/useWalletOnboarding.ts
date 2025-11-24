import { useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export function useWalletOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage(
    "nft-wallet-onboarding-completed",
    false
  );

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  // Removed auto-check on mount to prevent triggering wallet popup
  // Wallet connection state should be managed by WalletProvider/AppKit

  const checkWalletConnection = async () => {
    // This function is kept for backward compatibility but does nothing
    // Actual wallet state should come from useWalletStore or AppKit hooks
    return;
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