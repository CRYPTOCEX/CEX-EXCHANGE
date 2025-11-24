"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Icon } from "@iconify/react";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

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
const EcosystemBlockchains = () => {
  const t = useTranslations("ext");
  // Use EcosystemData as the type of your state
  const [blockchains, setBlockchains] = useState<EcosystemData>({
    baseChains: [],
    extendedChains: [],
    isUnlockedVault: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPassPhraseDialogOpen, setIsPassPhraseDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const router = useRouter();
  const fetchBlockchains = async () => {
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
  };
  useEffect(() => {
    fetchBlockchains();
  }, []);
  const supportedChainsImagesMap = (chain: string) => {
    switch (chain) {
      case "ETH":
        return "eth";
      case "BSC":
        return "bnb";
      case "POLYGON":
        return "matic";
      case "FTM":
        return "ftm";
      case "OPTIMISM":
        return "op";
      case "ARBITRUM":
        return "arbitrum";
      case "BASE":
        return "base";
      case "CELO":
        return "celo";
      case "BTC":
        return "btc";
      case "LTC":
        return "ltc";
      case "DOGE":
        return "doge";
      case "DASH":
        return "dash";
      case "SOL":
        return "sol";
      case "TRON":
        return "trx";
      case "XMR":
        return "xmr";
      case "MO":
        return "mo";
      case "TON":
        return "ton";
      default:
        return chain.toLowerCase();
    }
  };
  const setPassphraseHandler = async () => {
    setIsSubmitting(true);
    const { error } = await $fetch({
      url: "/api/admin/ecosystem/kms",
      method: "POST",
      body: {
        passphrase,
      },
    });
    if (!error) {
      setIsPassPhraseDialogOpen(false);
      setPassphrase("");
      await fetchBlockchains();
    }
    setIsSubmitting(false);
  };
  // Render UTXO blockchains
  const renderUtxoChains = (chains: ChainData[]) =>
    chains.map((item, index) => {
      return (
        <div key={index} className="flex flex-col items-center">
          <img
            src={`/img/crypto/${supportedChainsImagesMap(item.chain)}.webp`}
            alt={`${item.chain} logo`}
            className="h-10 w-10 rounded-full"
          />
          <span className="mt-1 text-sm font-semibold text-foreground">
            {item.chain} ( {item.info.network} )
          </span>
          <ul className="text-xs mt-1">
            <li>
              <span className="text-muted-foreground">{t("Node")}</span>
              <span className="text-info">{item.info.nodeProvider}</span>
            </li>
          </ul>
        </div>
      );
    });
  // Render EVM blockchains
  const renderEvmChains = (chains: ChainData[]) =>
    chains.map((item, index) => {
      return (
        <div key={index} className="flex flex-col items-center">
          <img
            src={`/img/crypto/${supportedChainsImagesMap(item.chain)}.webp`}
            alt={`${item.chain} logo`}
            className="h-10 w-10 rounded-full"
          />
          <span className="mt-1 text-sm font-semibold text-foreground">
            {item.chain} ( {item.info.network} )
          </span>
          <ul className="text-xs mt-1">
            <li
              className={`flex items-center gap-2 ${item.info.rpc ? "text-success" : "text-destructive"}`}
            >
              <Icon
                icon={item.info.rpc ? "lucide:check" : "lucide:x"}
                className="h-3 w-3"
              />
              RPC
            </li>
            <li
              className={`flex items-center gap-2 ${item.info.rpcWss ? "text-success" : "text-destructive"}`}
            >
              <Icon
                icon={item.info.rpcWss ? "lucide:check" : "lucide:x"}
                className="h-3 w-3"
              />
              RPC WSS
            </li>
            <li
              className={`flex items-center gap-2 ${item.info.explorerApi ? "text-success" : "text-destructive"}`}
            >
              <Icon
                icon={item.info.explorerApi ? "lucide:check" : "lucide:x"}
                className="h-3 w-3"
              />
              {t("explorer_api")}
            </li>
          </ul>
        </div>
      );
    });
  // Render extended blockchains
  const renderExtendedChains = (chains: ChainData[]) =>
    chains.map((item, index) => {
      return (
        <div key={index} className="flex flex-col items-center">
          <img
            src={`/img/crypto/${supportedChainsImagesMap(item.chain)}.webp`}
            alt={`${item.chain} logo`}
            className="h-10 w-10 rounded-full"
          />
          <span className="mt-1 text-sm font-semibold text-foreground">
            {item.chain} ( {item.info.network} )
          </span>
          <ul className="text-xs mt-1">
            <li>
              <span className="text-muted-foreground">{t("Network")}</span>
              <span className="text-info">{item.info.network}</span>
            </li>
            <li>
              <span className="text-muted-foreground">{t("Version")}</span>
              <span className="text-info">{item.info.version}</span>
            </li>
            <li
              className={`flex items-center gap-2 ${item.info.status ? "text-success" : "text-destructive"}`}
            >
              <Icon
                icon={item.info.status ? "lucide:check" : "lucide:x"}
                className="h-3 w-3"
              />
              {item.info.status ? "Active" : "Inactive"}
            </li>
            {item.chain === "MO" && (
              <>
                <li
                  className={`flex items-center gap-2 ${item.info.rpc ? "text-success" : "text-destructive"}`}
                >
                  <Icon
                    icon={item.info.rpc ? "lucide:check" : "lucide:x"}
                    className="h-3 w-3"
                  />
                  RPC
                </li>
                <li
                  className={`flex items-center gap-2 ${item.info.rpcWss ? "text-success" : "text-destructive"}`}
                >
                  <Icon
                    icon={item.info.rpcWss ? "lucide:check" : "lucide:x"}
                    className="h-3 w-3"
                  />
                  RPC WSS
                </li>
              </>
            )}
            {item.info.version === "0.0.1" && (
              <div className="w-full mt-2">
                <Button
                  color="primary"
                  className="w-full"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/admin/ecosystem/blockchain/${item.info.productId}`
                    )
                  }
                >
                  {t("Install")}
                </Button>
              </div>
            )}
            {!item.info.status && (
              <div className="w-full mt-2">
                <Button
                  color="success"
                  className="w-full"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/admin/ecosystem/blockchain/${item.info.productId}`
                    )
                  }
                >
                  {t("Activate")}
                </Button>
              </div>
            )}
            {item.info.status && item.info.version !== "0.0.1" && (
              <div className="w-full mt-2">
                <Button
                  color="info"
                  className="w-full"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/admin/ecosystem/blockchain/${item.info.productId}`
                    )
                  }
                >
                  {t("View")}
                </Button>
              </div>
            )}
          </ul>
        </div>
      );
    });
  return (
    <div className="container space-y-8 p-5">
      {/* Header + Vault Active/Initiate Vault */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t("ecosystem_blockchains")}</h2>
        {blockchains.isUnlockedVault ? (
          <div className="flex items-center gap-2 rounded-md px-3 py-1 text-sm bg-success/10 text-success">
            <Icon icon="line-md:confirm-circle" className="h-5 w-5" />
            {t("vault_active")}
          </div>
        ) : (
          <Dialog
            open={isPassPhraseDialogOpen}
            onOpenChange={setIsPassPhraseDialogOpen}
          >
            <DialogTrigger asChild>
              <Button color="success" className="ml-2">
                <Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
                {t("initiate_vault")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm bg-card text-card-foreground z-999">
              <DialogHeader>
                <DialogTitle>{t("set_ecosystem_passphrase")}</DialogTitle>
                <DialogDescription>
                  {t("please_enter_the_passphrase_of_the_ecosystem_vault")}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase"
                  type="password"
                  disabled={isSubmitting}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsPassPhraseDialogOpen(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  color="primary"
                  onClick={setPassphraseHandler}
                  disabled={isSubmitting}
                >
                  {t("Submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {/* Built-in Blockchains */}
      <Card className="bg-card text-card-foreground p-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t("built-in_blockchains")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid gap-5 mt-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {renderUtxoChains(
              blockchains.baseChains.filter((chain) =>
                ["BTC", "LTC", "DOGE", "DASH"].includes(chain.chain)
              )
            )}
            {renderEvmChains(
              blockchains.baseChains.filter(
                (chain) => !["BTC", "LTC", "DOGE", "DASH"].includes(chain.chain)
              )
            )}
          </div>
        </CardContent>
      </Card>
      {/* Extended Blockchains */}
      <Card className="bg-card text-card-foreground p-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t("extended_blockchains")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid gap-5 mt-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {renderExtendedChains(blockchains.extendedChains)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default EcosystemBlockchains;
