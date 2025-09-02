"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  User,
  Clock,
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  Flag,
  Ban,
  FileText,
  Activity,
  MessageSquare,
  Hash,
  Calendar,
  MapPin,
  Globe,
  Percent,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";
import { useTranslations } from "next-intl";

interface OfferDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string | null;
}

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:text-green-400 dark:border-green-800";
    case "PENDING":
      return "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 dark:from-yellow-950 dark:to-amber-950 dark:text-yellow-400 dark:border-yellow-800";
    case "COMPLETED":
      return "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 dark:from-blue-950 dark:to-cyan-950 dark:text-blue-400 dark:border-blue-800";
    case "DISABLED":
    case "REJECTED":
      return "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 dark:from-red-950 dark:to-rose-950 dark:text-red-400 dark:border-red-800";
    default:
      return "bg-gradient-to-r from-zinc-50 to-slate-50 text-zinc-700 border-zinc-200 dark:from-zinc-800 dark:to-slate-800 dark:text-zinc-400 dark:border-zinc-700";
  }
};

const getOfferTypeColor = (type: string) => {
  return type?.toUpperCase() === "BUY"
    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
    : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25";
};

export default function OfferDetailsDrawer({ isOpen, onClose, offerId }: OfferDetailsDrawerProps) {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const { 
    offer, 
    isLoadingOffer, 
    offerError, 
    getOfferById,
    approveOffer,
    rejectOffer,
    flagOffer,
    disableOffer,
    addNote
  } = adminOffersStore();

  const [activeTab, setActiveTab] = useState("details");
  const [actionDialog, setActionDialog] = useState({
    open: false,
    type: "",
    reason: "",
    notes: "",
  });
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (isOpen && offerId) {
      getOfferById(offerId);
      setActiveTab("details");
    }
  }, [isOpen, offerId, getOfferById]);

  const handleAction = async () => {
    if (!offerId) return;

    try {
      switch (actionDialog.type) {
        case "approve":
          await approveOffer(offerId, actionDialog.notes);
          toast({
            title: "Offer Approved",
            description: "The offer has been approved successfully.",
          });
          break;
        case "reject":
          await rejectOffer(offerId, actionDialog.reason);
          toast({
            title: "Offer Rejected",
            description: "The offer has been rejected.",
          });
          break;
        case "flag":
          await flagOffer(offerId, actionDialog.reason);
          toast({
            title: "Offer Flagged",
            description: "The offer has been flagged for review.",
          });
          break;
        case "disable":
          await disableOffer(offerId, actionDialog.reason);
          toast({
            title: "Offer Disabled",
            description: "The offer has been disabled.",
          });
          break;
      }
      
      setActionDialog({ open: false, type: "", reason: "", notes: "" });
      // Refresh the offer data
      getOfferById(offerId);
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!offerId || !newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addNote(offerId, newNote);
      setNewNote("");
      toast({
        title: "Note Added",
        description: "Your note has been added successfully.",
      });
      // Refresh the offer data
      getOfferById(offerId);
    } catch (error) {
      toast({
        title: "Failed to Add Note",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          className="!w-[90vw] !max-w-[90vw] min-w-[90vw] p-0 !h-[100vh] !max-h-[100vh] flex flex-col"
          onInteractOutside={(e) => e.preventDefault()}
          aria-describedby="offer-details-description"
        >
          <SheetHeader className="p-6 pb-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
            <SheetTitle className="text-left text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {isLoadingOffer ? "Loading..." : offer ? `P2P Offer #${offer.id.slice(0, 8)}` : "P2P Offer Details"}
            </SheetTitle>
            <SheetDescription id="offer-details-description" className="text-left mt-1">
              View and manage offer information, user details, and activity logs
            </SheetDescription>
          </SheetHeader>

          {isLoadingOffer ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : offerError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 dark:text-red-400 mb-4">{offerError}</p>
                <Button onClick={() => offerId && getOfferById(offerId)}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : offer ? (
            <div className="flex flex-col h-full overflow-hidden flex-1">
              {/* Enhanced Header */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                <Card className="border-0 bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 shadow-xl backdrop-blur-sm rounded-2xl overflow-hidden">
                  <CardHeader className="relative bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-4 md:p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 md:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                          <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg md:text-2xl text-zinc-900 dark:text-zinc-100 mb-1 md:mb-2">
                            {offer.type} {offer.currency} Offer
                          </CardTitle>
                          <CardDescription className="text-zinc-600 dark:text-zinc-400 text-sm">
                            <div className="flex flex-wrap items-center gap-2 md:gap-4">
                              <span className="font-medium">
                                #{offer.id.slice(0, 8)}
                              </span>
                              <span className="hidden md:inline">•</span>
                              <span className="hidden md:inline">
                                Created {new Date(offer.createdAt).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-4 w-4 md:h-5 md:w-5">
                                  <AvatarImage src={offer.user?.avatar} />
                                  <AvatarFallback className="text-xs bg-zinc-200 dark:bg-zinc-700">
                                    {offer.user?.firstName?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-blue-600 dark:text-blue-400 text-sm">
                                  {`${offer.user?.firstName || ""} ${offer.user?.lastName || ""}`.trim() || "User"}
                                </span>
                              </div>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Status Badges and Actions */}
                      <div className="flex flex-col md:flex-row gap-2 md:gap-3 items-end md:items-start ml-2">
                        <div className="flex gap-2">
                          <Badge className={`${getOfferTypeColor(offer.type)} text-xs`}>
                            {offer.type}
                          </Badge>
                          <Badge className={`${getStatusColor(offer.status)} text-xs`} variant="outline">
                            {offer.status}
                          </Badge>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          {offer.status === "PENDING" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950 text-xs"
                                onClick={() => setActionDialog({ open: true, type: "approve", reason: "", notes: "" })}
                              >
                                <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 mr-1 text-green-600" />
                                <span className="hidden md:inline">Approve</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950 text-xs"
                                onClick={() => setActionDialog({ open: true, type: "reject", reason: "", notes: "" })}
                              >
                                <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 text-red-600" />
                                <span className="hidden md:inline">Reject</span>
                              </Button>
                            </>
                          )}
                          {offer.status === "ACTIVE" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950 text-xs"
                                onClick={() => setActionDialog({ open: true, type: "flag", reason: "", notes: "" })}
                              >
                                <Flag className="h-3 w-3 md:h-4 md:w-4 mr-1 text-orange-600" />
                                <span className="hidden md:inline">Flag</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950 text-xs"
                                onClick={() => setActionDialog({ open: true, type: "disable", reason: "", notes: "" })}
                              >
                                <Ban className="h-3 w-3 md:h-4 md:w-4 mr-1 text-red-600" />
                                <span className="hidden md:inline">Disable</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* Tabs Content */}
              <div className="flex-1 flex flex-col min-h-0 p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
                  <TabsList className="grid w-full grid-cols-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex-shrink-0 mb-4">
                    <TabsTrigger value="details" className="text-xs">
                      <FileText className="h-4 w-4 mr-1" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="user" className="text-xs">
                      <User className="h-4 w-4 mr-1" />
                      User Info
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs">
                      <Activity className="h-4 w-4 mr-1" />
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Notes
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Offer Information */}
                      <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                            Offer Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Type</p>
                              <p className="font-semibold">{offer.type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Currency</p>
                              <p className="font-semibold">{offer.currency}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Price</p>
                              <p className="font-semibold">{offer.price} {offer.fiatCurrency}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Market Diff</p>
                              <p className="font-semibold flex items-center gap-1">
                                {offer.margin > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                                )}
                                {Math.abs(offer.margin)}%
                              </p>
                            </div>
                          </div>
                          <Separator />
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Amount Range</p>
                              <p className="font-semibold">
                                {offer.minAmount} - {offer.maxAmount} {offer.currency}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Available Amount</p>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(offer.availableAmount / offer.maxAmount) * 100} 
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium">
                                  {offer.availableAmount} {offer.currency}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Payment Methods */}
                      <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-500" />
                            Payment Methods
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {offer.paymentMethods?.map((method) => (
                            <div key={method.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              <div className="w-10 h-10 bg-white dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                                {method.icon ? (
                                  <img src={method.icon} alt={method.name} className="w-6 h-6" />
                                ) : (
                                  <CreditCard className="h-5 w-5 text-zinc-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{method.name}</p>
                                {method.details && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {Object.entries(method.details).map(([key, value]) => (
                                      <span key={key}>{key}: {value} </span>
                                    ))}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Trading Terms */}
                      <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Trading Terms
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Payment Time Limit</p>
                            <p className="font-semibold">{offer.paymentTimeLimit || 15} minutes</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Auto-Reply Message</p>
                            <p className="text-sm p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              {offer.autoReplyMessage || "No auto-reply message set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Terms & Conditions</p>
                            <p className="text-sm p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              {offer.terms || "Standard platform terms apply"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Statistics */}
                      <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                        <CardHeader>
                          <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Statistics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {offer.stats?.totalTrades || 0}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Trades</p>
                            </div>
                            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {offer.stats?.completedTrades || 0}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Completed</p>
                            </div>
                            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {offer.stats?.avgCompletionTime || 0}m
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Avg Time</p>
                            </div>
                            <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {offer.stats?.successRate || 0}%
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">Success Rate</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="user" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-auto">
                    <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <User className="h-5 w-5 text-blue-500" />
                          User Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                            <AvatarImage src={offer.user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-lg">
                              {offer.user?.firstName?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {`${offer.user?.firstName || ""} ${offer.user?.lastName || ""}`.trim() || "User"}
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{offer.user?.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                KYC {offer.user?.kycStatus || "PENDING"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Member since {new Date(offer.user?.createdAt || Date.now()).getFullYear()}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {offer.user?.stats?.totalOffers || 0}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Offers</p>
                          </div>
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              {offer.user?.stats?.completedTrades || 0}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Completed Trades</p>
                          </div>
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                              {offer.user?.stats?.rating || 0}★
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Rating</p>
                          </div>
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                              {offer.user?.stats?.disputes || 0}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Disputes</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-auto">
                    <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          Activity Log
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {offer.activityLog?.map((activity, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.type}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {activity.notes || "No description"}
                              </p>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                {new Date(activity.createdAt).toLocaleString()}
                                {activity.adminName && ` by ${activity.adminName}`}
                              </p>
                            </div>
                          </div>
                        ))}
                        {(!offer.activityLog || offer.activityLog.length === 0) && (
                          <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                            No activity recorded yet
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes" className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col overflow-auto">
                    <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-blue-500" />
                          Admin Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {offer.adminNotes && (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm">{offer.adminNotes}</p>
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          <Textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a note about this offer..."
                            className="min-h-[100px]"
                          />
                          <Button
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || isAddingNote}
                            className="w-full"
                          >
                            {isAddingNote ? "Adding..." : "Add Note"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: "", reason: "", notes: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "approve" && "Approve Offer"}
              {actionDialog.type === "reject" && "Reject Offer"}
              {actionDialog.type === "flag" && "Flag Offer"}
              {actionDialog.type === "disable" && "Disable Offer"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "approve" && "Are you sure you want to approve this offer? It will become active on the platform."}
              {actionDialog.type === "reject" && "Please provide a reason for rejecting this offer."}
              {actionDialog.type === "flag" && "Please provide a reason for flagging this offer for review."}
              {actionDialog.type === "disable" && "Please provide a reason for disabling this offer."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionDialog.type === "approve" ? (
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={actionDialog.notes}
                  onChange={(e) => setActionDialog({ ...actionDialog, notes: e.target.value })}
                  placeholder="Add any notes about the approval..."
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={actionDialog.reason}
                  onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                  placeholder="Enter the reason..."
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: "", reason: "", notes: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionDialog.type !== "approve" && !actionDialog.reason.trim()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}