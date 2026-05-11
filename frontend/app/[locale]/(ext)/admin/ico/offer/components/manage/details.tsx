"use client";

import type React from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CircleDollarSign,
  Clock,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  Layers,
  LinkIcon,
  Milestone,
  Plus,
  Shield,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import InvestorsList from "./transaction";
import { formatCurrency, formatDate, formatNumber } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
export const TokenDetailsSection = () => {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const { offering, offerMetrics, addPhase, deletePhase } = useAdminOfferStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [addPhaseDialogOpen, setAddPhaseDialogOpen] = useState(false);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhase, setNewPhase] = useState({
    name: "",
    tokenPrice: "",
    allocation: "",
    duration: "7",
  });
  const [deletePhaseDialogOpen, setDeletePhaseDialogOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingPhase, setIsDeletingPhase] = useState(false);

  const handleAddPhase = async () => {
    if (!offering?.id) return;
    if (!newPhase.name.trim()) {
      toast({ title: "Error", description: "Phase name is required", variant: "destructive" });
      return;
    }
    const tokenPrice = parseFloat(newPhase.tokenPrice);
    const allocation = parseFloat(newPhase.allocation);
    const duration = parseInt(newPhase.duration);
    if (isNaN(tokenPrice) || tokenPrice <= 0) {
      toast({ title: "Error", description: "Token price must be positive", variant: "destructive" });
      return;
    }
    if (isNaN(allocation) || allocation <= 0) {
      toast({ title: "Error", description: "Allocation must be positive", variant: "destructive" });
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      toast({ title: "Error", description: "Duration must be positive", variant: "destructive" });
      return;
    }

    setIsAddingPhase(true);
    try {
      await addPhase(offering.id, {
        name: newPhase.name,
        tokenPrice,
        allocation,
        duration,
      });
      toast({ title: "Success", description: "Phase added successfully" });
      setAddPhaseDialogOpen(false);
      setNewPhase({ name: "", tokenPrice: "", allocation: "", duration: "7" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add phase", variant: "destructive" });
    } finally {
      setIsAddingPhase(false);
    }
  };

  const handleDeletePhase = async () => {
    if (!offering?.id || !phaseToDelete) return;

    setIsDeletingPhase(true);
    try {
      await deletePhase(offering.id, phaseToDelete.id);
      toast({ title: "Success", description: `Phase "${phaseToDelete.name}" deleted successfully` });
      setDeletePhaseDialogOpen(false);
      setPhaseToDelete(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete phase", variant: "destructive" });
    } finally {
      setIsDeletingPhase(false);
    }
  };

  const calculateProgress = () => {
    if (!offerMetrics?.currentRaised || !offering.targetAmount) return 0;
    return Math.min(
      100,
      (offerMetrics?.currentRaised / offering.targetAmount) * 100
    );
  };
  const parseLinks = () => {
    try {
      return JSON.parse(offering.tokenDetail.links || "[]");
    } catch (e) {
      return [];
    }
  };
  const links = parseLinks();
  return (
    <>
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 md:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="phases">Phases</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tExt("token_information")}</CardTitle>
              <CardDescription>
                {t("basic_information_about_the")} {offering.name} token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tCommon("token_name")}
                        </span>
                      </div>
                      <span className="font-medium">{offering.name}</span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tExt("token_symbol")}
                        </span>
                      </div>
                      <span className="font-medium">{offering.symbol}</span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tExt("token_type")}
                        </span>
                      </div>
                      <span className="font-medium capitalize">
                        {offering.tokenDetail.tokenTypeData?.name || offering.tokenDetail.tokenType}
                      </span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tExt("total_supply")}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatNumber(offering.tokenDetail.totalSupply)}
                      </span>
                    </div>
                    <Separator />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tExt("token_price")}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(offering.tokenPrice)}
                      </span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tExt("start_date")}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatDate(offering.startDate)}
                      </span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tCommon("end_date")}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatDate(offering.endDate)}
                      </span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Blockchain
                        </span>
                      </div>
                      <span className="font-medium">
                        {offering.tokenDetail.blockchain}
                      </span>
                    </div>
                    <Separator />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {t("fundraising_progress")}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(offerMetrics?.currentRaised || 0)} of{" "}
                    {formatCurrency(offering.targetAmount)}
                  </span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {calculateProgress().toFixed(2)}% {t("of_target_raised")}
                </p>
              </div>

              {offering.tokenDetail.description && (
                <div className="mt-6 p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {offering.tokenDetail.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {offering.tokenDetail.useOfFunds && (
                <div className="mt-4 p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium mb-1">{tExt("use_of_funds")}</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(() => {
                          try {
                            const useOfFunds = JSON.parse(
                              offering.tokenDetail.useOfFunds
                            );
                            return useOfFunds.map(
                              (item: string, index: number) => (
                                <Badge key={index} variant="secondary">
                                  {item}
                                </Badge>
                              )
                            );
                          } catch (e) {
                            return (
                              <p className="text-sm text-muted-foreground">
                                {offering.tokenDetail.useOfFunds}
                              </p>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{tExt("offering_phases")}</CardTitle>
                  <CardDescription>
                    {t("token_sale_phases_and_allocations")}
                  </CardDescription>
                </div>
                {["ACTIVE", "PENDING", "UPCOMING", "SUCCESS"].includes(offering.status) && (
                  <Button onClick={() => setAddPhaseDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {tCommon("add")} {tExt("phase")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {offering.phases && offering.phases.length > 0 ? (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 left-[15px] w-[1px] bg-border" />
                    <div className="space-y-8">
                      {(() => {
                        // Sort phases by startDate if available, otherwise by sequence
                        const sortedPhases = [...offering.phases].sort((a: any, b: any) => {
                          // If both have startDate, sort by startDate
                          if (a.startDate && b.startDate) {
                            return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
                          }
                          // Fall back to sequence
                          return (a.sequence || 0) - (b.sequence || 0);
                        });

                        // Use stored dates if available, otherwise calculate from offering start
                        let currentDate = new Date(offering.startDate);
                        const phasesWithDates = sortedPhases.map((phase: any) => {
                          // Use stored dates if available (new phases have them)
                          if (phase.startDate && phase.endDate) {
                            const startDate = new Date(phase.startDate);
                            const endDate = new Date(phase.endDate);
                            currentDate = new Date(endDate); // Update for next phase calculation
                            return { ...phase, startDate, endDate };
                          }
                          // Fall back to calculated dates for old phases
                          const startDate = new Date(currentDate);
                          const endDate = new Date(currentDate);
                          endDate.setDate(endDate.getDate() + (phase.duration || 0));
                          currentDate = new Date(endDate);
                          return { ...phase, startDate, endDate };
                        });

                        const now = new Date();

                        return phasesWithDates.map((phase: any) => {
                          const isActive = now >= phase.startDate && now < phase.endDate;
                          const isCompleted = now >= phase.endDate;
                          const isUpcoming = now < phase.startDate;

                          return (
                            <div key={phase.id} className="relative pl-10">
                              <div className={cn(
                                "absolute left-0 w-[30px] h-[30px] rounded-full border flex items-center justify-center",
                                isActive
                                  ? "bg-green-500/10 border-green-500"
                                  : isCompleted
                                    ? "bg-muted border-muted-foreground/30"
                                    : "bg-primary/10 border-primary"
                              )}>
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  isActive
                                    ? "bg-green-500 animate-pulse"
                                    : isCompleted
                                      ? "bg-muted-foreground/50"
                                      : "bg-primary"
                                )} />
                              </div>
                              <Card className={cn(isActive && "ring-1 ring-green-500/50")}>
                                <CardContent className="p-6">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold">
                                          {phase.name}
                                        </h3>
                                        {isActive && (
                                          <Badge variant="default" className="bg-green-500 text-white">
                                            Active
                                          </Badge>
                                        )}
                                        {isCompleted && (
                                          <Badge variant="secondary">
                                            Completed
                                          </Badge>
                                        )}
                                        {isUpcoming && (
                                          <Badge variant="outline">
                                            Upcoming
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                                        <p className="text-sm text-muted-foreground">
                                          {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          ({phase.duration} days)
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 md:self-start">
                                      <Badge variant="outline">
                                        {formatCurrency(phase.tokenPrice)} {tExt("per_token")}
                                      </Badge>
                                      {/* Only show delete if no tokens sold and offering is editable */}
                                      {phase.allocation === phase.remaining &&
                                        ["ACTIVE", "PENDING", "UPCOMING", "SUCCESS"].includes(offering.status) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                              setPhaseToDelete({ id: phase.id, name: phase.name });
                                              setDeletePhaseDialogOpen(true);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">
                                          Allocation
                                        </span>
                                        <span className="text-sm font-medium">
                                          {formatNumber(phase.allocation)}{" "}
                                          {offering.symbol}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">
                                          Remaining
                                        </span>
                                        <span className="text-sm font-medium">
                                          {formatNumber(phase.remaining)}{" "}
                                          {offering.symbol}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-muted-foreground">
                                          Sold
                                        </span>
                                        <span className="text-sm font-medium">
                                          {formatNumber(
                                            phase.allocation - phase.remaining
                                          )}{" "}
                                          {offering.symbol}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">
                                          {t("sales_progress")}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {(
                                            ((phase.allocation -
                                              phase.remaining) /
                                              phase.allocation) *
                                            100
                                          ).toFixed(1)}
                                          %
                                        </span>
                                      </div>
                                      <Progress
                                        value={
                                          ((phase.allocation - phase.remaining) /
                                            phase.allocation) *
                                          100
                                        }
                                        className="h-2"
                                      />
                                      <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-muted-foreground">
                                          {formatNumber(
                                            phase.allocation - phase.remaining
                                          )}{" "}
                                          sold
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatNumber(phase.allocation)} total
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">{t("no_phases_defined")}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    {t("this_token_offering_does_not_have")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{tExt("project_roadmap")}</CardTitle>
              <CardDescription>
                {t("development_milestones_and_timeline")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offering.roadmapItems && offering.roadmapItems.length > 0 ? (
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-[15px] w-[1px] bg-border" />
                  <div className="space-y-8">
                    {offering.roadmapItems.map((item: any) => {
                      return (
                        <div key={item.id} className="relative pl-10">
                          <div
                            className={cn(
                              "absolute left-0 w-[30px] h-[30px] rounded-full border flex items-center justify-center",
                              item.completed
                                ? "bg-green-500/10 border-green-500/20"
                                : "bg-muted border-border"
                            )}
                          >
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                item.completed
                                  ? "bg-green-500"
                                  : "bg-muted-foreground"
                              )}
                            />
                          </div>
                          <Card>
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold">
                                      {item.title}
                                    </h3>
                                    {item.completed && (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-500/10 text-green-500 border-green-500/20"
                                      >
                                        Completed
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {formatDate(item.date)}
                                  </p>
                                </div>
                              </div>

                              {item.description && (
                                <div className="mt-4">
                                  <p className="text-sm">{item.description}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Milestone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">{t("no_roadmap_items")}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    {t('this_token_offering_does_not_have')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("external_resources")}</CardTitle>
              <CardDescription>
                {t("important_links_and_resources_for_the")} {offering.name} token
              </CardDescription>
            </CardHeader>
            <CardContent>
              {links && links.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {links.map((link: any, index: number) => {
                    return (
                      <Card key={index} className="overflow-hidden">
                        <div className="p-6 flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <LinkIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate capitalize">
                              {link.label}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {link.url}
                            </p>
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-3 w-3" />
                              <span>Visit</span>
                            </Button>
                          </a>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <LinkIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">{t("no_links_available")}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    {t("there_are_no_external_links_available")}
                  </p>
                </div>
              )}

              {offering.website && (
                <div className="mt-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>{t("project_website")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">{offering.website}</p>
                        <a
                          href={offering.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button>
                            <Globe className="h-4 w-4 mr-2" />
                            Visit
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investors" className="mt-6">
          <InvestorsList id={offering.id} />
        </TabsContent>
      </Tabs>

      {/* Add Phase Dialog */}
      <Dialog open={addPhaseDialogOpen} onOpenChange={setAddPhaseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tCommon("add")} {tExt("phase")}</DialogTitle>
            <DialogDescription>
              {t("add_a_new_phase_to_extend_the_ico")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phase-name">{tCommon("name")}</Label>
              <Input
                id="phase-name"
                placeholder={`${tExt("phase")} ${(offering?.phases?.length || 0) + 1}`}
                value={newPhase.name}
                onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase-price">{tExt("token_price")}</Label>
              <Input
                id="phase-price"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0.0000"
                value={newPhase.tokenPrice}
                onChange={(e) => setNewPhase({ ...newPhase, tokenPrice: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase-allocation">{tExt("allocation")}</Label>
              <Input
                id="phase-allocation"
                type="number"
                min="0"
                placeholder="0"
                value={newPhase.allocation}
                onChange={(e) => setNewPhase({ ...newPhase, allocation: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {tExt("number_of_tokens_for_this_phase")}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phase-duration">{tCommon("duration")} ({tCommon("days")})</Label>
              <Input
                id="phase-duration"
                type="number"
                min="1"
                placeholder="7"
                value={newPhase.duration}
                onChange={(e) => setNewPhase({ ...newPhase, duration: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPhaseDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleAddPhase} disabled={isAddingPhase}>
              {isAddingPhase ? `${tCommon("adding")}...` : tCommon("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Phase Confirmation Dialog */}
      <Dialog open={deletePhaseDialogOpen} onOpenChange={setDeletePhaseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tCommon("delete")} {tExt("phase")}</DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to_delete_phase")} &quot;{phaseToDelete?.name}&quot;?
              {t("this_action_cannot_be_undone")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletePhaseDialogOpen(false);
                setPhaseToDelete(null);
              }}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePhase}
              disabled={isDeletingPhase}
            >
              {isDeletingPhase ? `${tCommon("deleting")}...` : tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default TokenDetailsSection;
