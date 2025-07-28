"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { $fetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings,
  DollarSign,
  Shield,
  Zap,
  Globe,
  Users,
  Package,
  TrendingUp,
  Clock,
  Save,
  RefreshCw
} from "lucide-react";

interface NFTSettings {
  general: {
    marketplaceName: string;
    description: string;
    logoUrl: string;
    bannerUrl: string;
    contactEmail: string;
    supportUrl: string;
    termsUrl: string;
    privacyUrl: string;
  };
  fees: {
    marketplaceFeePercentage: number;
    maxRoyaltyPercentage: number;
    listingFee: number;
    gasOptimizationEnabled: boolean;
    feeRecipientAddress: string;
  };
  trading: {
    enableFixedPriceSales: boolean;
    enableAuctions: boolean;
    enableOffers: boolean;
    enableBundles: boolean;
    minAuctionDuration: number;
    maxAuctionDuration: number;
    bidIncrementPercentage: number;
    enableAntiSnipe: boolean;
    antiSnipeExtension: number;
  };
  verification: {
    autoVerifyCreators: boolean;
    requireKycForCreators: boolean;
    requireKycForHighValue: boolean;
    highValueThreshold: number;
    verificationBadgeEnabled: boolean;
    manualReviewRequired: boolean;
  };
  content: {
    enableContentModeration: boolean;
    allowExplicitContent: boolean;
    maxFileSize: number;
    supportedFormats: string[];
    requireMetadataValidation: boolean;
    enableIpfsStorage: boolean;
    enableArweaveStorage: boolean;
  };
  integrations: {
    enableCrossChain: boolean;
    supportedChains: string[];
    enableExternalMarketplaces: boolean;
    openseaApiKey: string;
    enableSocialFeatures: boolean;
    enableDiscordIntegration: boolean;
    enableTwitterIntegration: boolean;
  };
}

export default function NFTSettingsClient() {
  const t = useTranslations();
  const [settings, setSettings] = useState<NFTSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await $fetch({
        url: "/api/admin/nft/settings",
        silentSuccess: true,
      });

      if (fetchError) {
        throw new Error(fetchError);
      }

      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (section: keyof NFTSettings, field: string, value: any) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);

      const { error } = await $fetch({
        url: "/api/admin/nft/settings",
        method: "PUT",
        body: settings,
        successMessage: "Settings updated successfully!",
      });

      if (error) {
        throw new Error(error);
      }

      await fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">NFT Marketplace Settings</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">NFT Marketplace Settings</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchSettings}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NFT Marketplace Settings</h1>
          <p className="text-muted-foreground">
            Configure marketplace parameters, fees, and policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving || !settings}>
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic marketplace information and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="marketplaceName">Marketplace Name</Label>
                  <Input
                    id="marketplaceName"
                    value={settings?.general.marketplaceName || ""}
                    onChange={(e) => updateSettings("general", "marketplaceName", e.target.value)}
                    placeholder="My NFT Marketplace"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={settings?.general.contactEmail || ""}
                    onChange={(e) => updateSettings("general", "contactEmail", e.target.value)}
                    placeholder="contact@marketplace.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={settings?.general.description || ""}
                  onChange={(e) => updateSettings("general", "description", e.target.value)}
                  placeholder="Describe your NFT marketplace..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={settings?.general.logoUrl || ""}
                    onChange={(e) => updateSettings("general", "logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bannerUrl">Banner URL</Label>
                  <Input
                    id="bannerUrl"
                    value={settings?.general.bannerUrl || ""}
                    onChange={(e) => updateSettings("general", "bannerUrl", e.target.value)}
                    placeholder="https://example.com/banner.png"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="supportUrl">Support URL</Label>
                  <Input
                    id="supportUrl"
                    value={settings?.general.supportUrl || ""}
                    onChange={(e) => updateSettings("general", "supportUrl", e.target.value)}
                    placeholder="https://support.marketplace.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termsUrl">Terms of Service URL</Label>
                  <Input
                    id="termsUrl"
                    value={settings?.general.termsUrl || ""}
                    onChange={(e) => updateSettings("general", "termsUrl", e.target.value)}
                    placeholder="https://marketplace.com/terms"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                  <Input
                    id="privacyUrl"
                    value={settings?.general.privacyUrl || ""}
                    onChange={(e) => updateSettings("general", "privacyUrl", e.target.value)}
                    placeholder="https://marketplace.com/privacy"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fee Configuration
              </CardTitle>
              <CardDescription>
                Set marketplace fees and revenue parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="marketplaceFee">Marketplace Fee (%)</Label>
                  <Input
                    id="marketplaceFee"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={settings?.fees.marketplaceFeePercentage || 0}
                    onChange={(e) => updateSettings("fees", "marketplaceFeePercentage", parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Platform fee charged on each sale</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRoyalty">Max Royalty (%)</Label>
                  <Input
                    id="maxRoyalty"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={settings?.fees.maxRoyaltyPercentage || 0}
                    onChange={(e) => updateSettings("fees", "maxRoyaltyPercentage", parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Maximum creator royalty allowed</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="listingFee">Listing Fee (USD)</Label>
                  <Input
                    id="listingFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings?.fees.listingFee || 0}
                    onChange={(e) => updateSettings("fees", "listingFee", parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Fee to list an NFT (0 = free)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeRecipient">Fee Recipient Address</Label>
                  <Input
                    id="feeRecipient"
                    value={settings?.fees.feeRecipientAddress || ""}
                    onChange={(e) => updateSettings("fees", "feeRecipientAddress", e.target.value)}
                    placeholder="0x..."
                  />
                  <p className="text-xs text-muted-foreground">Wallet to receive marketplace fees</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Gas Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable gas optimization features for transactions
                  </p>
                </div>
                <Switch
                  checked={settings?.fees.gasOptimizationEnabled || false}
                  onCheckedChange={(checked) => updateSettings("fees", "gasOptimizationEnabled", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Trading Features
              </CardTitle>
              <CardDescription>
                Configure available trading methods and auction settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Fixed Price Sales</Label>
                    <p className="text-sm text-muted-foreground">Allow buy-now listings</p>
                  </div>
                  <Switch
                    checked={settings?.trading.enableFixedPriceSales || false}
                    onCheckedChange={(checked) => updateSettings("trading", "enableFixedPriceSales", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auctions</Label>
                    <p className="text-sm text-muted-foreground">Enable timed auctions</p>
                  </div>
                  <Switch
                    checked={settings?.trading.enableAuctions || false}
                    onCheckedChange={(checked) => updateSettings("trading", "enableAuctions", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Offers</Label>
                    <p className="text-sm text-muted-foreground">Allow users to make offers</p>
                  </div>
                  <Switch
                    checked={settings?.trading.enableOffers || false}
                    onCheckedChange={(checked) => updateSettings("trading", "enableOffers", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bundle Sales</Label>
                    <p className="text-sm text-muted-foreground">Allow selling multiple NFTs together</p>
                  </div>
                  <Switch
                    checked={settings?.trading.enableBundles || false}
                    onCheckedChange={(checked) => updateSettings("trading", "enableBundles", checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="minAuctionDuration">Min Auction Duration (hours)</Label>
                  <Input
                    id="minAuctionDuration"
                    type="number"
                    min="1"
                    value={settings?.trading.minAuctionDuration || 1}
                    onChange={(e) => updateSettings("trading", "minAuctionDuration", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAuctionDuration">Max Auction Duration (days)</Label>
                  <Input
                    id="maxAuctionDuration"
                    type="number"
                    min="1"
                    max="30"
                    value={settings?.trading.maxAuctionDuration || 7}
                    onChange={(e) => updateSettings("trading", "maxAuctionDuration", parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bidIncrement">Bid Increment (%)</Label>
                  <Input
                    id="bidIncrement"
                    type="number"
                    min="1"
                    max="50"
                    value={settings?.trading.bidIncrementPercentage || 5}
                    onChange={(e) => updateSettings("trading", "bidIncrementPercentage", parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Anti-Snipe Protection</Label>
                    <p className="text-sm text-muted-foreground">Extend auctions when bids come in late</p>
                  </div>
                  <Switch
                    checked={settings?.trading.enableAntiSnipe || false}
                    onCheckedChange={(checked) => updateSettings("trading", "enableAntiSnipe", checked)}
                  />
                </div>

                {settings?.trading.enableAntiSnipe && (
                  <div className="space-y-2">
                    <Label htmlFor="antiSnipeExtension">Extension Time (minutes)</Label>
                    <Input
                      id="antiSnipeExtension"
                      type="number"
                      min="1"
                      max="60"
                      value={settings?.trading.antiSnipeExtension || 10}
                      onChange={(e) => updateSettings("trading", "antiSnipeExtension", parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification & Security
              </CardTitle>
              <CardDescription>
                Configure creator verification and security policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Verify Creators</Label>
                    <p className="text-sm text-muted-foreground">Automatically verify new creators</p>
                  </div>
                  <Switch
                    checked={settings?.verification.autoVerifyCreators || false}
                    onCheckedChange={(checked) => updateSettings("verification", "autoVerifyCreators", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require KYC for Creators</Label>
                    <p className="text-sm text-muted-foreground">Mandate KYC verification for creators</p>
                  </div>
                  <Switch
                    checked={settings?.verification.requireKycForCreators || false}
                    onCheckedChange={(checked) => updateSettings("verification", "requireKycForCreators", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>KYC for High-Value Sales</Label>
                    <p className="text-sm text-muted-foreground">Require KYC for expensive transactions</p>
                  </div>
                  <Switch
                    checked={settings?.verification.requireKycForHighValue || false}
                    onCheckedChange={(checked) => updateSettings("verification", "requireKycForHighValue", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Verification Badges</Label>
                    <p className="text-sm text-muted-foreground">Display verification badges</p>
                  </div>
                  <Switch
                    checked={settings?.verification.verificationBadgeEnabled || false}
                    onCheckedChange={(checked) => updateSettings("verification", "verificationBadgeEnabled", checked)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="highValueThreshold">High-Value Threshold (USD)</Label>
                  <Input
                    id="highValueThreshold"
                    type="number"
                    min="0"
                    value={settings?.verification.highValueThreshold || 10000}
                    onChange={(e) => updateSettings("verification", "highValueThreshold", parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Amount that triggers additional verification</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Manual Review Required</Label>
                    <p className="text-sm text-muted-foreground">Require manual review for new collections</p>
                  </div>
                  <Switch
                    checked={settings?.verification.manualReviewRequired || false}
                    onCheckedChange={(checked) => updateSettings("verification", "manualReviewRequired", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Content Policies
              </CardTitle>
              <CardDescription>
                Configure content moderation and file handling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Content Moderation</Label>
                    <p className="text-sm text-muted-foreground">Enable automated content moderation</p>
                  </div>
                  <Switch
                    checked={settings?.content.enableContentModeration || false}
                    onCheckedChange={(checked) => updateSettings("content", "enableContentModeration", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Explicit Content</Label>
                    <p className="text-sm text-muted-foreground">Allow NSFW/explicit content</p>
                  </div>
                  <Switch
                    checked={settings?.content.allowExplicitContent || false}
                    onCheckedChange={(checked) => updateSettings("content", "allowExplicitContent", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Metadata Validation</Label>
                    <p className="text-sm text-muted-foreground">Validate NFT metadata format</p>
                  </div>
                  <Switch
                    checked={settings?.content.requireMetadataValidation || false}
                    onCheckedChange={(checked) => updateSettings("content", "requireMetadataValidation", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IPFS Storage</Label>
                    <p className="text-sm text-muted-foreground">Enable IPFS for decentralized storage</p>
                  </div>
                  <Switch
                    checked={settings?.content.enableIpfsStorage || false}
                    onCheckedChange={(checked) => updateSettings("content", "enableIpfsStorage", checked)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    min="1"
                    max="500"
                    value={settings?.content.maxFileSize || 50}
                    onChange={(e) => updateSettings("content", "maxFileSize", parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Supported Formats</Label>
                  <div className="flex flex-wrap gap-2">
                    {settings?.content.supportedFormats?.map((format) => (
                      <Badge key={format} variant="secondary">
                        {format}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                External Integrations
              </CardTitle>
              <CardDescription>
                Configure third-party integrations and social features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cross-Chain Support</Label>
                    <p className="text-sm text-muted-foreground">Enable multi-blockchain trading</p>
                  </div>
                  <Switch
                    checked={settings?.integrations.enableCrossChain || false}
                    onCheckedChange={(checked) => updateSettings("integrations", "enableCrossChain", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>External Marketplaces</Label>
                    <p className="text-sm text-muted-foreground">Sync with other NFT platforms</p>
                  </div>
                  <Switch
                    checked={settings?.integrations.enableExternalMarketplaces || false}
                    onCheckedChange={(checked) => updateSettings("integrations", "enableExternalMarketplaces", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Social Features</Label>
                    <p className="text-sm text-muted-foreground">Enable likes, comments, follows</p>
                  </div>
                  <Switch
                    checked={settings?.integrations.enableSocialFeatures || false}
                    onCheckedChange={(checked) => updateSettings("integrations", "enableSocialFeatures", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Discord Integration</Label>
                    <p className="text-sm text-muted-foreground">Connect with Discord communities</p>
                  </div>
                  <Switch
                    checked={settings?.integrations.enableDiscordIntegration || false}
                    onCheckedChange={(checked) => updateSettings("integrations", "enableDiscordIntegration", checked)}
                  />
                </div>
              </div>

              {settings?.integrations.enableExternalMarketplaces && (
                <div className="space-y-2">
                  <Label htmlFor="openseaApiKey">OpenSea API Key</Label>
                  <Input
                    id="openseaApiKey"
                    type="password"
                    value={settings?.integrations.openseaApiKey || ""}
                    onChange={(e) => updateSettings("integrations", "openseaApiKey", e.target.value)}
                    placeholder="Enter OpenSea API key..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for OpenSea integration and cross-platform listings
                  </p>
                </div>
              )}

              {settings?.integrations.enableCrossChain && (
                <div className="space-y-2">
                  <Label>Supported Blockchains</Label>
                  <div className="flex flex-wrap gap-2">
                    {settings?.integrations.supportedChains?.map((chain) => (
                      <Badge key={chain} variant="secondary">
                        {chain}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Blockchains supported for cross-chain NFT trading
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 