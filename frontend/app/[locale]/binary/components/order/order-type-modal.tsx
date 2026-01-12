"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { BinaryOrderType } from "@/types/binary-trading";
import { ORDER_TYPE_CONFIGS } from "@/types/binary-trading";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { OrderTypeIcon, ORDER_TYPE_COLORS } from "./order-type-icons";
import { useTranslations } from "next-intl";

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: BinaryOrderType;
  onSelectType: (type: BinaryOrderType) => void;
  darkMode?: boolean;
}

export default function OrderTypeModal({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
  darkMode = false,
}: OrderTypeModalProps) {
  const t = useTranslations("binary_components");
  // Get enabled order types from binary settings
  const getEnabledOrderTypes = useBinaryStore((state) => state.getEnabledOrderTypes);
  const enabledTypes = getEnabledOrderTypes();

  const handleSelect = (type: BinaryOrderType) => {
    onSelectType(type);
    onClose();
  };

  if (!isOpen) return null;

  // Theme matching other overlays
  const theme = {
    bg: darkMode ? "bg-zinc-900" : "bg-white",
    bgSubtle: darkMode ? "bg-zinc-800/50" : "bg-gray-50",
    bgCard: darkMode ? "bg-zinc-800" : "bg-gray-100",
    border: darkMode ? "border-zinc-800/50" : "border-gray-200/50",
    text: darkMode ? "text-white" : "text-gray-900",
    textMuted: darkMode ? "text-zinc-400" : "text-gray-500",
    textSubtle: darkMode ? "text-zinc-500" : "text-gray-400",
    hoverBg: darkMode ? "hover:bg-zinc-700/50" : "hover:bg-gray-100",
    backdrop: darkMode ? "bg-black/60" : "bg-black/40",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${theme.backdrop} backdrop-blur-sm`}
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring" as const, damping: 30, stiffness: 400 }}
            className={`relative ml-auto h-full w-full flex flex-col ${theme.bg} shadow-2xl border-l ${theme.border}`}
          >
            {/* Header - Compact */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${theme.border}`}>
              <h2 className={`text-sm font-semibold ${theme.text}`}>
                {t("select_order_type")}
              </h2>
              <button
                onClick={onClose}
                className={`p-1 rounded-lg transition-colors ${theme.hoverBg} ${theme.textMuted}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Order Types List - Compact */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {enabledTypes.length === 0 ? (
                <div className={`p-4 text-center ${theme.textMuted}`}>
                  <p className="text-sm">{t("no_order_types_enabled")}</p>
                  <p className="text-xs mt-1">{t("contact_admin_to_enable_trading")}</p>
                </div>
              ) : (
                enabledTypes.map((type) => {
                  const config = ORDER_TYPE_CONFIGS[type];
                  const color = ORDER_TYPE_COLORS[type];
                  const isSelected = selectedType === type;

                  return (
                    <button
                      key={type}
                      onClick={() => handleSelect(type)}
                      className={`w-full p-2.5 rounded-lg border transition-all text-left ${
                        isSelected
                          ? `${color.border} ${darkMode ? color.bgDark : color.bg}`
                          : `${theme.border} ${theme.hoverBg} ${theme.bgSubtle}`
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Icon - Compact */}
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected
                              ? `${(darkMode ? color.textDark : color.text).replace("text-", "bg-")} text-white`
                              : darkMode
                                ? "bg-zinc-700 text-zinc-300"
                                : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          <OrderTypeIcon orderType={type} size={16} />
                        </div>

                        {/* Content - Compact */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={`text-sm font-medium ${theme.text}`}>
                              {config.label}
                            </h3>
                            {isSelected && (
                              <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${darkMode ? color.bgDark : color.bg} ${darkMode ? color.textDark : color.text}`}>
                                Active
                              </div>
                            )}
                          </div>
                          <p className={`text-[11px] ${theme.textMuted} line-clamp-1`}>
                            {config.description}
                          </p>

                          {/* Requirements - Inline badges */}
                          {(config.requiresBarrier || config.requiresStrikePrice || config.requiresPayoutPerPoint) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {config.requiresBarrier && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                                    darkMode
                                      ? "bg-zinc-700/50 text-zinc-400"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  Barrier
                                </span>
                              )}
                              {config.requiresStrikePrice && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                                    darkMode
                                      ? "bg-zinc-700/50 text-zinc-400"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  Strike
                                </span>
                              )}
                              {config.requiresPayoutPerPoint && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                                    darkMode
                                      ? "bg-zinc-700/50 text-zinc-400"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {t("payout_pt")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
