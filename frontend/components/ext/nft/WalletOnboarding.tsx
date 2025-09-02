"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { detectProvider } from "@/utils/blockchain";
import { ChevronRight, ChevronLeft, Wallet, Shield, Download, CheckCircle, AlertCircle, Info, ExternalLink } from "lucide-react";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [walletDetected, setWalletDetected] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWalletStatus();
  }, []);

  const checkWalletStatus = async () => {
    const provider = await detectProvider();
    setWalletDetected(!!provider);
    
    if (provider && provider.selectedAddress) {
      setWalletConnected(true);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const provider = await detectProvider();
      if (!provider) {
        throw new Error("No wallet detected");
      }
      
      const accounts = await provider.request({ 
        method: "eth_requestAccounts" 
      });
      
      if (accounts.length > 0) {
        setWalletConnected(true);
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 1000);
      }
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <Info className="w-5 h-5" />
              What is a Web3 Wallet?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A Web3 wallet is like a digital bank account that lets you:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• Store cryptocurrencies and NFTs</li>
              <li>• Sign transactions securely</li>
              <li>• Connect to decentralized apps (dApps)</li>
              <li>• Maintain full control of your assets</li>
            </ul>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <Shield className="w-5 h-5" />
              Security First
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your wallet is protected by a secret recovery phrase. Never share this with anyone!
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
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-primary-300"
              }`}
              onClick={() => setSelectedWallet(wallet.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{wallet.icon}</span>
                  <div>
                    <h4 className="font-semibold">{wallet.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {wallet.description}
                    </p>
                  </div>
                </div>
                {wallet.detected ? (
                  <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                    Detected
                  </span>
                ) : (
                  <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded flex items-center gap-1"
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
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No wallet detected. Please install one of the wallets above and refresh the page.
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
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
            {walletConnected ? (
              <div className="space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">Wallet Connected!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your wallet is now connected to the marketplace
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Wallet className="w-16 h-16 text-gray-400 mx-auto" />
                <h3 className="text-lg font-semibold">Ready to Connect</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click the button below to connect your wallet. A popup will appear asking for permission.
                </p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <h4 className="font-semibold">What happens when you connect:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>The site can see your wallet address and NFT balance</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>You can buy, sell, and trade NFTs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>You always approve transactions manually</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
                <span>Your private keys remain secure in your wallet</span>
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
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your wallet is connected and you're ready to start trading NFTs
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Browse NFT collections</li>
                <li>• Create your first NFT</li>
                <li>• Join the community</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Pro Tips</h4>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Keep your recovery phrase safe</li>
                <li>• Verify transactions carefully</li>
                <li>• Start with small amounts</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {currentStepData.icon}
              <div>
                <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentStepData.description}
                </p>
              </div>
            </div>
            {onSkip && currentStep === 0 && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                    ? "bg-primary-500"
                    : "bg-gray-200 dark:bg-gray-700"
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
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            
            {currentStepData.action ? (
              <button
                onClick={currentStepData.action}
                disabled={isConnecting || (currentStep === 1 && !selectedWallet)}
                className="btn btn-primary flex items-center gap-2"
              >
                {currentStepData.actionLabel}
                {!isConnecting && <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === 1 && !selectedWallet}
                className="btn btn-primary flex items-center gap-2"
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