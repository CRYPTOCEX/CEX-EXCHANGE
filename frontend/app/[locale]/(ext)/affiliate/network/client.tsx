"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNetworkStore } from "@/store/affiliate/network-store";
import { ReferralTree } from "./components/referral-tree";
import { AlertCircle, HelpCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export default function AffiliateNetworkClient() {
  const { networkData, loading, error, mlmSystem, fetchNetworkData } =
    useNetworkStore();
  const [activeTab, setActiveTab] = useState("tree");
  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);
  if (loading && !networkData) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl my-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!networkData) {
    return (
      <Alert className="mx-auto max-w-2xl my-8">
        <Info className="h-4 w-4" />
        <AlertTitle>No Network Data</AlertTitle>
        <AlertDescription>
          No network data is available. Start building your network by referring
          friends.
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="container mx-auto px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Your Affiliate Network
        </h1>
        <p className="text-muted-foreground">
          Visualize and manage your affiliate network structure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                <AvatarImage
                  src={networkData.user.avatar || "/placeholder.svg"}
                />
                <AvatarFallback>
                  {networkData.user.firstName.charAt(0)}
                  {networkData.user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm md:text-base">
                  {networkData.user.firstName} {networkData.user.lastName}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  ID: {networkData.user.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Network Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {mlmSystem || "Direct"}
              </Badge>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {mlmSystem === "BINARY"
                ? "Binary systems have left and right legs with equal compensation"
                : mlmSystem === "UNILEVEL"
                  ? "Unilevel systems pay commissions on multiple levels of referrals"
                  : "Direct referral system with single-level commission"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Upline</CardTitle>
          </CardHeader>
          <CardContent>
            {networkData.upline ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={networkData.upline.avatar || ""} />
                  <AvatarFallback>
                    {networkData.upline.firstName?.charAt(0) || ""}
                    {networkData.upline.lastName?.charAt(0) || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm md:text-base">
                    {networkData.upline.firstName} {networkData.upline.lastName}
                  </p>
                  <p className="text-xs">
                    {networkData.upline.status === "ACTIVE" ? (
                      <Badge variant="success" className="text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {networkData.upline.status}
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upline</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full md:w-auto">
          <TabsTrigger value="tree" className="flex-1 md:flex-none">
            Tree View
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex-1 md:flex-none">
            Structure Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-4">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Interactive Tree View</AlertTitle>
            <AlertDescription>
              Click on members to view their details. Zoom and pan to explore
              your network structure.
            </AlertDescription>
          </Alert>

          <ReferralTree networkData={networkData} mlmSystem={mlmSystem} />
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Structure</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="space-y-4 min-w-[300px]">
                <div>
                  <h3 className="font-medium mb-2">MLM System Type</h3>
                  <Badge className="text-sm">{mlmSystem}</Badge>
                </div>

                {mlmSystem === "BINARY" && networkData.binaryStructure && (
                  <div>
                    <h3 className="font-medium mb-2">
                      Binary Structure Summary
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Left Leg</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {networkData.binaryStructure.left ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    networkData.binaryStructure.left.avatar ||
                                    ""
                                  }
                                />
                                <AvatarFallback>
                                  {networkData.binaryStructure.left.firstName?.charAt(
                                    0
                                  ) || ""}
                                  {networkData.binaryStructure.left.lastName?.charAt(
                                    0
                                  ) || ""}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {networkData.binaryStructure.left.firstName}{" "}
                                {networkData.binaryStructure.left.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Empty
                            </span>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Right Leg</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {networkData.binaryStructure.right ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={
                                    networkData.binaryStructure.right.avatar ||
                                    ""
                                  }
                                />
                                <AvatarFallback>
                                  {networkData.binaryStructure.right.firstName?.charAt(
                                    0
                                  ) || ""}
                                  {networkData.binaryStructure.right.lastName?.charAt(
                                    0
                                  ) || ""}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {networkData.binaryStructure.right.firstName}{" "}
                                {networkData.binaryStructure.right.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Empty
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {mlmSystem === "UNILEVEL" && networkData.levels && (
                  <div>
                    <h3 className="font-medium mb-2">
                      Unilevel Structure Summary
                    </h3>
                    <div className="space-y-2">
                      {networkData.levels.map((level, index) => {
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <Badge className="h-6 w-6 rounded-full flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="text-sm">
                              Level {index + 1}: {level.length} members
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mlmSystem === "DIRECT" && networkData.referrals && (
                  <div>
                    <h3 className="font-medium mb-2">Direct Referrals</h3>
                    <p className="text-sm">
                      You have {networkData.referrals.length} direct referrals
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
