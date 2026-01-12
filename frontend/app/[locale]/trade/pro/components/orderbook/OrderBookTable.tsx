"use client";

import React, { memo, useMemo } from "react";
import { cn } from "../../utils/cn";
import { OrderBookRow } from "./OrderBookRow";

interface OrderBookTableProps {
  data: [number, number][]; // [price, amount]
  side: "bid" | "ask";
  showCumulative: boolean;
  onPriceClick: (price: number) => void;
  maxVolume: number;
  pricePrecision?: number;
  amountPrecision?: number;
  maxRows?: number;
}

export const OrderBookTable = memo(function OrderBookTable({
  data,
  side,
  showCumulative,
  onPriceClick,
  maxVolume,
  pricePrecision = 2,
  amountPrecision = 4,
  maxRows = 15,
}: OrderBookTableProps) {
  // Calculate cumulative volumes
  const rowsWithCumulative = useMemo(() => {
    let cumulative = 0;
    const rows = data.slice(0, maxRows).map(([price, amount]) => {
      cumulative += amount;
      return {
        price,
        amount,
        cumulative,
        percentage: maxVolume > 0 ? (amount / maxVolume) * 100 : 0,
      };
    });
    return rows;
  }, [data, maxVolume, maxRows]);

  return (
    <div className={cn("tp-orderbook-table")}>
      {rowsWithCumulative.map((row) => (
        <OrderBookRow
          key={`${side}-${row.price}`}
          price={row.price}
          amount={row.amount}
          cumulative={row.cumulative}
          percentage={row.percentage}
          side={side}
          showCumulative={showCumulative}
          onClick={() => onPriceClick(row.price)}
          pricePrecision={pricePrecision}
          amountPrecision={amountPrecision}
        />
      ))}
    </div>
  );
});

export default OrderBookTable;
