"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Building,
  Wallet,
  Smartphone,
  Globe,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  processingTime?: string;
}

interface PaymentMethodsSectionProps {
  methods: PaymentMethod[];
  isLoading?: boolean;
}

// Payment method icon mapping
const getPaymentIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("bank") || lowerName.includes("transfer")) return Building;
  if (lowerName.includes("card") || lowerName.includes("credit") || lowerName.includes("debit")) return CreditCard;
  if (lowerName.includes("mobile") || lowerName.includes("pay")) return Smartphone;
  if (lowerName.includes("wallet") || lowerName.includes("crypto")) return Wallet;
  return Globe;
};

// Payment method colors
const paymentColors: Record<string, { bg: string; text: string; border: string }> = {
  "Bank Transfer": { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  "PayPal": { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/20" },
  "Credit Card": { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
  "Debit Card": { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20" },
  "Mobile Payment": { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  "Crypto Wallet": { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  "Cash Deposit": { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20" },
  "Wire Transfer": { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20" },
};

function PaymentMethodCard({
  method,
  index,
}: {
  method: PaymentMethod;
  index: number;
}) {
  const Icon = getPaymentIcon(method.name);
  const colors = paymentColors[method.name] || {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className={`flex flex-col items-center gap-3 p-5 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-300 hover:shadow-lg cursor-pointer`}
    >
      {/* Icon */}
      {method.icon ? (
        <img
          src={method.icon}
          alt={method.name}
          className="w-10 h-10 object-contain"
        />
      ) : (
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>
      )}

      {/* Name */}
      <span className={`font-semibold text-sm ${colors.text} text-center`}>
        {method.name}
      </span>

      {/* Processing Time */}
      {method.processingTime && (
        <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="w-3 h-3" />
          <span>{method.processingTime}</span>
        </div>
      )}
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-zinc-300 dark:bg-zinc-700" />
      <div className="h-4 w-20 bg-zinc-300 dark:bg-zinc-700 rounded" />
      <div className="h-3 w-16 bg-zinc-300 dark:bg-zinc-700 rounded" />
    </div>
  );
}

export default function PaymentMethodsSection({
  methods,
  isLoading,
}: PaymentMethodsSectionProps) {
  const t = useTranslations("ext_p2p");
  const tExt = useTranslations("ext");
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  if (!isLoading && (!methods || methods.length === 0)) {
    return null;
  }

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/20"
          >
            <CreditCard className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {t("payment_options") || "Payment Options"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("supported") || "Supported"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {tExt("payment_methods") || "Payment Methods"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("trade_with_your_preferred_payment") ||
              "Trade with your preferred payment method. We support multiple options for your convenience."}
          </p>
        </motion.div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 max-w-5xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(8)].map((_, i) => <LoadingCard key={i} />)
              : methods.slice(0, 8).map((method, index) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    index={index}
                  />
                ))}
          </AnimatePresence>
        </div>

        {/* Count Badge */}
        {!isLoading && methods.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mt-10"
          >
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <CreditCard className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {methods.length}+
                </span>{" "}
                payment methods supported
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
