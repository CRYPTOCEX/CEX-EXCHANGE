"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Rocket,
  BarChart3,
  Calendar,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTokenReleaseStore } from "@/store/ico/token-release-store";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { formatCurrency, formatDate } from "@/lib/ico/utils";
import { Link, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { TokenPhaseCard } from "../../components/release/token-phase-card";
import { TransactionsTable } from "../../components/release/transactions-table";
import { ReleaseDrawer } from "../../components/release/release-drawer";
import { useTranslations } from "next-intl";

export function TokenReleaseClient() {
  const t = useTranslations("ext");
  const params = useParams();
  const tokenId = params.id as string;
  const { toast } = useToast();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [showStats, setShowStats] = useState(true);
  const [showPhases, setShowPhases] = useState(true);

  // Fetch offering details from the offer store.
  const { offering, fetchOffering } = useOfferStore();
  const {
    pendingTransactions,
    pendingVerificationTransactions,
    releasedTransactions,
    rejectedTransactions,
    fetchTransactions,
    isLoadingTransactions,
    paginationMeta,
  } = useTokenReleaseStore();

  useEffect(() => {
    fetchOffering(tokenId);

    // Initial fetch for each transaction type
    fetchTransactions(tokenId, "PENDING", 1, 10);
    fetchTransactions(tokenId, "VERIFICATION", 1, 10);
    fetchTransactions(tokenId, "RELEASED", 1, 10);
    fetchTransactions(tokenId, "REJECTED", 1, 10);
  }, [tokenId, fetchOffering, fetchTransactions]);

  const handleReleaseClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedTransactionId(null);
  };

  const handleReleaseSuccess = () => {
    toast({
      title: "Transaction submitted",
      description: "Your transaction has been submitted for verification.",
      variant: "default",
    });
    setIsDrawerOpen(false);
    setSelectedTransactionId(null);

    // Refresh all transaction lists
    fetchTransactions(
      tokenId,
      "PENDING",
      paginationMeta.pending.currentPage,
      paginationMeta.pending.itemsPerPage
    );
    fetchTransactions(
      tokenId,
      "VERIFICATION",
      paginationMeta.verification.currentPage,
      paginationMeta.verification.itemsPerPage
    );
    fetchTransactions(
      tokenId,
      "RELEASED",
      paginationMeta.released.currentPage,
      paginationMeta.released.itemsPerPage
    );
    fetchTransactions(
      tokenId,
      "REJECTED",
      paginationMeta.rejected.currentPage,
      paginationMeta.rejected.itemsPerPage
    );
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // No need to fetch here as the TransactionsTable component will handle it
  };

  if (!offering) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Use tokenDetail values from the offering.
  const totalSupply = offering.tokenDetail?.totalSupply || 0;
  const tokensSold = offering.tokenDetail
    ? totalSupply - (offering.tokenDetail.tokensForSale || 0)
    : 0;

  const percentageSold = totalSupply > 0 ? (tokensSold / totalSupply) * 100 : 0;
  const percentageRaised =
    offering.targetAmount > 0
      ? ((offering.currentRaised ?? 0) / offering.targetAmount) * 100
      : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/10 text-green-600";
      case "PAUSED":
        return "bg-amber-500/10 text-amber-600";
      default:
        return "bg-gray-500/10 text-gray-600";
    }
  };

  return (
    <div className="pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background pt-8 pb-6">
        <div className="container">
          <Link href={`/ico/creator/token/${tokenId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_token")}
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-primary/20 flex items-center justify-center">
                {offering.icon ? (
                  <img
                    src={offering.icon || "/img/placeholder.svg"}
                    alt={offering.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : offering.symbol ? (
                  <span className="text-2xl font-bold text-primary">
                    {offering.symbol.slice(0, 2)}
                  </span>
                ) : (
                  <Rocket className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold">{offering.name}</h1>
                  <Badge
                    className={`${getStatusColor(offering.status)} px-3 py-1 text-xs font-medium`}
                  >
                    {offering.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  {offering.symbol && (
                    <span className="font-mono">{offering.symbol}</span>
                  )}
                  {offering.tokenDetail?.blockchain && (
                    <>
                      <span className="text-xs">•</span>
                      <span>{offering.tokenDetail.blockchain}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t("token_performance")}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1"
          >
            {showStats ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Hide Stats</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Show Stats</span>
              </>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      {t("funds_raised")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(offering.currentRaised ?? 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("target")}
                      {formatCurrency(offering.targetAmount)}
                    </p>
                    <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, percentageRaised)}%`,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {t("Participants")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {offering.participants}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("active_investors")}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {offering.status}
                      </Badge>
                      {offering.tokenDetail?.tokenType && (
                        <Badge variant="outline" className="bg-secondary/10">
                          {offering.tokenDetail.tokenType
                            .charAt(0)
                            .toUpperCase() +
                            offering.tokenDetail.tokenType.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {t("Timeline")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {t("start_date")}
                        </span>
                        <span>{formatDate(offering.startDate)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {t("end_date")}
                        </span>
                        <span>{formatDate(offering.endDate)}</span>
                      </div>
                      {offering.currentPhase && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {t("current_phase")}
                          </span>
                          <span>{offering.currentPhase.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(offering.currentPhase || offering.nextPhase) && (
        <div className="container mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{t("token_phases")}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPhases(!showPhases)}
              className="flex items-center gap-1"
            >
              {showPhases ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Hide Phases</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Show Phases</span>
                </>
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showPhases && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {offering.currentPhase && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {t("current_phase")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TokenPhaseCard
                          phase={offering.currentPhase as any}
                          symbol={offering.symbol}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {offering.nextPhase && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {t("next_phase")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <TokenPhaseCard
                          phase={offering.nextPhase as any}
                          symbol={offering.symbol}
                          isNext
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="container mt-6">
        <div className="mb-6 mt-12">
          <h2 className="text-xl font-semibold mb-4">{t("release_status")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className={`border rounded-lg p-4 transition-colors cursor-pointer hover:border-primary/50 ${activeTab === "PENDING" ? "border-primary bg-primary/5" : ""}`}
              onClick={() => handleTabChange("PENDING")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <p className="font-medium">{t("pending_release")}</p>
              </div>
              <p className="text-2xl font-bold">
                {paginationMeta.pending.totalItems}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("transactions_awaiting_token_release")}
              </p>
            </div>
            <div
              className={`border rounded-lg p-4 transition-colors cursor-pointer hover:border-primary/50 ${activeTab === "VERIFICATION" ? "border-primary bg-primary/5" : ""}`}
              onClick={() => handleTabChange("VERIFICATION")}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <p className="font-medium">{t("pending_verification")}</p>
              </div>
              <p className="text-2xl font-bold">
                {paginationMeta.verification.totalItems}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("transactions_awaiting_verification")}
              </p>
            </div>
            <div
              className={`border rounded-lg p-4 transition-colors cursor-pointer hover:border-primary/50 ${activeTab === "RELEASED" ? "border-primary bg-primary/5" : ""}`}
              onClick={() => handleTabChange("RELEASED")}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="font-medium">{t("Released")}</p>
              </div>
              <p className="text-2xl font-bold">
                {paginationMeta.released.totalItems}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("successfully_completed_transactions")}
              </p>
            </div>
            <div
              className={`border rounded-lg p-4 transition-colors cursor-pointer hover:border-primary/50 ${activeTab === "REJECTED" ? "border-primary bg-primary/5" : ""}`}
              onClick={() => handleTabChange("REJECTED")}
            >
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <p className="font-medium">{t("Rejected")}</p>
              </div>
              <p className="text-2xl font-bold">
                {paginationMeta.rejected.totalItems}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("transactions_that_were_rejected")}
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-24">
          <CardHeader>
            <CardTitle>
              {activeTab === "PENDING" && "Pending Transactions"}
              {activeTab === "VERIFICATION" &&
                "Transactions Awaiting Verification"}
              {activeTab === "RELEASED" && "Released Transactions"}
              {activeTab === "REJECTED" && "Rejected Transactions"}
            </CardTitle>
            <CardDescription>
              {activeTab === "PENDING" &&
                "Transactions that require token release to investors"}
              {activeTab === "VERIFICATION" &&
                "Transactions with submitted hashes awaiting verification"}
              {activeTab === "RELEASED" &&
                "Successfully completed token release transactions"}
              {activeTab === "REJECTED" &&
                "Transactions that were rejected and refunded"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="hidden">
                <TabsTrigger value="PENDING">{t("Pending")}</TabsTrigger>
                <TabsTrigger value="VERIFICATION">
                  {t("Verification")}
                </TabsTrigger>
                <TabsTrigger value="RELEASED">{t("Released")}</TabsTrigger>
                <TabsTrigger value="REJECTED">{t("Rejected")}</TabsTrigger>
              </TabsList>

              <TabsContent value="PENDING" className="mt-0">
                <TransactionsTable
                  transactions={pendingTransactions}
                  isLoading={isLoadingTransactions}
                  onReleaseClick={handleReleaseClick}
                  status="PENDING"
                  tokenId={tokenId}
                />
              </TabsContent>

              <TabsContent value="VERIFICATION" className="mt-0">
                <TransactionsTable
                  transactions={pendingVerificationTransactions}
                  isLoading={isLoadingTransactions}
                  status="VERIFICATION"
                  tokenId={tokenId}
                />
              </TabsContent>

              <TabsContent value="RELEASED" className="mt-0">
                <TransactionsTable
                  transactions={releasedTransactions}
                  isLoading={isLoadingTransactions}
                  status="RELEASED"
                  tokenId={tokenId}
                />
              </TabsContent>

              <TabsContent value="REJECTED" className="mt-0">
                <TransactionsTable
                  transactions={rejectedTransactions}
                  isLoading={isLoadingTransactions}
                  status="REJECTED"
                  tokenId={tokenId}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <ReleaseDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        transactionId={selectedTransactionId}
        tokenId={tokenId}
        onSuccess={handleReleaseSuccess}
      />
    </div>
  );
}
