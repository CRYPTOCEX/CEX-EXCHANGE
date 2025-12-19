"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { detectProvider } from "@/utils/blockchain";
import { ChevronRight, ChevronLeft, Wallet, Shield, Download, CheckCircle, AlertCircle, Info, ExternalLink } from "lucide-react";
import { useWalletStore } from "@/store/nft/wallet-store";
import { useTranslations } from "next-intl";

interface WalletOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
  content: React.ReactNode;
}

export function WalletOnboarding({ onComplete, onSkip }: WalletOnboardingProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const { connectWallet: connectWalletStore, isConnected } = useWalletStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [walletDetected, setWalletDetected] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    const provider = await detectProvider();
    setWalletDetected(!!provider);
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await connectWalletStore();

      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const walletOptions = [
    {
      id: "metamask",
      name: "MetaMask",
      description: "Most popular Ethereum wallet",
      icon: "🦊",
      installUrl: "https://metamask.io/download/",
      detected: walletDetected && window.ethereum?.isMetaMask
    },
    {
      id: "coinbase",
      name: "Coinbase Wallet",
      description: "User-friendly wallet by Coinbase",
      icon: "💙",
      installUrl: "https://www.coinbase.com/wallet",
      detected: walletDetected && window.ethereum?.isCoinbaseWallet
    },
    {
      id: "trustwallet",
      name: "Trust Wallet",
      description: "Mobile-first crypto wallet",
      icon: "🛡️",
      installUrl: "https://trustwallet.com/",
      detected: false
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      description: "Connect any mobile wallet",
      icon: "🔗",
      installUrl: "https://walletconnect.com/",
      detected: true
    }
  ];

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to NFT Marketplace",
      description: "Let's get you set up with a Web3 wallet to start trading NFTs",
      icon: <Wallet className="w-12 h-12" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
            <h3 className="flex items-center gap-2 font-semibold mb-2 text-blue-900 dark:text-blue-400">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              {t("what_is_a_web3_wallet")}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              {t("a_web3_wallet_is_like_a")}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-400">
              <li>• {t("store_cryptocurrencies_and_nfts")}</li>
              <li>• {t("sign_transactions_securely")}</li>
              <li>• {t("connect_to_decentralized_apps_dapps")}</li>
              <li>• {t("maintain_full_control_of_your_assets")}</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
            <h3 className="flex items-center gap-2 font-semibold mb-2 text-amber-900 dark:text-amber-400">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              {t("security_first")}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              {t("your_wallet_is_protected_by_a")} {t("never_share_this_with_anyone")}
            </p>
          </div>
        </div>
      )
    },
    {
      id: "choose-wallet",
      title: "Choose Your Wallet",
      description: "Select a wallet provider to get started",
      icon: <Download className="w-12 h-12" />,
      content: (
        <div className="space-y-4">
          {walletOptions.map((wallet) => (
            <div
              key={wallet.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedWallet === wallet.id
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-500/20 dark:border-primary-400"
                  : "border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-gray-700 dark:bg-gray-900/50"
              }`}
              onClick={() => setSelectedWallet(wallet.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-200">{wallet.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {wallet.description}
                    </p>
                  </div>
                </div>
                {wallet.detected ? (
                  <span className="text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded border border-green-200 dark:border-green-500/20">
                    Detected
                  </span>
                ) : (
                  <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded flex items-center gap-1 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Install
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
          
          {!walletDetected && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3">
              <p className="text-sm text-amber-900 dark:text-amber-400">
                {t("no_wallet_detected")} {t("please_install_one_of_the_wallets")}
              </p>
            </div>
          )}
        </div>
      )
    },
    {
      id: "connect",
      title: "Connect Your Wallet",
      description: "Connect your wallet to the marketplace",
      icon: <CheckCircle className="w-12 h-12" />,
      action: connectWallet,
      actionLabel: isConnecting ? "Connecting..." : "Connect Wallet",
      content: (
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-6 text-center">
            {isConnected ? (
              <div className="space-y-4">
                <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{tCommon("wallet_connected")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("your_wallet_is_now_connected_to_the_marketplace")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Wallet className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{t("ready_to_connect")}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("click_the_button_below_to_connect_your_wallet")} {t("a_popup_will_appear_asking_for_permission")}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-200">{t("what_happens_when_you_connect")}</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t("the_site_can_see_your_wallet")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t("you_can_buy_sell_and_trade_nfts")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t("you_always_approve_transactions_manually")}</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-500 mt-0.5 flex-shrink-0" />
                <span>{t("your_private_keys_remain_secure_in_your_wallet")}</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: "complete",
      title: "You're All Set!",
      description: "Start exploring the NFT marketplace",
      icon: <CheckCircle className="w-12 h-12 text-green-500" />,
      action: onComplete,
      actionLabel: "Start Exploring",
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-green-900 dark:text-green-400">{tCommon("setup_complete")}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-400">
              {t("your_wallet_is_connected_and_youre")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-200">{t("whats_next")}</h4>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-400">
                <li>{t("browse_nft_collections")}</li>
                <li>{t("create_your_first_nft")}</li>
                <li>{t("join_the_community")}</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-200">{t("pro_tips")}</h4>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-400">
                <li>{t("keep_your_recovery_phrase_safe")}</li>
                <li>{t("verify_transactions_carefully")}</li>
                <li>{t("start_with_small_amounts")}</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-950 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-primary-600 dark:text-primary-500">
                {currentStepData.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-200">{currentStepData.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentStepData.description}
                </p>
              </div>
            </div>
            {onSkip && currentStep === 0 && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  index <= currentStep
                    ? "bg-primary-600 dark:bg-primary-400"
                    : "bg-gray-200 dark:bg-gray-800"
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStepData.content}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            {currentStepData.action ? (
              <button
                onClick={currentStepData.action}
                disabled={isConnecting || (currentStep === 1 && !selectedWallet)}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {currentStepData.actionLabel}
                {!isConnecting && <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === 1 && !selectedWallet}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}