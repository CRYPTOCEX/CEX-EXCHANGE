"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Building2,
  Coins,
  Settings,
  Pause,
  Play,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Wallet,
  Activity,
  Zap,
  Copy,
  Eye,
  DollarSign,
  BookOpen
} from "lucide-react";

interface MarketplaceContract {
  chain: string;
  contractAddress: string | null;
  isActive: boolean;
  error?: string;
  balance?: string;
  balanceUSD?: number;
  currency?: string;
  feePercentage?: number;
  feeRecipient?: string;
  isPaused?: boolean;
  deployedAt?: string;
}

interface DeploymentForm {
  chain: string;
  feeRecipient: string;
  feePercentage: number;
}

interface ConfigForm {
  chain: string;
  contractAddress: string;
  feePercentage?: number;
  feeRecipient?: string;
}

interface EmergencyForm {
  chain: string;
  contractAddress: string;
  reason: string;
}

interface WithdrawForm {
  chain: string;
  contractAddress: string;
  amount: string;
  withdrawalAddress: string;
  reason: string;
}

export default function MarketplaceManagementClient() {
  const t = useTranslations("ext");
  const [contracts, setContracts] = useState<{ [chain: string]: MarketplaceContract }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [deployForm, setDeployForm] = useState<DeploymentForm>({
    chain: "ETH",
    feeRecipient: "",
    feePercentage: 2.5
  });

  const [configForm, setConfigForm] = useState<ConfigForm>({
    chain: "ETH",
    contractAddress: "",
    feePercentage: undefined,
    feeRecipient: ""
  });

  const [emergencyForm, setEmergencyForm] = useState<EmergencyForm>({
    chain: "ETH",
    contractAddress: "",
    reason: ""
  });

  const [withdrawForm, setWithdrawForm] = useState<WithdrawForm>({
    chain: "ETH",
    contractAddress: "",
    amount: "",
    withdrawalAddress: "",
    reason: ""
  });

  // Loading states
  const [deploying, setDeploying] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const supportedChains = ["ETH", "BSC", "POLYGON", "ARBITRUM", "OPTIMISM"];

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      
      // Fetch contract addresses
      const contractsResponse = await $fetch({
        url: "/api/nft/marketplace/contract",
        silentSuccess: true
      });

      if (contractsResponse.error) {
        throw new Error(contractsResponse.error);
      }

      const contractData = contractsResponse.data || contractsResponse;
      const enrichedContracts: { [chain: string]: MarketplaceContract } = {};

      // Fetch additional data for each chain
      for (const chain of supportedChains) {
        const baseContract = contractData[chain] || {
          chain,
          contractAddress: null,
          isActive: false
        };

        if (baseContract.contractAddress) {
          try {
            // Fetch marketplace info
            const infoResponse = await $fetch({
              url: "/api/nft/marketplace/info",
              params: { chain },
              silentSuccess: true
            });

            // Fetch balance
            const balanceResponse = await $fetch({
              url: "/api/nft/marketplace/balance",
              params: { chain },
              silentSuccess: true
            });

            enrichedContracts[chain] = {
              ...baseContract,
              feePercentage: infoResponse.data?.feePercentage,
              feeRecipient: infoResponse.data?.feeRecipient,
              deployedAt: infoResponse.data?.deployedAt,
              balance: balanceResponse.data?.balance,
              balanceUSD: balanceResponse.data?.balanceUSD,
              currency: balanceResponse.data?.currency,
              isPaused: false // TODO: Add pause status to API
            };
          } catch (error) {
            enrichedContracts[chain] = {
              ...baseContract,
              error: "Failed to fetch additional data"
            };
          }
        } else {
          enrichedContracts[chain] = baseContract;
        }
      }

      setContracts(enrichedContracts);
    } catch (error) {
      toast.error("Failed to load marketplace data");
      console.error("Marketplace data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    try {
      setDeploying(true);

      const response = await $fetch({
        url: "/api/nft/marketplace/deploy",
        method: "POST",
        body: deployForm
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(`Marketplace deployed successfully on ${deployForm.chain}`);
      setDeployForm({ chain: "ETH", feeRecipient: "", feePercentage: 2.5 });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deploy marketplace");
    } finally {
      setDeploying(false);
    }
  };

  const handleConfigUpdate = async () => {
    try {
      setConfiguring(true);

      const response = await $fetch({
        url: "/api/nft/marketplace/config",
        method: "PUT",
        body: configForm
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Marketplace configuration updated successfully");
      setConfigForm({ chain: "ETH", contractAddress: "", feePercentage: undefined, feeRecipient: "" });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update configuration");
    } finally {
      setConfiguring(false);
    }
  };

  const handlePause = async (action: "pause" | "unpause") => {
    try {
      setPausing(true);

      const response = await $fetch({
        url: `/api/nft/marketplace/${action}`,
        method: "POST",
        body: emergencyForm
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(`Marketplace ${action}d successfully`);
      setEmergencyForm({ chain: "ETH", contractAddress: "", reason: "" });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} marketplace`);
    } finally {
      setPausing(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);

      const response = await $fetch({
        url: "/api/nft/marketplace/withdraw",
        method: "POST",
        body: withdrawForm
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Marketplace fees withdrawn successfully");
      setWithdrawForm({ chain: "ETH", contractAddress: "", amount: "", withdrawalAddress: "", reason: "" });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to withdraw fees");
    } finally {
      setWithdrawing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getChainExplorer = (chain: string, address: string) => {
    const explorers: { [key: string]: string } = {
      ETH: `https://etherscan.io/address/${address}`,
      BSC: `https://bscscan.com/address/${address}`,
      POLYGON: `https://polygonscan.com/address/${address}`,
      ARBITRUM: `https://arbiscan.io/address/${address}`,
      OPTIMISM: `https://optimistic.etherscan.io/address/${address}`
    };
    return explorers[chain] || `https://etherscan.io/address/${address}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Marketplace Contract Management</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketplace Contract Management</h1>
          <p className="text-muted-foreground">
            Deploy and manage NFT marketplace contracts across multiple blockchains
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMarketplaceData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Contract Overview Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {supportedChains.map((chain) => {
          const contract = contracts[chain];
          const isDeployed = contract?.contractAddress && contract.isActive;
          
          return (
            <Card key={chain} className={`${isDeployed ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20"}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{chain}</CardTitle>
                <div className="flex items-center gap-2">
                  {isDeployed ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Deployed
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isDeployed ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Contract:</span>
                      <code className="text-xs bg-muted px-1 rounded flex-1 truncate">
                        {contract.contractAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(contract.contractAddress!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(getChainExplorer(chain, contract.contractAddress!), "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Balance:</span>
                        <div className="font-medium">
                          {contract.balance ? `${parseFloat(contract.balance).toFixed(4)} ${contract.currency}` : "Loading..."}
                        </div>
                        {contract.balanceUSD && (
                          <div className="text-muted-foreground">
                            {formatCurrency(contract.balanceUSD)}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fee:</span>
                        <div className="font-medium">
                          {contract.feePercentage ? `${contract.feePercentage}%` : "Loading..."}
                        </div>
                      </div>
                    </div>

                    {contract.error && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {contract.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      No marketplace deployed
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setDeployForm({ ...deployForm, chain })}>
                          <Zap className="h-3 w-3 mr-1" />
                          Deploy
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Deploy Marketplace Contract</DialogTitle>
                          <DialogDescription>
                            Deploy a new NFT marketplace contract to {chain}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="feeRecipient">Fee Recipient Address</Label>
                            <Input
                              id="feeRecipient"
                              placeholder="0x..."
                              value={deployForm.feeRecipient}
                              onChange={(e) => setDeployForm({ ...deployForm, feeRecipient: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Leave empty to use master wallet
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="feePercentage">Fee Percentage (%)</Label>
                            <Input
                              id="feePercentage"
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={deployForm.feePercentage}
                              onChange={(e) => setDeployForm({ ...deployForm, feePercentage: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <Button onClick={handleDeploy} disabled={deploying} className="w-full">
                            {deploying ? "Deploying..." : "Deploy Contract"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Controls</TabsTrigger>
          <TabsTrigger value="withdraw">Revenue Withdrawal</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Marketplace Configuration
              </CardTitle>
              <CardDescription>
                Update marketplace fees and recipient wallet addresses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportedChains.filter(chain => contracts[chain]?.contractAddress).length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p><strong>No marketplace contracts deployed yet!</strong></p>
                      <p>You need to deploy at least one marketplace contract before you can configure settings.</p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/admin/nft/onboarding">
                          <Button size="sm" variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Follow Setup Guide
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          onClick={() => setDeployForm({ chain: "ETH", feeRecipient: "", feePercentage: 2.5 })}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Deploy First Contract
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="configChain">Blockchain</Label>
                      <Select value={configForm.chain} onValueChange={(value) => {
                        const contract = contracts[value];
                        setConfigForm({ 
                          chain: value, 
                          contractAddress: contract?.contractAddress || "",
                          feePercentage: undefined,
                          feeRecipient: ""
                        });
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedChains.filter(chain => contracts[chain]?.contractAddress).map((chain) => (
                            <SelectItem key={chain} value={chain}>{chain}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="configContract">Contract Address</Label>
                      <Input
                        id="configContract"
                        value={configForm.contractAddress}
                        onChange={(e) => setConfigForm({ ...configForm, contractAddress: e.target.value })}
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="configFeePercentage">New Fee Percentage (%)</Label>
                      <Input
                        id="configFeePercentage"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="Leave empty to keep current"
                        value={configForm.feePercentage || ""}
                        onChange={(e) => setConfigForm({ ...configForm, feePercentage: parseFloat(e.target.value) || undefined })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="configFeeRecipient">New Fee Recipient</Label>
                      <Input
                        id="configFeeRecipient"
                        placeholder="0x... (leave empty to keep current)"
                        value={configForm.feeRecipient}
                        onChange={(e) => setConfigForm({ ...configForm, feeRecipient: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleConfigUpdate}
                    disabled={configuring || !configForm.contractAddress || (!configForm.feePercentage && !configForm.feeRecipient)}
                  >
                    {configuring ? "Updating..." : "Update Configuration"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Controls Tab */}
        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Controls
              </CardTitle>
              <CardDescription>
                Pause or resume marketplace trading in case of security incidents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportedChains.filter(chain => contracts[chain]?.contractAddress).length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p><strong>No marketplace contracts to control!</strong></p>
                      <p>Deploy marketplace contracts first to enable emergency pause/resume functionality.</p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/admin/nft/onboarding">
                          <Button size="sm" variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Follow Setup Guide
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          onClick={() => setDeployForm({ chain: "ETH", feeRecipient: "", feePercentage: 2.5 })}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Deploy First Contract
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="emergencyChain">Blockchain</Label>
                      <Select value={emergencyForm.chain} onValueChange={(value) => {
                        const contract = contracts[value];
                        setEmergencyForm({ 
                          chain: value, 
                          contractAddress: contract?.contractAddress || "",
                          reason: ""
                        });
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedChains.filter(chain => contracts[chain]?.contractAddress).map((chain) => (
                            <SelectItem key={chain} value={chain}>{chain}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="emergencyContract">Contract Address</Label>
                      <Input
                        id="emergencyContract"
                        value={emergencyForm.contractAddress}
                        readOnly
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="emergencyReason">Reason</Label>
                    <Textarea
                      id="emergencyReason"
                      placeholder="Explain why you are pausing/resuming the marketplace..."
                      value={emergencyForm.reason}
                      onChange={(e) => setEmergencyForm({ ...emergencyForm, reason: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handlePause("pause")}
                      disabled={pausing || !emergencyForm.contractAddress || !emergencyForm.reason}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      {pausing ? "Pausing..." : "Pause Trading"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePause("unpause")}
                      disabled={pausing || !emergencyForm.contractAddress || !emergencyForm.reason}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {pausing ? "Resuming..." : "Resume Trading"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Withdrawal Tab */}
        <TabsContent value="withdraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Revenue Withdrawal
              </CardTitle>
              <CardDescription>
                Withdraw accumulated marketplace fees to specified wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportedChains.filter(chain => contracts[chain]?.contractAddress).length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p><strong>No marketplace contracts with revenue!</strong></p>
                      <p>Deploy marketplace contracts and start earning trading fees before withdrawing revenue.</p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/admin/nft/onboarding">
                          <Button size="sm" variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Follow Setup Guide
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          onClick={() => setDeployForm({ chain: "ETH", feeRecipient: "", feePercentage: 2.5 })}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Deploy First Contract
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="withdrawChain">Blockchain</Label>
                      <Select value={withdrawForm.chain} onValueChange={(value) => {
                        const contract = contracts[value];
                        setWithdrawForm({ 
                          ...withdrawForm,
                          chain: value, 
                          contractAddress: contract?.contractAddress || ""
                        });
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedChains.filter(chain => contracts[chain]?.contractAddress).map((chain) => (
                            <SelectItem key={chain} value={chain}>{chain}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="withdrawContract">Contract Address</Label>
                      <Input
                        id="withdrawContract"
                        value={withdrawForm.contractAddress}
                        readOnly
                      />
                    </div>
                  </div>

                  {withdrawForm.contractAddress && contracts[withdrawForm.chain] && (
                    <Alert>
                      <DollarSign className="h-4 w-4" />
                      <AlertDescription>
                        Available balance: {contracts[withdrawForm.chain].balance || "0"} {contracts[withdrawForm.chain].currency}
                        {contracts[withdrawForm.chain].balanceUSD && (
                          ` (${formatCurrency(contracts[withdrawForm.chain].balanceUSD!)})`
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="withdrawAmount">Amount</Label>
                      <Input
                        id="withdrawAmount"
                        placeholder="Leave empty to withdraw all"
                        value={withdrawForm.amount}
                        onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="withdrawAddress">Withdrawal Address</Label>
                      <Input
                        id="withdrawAddress"
                        placeholder="0x... (leave empty to use fee recipient)"
                        value={withdrawForm.withdrawalAddress}
                        onChange={(e) => setWithdrawForm({ ...withdrawForm, withdrawalAddress: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="withdrawReason">Reason</Label>
                    <Textarea
                      id="withdrawReason"
                      placeholder="Explain the reason for this withdrawal..."
                      value={withdrawForm.reason}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, reason: e.target.value })}
                    />
                  </div>

                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawForm.contractAddress || !withdrawForm.reason}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {withdrawing ? "Withdrawing..." : "Withdraw Fees"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deployed</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(contracts).filter(c => c.contractAddress && c.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {supportedChains.length} chains
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    Object.values(contracts)
                      .filter(c => c.balanceUSD)
                      .reduce((sum, c) => sum + (c.balanceUSD || 0), 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  across all chains
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Fee Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(
                    Object.values(contracts)
                      .filter(c => c.feePercentage)
                      .reduce((sum, c) => sum + (c.feePercentage || 0), 0) /
                    Object.values(contracts).filter(c => c.feePercentage).length || 0
                  ).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  marketplace fee
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(contracts).filter(c => c.isActive && !c.error).length > 0 ? "Healthy" : "Issues"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.values(contracts).filter(c => c.error).length} errors
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}