"use client";

import { X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import type { BinaryOrderType } from "@/types/binary-trading";
import { ORDER_TYPE_CONFIGS } from "@/types/binary-trading";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import { OrderTypeIcon, ORDER_TYPE_ACCENT } from "./order-type-icons";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: BinaryOrderType;
  onSelectType: (type: BinaryOrderType) => void;
  /** @deprecated Tokens are theme-aware; kept so callers need no change. */
  darkMode?: boolean;
}

export default function OrderTypeModal({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-50 flex"
        >
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-overlay/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <m.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring" as const, damping: 30, stiffness: 400 }}
            className="relative ml-auto h-full w-full flex flex-col bg-card border-l border-border"
          >
            {/* Header - Compact */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                {t("select_order_type")}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg transition-colors hover:bg-surface-3 text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Order Types List - Compact */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {enabledTypes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">{t("no_order_types_enabled")}</p>
                  <p className="text-xs mt-1">{t("contact_admin_to_enable_trading")}</p>
                </div>
              ) : (
                enabledTypes.map((type) => {
                  const config = ORDER_TYPE_CONFIGS[type];
                  const isSelected = selectedType === type;

                  return (
                    <button
                      key={type}
                      onClick={() => handleSelect(type)}
                      className={cn(
                        "w-full p-2.5 rounded-lg border transition-all text-left",
                        isSelected
                          ? `${ORDER_TYPE_ACCENT.border} ${ORDER_TYPE_ACCENT.tint}`
                          : "border-border bg-surface-2 hover:bg-surface-3"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Icon - Compact */}
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-surface-3 text-muted-foreground"
                          )}
                        >
                          <OrderTypeIcon orderType={type} size={16} />
                        </div>

                        {/* Content - Compact */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-foreground">
                              {config.label}
                            </h3>
                            {isSelected && (
                              <div className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-foreground">
                                Active
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {config.description}
                          </p>

                          {/* Requirements - Inline badges */}
                          {(config.requiresBarrier || config.requiresStrikePrice || config.requiresPayoutPerPoint) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {config.requiresBarrier && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground">
                                  Barrier
                                </span>
                              )}
                              {config.requiresStrikePrice && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground">
                                  Strike
                                </span>
                              )}
                              {config.requiresPayoutPerPoint && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground">
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
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
