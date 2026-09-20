"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { MoneyFigure } from "@/components/ui/money-figure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  BookOpen,
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
  listingFee?: number;
  maxRoyaltyPercentage?: number;
  isPaused?: boolean;
  deployedAt?: string;
}

interface DeploymentForm {
  chain: string;
  feeRecipient: string;
  feePercentage: number;
  listingFee: number;
  maxRoyaltyPercentage: number;
}

interface ConfigForm {
  chain: string;
  contractAddress: string;
  feePercentage?: number;
  feeRecipient?: string;
  listingFee?: number;
  maxRoyaltyPercentage?: number;
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
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [contracts, setContracts] = useState<{
    [chain: string]: MarketplaceContract;
  }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [deployForm, setDeployForm] = useState<DeploymentForm>({
    chain: "ETH",
    feeRecipient: "",
    feePercentage: 2.5,
    listingFee: 0,
    maxRoyaltyPercentage: 10,
  });

  const [configForm, setConfigForm] = useState<ConfigForm>({
    chain: "ETH",
    contractAddress: "",
    feePercentage: undefined,
    feeRecipient: "",
  });

  const [emergencyForm, setEmergencyForm] = useState<EmergencyForm>({
    chain: "ETH",
    contractAddress: "",
    reason: "",
  });

  const [withdrawForm, setWithdrawForm] = useState<WithdrawForm>({
    chain: "ETH",
    contractAddress: "",
    amount: "",
    withdrawalAddress: "",
    reason: "",
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
        silentSuccess: true,
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
          isActive: false,
        };

        if (baseContract.contractAddress) {
          try {
            // Fetch marketplace info
            const infoResponse = await $fetch({
              url: "/api/nft/marketplace/info",
              params: { chain },
              silentSuccess: true,
            });

            // Fetch balance
            const balanceResponse = await $fetch({
              url: "/api/nft/marketplace/balance",
              params: { chain },
              silentSuccess: true,
            });

            enrichedContracts[chain] = {
              ...baseContract,
              feePercentage: infoResponse.data?.feePercentage,
              feeRecipient: infoResponse.data?.feeRecipient,
              listingFee: infoResponse.data?.listingFee,
              maxRoyaltyPercentage: infoResponse.data?.maxRoyaltyPercentage,
              deployedAt: infoResponse.data?.deployedAt,
              balance: balanceResponse.data?.balance,
              balanceUSD: balanceResponse.data?.balanceUSD,
              currency: balanceResponse.data?.currency,
              isPaused: infoResponse.data?.isPaused ?? false,
            };
          } catch (error) {
            enrichedContracts[chain] = {
              ...baseContract,
              error: t("failed_to_fetch_additional_data"),
            };
          }
        } else {
          enrichedContracts[chain] = baseContract;
        }
      }

      setContracts(enrichedContracts);
    } catch (error) {
      toast.error(t("failed_to_load_marketplace_data"));
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
        body: deployForm,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(t("marketplace_deployed_successfully_on", { chain: String(deployForm.chain) }));
      setDeployForm({
        chain: "ETH",
        feeRecipient: "",
        feePercentage: 2.5,
        listingFee: 0,
        maxRoyaltyPercentage: 10,
      });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failed_to_deploy_marketplace")
      );
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
        body: configForm,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(t("marketplace_configuration_updated_successfully"));
      setConfigForm({
        chain: "ETH",
        contractAddress: "",
        feePercentage: undefined,
        feeRecipient: "",
      });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("failed_to_update_configuration")
      );
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
        body: emergencyForm,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(t("marketplace_d_successfully", { action: String(action) }));
      setEmergencyForm({ chain: "ETH", contractAddress: "", reason: "" });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("failed_to_marketplace", { action: String(action) })
      );
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
        body: withdrawForm,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(t("marketplace_fees_withdrawn_successfully"));
      setWithdrawForm({
        chain: "ETH",
        contractAddress: "",
        amount: "",
        withdrawalAddress: "",
        reason: "",
      });
      await fetchMarketplaceData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("failed_to_withdraw_fees")
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tCommon("copied_to_clipboard"));
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
      OPTIMISM: `https://optimistic.etherscan.io/address/${address}`,
    };
    return explorers[chain] || `https://etherscan.io/address/${address}`;
  };

  /*
    A HAND-BUILT COPY OF THE KPI ROW, AND ONLY THE KPI ROW.
    ==========================================================================
    The pending branch drew `Card` + `Skeleton h-4` + `Skeleton h-8` + `Skeleton
    h-3` per tile, which is a guess at `StatsCard`'s real geometry (16px label
    row, 30px `text-2xl leading-tight` figure, 11px delta row inside `p-4`) and
    cannot follow a change to it. Worse, it stopped at the KPI row: everything
    below — charts, tables, panels — simply did not exist while pending and
    arrived all at once.

    `StatsCard` already renders its own frame with `loading`, so the copy is
    deleted and the flag is threaded instead. The tiles keep their border,
    label, icon tile and height throughout; only the figures wait.
  */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t("marketplace_contract_management")}
          </h1>
          <p className="text-muted-foreground">
            {t("deploy_and_manage_nft_marketplace_contracts")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMarketplaceData}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
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
            <Card
              key={chain}
              className={`${isDeployed ? "border-success/30" : "border-border"}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{chain}</CardTitle>
                <div className="flex items-center gap-2">
                  {isDeployed ? (
                    <Badge
                      variant="secondary"
                      className="bg-success/10 text-success-ink"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-border text-muted-foreground"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {tExt("not_deployed")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isDeployed ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {tCommon("contract")}
                      </span>
                      <code className="text-xs bg-muted px-1 rounded flex-1 truncate">
                        {contract.contractAddress}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copyToClipboard(contract.contractAddress!)
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          window.open(
                            getChainExplorer(chain, contract.contractAddress!),
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">
                          {tCommon("balance")}
                        </span>
                        <div className="font-medium">
                          {contract.balance ? (
                            <MoneyFigure
                              value={`${parseFloat(contract.balance).toFixed(4)} ${contract.currency}`}
                            />
                          ) : (
                            `${tCommon("loading")}…`
                          )}
                        </div>
                        {contract.balanceUSD && (
                          <div className="text-muted-foreground font-mono tabular-nums">
                            {formatCurrency(contract.balanceUSD)}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{`${t("marketplace_fee")} (%)`}</span>
                        <div
                          className={`font-medium${
                            contract.feePercentage ? " font-mono tabular-nums" : ""
                          }`}
                        >
                          {contract.feePercentage
                            ? `${contract.feePercentage}%`
                            : `${tCommon("loading")}…`}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("listing_fee")}
                        </span>
                        <div className="font-medium">
                          {contract.listingFee !== undefined ? (
                            <MoneyFigure
                              value={`${contract.listingFee} ${contract.currency}`}
                            />
                          ) : (
                            `${tCommon("loading")}…`
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("max_royalty")}
                        </span>
                        <div
                          className={`font-medium${
                            contract.maxRoyaltyPercentage !== undefined
                              ? " font-mono tabular-nums"
                              : ""
                          }`}
                        >
                          {contract.maxRoyaltyPercentage !== undefined
                            ? `${contract.maxRoyaltyPercentage}%`
                            : `${tCommon("loading")}…`}
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
                      {t("no_marketplace_deployed")}
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDeployForm({ ...deployForm, chain })
                          }
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Deploy
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>
                            {t("deploy_marketplace_contract")}
                          </DialogTitle>
                          <DialogDescription>
                            {t("deploy_a_new_nft_marketplace_contract_to")}{" "}
                            {chain}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{t("blockchain_deployment")}</strong>{" "}
                              {t("deploying_a_marketplace_contract_is_a")}{" "}
                              {t("the_deployment_cost_varies_based_on")}{" "}
                              {t("make_sure_you_have_sufficient_funds")}
                            </AlertDescription>
                          </Alert>

                          <Input
                            id="feeRecipient"
                            title={t("fee_recipient_address")}
                            placeholder="0x..."
                            value={deployForm.feeRecipient}
                            onChange={(e) =>
                              setDeployForm({
                                ...deployForm,
                                feeRecipient: e.target.value,
                              })
                            }
                            description={t("leave_empty_to_use_master_wallet")}
                          />
                          <Input
                            id="feePercentage"
                            title={`${t("marketplace_fee")} (%)`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={deployForm.feePercentage}
                            onChange={(e) =>
                              setDeployForm({
                                ...deployForm,
                                feePercentage: parseFloat(e.target.value) || 0,
                              })
                            }
                            description="Percentage charged on each sale (e.g., 2.5 = 2.5%)"
                          />
                          <Input
                            id="listingFee"
                            title={`Listing Fee (${chain === "ETH" ? "ETH" : chain === "BSC" ? "BNB" : chain === "POLYGON" ? "MATIC" : t("native_token")})`}
                            type="number"
                            step="0.001"
                            min="0"
                            value={deployForm.listingFee}
                            onChange={(e) =>
                              setDeployForm({
                                ...deployForm,
                                listingFee: parseFloat(e.target.value) || 0,
                              })
                            }
                            description={`${tCommon("fixed_fee_charged_when_listing_an")} (0 = free listing)`}
                          />
                          <Input
                            id="maxRoyaltyPercentage"
                            title={`${t("maximum_royalty")} (%)`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="50"
                            value={deployForm.maxRoyaltyPercentage}
                            onChange={(e) =>
                              setDeployForm({
                                ...deployForm,
                                maxRoyaltyPercentage:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            description={t(
                              "maximum_royalty_percentage_creators_can_set"
                            )}
                          />
                          <Button
                            onClick={handleDeploy}
                            disabled={deploying}
                            className="w-full"
                          >
                            {deploying ? `${tExt("deploying")}…` : tExt("deploy_contract")}
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
          <TabsTrigger value="emergency">{t("emergency_controls")}</TabsTrigger>
          <TabsTrigger value="withdraw">{t("revenue_withdrawal")}</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Settings className="h-3.5 w-3.5" />
                </span>
                {tExt("marketplace_configuration")}
              </CardTitle>
              <CardDescription>
                {t("update_marketplace_fees_and_recipient_wallet")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportedChains.filter(
                (chain) => contracts[chain]?.contractAddress
              ).length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        <strong>
                          {t("no_marketplace_contracts_deployed_yet")}
                        </strong>
                      </p>
                      <p>{t("you_need_to_deploy_at_least")}</p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/admin/nft/onboarding">
                          <Button size="sm" variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            {t("follow_setup_guide")}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDeployForm({
                              chain: "ETH",
                              feeRecipient: "",
                              feePercentage: 2.5,
                              listingFee: 0,
                              maxRoyaltyPercentage: 10,
                            })
                          }
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {t("deploy_first_contract")}
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t("blockchain_operation_warning")}</strong>{" "}
                      {t("this_action_will_create_a_transaction")}{" "}
                      {t("make_sure_you_have_sufficient_funds")}{" "}
                      {t("the_fee_amount_varies_based_on_network_congestion")}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      value={configForm.chain}
                      onValueChange={(value) => {
                        const contract = contracts[value];
                        setConfigForm({
                          chain: value,
                          contractAddress: contract?.contractAddress || "",
                          feePercentage: undefined,
                          feeRecipient: "",
                        });
                      }}
                    >
                      <SelectTrigger title="Blockchain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedChains
                          .filter((chain) => contracts[chain]?.contractAddress)
                          .map((chain) => (
                            <SelectItem key={chain} value={chain}>
                              {chain}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="configContract"
                      title={tExt("contract_address")}
                      value={configForm.contractAddress}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          contractAddress: e.target.value,
                        })
                      }
                      readOnly
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      id="configFeePercentage"
                      title={`${t("marketplace_fee")} (%)`}
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      placeholder={t("leave_empty_to_keep_current")}
                      value={configForm.feePercentage || ""}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          feePercentage:
                            parseFloat(e.target.value) || undefined,
                        })
                      }
                      description={t("percentage_charged_on_each_sale")}
                    />
                    <Input
                      id="configFeeRecipient"
                      title={t("fee_recipient_address")}
                      placeholder="0x... (leave empty to keep current)"
                      value={configForm.feeRecipient}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          feeRecipient: e.target.value,
                        })
                      }
                      description={t("address_to_receive_marketplace_fees")}
                    />
                    <Input
                      id="configListingFee"
                      title={`Listing Fee (${configForm.chain === "ETH" ? "ETH" : configForm.chain === "BSC" ? "BNB" : configForm.chain === "POLYGON" ? "MATIC" : t("native_token")})`}
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder={t("leave_empty_to_keep_current")}
                      value={configForm.listingFee || ""}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          listingFee: parseFloat(e.target.value) || undefined,
                        })
                      }
                      description={tCommon("fixed_fee_charged_when_listing_an")}
                    />
                    <Input
                      id="configMaxRoyalty"
                      title={`${t("maximum_royalty")} (%)`}
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      placeholder={t("leave_empty_to_keep_current")}
                      value={configForm.maxRoyaltyPercentage || ""}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          maxRoyaltyPercentage:
                            parseFloat(e.target.value) || undefined,
                        })
                      }
                      description={t(
                        "maximum_royalty_percentage_creators_can_set"
                      )}
                    />
                  </div>

                  <Button
                    onClick={handleConfigUpdate}
                    disabled={
                      configuring ||
                      !configForm.contractAddress ||
                      (!configForm.feePercentage &&
                        !configForm.feeRecipient &&
                        !configForm.listingFee &&
                        !configForm.maxRoyaltyPercentage)
                    }
                  >
                    {configuring ? `${tCommon("updating")}…` : t("update_configuration")}
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
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                </span>
                {t("emergency_controls")}
              </CardTitle>
              <CardDescription>
                {t("pause_or_resume_marketplace_trading_in")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportedChains.filter(
                (chain) => contracts[chain]?.contractAddress
              ).length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        <strong>
                          {t("no_marketplace_contracts_to_control")}
                        </strong>
                      </p>
                      <p>{t("deploy_marketplace_contracts_first_to_enable")}</p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/admin/nft/onboarding">
                          <Button size="sm" variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            {t("follow_setup_guide")}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDeployForm({
                              chain: "ETH",
                              feeRecipient: "",
                              feePercentage: 2.5,
                              listingFee: 0,
                              maxRoyaltyPercentage: 10,
                            })
                          }
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {t("deploy_first_contract")}
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t("blockchain_operation_warning")}</strong>{" "}
                      {t("pausing_or_resuming_the_marketplace_requires")}{" "}
                      {t("this_action_is_immediate_and_affects")}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      value={emergencyForm.chain}
                      onValueChange={(value) => {
                        const contract = contracts[value];
                        setEmergencyForm({
                          chain: value,
                          contractAddress: contract?.contractAddress || "",
                          reason: "",
                        });
                      }}
                    >
                      <SelectTrigger title="Blockchain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedChains
                          .filter((chain) => contracts[chain]?.contractAddress)
                          .map((chain) => (
                            <SelectItem key={chain} value={chain}>
                              {chain}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="emergencyContract"
                      title={tExt("contract_address")}
                      value={emergencyForm.contractAddress}
                      readOnly
                    />
                  </div>

                  <Textarea
                    id="emergencyReason"
                    title="Reason"
                    placeholder={`${t("explain_why_you_are_pausing_resuming")}…`}
                    value={emergencyForm.reason}
                    onChange={(e) =>
                      setEmergencyForm({
                        ...emergencyForm,
                        reason: e.target.value,
                      })
                    }
                  />

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handlePause("pause")}
                      disabled={
                        pausing ||
                        !emergencyForm.contractAddress ||
                        !emergencyForm.reason
                      }
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      {pausing ? `${t("pausing")}…` : t("pause_trading")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePause("unpause")}
                      disabled={
                        pausing ||
                        !emergencyForm.contractAddress ||
                        !emergencyForm.reason
                      }
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {pausing ? `${t("resuming")}…` : t("resume_trading")}
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
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
                {t("revenue_withdrawal")}
              </CardTitle>
              <CardDescription>
                {t("withdraw_accumulated_marketplace_fees_to_specified")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportedChains.filter(
                (chain) => contracts[chain]?.contractAddress
              ).length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>
                        <strong>
                          {t("no_marketplace_contracts_with_revenue")}
                        </strong>
                      </p>
                      <p>
                        {t("deploy_marketplace_contracts_and_start_earning")}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/admin/nft/onboarding">
                          <Button size="sm" variant="outline">
                            <BookOpen className="h-4 w-4 mr-2" />
                            {t("follow_setup_guide")}
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDeployForm({
                              chain: "ETH",
                              feeRecipient: "",
                              feePercentage: 2.5,
                              listingFee: 0,
                              maxRoyaltyPercentage: 10,
                            })
                          }
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {t("deploy_first_contract")}
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t("blockchain_operation_warning")}</strong>{" "}
                      {t("withdrawing_marketplace_fees_requires_a_blockchain")}{" "}
                      {t("the_gas_cost_will_be_deducted")}{" "}
                      {t("ensure_you_verify_the_withdrawal_address")}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      value={withdrawForm.chain}
                      onValueChange={(value) => {
                        const contract = contracts[value];
                        setWithdrawForm({
                          ...withdrawForm,
                          chain: value,
                          contractAddress: contract?.contractAddress || "",
                        });
                      }}
                    >
                      <SelectTrigger title="Blockchain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedChains
                          .filter((chain) => contracts[chain]?.contractAddress)
                          .map((chain) => (
                            <SelectItem key={chain} value={chain}>
                              {chain}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="withdrawContract"
                      title={tExt("contract_address")}
                      value={withdrawForm.contractAddress}
                      readOnly
                    />
                  </div>

                  {withdrawForm.contractAddress &&
                    contracts[withdrawForm.chain] && (
                      <Alert>
                        <DollarSign className="h-4 w-4" />
                        <AlertDescription>
                          {tCommon("available_balance")}{" "}
                          {contracts[withdrawForm.chain].balance ?? "0"}{" "}
                          {contracts[withdrawForm.chain].currency || ""}
                          {contracts[withdrawForm.chain].balanceUSD
                            ? ` ($${Number(contracts[withdrawForm.chain].balanceUSD).toFixed(2)})`
                            : ""}
                        </AlertDescription>
                      </Alert>
                    )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      id="withdrawAmount"
                      title="Amount"
                      placeholder={t("leave_empty_to_withdraw_all")}
                      value={withdrawForm.amount}
                      onChange={(e) =>
                        setWithdrawForm({
                          ...withdrawForm,
                          amount: e.target.value,
                        })
                      }
                    />
                    <Input
                      id="withdrawAddress"
                      title={tCommon("withdrawal_address")}
                      placeholder="0x..."
                      description={t(
                        "n_0x_ellipsis_leave_empty_to_use_fee_recipient"
                      )}
                      value={withdrawForm.withdrawalAddress}
                      onChange={(e) =>
                        setWithdrawForm({
                          ...withdrawForm,
                          withdrawalAddress: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Textarea
                    id="withdrawReason"
                    title="Reason"
                    placeholder={`${t(
                      "explain_the_reason_for_this_withdrawal"
                    )}…`}
                    value={withdrawForm.reason}
                    onChange={(e) =>
                      setWithdrawForm({
                        ...withdrawForm,
                        reason: e.target.value,
                      })
                    }
                  />

                  <Button
                    onClick={handleWithdraw}
                    disabled={
                      withdrawing ||
                      !withdrawForm.contractAddress ||
                      !withdrawForm.reason
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {withdrawing ? `${t("withdrawing")}…` : t("withdraw_fees")}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label={t("total_deployed")}
              value={
                Object.values(contracts).filter(
                  (c) => c.contractAddress && c.isActive
                ).length
              }
              icon={Building2}
              description={t("of_chains", { length: supportedChains.length })}
              loading={loading}
              {...statsCardColors.neutral}
            />

            <StatsCard
              label={tCommon("total_balance")}
              value={formatCurrency(
                Object.values(contracts)
                  .filter((c) => c.balanceUSD)
                  .reduce((sum, c) => sum + (c.balanceUSD || 0), 0)
              )}
              icon={Coins}
              description={t("across_all_chains")}
              loading={loading}
              {...statsCardColors.neutral}
            />

            <StatsCard
              label={t("avg_fee_rate")}
              value={`${(
                Object.values(contracts)
                  .filter((c) => c.feePercentage)
                  .reduce((sum, c) => sum + (c.feePercentage || 0), 0) /
                  Object.values(contracts).filter((c) => c.feePercentage)
                    .length || 0
              ).toFixed(1)}%`}
              icon={TrendingUp}
              description={`${t("marketplace_fee")} (%)`}
              loading={loading}
              {...statsCardColors.neutral}
            />

            <StatsCard
              label={t("health_status")}
              value={
                Object.values(contracts).filter((c) => c.isActive && !c.error)
                  .length > 0
                  ? "Healthy"
                  : "Issues"
              }
              icon={Activity}
              description={t("errors", { length: Object.values(contracts).filter((c) => c.error).length })}
              loading={loading}
              {...statsCardColors.success}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
