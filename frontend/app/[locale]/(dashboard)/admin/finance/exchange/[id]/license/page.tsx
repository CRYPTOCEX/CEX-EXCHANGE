"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  Shield,
  Key,
  User,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ExchangeProvider {
  id: string;
  name: string;
  title: string;
  status: boolean;
  licenseStatus: boolean;
  version: string;
  productId: string;
}

const ExchangeLicensePage = () => {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [exchange, setExchange] = useState<ExchangeProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");

  useEffect(() => {
    if (productId) {
      fetchExchangeDetails(productId);
    }
  }, [productId]);

  const fetchExchangeDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${id}`,
        silent: true,
      });

      if (!error) {
        setExchange(data.exchange);
      } else {
        toast.error("Failed to fetch exchange details");
      }
    } catch (error) {
      toast.error("An error occurred while fetching exchange details");
    } finally {
      setLoading(false);
    }
  };

  const activateLicense = async () => {
    if (!purchaseCode.trim() || !envatoUsername.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setActivating(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${productId}/activate`,
        method: "POST",
        body: {
          purchaseCode: purchaseCode.trim(),
          envatoUsername: envatoUsername.trim(),
        },
        silent: true,
      });

      if (!error) {
        toast.success("License activated successfully!");
        // Refresh exchange details
        await fetchExchangeDetails(productId);
        // Redirect back to the exchange view page
        router.push(`/admin/finance/exchange/${productId}`);
      } else {
        toast.error("Failed to activate license");
      }
    } catch (error) {
      toast.error("An error occurred while activating license");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96 flex-col gap-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">
            {t("loading_exchange_provider")}.
          </span>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("exchange_provider_not_found")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("the_requested_exchange_provider_could_not_be_found")}.
          </p>
          <Link href="/admin/finance/exchange">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_exchange_providers")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (exchange.licenseStatus) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/admin/finance/exchange/${productId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("Back")}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{t("license_management")}</h1>
              <p className="text-muted-foreground">
                {exchange.title}
                {t("exchange_provider")}
              </p>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>{t("license_already_active")}</AlertTitle>
            <AlertDescription>
              {t("the_license_for")}
              {exchange.title}
              {t("exchange_provider_is_working_properly")}.
            </AlertDescription>
          </Alert>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t("license_status")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {exchange.title}
                    {t("Exchange")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("Version")}
                    {exchange.version}
                  </p>
                </div>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t("Licensed")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/admin/finance/exchange/${productId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("Back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t("activate_license")}</h1>
            <p className="text-muted-foreground">
              {exchange.title}
              {t("exchange_provider")}
            </p>
          </div>
        </div>

        {/* Current Status */}
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("license_required")}</AlertTitle>
          <AlertDescription>
            {t("this_exchange_provider_to_operate")}.{" "}
            {t("please_enter_your_the_license")}.
          </AlertDescription>
        </Alert>

        {/* Exchange Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("exchange_provider_details")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("name")}</span>
                <span className="text-sm">{exchange.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("version")}</span>
                <Badge variant="outline">{exchange.version}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("status")}</span>
                <Badge variant={exchange.status ? "default" : "secondary"}>
                  {exchange.status ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("license")}</span>
                <Badge variant="destructive">{t("Unlicensed")}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Activation Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("license_activation")}</CardTitle>
            <CardDescription>
              {t("enter_your_envato_exchange_provider")}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseCode" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                {t("purchase_code")}
              </Label>
              <Input
                id="purchaseCode"
                type="text"
                placeholder="Enter your Envato purchase code"
                value={purchaseCode}
                onChange={(e) => setPurchaseCode(e.target.value)}
                disabled={activating}
              />
              <p className="text-xs text-muted-foreground">
                {t("the_purchase_code_purchase_receipt")}
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="envatoUsername"
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {t("envato_username")}
              </Label>
              <Input
                id="envatoUsername"
                type="text"
                placeholder="Enter your Envato username"
                value={envatoUsername}
                onChange={(e) => setEnvatoUsername(e.target.value)}
                disabled={activating}
              />
              <p className="text-xs text-muted-foreground">
                {t("your_envato_account_username_(buyer_username)")}
              </p>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button
                onClick={activateLicense}
                disabled={
                  activating || !purchaseCode.trim() || !envatoUsername.trim()
                }
                className="flex-1"
              >
                {activating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("Activating")}.
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {t("activate_license")}
                  </>
                )}
              </Button>
              <Link href={`/admin/finance/exchange/${productId}`}>
                <Button variant="outline">{t("Cancel")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">{t("need_help")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p className="font-medium">
                {t("where_to_find_your_purchase_code")}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>{t("log_in_to_your_codecanyon_account")}</li>
                <li>{t("go_to_your_downloads_page")}</li>
                <li>{t("find_this_item_and_click_download")}</li>
                <li>{t("select_license_certificate_&_purchase_code")}</li>
              </ul>
            </div>
            <Separator />
            <div className="flex items-center gap-2 text-sm">
              <span>{t("need_more_help")}</span>
              <Link
                href="https://help.market.envato.com/hc/en-us/articles/202822600-Where-Is-My-Purchase-Code-"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {t("envato_help_center")}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExchangeLicensePage;
