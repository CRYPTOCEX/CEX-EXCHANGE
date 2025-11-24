"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useAdminTransactionStore } from "@/store/ico/admin/admin-transaction-store";
import TransactionLoading from "./loading";
// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
// Icons
import {
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  Clock,
  RefreshCw,
  XCircle,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { useToast } from "@/hooks/use-toast";
export default function TransactionDetailsPage() {
  const { id } = useParams() as {
    id: string;
  };
  const { toast } = useToast();
  const {
    transaction,
    fetchTransaction,
    verifyTransaction,
    rejectTransaction,
    saveTransactionNote,
    removeTransactionNote,
    isLoadingTransaction,
  } = useAdminTransactionStore();
  // State
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [note, setNote] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Effects
  useEffect(() => {
    if (id) fetchTransaction(id);
  }, [id, fetchTransaction]);
  useEffect(() => {
    if (transaction?.notes) {
      setNote(transaction.notes);
    }
  }, [transaction?.notes]);
  if (!transaction || isLoadingTransaction) {
    return <TransactionLoading />;
  }
  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(date);
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied to your clipboard.`,
      duration: 3000,
    });
  };
  // Status helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
            <Clock className="w-3 h-3 mr-1" /> User Invested
          </Badge>
        );
      case "VERIFICATION":
        if (transaction.releaseUrl) {
          return (
            <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
              <Icon
                icon="mdi:clock-time-four-outline"
                className="w-3 h-3 mr-1"
              />
              Release URL Submitted
            </Badge>
          );
        }
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            <Icon icon="mdi:clock-time-four-outline" className="w-3 h-3 mr-1" />
            Awaiting Release URL
          </Badge>
        );
      case "RELEASED":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircle className="w-3 h-3 mr-1" /> Released
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 text-white">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600 text-white">
            {status}
          </Badge>
        );
    }
  };
  // Action state helpers
  const isReleased = transaction.status === "RELEASED";
  const isRejected = transaction.status === "REJECTED";
  const isVerification = transaction.status === "VERIFICATION";
  const canApprove = isVerification && transaction.releaseUrl;
  const canReject = isVerification && transaction.releaseUrl;
  const canAddNote = !isReleased && !isRejected;
  const hasNote = Boolean(
    transaction.notes && transaction.notes.trim().length > 0
  );
  const canRemoveNote = hasNote && canAddNote;
  // Action handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransaction(transaction.id);
    setIsRefreshing(false);
  };
  const handleApprove = async () => {
    await verifyTransaction(transaction.id);
    setOpenApproveDialog(false);
  };
  const handleReject = async () => {
    if (!rejectNote.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    await rejectTransaction(transaction.id, rejectNote);
    setOpenRejectDialog(false);
    setRejectNote("");
  };
  const handleSaveNote = async () => {
    await saveTransactionNote(transaction.id, note);
  };
  const handleRemoveNote = async () => {
    await removeTransactionNote(transaction.id);
  };
  return (
    <div className="container mx-auto pb-20 space-y-6 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground">
          <Link
            href="/admin/ico/transaction"
            className="flex items-center hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Transactions
          </Link>
        </div>
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Transaction Details
            </h1>
            <p className="text-muted-foreground mt-1">
              ID: {transaction.id} • Created {formatDate(transaction.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>
      {/* Transaction Overview Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center justify-between">
            <span className="flex items-center gap-2">
              Transaction Overview
              {getStatusBadge(transaction.status)}
            </span>
            <div className="flex items-center justify-end gap-4">
              {canReject && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenRejectDialog(true)}
                  className="border-red-500 text-red-500 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              )}
              {canApprove && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setOpenApproveDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Comprehensive details about this transaction
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Transaction ID */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Transaction ID
                </h3>
                <div className="flex items-center">
                  <code className="bg-muted p-1.5 rounded text-xs md:text-sm truncate max-w-[250px]">
                    {transaction.id}
                  </code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={() =>
                            copyToClipboard(transaction.id, "Transaction ID")
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy Transaction ID</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              {/* Release URL */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Release URL
                </h3>
                <div className="flex items-center">
                  <code className="bg-muted p-1.5 rounded text-xs md:text-sm truncate max-w-[250px]">
                    {transaction.releaseUrl || "Not submitted"}
                  </code>
                  {transaction.releaseUrl && (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-1"
                              onClick={() =>
                                copyToClipboard(
                                  transaction.releaseUrl,
                                  "Release URL"
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy Release URL</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              asChild
                            >
                              <a
                                href={transaction.releaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View on Blockchain Explorer</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>
              {/* Amount & Price */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Amount & Price
                </h3>
                <p className="text-xl font-semibold">
                  ${transaction.amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Price per token: ${transaction.price}
                </p>
                <p className="text-sm font-medium mt-1">
                  Token amount:{" "}
                  {(transaction.amount / transaction.price).toLocaleString()}{" "}
                  {transaction.offering.symbol}
                </p>
              </div>
              {/* Wallet Address */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Wallet Address
                </h3>
                <div className="flex items-center">
                  <code className="bg-muted p-1.5 rounded text-xs truncate max-w-[250px]">
                    {transaction.walletAddress}
                  </code>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-1"
                          onClick={() =>
                            copyToClipboard(
                              transaction.walletAddress,
                              "Wallet Address"
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy Wallet Address</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            {/* Right Column */}
            <div className="space-y-4">
              {/* Offering */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Offering
                </h3>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">
                      {transaction.offering.symbol.substring(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      <Link
                        href={`/admin/ico/offer/${transaction.offering.id}`}
                        className="text-primary hover:underline"
                      >
                        {transaction.offering.name}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Symbol: {transaction.offering.symbol}
                    </p>
                  </div>
                </div>
              </div>
              {/* Investor */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Investor
                </h3>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {transaction.user.firstName.charAt(0)}
                      {transaction.user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {transaction.user.firstName} {transaction.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.user.email}
                    </p>
                  </div>
                </div>
              </div>
              {/* Timeline */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Timeline
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-1">
                      {formatDate(transaction.createdAt)}
                    </span>
                  </div>
                  {transaction.updatedAt &&
                    transaction.updatedAt !== transaction.createdAt && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full bg-indigo-500 mr-2"></div>
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="ml-1">
                          {formatDate(transaction.updatedAt)}
                        </span>
                      </div>
                    )}
                  {transaction.status === "RELEASED" && (
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-muted-foreground">Released:</span>
                      <span className="ml-1">
                        {formatDate(transaction.updatedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Tabs Section */}
      <Tabs defaultValue="related">
        <TabsList>
          <TabsTrigger value="related">Related Transactions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        {/* Related Transactions Tab */}
        <TabsContent value="related" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Transactions</CardTitle>
              <CardDescription>
                Other transactions from this investor for this offering
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transaction.relatedTransactions &&
              transaction.relatedTransactions.length > 0 ? (
                <div className="space-y-4">
                  {transaction.relatedTransactions.map((relTx) => {
                    return (
                      <div
                        key={relTx.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div>
                          <Link
                            href={`/admin/ico/transaction/${relTx.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {relTx.id}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {relTx.amount} (Price: {relTx.price}) –{" "}
                            {formatDate(relTx.createdAt)}
                          </p>
                        </div>
                        <div>{getStatusBadge(relTx.status)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No related transactions found.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
              <CardDescription>
                Notes and comments about this transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-md">
                <p>{transaction.notes || "No notes available."}</p>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">
                  {hasNote ? "Update Note" : "Add Note"}
                </h3>
                <Textarea
                  className="min-h-[100px]"
                  placeholder="Enter note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!canAddNote}
                />
                <div className="mt-2 flex justify-end space-x-2">
                  {canRemoveNote && (
                    <Button
                      variant="outline"
                      onClick={handleRemoveNote}
                      className="text-red-500 border-red-200 hover:bg-red-50"
                    >
                      Remove Note
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveNote}
                    disabled={!canAddNote || !note.trim()}
                  >
                    Save Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Approve Dialog */}
      <Dialog open={openApproveDialog} onOpenChange={setOpenApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify & Approve Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to verify and approve this transaction? This
              action will release funds to the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-md bg-amber-50 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Please confirm that you have verified:
                  </h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The release URL is valid and accessible</li>
                      <li>Transaction amount matches the investment record</li>
                      <li>Wallet addresses match the records</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenApproveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!canApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reject Dialog */}
      <Dialog open={openRejectDialog} onOpenChange={setOpenRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Important
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      This action cannot be undone. The creator will be notified
                      of the rejection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!canReject || !rejectNote.trim()}
              variant="destructive"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
