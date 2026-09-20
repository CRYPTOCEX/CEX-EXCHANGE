"use client";

import React, { memo, useCallback } from "react";
import { NumberField, FieldAction } from "./NumberField";
import { formatNumber } from "../../utils/format";
import { useTranslations } from "next-intl";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  precision?: number;
  currency?: string;
  label?: string;
  placeholder?: string;
  invalid?: boolean;
}

export const AmountInput = memo(function AmountInput({
  value,
  onChange,
  max = 0,
  precision = 4,
  currency = "BTC",
  label = "Amount",
  placeholder,
  invalid,
}: AmountInputProps) {
  const t = useTranslations("trade_pro");
  const tCommon = useTranslations("common");
  // Generate placeholder based on precision if not provided
  const displayPlaceholder = placeholder ?? (0).toFixed(precision);

  const setMax = useCallback(() => {
    if (max > 0) onChange(max.toFixed(precision));
  }, [max, precision, onChange]);

  return (
    <NumberField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={displayPlaceholder}
      suffix={currency}
      invalid={invalid}
      hint={
        max > 0 ? (
          <FieldAction onClick={setMax} title={t("use_full_available_balance")}>
            {tCommon("max")}: {formatNumber(max, precision)}
          </FieldAction>
        ) : undefined
      }
    />
  );
});

export default AmountInput;
