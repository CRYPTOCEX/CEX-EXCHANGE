import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useFormContext, Controller } from "react-hook-form";
import { $fetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface WalletResponse {
  wallet: {
    id: string;
    chain: string;
    currency: string;
    address: string;
    balance: number;
  };
  tokenDeploymentCost: string | null;
}

interface StepChainAndInfoProps {
  chainOptions: ChainOption[];
  onWalletCheck: (sufficient: boolean) => void;
}

const StepChainAndInfo: React.FC<StepChainAndInfoProps> = ({
  chainOptions,
  onWalletCheck,
}) => {
  const t = useTranslations("ext");
  const { control, register, watch, setValue } = useFormContext<DeployFormData>();
  const mode = watch("mode");
  const chain = watch("chain");
  const network = watch("network");

  const [walletInfo, setWalletInfo] = useState<WalletResponse | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Auto-suggest network based on chain
  useEffect(() => {
    if (!chain || network) return; // Don't override if network is already set

    // Common chain-to-network mappings for production
    const chainNetworkMap: Record<string, string> = {
      'BSC': 'mainnet',
      'ETH': 'mainnet', 
      'POLYGON': 'mainnet',
      'ARBITRUM': 'mainnet',
      'OPTIMISM': 'mainnet',
      'AVALANCHE': 'mainnet',
      'FANTOM': 'mainnet',
    };

    const suggestedNetwork = chainNetworkMap[chain.toUpperCase()];
    if (suggestedNetwork) {
      setValue("network", suggestedNetwork);
    }
  }, [chain, network, setValue]);

  const fetchWalletInfo = async () => {
    try {
      setLoadingWallet(true);
      setWalletError(null);

      const { data, error } = await $fetch({
        url: `/api/admin/ecosystem/blockchain/balance?chain=${chain}`,
        method: "GET",
        silent: true,
      });

      if (error) {
        if (
          error.startsWith("Token deployment cost not available for this chain")
        ) {
          setWalletError(null);
          setWalletInfo(null);
          onWalletCheck(true);
        } else {
          setWalletError(error);
          setWalletInfo(null);
          onWalletCheck(false);
        }
      } else if (data) {
        const costNum = parseFloat(data.tokenDeploymentCost);
        const balanceNum = data.wallet.balance;
        if (Number.isNaN(costNum)) {
          setWalletInfo({
            wallet: data.wallet,
            tokenDeploymentCost: null,
          });
          onWalletCheck(balanceNum > 0);
        } else {
          setWalletInfo(data);
          const sufficient = balanceNum >= costNum;
          onWalletCheck(sufficient);
        }
      }
    } catch (err: any) {
      setWalletError(err.message || "Failed to fetch wallet info");
      setWalletInfo(null);
      onWalletCheck(false);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    if (!chain || mode !== "deploy") {
      setWalletInfo(null);
      setWalletError(null);
      onWalletCheck(true);
      return;
    }
    fetchWalletInfo();
  }, [chain, mode]);

  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold">
        {t("blockchain_&_basic_information")}
      </h2>
      <div className="space-y-3">
        {/* Chain Selection using shadcn Select with Controller */}
        <Controller
          name="chain"
          control={control}
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger title="Blockchain" className="w-full">
                <SelectValue placeholder="Select blockchain" />
              </SelectTrigger>
              <SelectContent>
                {chainOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />

        {/* Token Name & Symbol */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            placeholder="e.g. MyToken"
            title="Token Name"
            {...register("name", { required: true })}
          />
          <Input
            type="text"
            placeholder="e.g. MYT"
            title="Token Symbol"
            {...register("currency", { required: true })}
          />
        </div>

        {/* Network Configuration */}
        <div className="space-y-3">
          <Controller
            name="network"
            control={control}
            rules={{ required: mode === "import" }}
            render={({ field: { onChange, value } }) => (
              <div className="space-y-2">
                <Select value={value} onValueChange={onChange}>
                  <SelectTrigger title="Network Environment" className="w-full">
                    <SelectValue placeholder="Select network environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mainnet">Mainnet (Production)</SelectItem>
                    <SelectItem value="testnet">Testnet (Testing)</SelectItem>
                    <SelectItem value="sepolia">Sepolia (Ethereum Testnet)</SelectItem>
                    <SelectItem value="goerli">Goerli (Ethereum Testnet)</SelectItem>
                    <SelectItem value="matic-mumbai">Mumbai (Polygon Testnet)</SelectItem>
                    <SelectItem value="matic">Polygon Mainnet</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">
                        Network Configuration Guide
                      </p>
                      <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-xs">
                        <li>• <strong>Mainnet:</strong> For production tokens on the main blockchain</li>
                        <li>• <strong>Testnet:</strong> For testing on networks like BSC Testnet</li>
                        <li>• <strong>Sepolia/Goerli:</strong> For Ethereum testing environments</li>
                        <li>• <strong>Mumbai:</strong> For Polygon testing</li>
                      </ul>
                      <p className="text-blue-700 dark:text-blue-300 mt-2 text-xs">
                        <strong>Important:</strong> This must match your environment variables (e.g., BSC_NETWORK=mainnet)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>

        {/* Decimals and other fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            placeholder="e.g. 18"
            title="Decimals"
            {...register("decimals", { required: true, valueAsNumber: true })}
          />
          {mode === "deploy" ? (
            <>
              <Input
                type="number"
                placeholder="e.g. 1000000"
                title="Initial Supply"
                {...register("initialSupply", {
                  required: true,
                  valueAsNumber: true,
                })}
              />
              <Input
                type="text"
                placeholder="0x123..."
                title="Initial Holder"
                {...register("initialHolder", { required: true })}
              />
              <Input
                type="number"
                placeholder="e.g. 10000000"
                title="Market Cap"
                {...register("marketCap", {
                  required: true,
                  valueAsNumber: true,
                })}
              />
            </>
          ) : (
            <Input
              type="text"
              placeholder="0xABC..."
              title="Contract Address"
              {...register("contract", { required: true })}
            />
          )}
        </div>

        {/* Wallet Info Section */}
        {mode === "deploy" && chain && (
          <div className="border-zinc-200 dark:border-zinc-700 rounded p-3 mt-3">
            {loadingWallet ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : walletError ? (
              <div className="flex flex-col gap-2">
                <p className="text-red-500 dark:text-red-400 text-sm">
                  {walletError}
                </p>
                {walletError ===
                "Master wallet not found for the specified chain" ? (
                  <a
                    href="/admin/ecosystem/wallet/master"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button color="default" size="sm">
                      {t("create_master_wallet")}
                    </Button>
                  </a>
                ) : (
                  <Button onClick={fetchWalletInfo} color="default" size="sm">
                    {t("Refresh")}
                  </Button>
                )}
              </div>
            ) : walletInfo ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">
                  {t("master_wallet_info")}
                </h3>
                <div className="text-sm">
                  <p>
                    <strong>{t("address")}</strong> {walletInfo.wallet.address}
                  </p>
                  <p>
                    <strong>{t("balance")}</strong> {walletInfo.wallet.balance}{" "}
                    {walletInfo.wallet.currency}
                  </p>
                </div>
                {walletInfo.tokenDeploymentCost === null ? (
                  <p className="text-sm">
                    <strong>{t("deployment_cost")}</strong>
                    {t("not_available_for_this_chain")}
                  </p>
                ) : (
                  <p className="text-sm">
                    <strong>{t("deployment_cost")}</strong>{" "}
                    {walletInfo.tokenDeploymentCost}{" "}
                    {walletInfo.wallet.currency}
                  </p>
                )}
                {walletInfo.tokenDeploymentCost === null ? (
                  walletInfo.wallet.balance <= 0 && (
                    <p className="text-red-600 dark:text-red-400 text-xs">
                      {t("your_wallet_balance_is_0_so_you_cannot_deploy")}.
                    </p>
                  )
                ) : parseFloat(walletInfo.tokenDeploymentCost) <=
                  walletInfo.wallet.balance ? (
                  <p className="text-green-600 dark:text-green-500 text-xs">
                    {t("sufficient_funds_to_deploy_token")}.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-red-600 dark:text-red-400 text-xs">
                      {t("insufficient_funds")}. {t("please_deposit_at_least")}{" "}
                      {(
                        parseFloat(walletInfo.tokenDeploymentCost) -
                        walletInfo.wallet.balance
                      ).toFixed(4)}{" "}
                      {walletInfo.wallet.currency}
                      {t("more")}.
                    </p>
                    <Button onClick={fetchWalletInfo} color="default" size="sm">
                      {t("refresh_wallet_info")}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StepChainAndInfo;
