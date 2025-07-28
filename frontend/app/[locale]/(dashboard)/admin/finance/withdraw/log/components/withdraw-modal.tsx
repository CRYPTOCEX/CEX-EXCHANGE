"use client";

import React, { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { TransactionSummary, Transaction as BaseTransaction } from "../../../transaction/components/transaction-summary";
import { TransactionEditForm } from "../../../transaction/components/transaction-edit-form";
import { RejectDialog } from "../../../transaction/components/reject-dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Extended Transaction interface for deposit/withdraw operations
interface Transaction extends BaseTransaction {
  amount: number;
  fee: number;
  walletId: string;
  description?: string;
  referenceId?: string;
}

interface WithdrawModalProps {
  withdrawId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onWithdrawUpdated?: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  withdrawId,
  isOpen,
  onClose,
  onWithdrawUpdated,
}) => {
  const t = useTranslations("dashboard");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Editable fields
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");

  // For rejection dialog
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState(
    "Please provide a reason for rejection."
  );

  const fetchTransaction = useCallback(async () => {
    if (!withdrawId) return;
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/withdraw/log/${withdrawId}`,
        silent: true,
      });
      if (!error && data) {
        setTransaction(data);
        setAmount(String(data.amount));
        setFee(String(data.fee));
        setDescription(data.description || "");
        setReferenceId(data.referenceId || "");
      }
    } catch (err) {
      console.error("Failed to fetch withdraw", err);
    } finally {
      setIsLoading(false);
    }
  }, [withdrawId]);

  useEffect(() => {
    if (withdrawId && isOpen) {
      fetchTransaction();
    }
  }, [withdrawId, isOpen, fetchTransaction]);

  const updateTransaction = async (newStatus: string) => {
    if (!withdrawId) return;
    setIsLoading(true);
    try {
      // Build the payload.
      const payload: any = {
        status: newStatus,
        amount: parseFloat(amount),
        fee: parseFloat(fee),
        description,
        referenceId,
      };

      if (newStatus === "REJECTED") {
        let currentMeta = {};
        try {
          currentMeta = transaction?.metadata
            ? JSON.parse(transaction.metadata)
            : {};
        } catch (err) {
          console.error("Failed to parse metadata, using empty object", err);
        }
        payload.metadata = { ...currentMeta, message: rejectionMessage };
      } else {
        try {
          payload.metadata = transaction?.metadata
            ? JSON.parse(transaction.metadata)
            : {};
        } catch (err) {
          payload.metadata = {};
        }
      }

      const { error } = await $fetch({
        method: "PUT",
        url: `/api/admin/finance/withdraw/log/${withdrawId}`,
        body: payload,
      });
      if (!error) {
        setTransaction((prev) =>
          prev
            ? {
                ...prev,
                ...payload,
                status: newStatus,
                metadata: JSON.stringify(payload.metadata),
              }
            : prev
        );
        if (newStatus === "REJECTED") {
          setIsRejectDialogOpen(false);
        }
        // Notify parent component to refresh data
        onWithdrawUpdated?.();
      }
    } catch (err) {
      console.error("Failed to update withdraw", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTransaction(null);
    setAmount("");
    setFee("");
    setDescription("");
    setReferenceId("");
    setIsRejectDialogOpen(false);
    setRejectionMessage("Please provide a reason for rejection.");
    onClose();
  };

  if (!isOpen) return null;

  const isEditable = transaction?.status === "PENDING";

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent 
          side="right" 
          className="w-[90vw] max-w-[90vw] min-w-[90vw] p-0 overflow-hidden sm:max-w-[90vw]"
          style={{ width: '90vw', maxWidth: '90vw', minWidth: '90vw' }}
        >
          <SheetHeader className="px-6 py-4 border-b bg-muted/30">
            <SheetTitle className="text-xl font-semibold">
              Withdraw Transaction Details
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-6 space-y-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-lg font-medium">Loading transaction details...</p>
                    <p className="text-sm text-muted-foreground">Please wait while we fetch the information</p>
                  </div>
                </div>
              ) : !transaction ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium">Transaction not found</p>
                      <p className="text-sm text-muted-foreground">The requested transaction could not be located</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Transaction Header */}
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 rounded-xl p-6 border border-red-200/50 dark:border-red-800/50">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Withdraw Transaction</h2>
                            <p className="text-sm text-muted-foreground">Transaction ID: {transaction.id}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            transaction.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-400'
                          }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              transaction.status === 'COMPLETED' ? 'bg-green-500' :
                              transaction.status === 'PENDING' ? 'bg-yellow-500' :
                              transaction.status === 'REJECTED' ? 'bg-red-500' : 'bg-zinc-500'
                            }`}></div>
                            {transaction.status}
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(transaction.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                          -{transaction.amount} {transaction.wallet?.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Fee: {transaction.fee} {transaction.wallet?.currency}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Information */}
                    <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        User Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-medium">
                            {transaction.user?.firstName?.[0]}{transaction.user?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.user?.firstName} {transaction.user?.lastName}</p>
                            <p className="text-sm text-muted-foreground">{transaction.user?.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Information */}
                    <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Wallet Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Currency:</span>
                          <span className="font-medium">{transaction.wallet?.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="font-medium">{transaction.wallet?.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Wallet ID:</span>
                          <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-700 px-2 py-1 rounded">
                            {transaction.walletId}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Section */}
                  {transaction.metadata && (
                    <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Transaction Metadata
                      </h3>
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(JSON.parse(transaction.metadata), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  <Separator />
                  
                  {/* Edit Form */}
                  <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Transaction Management
                    </h3>
                    
                    <TransactionEditForm
                      amount={amount}
                      fee={fee}
                      description={description}
                      referenceId={referenceId}
                      onAmountChange={(e) => setAmount(e.target.value)}
                      onFeeChange={(e) => setFee(e.target.value)}
                      onDescriptionChange={(e) => setDescription(e.target.value)}
                      onReferenceIdChange={(e) => setReferenceId(e.target.value)}
                      disabled={!isEditable}
                    />
                    
                    {isEditable && (
                      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-zinc-200 dark:border-zinc-700 mt-6">
                        <Button
                          variant="default"
                          onClick={() => updateTransaction("COMPLETED")}
                          disabled={isLoading}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Complete Transaction
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setIsRejectDialogOpen(true)}
                          disabled={isLoading}
                          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject Transaction
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <RejectDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        rejectionMessage={rejectionMessage}
        onRejectionMessageChange={(e) => setRejectionMessage(e.target.value)}
        onReject={() => updateTransaction("REJECTED")}
        isLoading={isLoading}
      />
    </>
  );
}; 