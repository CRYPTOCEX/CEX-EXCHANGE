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
  CircleDollarSign,
  Clock,
  ExternalLink,
  Globe,
  HelpCircle,
  Info,
  Layers,
  LinkIcon,
  Milestone,
  Shield,
  Tag,
  Wallet,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import InvestorsList from "./transaction";
import { formatCurrency, formatDate, formatNumber } from "@/lib/ico/utils";
export const TokenDetailsSection = () => {
  const { offering, offerMetrics } = useAdminOfferStore();
  const [activeTab, setActiveTab] = useState("overview");
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
              <CardTitle>Token Information</CardTitle>
              <CardDescription>
                Basic information about the {offering.name} token
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
                          Token Name
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
                          Token Symbol
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
                          Token Type
                        </span>
                      </div>
                      <span className="font-medium capitalize">
                        {offering.tokenDetail.tokenType}
                      </span>
                    </div>
                    <Separator />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Total Supply
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
                          Token Price
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
                          Start Date
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
                          End Date
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
                    Fundraising Progress
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(offerMetrics?.currentRaised || 0)} of{" "}
                    {formatCurrency(offering.targetAmount)}
                  </span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {calculateProgress().toFixed(2)}% of target raised
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
                      <h4 className="font-medium mb-1">Use of Funds</h4>
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
              <CardTitle>Offering Phases</CardTitle>
              <CardDescription>
                Token sale phases and allocations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offering.phases && offering.phases.length > 0 ? (
                <div className="space-y-6">
                  <div className="relative">
                    <div className="absolute top-0 bottom-0 left-[15px] w-[1px] bg-border" />
                    <div className="space-y-8">
                      {offering.phases.map((phase: any, index: number) => {
                        return (
                          <div key={phase.id} className="relative pl-10">
                            <div className="absolute left-0 w-[30px] h-[30px] rounded-full bg-primary/10 border border-primary flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <Card>
                              <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div>
                                    <h3 className="text-lg font-bold">
                                      {phase.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      Duration: {phase.duration} days
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="md:self-start"
                                  >
                                    {formatCurrency(phase.tokenPrice)} per token
                                  </Badge>
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
                                        Sales Progress
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
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No Phases Defined</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    This token offering does not have any defined phases.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Roadmap</CardTitle>
              <CardDescription>
                Development milestones and timeline
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
                                ? "bg-green-50 border-green-200"
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
                                        className="bg-green-50 text-green-700 border-green-200"
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
                  <h3 className="text-lg font-medium">No Roadmap Items</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    This token offering does not have any defined roadmap items.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>External Resources</CardTitle>
              <CardDescription>
                Important links and resources for the {offering.name} token
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
                  <h3 className="text-lg font-medium">No Links Available</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    There are no external links available for this token
                    offering.
                  </p>
                </div>
              )}

              {offering.website && (
                <div className="mt-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle>Project Website</CardTitle>
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
    </>
  );
};
export default TokenDetailsSection;
