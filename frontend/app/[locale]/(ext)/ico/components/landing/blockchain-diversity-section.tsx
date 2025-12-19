"use client";

import { motion } from "framer-motion";
import { Globe, Layers, Sparkles, Box } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface BlockchainItem {
  name: string;
  value: string;
  offeringCount: number;
}

interface TokenTypeItem {
  name: string;
  value: string;
  offeringCount: number;
}

interface BlockchainDiversitySectionProps {
  blockchains: BlockchainItem[];
  tokenTypes: TokenTypeItem[];
  isLoading?: boolean;
}

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Blockchain colors and icons
const blockchainConfig: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Ethereum: { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/20" },
  "Binance Smart Chain": { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
  BSC: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
  Polygon: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
  Solana: { bg: "bg-gradient-to-r from-violet-500/10 to-teal-500/10", text: "text-violet-500", border: "border-violet-500/20" },
  Avalanche: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
  Arbitrum: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  Base: { bg: "bg-blue-600/10", text: "text-blue-600", border: "border-blue-600/20" },
  Optimism: { bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20" },
  Cardano: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20" },
  Polkadot: { bg: "bg-pink-500/10", text: "text-pink-500", border: "border-pink-500/20" },
};

// Token type colors
const tokenTypeConfig: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  Utility: { bg: "bg-teal-500/10", text: "text-teal-500", icon: "wrench" },
  Security: { bg: "bg-amber-500/10", text: "text-amber-500", icon: "shield" },
  Governance: { bg: "bg-purple-500/10", text: "text-purple-500", icon: "vote" },
  Payment: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: "dollar" },
  NFT: { bg: "bg-pink-500/10", text: "text-pink-500", icon: "image" },
  DeFi: { bg: "bg-blue-500/10", text: "text-blue-500", icon: "trending" },
};

function BlockchainBadge({
  blockchain,
  index,
}: {
  blockchain: BlockchainItem;
  index: number;
}) {
  const config = blockchainConfig[blockchain.name] || {
    bg: "bg-zinc-500/10",
    text: "text-zinc-500",
    border: "border-zinc-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${config.bg} border ${config.border} transition-all duration-300 hover:shadow-lg cursor-pointer`}
    >
      <Globe className={`w-5 h-5 ${config.text}`} />
      <div className="flex-1">
        <span className={`font-semibold ${config.text}`}>{blockchain.name}</span>
      </div>
      <div className="px-2 py-0.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {blockchain.offeringCount} {blockchain.offeringCount === 1 ? "project" : "projects"}
      </div>
    </motion.div>
  );
}

function TokenTypeBadge({
  tokenType,
  index,
}: {
  tokenType: TokenTypeItem;
  index: number;
}) {
  const config = tokenTypeConfig[tokenType.name] || {
    bg: "bg-zinc-500/10",
    text: "text-zinc-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${config.bg} border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300 cursor-pointer`}
    >
      <Box className={`w-5 h-5 ${config.text}`} />
      <div className="flex-1">
        <span className={`font-semibold ${config.text}`}>{tokenType.name}</span>
      </div>
      <div className="px-2 py-0.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {tokenType.offeringCount}
      </div>
    </motion.div>
  );
}

function LoadingBadge() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse">
      <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      <div className="flex-1 h-4 bg-zinc-300 dark:bg-zinc-700 rounded" />
      <div className="w-12 h-4 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
    </div>
  );
}

export default function BlockchainDiversitySection({
  blockchains,
  tokenTypes,
  isLoading,
}: BlockchainDiversitySectionProps) {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const gradient = { from: "#14b8a6", to: "#06b6d4" };

  // Filter out token types with UUID names (backend data issue)
  const validTokenTypes = tokenTypes?.filter(tt => !isUUID(tt.name)) || [];

  const totalBlockchains = blockchains?.length || 0;
  const totalTokenTypes = validTokenTypes?.length || 0;

  if (!isLoading && totalBlockchains === 0 && totalTokenTypes === 0) {
    return null;
  }

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/20"
          >
            <Layers className="w-4 h-4 text-teal-500 mr-2" />
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
              {tCommon("multi_chain") || "Multi-Chain Support"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tExt("platform") || "Platform"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {t("diversity") || "Diversity"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("explore_offerings_across_multiple") ||
              "Explore offerings across multiple blockchains and token types. We support the most popular networks."}
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Blockchains */}
          {(isLoading || totalBlockchains > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-500" />
                {tExt("supported_blockchains") || "Supported Blockchains"}
                {!isLoading && (
                  <span className="text-sm font-normal text-zinc-500">
                    ({totalBlockchains})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isLoading
                  ? [...Array(6)].map((_, i) => <LoadingBadge key={i} />)
                  : blockchains.map((blockchain, index) => (
                      <BlockchainBadge
                        key={blockchain.value}
                        blockchain={blockchain}
                        index={index}
                      />
                    ))}
              </div>
            </motion.div>
          )}

          {/* Token Types */}
          {(isLoading || totalTokenTypes > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-500" />
                {tExt("token_types") || "Token Types"}
                {!isLoading && (
                  <span className="text-sm font-normal text-zinc-500">
                    ({totalTokenTypes})
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {isLoading
                  ? [...Array(6)].map((_, i) => <LoadingBadge key={i} />)
                  : validTokenTypes.map((tokenType, index) => (
                      <TokenTypeBadge
                        key={tokenType.value}
                        tokenType={tokenType}
                        index={index}
                      />
                    ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom stats */}
        {!isLoading && (totalBlockchains > 0 || totalTokenTypes > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mt-10"
          >
            <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {totalBlockchains}
                  </span>{" "}
                  Blockchains
                </span>
              </div>
              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                    {totalTokenTypes}
                  </span>{" "}
                  Token Types
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
