"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, User, Clock } from "lucide-react";
import { useStakingAdminPositionsStore } from "@/store/staking/admin/position";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";

interface StakingPositionDetailsProps {
  row: StakingPosition;
}

const StakingPositionDetails: React.FC<StakingPositionDetailsProps> = ({
  row,
}) => {
  const t = useTranslations("ext");
  const updatePosition = useStakingAdminPositionsStore(
    (state) => state.updatePosition
  );
  const isLoading = useStakingAdminPositionsStore((state) => state.isLoading);

  const [adminNotes, setAdminNotes] = useState(row.adminNotes || "");

  // State for the confirmation dialog for withdrawal actions
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [confirmRow, setConfirmRow] = useState<StakingPosition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!confirmRow || !confirmAction) return;
    setIsProcessing(true);
    try {
      if (confirmAction === "approve") {
        await updatePosition(confirmRow.id, {
          status: "COMPLETED",
          updatedAt: new Date(),
        });
      } else if (confirmAction === "reject") {
        await updatePosition(confirmRow.id, {
          withdrawalRequested: false,
          withdrawalRequestDate: null,
          updatedAt: new Date(),
        });
      }
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error("Error updating position:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const pool = row.pool;
  if (!pool) return null;

  return (
    <>
      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="earnings">{t("earnings_history")}</TabsTrigger>
          <TabsTrigger value="notes">{t("admin_notes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-medium text-lg">{row.userId}</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {new Date(row.startDate).toLocaleDateString()} -{" "}
                  {new Date(row.endDate).toLocaleDateString()}
                </span>
                {(() => {
                  switch (row.status) {
                    case "ACTIVE":
                      return (
                        <Badge className="bg-green-500">{t("Active")}</Badge>
                      );
                    case "COMPLETED":
                      return (
                        <Badge className="bg-blue-500">{t("Completed")}</Badge>
                      );
                    case "CANCELLED":
                      return (
                        <Badge variant="secondary">{t("Cancelled")}</Badge>
                      );
                    case "PENDING_WITHDRAWAL":
                      return (
                        <Badge className="bg-amber-500">
                          {t("pending_withdrawal")}
                        </Badge>
                      );
                    default:
                      return null;
                  }
                })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("Amount")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {row.amount} {pool.symbol || ""}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("total_rewards")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {/* // TODO: Uncomment when stakingComputations is available */}
                  {/* +{stakingComputations.getPendingRewards(row.id)}{" "} */}
                  {pool.symbol || ""}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("start_date")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {new Date(row.startDate).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("end_date")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  {new Date(row.endDate).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          </div>
          {row.withdrawalRequested && row.status === "PENDING_WITHDRAWAL" && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2 bg-amber-50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {t("withdrawal_request")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm mb-4">
                  {t("this_user_has_requested_to_withdraw_their_funds_on")}{" "}
                  {row.withdrawalRequestDate &&
                    new Date(row.withdrawalRequestDate).toLocaleDateString()}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      setConfirmRow(row);
                      setConfirmAction("reject");
                      setConfirmDialogOpen(true);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    {t("reject_withdrawal")}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setConfirmRow(row);
                      setConfirmAction("approve");
                      setConfirmDialogOpen(true);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {t("approve_withdrawal")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="earnings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("earnings_history")}</CardTitle>
              <CardDescription>
                {t("record_of_all_earnings_for_this_position")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Date")}</TableHead>
                    <TableHead>{t("Amount")}</TableHead>
                    <TableHead>{t("Type")}</TableHead>
                    <TableHead>{t("Description")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.earningHistory?.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        {earning.createdAt
                          ? new Date(earning.createdAt).toLocaleDateString()
                          : "Invalid Date"}
                      </TableCell>
                      <TableCell className="text-green-500">
                        +{earning.amount} {pool.symbol || ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            earning.type === "REGULAR"
                              ? "default"
                              : earning.type === "BONUS"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {earning.type.charAt(0).toUpperCase() +
                            earning.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{earning.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin_notes")}</CardTitle>
              <CardDescription>
                {t("internal_notes_about_this_position")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this position..."
                className="w-full min-h-[200px] p-3 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  onClick={async () => {
                    try {
                      await updatePosition(row.id, {
                        adminNotes,
                        updatedAt: new Date(),
                      });
                    } catch (error) {
                      console.error("Error saving admin notes:", error);
                    }
                  }}
                  disabled={isLoading}
                >
                  {t("save_admin_note")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "approve"
                ? "Approve Withdrawal"
                : "Reject Withdrawal"}
            </DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to")}{" "}
              {confirmAction === "approve" ? "approve" : "reject"}
              {t("the_withdrawal_request_for_this_position")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : confirmAction === "approve" ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {t("Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StakingPositionDetails;
