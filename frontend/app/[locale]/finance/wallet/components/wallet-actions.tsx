"use client";

import { useRouter } from "@/i18n/routing";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  History,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function WalletActions() {
  const t = useTranslations("finance/wallet/components/wallet-actions");
  const router = useRouter();

  const actions = [
    {
      title: "Deposit",
      description: "Add funds to your wallet",
      icon: ArrowDownToLine,
      color: "bg-green-500",
      textColor: "text-green-500",
      onClick: () => router.push("/finance/deposit"),
    },
    {
      title: "Withdraw",
      description: "Withdraw funds from your wallet",
      icon: ArrowUpFromLine,
      color: "bg-red-500",
      textColor: "text-red-500",
      onClick: () => router.push("/finance/withdraw"),
    },
    {
      title: "Transfer",
      description: "Transfer between wallets",
      icon: ArrowLeftRight,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      onClick: () => router.push("/finance/transfer"),
    },
    {
      title: "History",
      description: "View transaction history",
      icon: History,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      onClick: () => router.push("/finance/history"),
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">{t("quick_actions")}</h3>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {actions.map((action) => (
          <motion.div key={action.title} variants={item}>
            <button onClick={action.onClick} className="w-full text-left group">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 p-6 shadow-sm hover:shadow-md transition-all duration-200 h-full">
                <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 opacity-10 group-hover:opacity-20 transition-opacity duration-200">
                  <div
                    className={`w-full h-full rounded-full ${action.color}`}
                  ></div>
                </div>

                <div className="flex flex-col h-full">
                  <div
                    className={`p-3 rounded-lg ${action.color} bg-opacity-10 mb-4 w-fit`}
                  >
                    <action.icon className={`h-5 w-5 ${action.textColor}`} />
                  </div>

                  <h4 className="text-lg font-semibold mb-1">{action.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>

                  <div className="mt-auto pt-4">
                    <div className="w-0 group-hover:w-full h-0.5 bg-gradient-to-r from-blue-500 to-blue-300 transition-all duration-300"></div>
                  </div>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
