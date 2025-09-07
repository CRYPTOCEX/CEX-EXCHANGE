"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ValidationErrors {
  [key: string]: string;
}

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
  errors?: ValidationErrors;
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
  errors,
}) => {
  return (
    <Card className="p-6 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700">
      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium">
            Amount <span className="text-red-500">*</span>
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={onAmountChange}
            disabled={disabled}
            className={errors?.amount ? "border-red-500 focus:ring-red-500" : ""}
          />
          {errors?.amount && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.amount}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fee" className="text-sm font-medium">
            Fee <span className="text-red-500">*</span>
          </Label>
          <Input
            id="fee"
            type="number"
            step="0.01"
            min="0"
            value={fee}
            onChange={onFeeChange}
            disabled={disabled}
            className={errors?.fee ? "border-red-500 focus:ring-red-500" : ""}
          />
          {errors?.fee && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.fee}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={onDescriptionChange}
            disabled={disabled}
            rows={3}
            className={errors?.description ? "border-red-500 focus:ring-red-500" : ""}
          />
          {errors?.description && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="referenceId" className="text-sm font-medium">
            Reference ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="referenceId"
            type="text"
            value={referenceId}
            onChange={onReferenceIdChange}
            disabled={disabled}
            placeholder="Enter payment reference ID"
            className={errors?.referenceId ? "border-red-500 focus:ring-red-500" : ""}
          />
          {errors?.referenceId && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {errors.referenceId}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Required when completing the transaction
          </p>
        </div>
      </div>
    </Card>
  );
};
