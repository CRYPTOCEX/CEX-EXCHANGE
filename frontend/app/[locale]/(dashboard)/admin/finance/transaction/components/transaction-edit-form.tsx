"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TransactionEditFormProps {
  amount: string;
  fee: string;
  description: string;
  referenceId: string;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFeeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReferenceIdChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}

export const TransactionEditForm: React.FC<TransactionEditFormProps> = ({
  amount,
  fee,
  description,
  referenceId,
  onAmountChange,
  onFeeChange,
  onDescriptionChange,
  onReferenceIdChange,
  disabled,
}) => {
  return (
    <Card className="p-6 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700">
      <div className="grid gap-4">
        <Input
          type="number"
          title="Amount"
          value={amount}
          onChange={onAmountChange}
          disabled={disabled}
        />
        <Input
          type="number"
          title="Fee"
          value={fee}
          onChange={onFeeChange}
          disabled={disabled}
        />
        <Textarea
          title="Description"
          value={description}
          onChange={onDescriptionChange}
          disabled={disabled}
        />
        <Input
          type="text"
          title="Reference ID"
          value={referenceId}
          onChange={onReferenceIdChange}
          disabled={disabled}
        />
      </div>
    </Card>
  );
};
