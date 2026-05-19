"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Globe,
  Server,
  Cpu,
  HardDrive,
  Network,
  Wallet,
  Settings,
  Download,
  Eye,
  RefreshCw,
  Layers,
  Box,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

interface ChainInfo {
  network: string;
  nodeProvider?: string;
  rpc?: boolean;
  rpcWss?: boolean;
  explorerApi?: boolean;
  status?: boolean;
  version?: string;
  productId?: string;
}

interface ChainData {
  chain: string;
  info: ChainInfo;
}

interface EcosystemData {
  baseChains: ChainData[];
  extendedChains: ChainData[];
  isUnlockedVault: boolean;
}

const chainColors: Record<string, string> = {
  ETH: "from-blue-400 to-indigo-500",
  BSC: "from-yellow-400 to-orange-500",
  POLYGON: "from-purple-400 to-violet-500",
  FTM: "from-blue-400 to-cyan-500",
  OPTIMISM: "from-red-400 to-rose-500",
  ARBITRUM: "from-blue-500 to-sky-500",
  BASE: "from-blue-400 to-blue-600",
  CELO: "from-green-400 to-emerald-500",
  BTC: "from-orange-400 to-amber-500",
  LTC: "from-gray-400 to-slate-500",
  DOGE: "from-yellow-400 to-yellow-600",
  DASH: "from-blue-400 to-blue-600",
  SOL: "from-purple-400 to-pink-500",
  TRON: "from-red-400 to-red-600",
  XMR: "from-orange-400 to-orange-600",
  MO: "from-indigo-400 to-purple-500",
  TON: "from-cyan-400 to-blue-500",
};

const EcosystemBlockchains = () => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [blockchains, setBlockchains] = useState<EcosystemData>({
    baseChains: [],
    extendedChains: [],
    isUnlockedVault: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPassPhraseDialogOpen, setIsPassPhraseDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");

  const fetchBlockchains = async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: "/api/admin/ecosystem",
      silent: true,
    });
    if (!error) {
      setBlockchains({
        baseChains: data.baseChains || [],
        extendedChains: data.extendedChains || [],
        isUnlockedVault: data.isUnlockedVault || false,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBlockchains();
  }, []);

  const supportedChainsImagesMap = (chain: string) => {
    const mapping: Record<string, string> = {
      ETH: "eth",
      BSC: "bnb",
      POLYGON: "matic",
      FTM: "ftm",
      OPTIMISM: "op",
      ARBITRUM: "arbitrum",
      BASE: "base",
      CELO: "celo",
      BTC: "btc",
      LTC: "ltc",
      DOGE: "doge",
      DASH: "dash",
      SOL: "sol",
      TRON: "trx",
      XMR: "xmr",
      MO: "mo",
      TON: "ton",
    };
    return mapping[chain] || chain.toLowerCase();
  };

  const setPassphraseHandler = async () => {
    setIsSubmitting(true);
    const { error } = await $fetch({
      url: "/api/admin/ecosystem/kms",
      method: "POST",
      body: { passphrase },
    });
    if (!error) {
      setIsPassPhraseDialogOpen(false);
      setPassphrase("");
      await fetchBlockchains();
    }
    setIsSubmitting(false);
  };

  // Statistics
  const totalBaseChains = blockchains.baseChains.length;
  const totalExtendedChains = blockchains.extendedChains.length;
  const activeExtendedChains = blockchains.extendedChains.filter(
    (c) => c.info.status
  ).length;
  const utxoChains = blockchains.baseChains.filter((chain) =>
    ["BTC", "LTC", "DOGE", "DASH"].includes(chain.chain)
  );
  const evmChains = blockchains.baseChains.filter(
    (chain) => !["BTC", "LTC", "DOGE", "DASH"].includes(chain.chain)
  );

  if (isLoading) {
    return (
      <div className={`container ${PAGE_PADDING} space-y-8`}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border border-border/40 p-8">
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`container space-y-8 ${PAGE_PADDING}`}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border border-border/40 p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {t("ecosystem_blockchains")}
                  </h1>
                  <p className="text-muted-foreground">
                    {t("manage_blockchain_integrations_and_wallet_infrastructure")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/admin/system/extension?type=blockchain">
                <Button
                  variant="outline"
                  className="bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-muted/80"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t("manage_blockchains")}
                </Button>
              </Link>

              {blockchains.isUnlockedVault ? (
                <div className="flex items-center gap-2 rounded-lg px-4 py-2 bg-success/10 border border-success/20 text-success">
                  <Unlock className="h-5 w-5" />
                  <span className="font-medium">{t("vault_active")}</span>
                </div>
              ) : (
                <Dialog
                  open={isPassPhraseDialogOpen}
                  onOpenChange={setIsPassPhraseDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 shadow-sm">
                      <Lock className="mr-2 h-4 w-4" />
                      {t("initiate_vault")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-card text-card-foreground">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        {t("set_ecosystem_passphrase")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("please_enter_the_passphrase_of_the_ecosystem_vault")}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        placeholder={t("enter_passphrase")}
                        type="password"
                        disabled={isSubmitting}
                        className="bg-background"
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsPassPhraseDialogOpen(false)}
                      >
                        {tCommon("cancel")}
                      </Button>
                      <Button
                        onClick={setPassphraseHandler}
                        disabled={isSubmitting || !passphrase}
                      >
                        {isSubmitting && (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {tCommon("submit")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Server}
              label={t("base_chains")}
              value={totalBaseChains}
              color="from-blue-500 to-indigo-600"
            />
            <StatCard
              icon={Box}
              label={t("extended_chains")}
              value={totalExtendedChains}
              color="from-purple-500 to-violet-600"
            />
            <StatCard
              icon={Activity}
              label={t("active_chains")}
              value={activeExtendedChains}
              color="from-green-500 to-emerald-600"
            />
            <StatCard
              icon={Wallet}
              label={t("wallet_types")}
              value={blockchains.isUnlockedVault ? 2 : 0}
              subtitle={
                blockchains.isUnlockedVault ? "HD & Custodial" : "Vault Locked"
              }
              color="from-orange-500 to-amber-600"
            />
          </div>
        </div>
      </motion.div>

      {/* Built-in EVM Blockchains */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Network className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    EVM {t("blockchains")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ethereum Virtual Machine compatible chains
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                {evmChains.length} {t("chains")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {evmChains.map((item, index) => (
                <EvmChainCard
                  key={index}
                  chain={item.chain}
                  network={item.info.network}
                  rpc={item.info.rpc}
                  rpcWss={item.info.rpcWss}
                  explorerApi={item.info.explorerApi}
                  imageSrc={supportedChainsImagesMap(item.chain)}
                  color={chainColors[item.chain] || "from-gray-400 to-gray-600"}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Built-in UTXO Blockchains */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <HardDrive className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    UTXO {t("blockchains")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Unspent Transaction Output based chains
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                {utxoChains.length} {t("chains")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {utxoChains.map((item, index) => (
                <UtxoChainCard
                  key={index}
                  chain={item.chain}
                  network={item.info.network}
                  nodeProvider={item.info.nodeProvider}
                  imageSrc={supportedChainsImagesMap(item.chain)}
                  color={chainColors[item.chain] || "from-gray-400 to-gray-600"}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Extended Blockchains */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Cpu className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {t("extended_blockchains")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Custom blockchain integrations and add-ons
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                {totalExtendedChains} {t("chains")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {blockchains.extendedChains.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-muted/50 border border-border/40">
                    <Box className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-lg">
                    {t("no_extended_blockchains")}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                    Extended blockchains provide additional chain support. Browse
                    the marketplace to add new blockchain integrations.
                  </p>
                </div>
                <Link href="/admin/system/extension?type=blockchain">
                  <Button variant="outline" className="mt-2">
                    <Globe className="h-4 w-4 mr-2" />
                    {t("browse_blockchains")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {blockchains.extendedChains.map((item, index) => (
                  <ExtendedChainCard
                    key={index}
                    chain={item.chain}
                    network={item.info.network}
                    version={item.info.version}
                    status={item.info.status}
                    productId={item.info.productId}
                    rpc={item.info.rpc}
                    rpcWss={item.info.rpcWss}
                    imageSrc={supportedChainsImagesMap(item.chain)}
                    color={
                      chainColors[item.chain] || "from-gray-400 to-gray-600"
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{tCommon("quick_actions")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon={Wallet}
            label={t("master_wallets")}
            href="/admin/ecosystem/wallet/master"
            description={t("manage_hd_wallets_and_master_keys")}
            color="from-blue-500 to-indigo-600"
          />
          <QuickActionCard
            icon={HardDrive}
            label={t("custodial_wallets")}
            href="/admin/ecosystem/wallet/custodial"
            description={t("view_and_manage_user_custodial_wallets")}
            color="from-green-500 to-emerald-600"
          />
          <QuickActionCard
            icon={Activity}
            label={t("ledger")}
            href="/admin/ecosystem/ledger"
            description={t("view_blockchain_transaction_history")}
            color="from-purple-500 to-violet-600"
          />
          <QuickActionCard
            icon={Globe}
            label={t("tokens")}
            href="/admin/ecosystem/token"
            description={t("manage_custom_tokens_and_assets")}
            color="from-orange-500 to-amber-600"
          />
        </div>
      </motion.div>
    </div>
  );
};

// Statistics Card Component
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtitle?: string;
  color: string;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: StatCardProps) => (
  <div className="p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/40 hover:border-border/60 transition-colors">
    <div className="flex items-center gap-3">
      <div
        className={`p-2 rounded-lg bg-gradient-to-br ${color} bg-opacity-10`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70">{subtitle}</p>
        )}
      </div>
    </div>
  </div>
);

// EVM Chain Card Component
interface EvmChainCardProps {
  chain: string;
  network: string;
  rpc?: boolean;
  rpcWss?: boolean;
  explorerApi?: boolean;
  imageSrc: string;
  color: string;
}

const EvmChainCard = ({
  chain,
  network,
  rpc,
  rpcWss,
  explorerApi,
  imageSrc,
  color,
}: EvmChainCardProps) => (
  <div className="group p-4 rounded-xl bg-muted/30 border border-border/40 hover:border-border/60 hover:bg-muted/50 transition-all">
    <div className="flex items-start gap-3">
      <div className="relative">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 rounded-xl blur-lg group-hover:opacity-30 transition-opacity`}
        />
        <div className="relative p-2 rounded-xl bg-background border border-border/40">
          <img
            src={`/img/crypto/${imageSrc}.webp`}
            alt={`${chain} logo`}
            className="h-10 w-10 rounded-lg object-contain"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{chain}</h3>
        <p className="text-xs text-muted-foreground truncate">{network}</p>
      </div>
    </div>
    <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
      <StatusIndicator label="RPC" active={rpc} />
      <StatusIndicator label="RPC WSS" active={rpcWss} />
      <StatusIndicator label="Explorer API" active={explorerApi} />
    </div>
  </div>
);

// UTXO Chain Card Component
interface UtxoChainCardProps {
  chain: string;
  network: string;
  nodeProvider?: string;
  imageSrc: string;
  color: string;
}

const UtxoChainCard = ({
  chain,
  network,
  nodeProvider,
  imageSrc,
  color,
}: UtxoChainCardProps) => (
  <div className="group p-4 rounded-xl bg-muted/30 border border-border/40 hover:border-border/60 hover:bg-muted/50 transition-all">
    <div className="flex items-start gap-3">
      <div className="relative">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 rounded-xl blur-lg group-hover:opacity-30 transition-opacity`}
        />
        <div className="relative p-2 rounded-xl bg-background border border-border/40">
          <img
            src={`/img/crypto/${imageSrc}.webp`}
            alt={`${chain} logo`}
            className="h-10 w-10 rounded-lg object-contain"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{chain}</h3>
        <p className="text-xs text-muted-foreground truncate">{network}</p>
      </div>
    </div>
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-2">
        <Server className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Node Provider:</span>
        <span className="text-xs font-medium text-primary truncate">
          {nodeProvider || "Default"}
        </span>
      </div>
    </div>
  </div>
);

// Extended Chain Card Component
interface ExtendedChainCardProps {
  chain: string;
  network: string;
  version?: string;
  status?: boolean;
  productId?: string;
  rpc?: boolean;
  rpcWss?: boolean;
  imageSrc: string;
  color: string;
}

const ExtendedChainCard = ({
  chain,
  network,
  version,
  status,
  productId,
  rpc,
  rpcWss,
  imageSrc,
  color,
}: ExtendedChainCardProps) => {
  const tCommon = useTranslations("common");
  const t = useTranslations("ext_admin");
  const needsInstall = version === "0.0.1";

  return (
    <div className="group p-4 rounded-xl bg-muted/30 border border-border/40 hover:border-border/60 hover:bg-muted/50 transition-all">
      <div className="flex items-start gap-3">
        <div className="relative">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 rounded-xl blur-lg group-hover:opacity-30 transition-opacity`}
          />
          <div className="relative p-2 rounded-xl bg-background border border-border/40">
            <img
              src={`/img/crypto/${imageSrc}.webp`}
              alt={`${chain} logo`}
              className="h-10 w-10 rounded-lg object-contain"
            />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{chain}</h3>
          <p className="text-xs text-muted-foreground truncate">{network}</p>
        </div>
        <Badge
          variant={status ? "default" : "secondary"}
          className="text-xs shrink-0"
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{tCommon("version")}</span>
          <Badge variant="outline" className="text-xs">
            {version || "0.0.1"}
          </Badge>
        </div>

        {chain === "MO" && (
          <div className="space-y-1.5">
            <StatusIndicator label="RPC" active={rpc} />
            <StatusIndicator label="RPC WSS" active={rpcWss} />
          </div>
        )}

        <div className="pt-2">
          {needsInstall ? (
            <Link href={`/admin/system/extension/${productId}`}>
              <Button size="sm" className="w-full gap-2">
                <Download className="h-3.5 w-3.5" />
                {t("install")}
              </Button>
            </Link>
          ) : !status ? (
            <Link href={`/admin/system/extension/${productId}`}>
              <Button size="sm" variant="secondary" className="w-full gap-2">
                <Zap className="h-3.5 w-3.5" />
                {tCommon("activate")}
              </Button>
            </Link>
          ) : (
            <Link href={`/admin/system/extension/${productId}`}>
              <Button size="sm" variant="outline" className="w-full gap-2">
                <Eye className="h-3.5 w-3.5" />
                {tCommon("view")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

// Status Indicator Component
interface StatusIndicatorProps {
  label: string;
  active?: boolean;
}

const StatusIndicator = ({ label, active }: StatusIndicatorProps) => (
  <div className="flex items-center gap-2">
    {active ? (
      <CheckCircle className="h-3.5 w-3.5 text-success" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-destructive" />
    )}
    <span className={`text-xs ${active ? "text-success" : "text-destructive"}`}>
      {label}
    </span>
  </div>
);

// Quick Action Card Component
interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  description: string;
  color: string;
}

const QuickActionCard = ({
  icon: Icon,
  label,
  href,
  description,
  color,
}: QuickActionCardProps) => (
  <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/40 hover:border-primary/20 hover:-translate-y-1">
    <Link href={href}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity`}
            />
            <div className="relative p-4 rounded-full bg-gradient-to-br from-background to-muted/20 border border-border/40 group-hover:border-primary/30 transition-colors">
              <Icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
              {label}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Link>
  </Card>
);

export default EcosystemBlockchains;
