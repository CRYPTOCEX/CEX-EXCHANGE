"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Wallet } from "lucide-react";
import { GasEstimator } from "./gas-estimator";
import { useGasEstimation } from "@/hooks/use-gas-estimation";
import { useUserStore } from "@/store/user";

interface MintFormProps {
  collectionAddress: string;
  chain?: string;
  onMint?: (tokenData: any) => void;
}

export function MintFormWithGas({ 
  collectionAddress, 
  chain = "ETH", 
  onMint 
}: MintFormProps) {
  const { user } = useUserStore();
  const [formData, setFormData] = useState({
    recipientAddress: user?.walletAddress || "",
    amount: "0" // Mint price if required
  });
  const [minting, setMinting] = useState(false);

  // Get gas estimation for minting
  const { estimate, loading: gasLoading, canAfford } = useGasEstimation({
    operation: "mint",
    chain,
    contractAddress: collectionAddress,
    recipientAddress: formData.recipientAddress,
    amount: formData.amount
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMint = async () => {
    if (!user?.walletAddress || !estimate) return;

    setMinting(true);
    try {
      // Here you would integrate with your actual minting logic
      // const result = await mintNFT({...formData, gasEstimate: estimate});
      
      // Mock success for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onMint?.({
        ...formData,
        gasUsed: estimate.gasLimit,
        transactionCost: estimate.gasCostEth
      });
      
    } catch (error) {
      console.error("Minting failed:", error);
    } finally {
      setMinting(false);
    }
  };

  // Check if user can afford the operation (assuming they have balance in wei)
  const userBalance = user?.balance || "0"; // This should be wallet balance in wei
  const canAffordGas = canAfford(userBalance, 15); // 15% buffer

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mint NFT</CardTitle>
          <CardDescription>
            Mint a new NFT from this collection
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              value={formData.recipientAddress}
              onChange={(e) => handleInputChange("recipientAddress", e.target.value)}
              placeholder="0x..."
              disabled={minting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Mint Price (in wei)</Label>
            <Input
              id="amount"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              placeholder="0"
              disabled={minting}
            />
            <p className="text-xs text-muted-foreground">
              Leave as 0 for free mints, or enter the required mint price
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gas Estimation */}
      <GasEstimator
        operation="mint"
        chain={chain}
        contractAddress={collectionAddress}
        recipientAddress={formData.recipientAddress}
        amount={formData.amount}
        showDetails={true}
      />

      {/* Balance Warning */}
      {estimate && !canAffordGas && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Insufficient Balance</p>
                <p className="text-sm text-orange-600">
                  You may not have enough {chain} to cover gas fees. 
                  Current estimate: {estimate.gasCostEth} {chain}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex space-x-3">
        <Button
          onClick={handleMint}
          disabled={
            minting || 
            gasLoading || 
            !estimate || 
            !formData.recipientAddress || 
            !user?.walletAddress
          }
          className="flex-1"
        >
          {minting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Minting...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Mint NFT
              {estimate && ` (${estimate.gasCostUsd} USD)`}
            </>
          )}
        </Button>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center">
        Gas estimates are approximate and may vary based on network conditions. 
        Actual costs may be higher during network congestion.
      </p>
    </div>
  );
}