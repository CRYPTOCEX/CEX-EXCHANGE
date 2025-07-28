"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
interface AmountInputProps {
  amount: number;
  setAmount: (amount: number) => void;
}
export default function AmountInput({ amount, setAmount }: AmountInputProps) {
  // Handle amount change
  const handleAmountChange = (value: string) => {
    const numValue = Number.parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setAmount(numValue);
    } else if (value === "") {
      setAmount(0);
    }
  };
  return (
    <div className="mb-4">
      <label className="block text-xs text-muted-foreground mb-1">
        Amount (USD)
      </label>
      <div className="relative">
        <Input
          type="number"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="pr-10"
          step="any"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2 mt-2">
        {[100, 500, 1000, 5000].map((value) => {
          return (
            <button
              key={value}
              className={cn(
                "py-1 text-xs rounded-md border",
                amount === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border dark:border-zinc-800"
              )}
              onClick={() => setAmount(value)}
            >
              ${value}
            </button>
          );
        })}
      </div>
    </div>
  );
}
