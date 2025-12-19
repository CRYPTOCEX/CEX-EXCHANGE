"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNetworkStore } from "@/store/affiliate/network-store";
import { ReferralTree } from "./components/referral-tree";
import { AlertCircle, HelpCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import AffiliateNetworkLoading from "./loading";
import AffiliateNetworkErrorState from "./error-state";
import { NetworkHero } from "./components/network-hero";
import { useTranslations } from "next-intl";

export default function AffiliateNetworkClient() {
  const t = useTranslations("ext_affiliate");
  const tExt = useTranslations("ext");
  const { networkData, loading, error, mlmSystem, fetchNetworkData } =
    useNetworkStore();
  const [activeTab, setActiveTab] = useState("tree");
  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);
  if (loading && !networkData) {
    return <AffiliateNetworkLoading />;
  }
  if (error) {
    return <AffiliateNetworkErrorState error={error} />;
  }
  if (!networkData) {
    return <AffiliateNetworkErrorState noData />;
  }
  // Calculate network stats
  const totalNodes = networkData.treeData ? countNetworkNodes(networkData.treeData) : 0;
  const directReferrals = networkData.referrals?.length || 0;
  const networkDepth = networkData.treeData ? calculateNetworkDepth(networkData.treeData) : 0;

  return (
    <div className="w-full">
      {/* Hero Section */}
      <NetworkHero
        totalNodes={totalNodes}
        directReferrals={directReferrals}
        networkDepth={networkDepth}
      />

      <div className="container mx-auto pb-6 pt-8">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{tExt("your_profile")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("network_type")}</CardTitle>
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
            <CardTitle className="text-sm font-medium">{t("your_upline")}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{t("no_upline")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full md:w-auto">
          <TabsTrigger value="tree" className="flex-1 md:flex-none">
            {t("tree_view")}
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex-1 md:flex-none">
            {t("structure_details")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-4">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>{t("interactive_tree_view")}</AlertTitle>
            <AlertDescription>
              {t("click_on_members_to_view_their_details_1")} {t("zoom_and_pan_to_explore_your_network_structure_1")}
            </AlertDescription>
          </Alert>

          <ReferralTree networkData={networkData} mlmSystem={mlmSystem} />
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("network_structure")}</CardTitle>
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
                      {t("binary_structure_summary")}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{t("left_leg")}</CardTitle>
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
                          <CardTitle className="text-sm">{t("right_leg")}</CardTitle>
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
                      {t("unilevel_structure_summary")}
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
                    <h3 className="font-medium mb-2">{t("direct_referrals")}</h3>
                    <p className="text-sm">
                      {tExt("you_have")} {networkData.referrals.length} {t("direct_referrals")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

// Helper functions for network stats
function countNetworkNodes(node: any): number {
  if (!node) return 0;
  let count = 1; // Count current node

  // Count children
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNetworkNodes(child);
    }
  }

  return count;
}

function calculateNetworkDepth(node: any, currentDepth: number = 0): number {
  if (!node || !node.children || node.children.length === 0) {
    return currentDepth;
  }

  let maxDepth = currentDepth;
  for (const child of node.children) {
    const childDepth = calculateNetworkDepth(child, currentDepth + 1);
    maxDepth = Math.max(maxDepth, childDepth);
  }

  return maxDepth;
}
