"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowUpDown, Download, Eye, Plus } from "lucide-react";
import { Link } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
export function CreatorTokensList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"progress" | "raised" | "investors">(
    "progress"
  );
  const { tokens, isLoadingTokens, tokensError, fetchTokens, sortTokens } =
    useCreatorStore();
  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);
  useEffect(() => {
    sortTokens(sortBy);
  }, [sortBy, sortTokens]);
  const handleSort = (newSortBy: "progress" | "raised" | "investors") => {
    setSortBy(newSortBy);
    sortTokens(newSortBy);
  };
  if (isLoadingTokens) {
    return (
      <div className="space-y-6">
        {/* Loading skeletons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">My Tokens</h2>
            <p className="text-muted-foreground">
              Manage and monitor your token offerings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-64 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded" />
          </div>
        </div>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full justify-start border-b p-0 bg-transparent">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 gap-4">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <Card
                    key={i}
                    className="overflow-hidden border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="h-16 w-16 bg-muted rounded-full" />
                        <div className="flex-1 ml-4 space-y-2">
                          <div className="h-7 w-40 bg-muted rounded" />
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-4 w-32 bg-muted rounded" />
                        </div>
                        <div className="h-9 w-9 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  if (tokensError) {
    return (
      <div className="p-6 border-red-200 bg-red-50 rounded">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p>Error loading tokens: {tokensError}</p>
        </div>
        <Button variant="outline" className="mt-4" onClick={fetchTokens}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">My Tokens</h2>
          <p className="text-muted-foreground">
            Manage and monitor your token offerings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Input
              placeholder="Search tokens..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon="mdi:magnify"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleSort("progress")}>
                Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("raised")}>
                Amount Raised
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort("investors")}>
                Investors
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/ico/creator/token/new">
            <Button size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full justify-start border-b p-0 bg-transparent">
          <TabsTrigger
            value="active"
            className="hover:bg-muted/40 transition-colors"
          >
            Active{" "}
            <Badge
              variant="outline"
              className="ml-2 bg-primary/10 text-primary"
            >
              {tokens.active.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="hover:bg-muted/40 transition-colors"
          >
            Pending{" "}
            <Badge
              variant="outline"
              className="ml-2 bg-primary/10 text-primary"
            >
              {tokens.pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="completed"
            className="hover:bg-muted/40 transition-colors"
          >
            Completed{" "}
            <Badge
              variant="outline"
              className="ml-2 bg-primary/10 text-primary"
            >
              {tokens.completed.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            {tokens.active.map((token) => {
              // Compute progress and days left
              const progress = token.targetAmount
                ? Math.round((token.currentRaised / token.targetAmount) * 100)
                : 0;
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (new Date(token.endDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              return (
                <Card
                  key={token.id}
                  className="overflow-hidden border-l-4 border-l-blue-500"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <div className="bg-primary/10 p-1 rounded-full h-16 w-16 flex items-center justify-center">
                            <img
                              src={token.icon || "/img/placeholder.svg"}
                              alt={token.name}
                              className="rounded-full"
                            />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{token.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {token.symbol}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{token.participants.toLocaleString()}</span>
                              <span>investors</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>{daysLeft}d left</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md space-y-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            ${token.currentRaised.toLocaleString()} raised
                          </span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Target: ${token.targetAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/ico/creator/token/${token.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            {tokens.pending.map((token) => {
              return (
                <Card
                  key={token.id}
                  className="overflow-hidden border-l-4 border-l-yellow-500"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-1 rounded-full h-16 w-16 flex items-center justify-center">
                          <img
                            src={token.icon || "/img/placeholder.svg"}
                            alt={token.name}
                            className="rounded-full"
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{token.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {token.symbol}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-sm text-muted-foreground">
                              Submitted on{" "}
                              {token.submittedAt &&
                                new Date(
                                  token.submittedAt
                                ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 max-w-md">
                        <div className="text-sm text-muted-foreground">
                          Target: ${token.targetAmount.toLocaleString()}
                        </div>
                      </div>
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/ico/creator/token/${token.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View Application</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <div className="grid grid-cols-1 gap-4">
            {tokens.completed.map((token) => {
              const progress = token.targetAmount
                ? Math.round((token.currentRaised / token.targetAmount) * 100)
                : 0;
              return (
                <Card
                  key={token.id}
                  className="overflow-hidden border-l-4 border-l-green-500"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-1 rounded-full h-16 w-16 flex items-center justify-center">
                          <img
                            src={token.icon || "/img/placeholder.svg"}
                            alt={token.name}
                            className="rounded-full"
                          />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{token.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {token.symbol}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <span>{token.participants.toLocaleString()}</span>
                              <span>investors</span>
                            </div>
                            <span>
                              Completed on{" "}
                              {token.approvedAt &&
                                new Date(token.approvedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            ${token.currentRaised.toLocaleString()} raised
                          </span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/ico/creator/token/${token.id}`}>
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
