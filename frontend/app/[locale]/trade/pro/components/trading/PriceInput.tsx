"use client";

import React, { memo, useCallback, useMemo } from "react";
import { NumberField, FieldAction } from "./NumberField";
import { formatNumber } from "../../utils/format";
import { useTranslations } from "next-intl";

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  currentPrice: number | null;
  precision?: number;
  label?: string;
  className?: string;
  placeholder?: string;
  suffix?: string;
  invalid?: boolean;
}

export const PriceInput = memo(function PriceInput({
  value,
  onChange,
  currentPrice,
  precision = 2,
  label = "Price",
  className,
  placeholder,
  suffix,
  invalid,
}: PriceInputProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  const step = Math.pow(10, -precision);

  // Generate placeholder based on precision if not provided
  const displayPlaceholder = placeholder ?? (0).toFixed(precision);

  const handleStep = useCallback(
    (direction: 1 | -1) => {
      const current = parseFloat(value) || currentPrice || 0;
      const next = current + step * direction;
      if (next > 0) onChange(next.toFixed(precision));
    },
    [value, currentPrice, step, precision, onChange]
  );

  const setToMarket = useCallback(() => {
    if (currentPrice) {
      onChange(currentPrice.toFixed(precision));
    }
  }, [currentPrice, precision, onChange]);

  // How far the typed price sits from the market. This is the number a trader
  // actually reasons about when placing a resting order, and it costs no space
  // — it rides in the label row that was already there.
  const deviation = useMemo(() => {
    const typed = parseFloat(value);
    if (!currentPrice || !Number.isFinite(typed) || typed <= 0) return null;
    const pct = ((typed - currentPrice) / currentPrice) * 100;
    if (Math.abs(pct) < 0.01) return null;
    return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
  }, [value, currentPrice]);

  return (
    <NumberField
      label={deviation ? `${label} (${deviation})` : label}
      value={value}
      onChange={onChange}
      placeholder={displayPlaceholder}
      suffix={suffix}
      invalid={invalid}
      onStep={handleStep}
      className={className}
      hint={
        currentPrice ? (
          <FieldAction onClick={setToMarket} title={t("use_last_traded_price")}>
            {tCommon("market")}: {formatNumber(currentPrice, precision)}
          </FieldAction>
        ) : undefined
      }
    />
  );
});

export default PriceInput;
