"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Download,
  ExternalLink,
  CheckCircle2,
  Copy,
  ShoppingCart,
  Store,
  Package,
  Settings,
  Key,
  Globe,
  ArrowRight,
  FileCode,
  Zap,
  Shield,
  RefreshCcw,
  Wallet,
  Info,
  AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { IntegrationHero } from "./components/integration-hero";

// Platform integration data
const INTEGRATIONS = [
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Accept crypto and fiat payments on your WordPress store",
    icon: "/img/integrations/woocommerce.svg",
    fallbackIcon: ShoppingCart,
    status: "available",
    version: "1.0.0",
    requirements: ["WordPress 5.8+", "WooCommerce 6.0+", "PHP 7.4+"],
    features: [
      "FIAT, SPOT, and ECO wallet payments",
      "Automatic order status updates",
      "Refund support from WooCommerce",
      "Test mode for development",
      "Customizable checkout experience",
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Coming soon - Accept payments on your Shopify store",
    icon: "/img/integrations/shopify.svg",
    fallbackIcon: Store,
    status: "coming_soon",
    version: null,
    requirements: [],
    features: [],
  },
  {
    id: "magento",
    name: "Magento",
    description: "Coming soon - Accept payments on your Magento store",
    icon: "/img/integrations/magento.svg",
    fallbackIcon: Package,
    status: "coming_soon",
    version: null,
    requirements: [],
    features: [],
  },
];

const CodeBlock = ({ code, language = "php" }: { code: string; language?: string }) => {
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  return (
    <div className="relative group">
      <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700"
        onClick={copyCode}
      >
        <Copy className="h-4 w-4 text-zinc-400" />
      </Button>
    </div>
  );
};

export default function IntegrationsClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const [activeIntegration, setActiveIntegration] = useState("woocommerce");
  const activePlugin = INTEGRATIONS.find((i) => i.id === activeIntegration);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (pluginId: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/gateway/integration/${pluginId}/download`, {
        method: "GET",
        credentials: "include", // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error("Failed to download plugin");
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${pluginId}-plugin.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Plugin downloaded successfully");
    } catch (error) {
      toast.error("Failed to download plugin. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full">
      <IntegrationHero
        rightContent={
          <div className="flex items-center gap-2">
            <Link href="/gateway/docs">
              <Button variant="outline">
                <FileCode className="h-4 w-4 mr-2" />
                API Documentation
              </Button>
            </Link>
            <Link href="/gateway/settings?tab=api-keys">
              <Button>
                <Key className="h-4 w-4 mr-2" />
                {t("get_api_keys")}
              </Button>
            </Link>
          </div>
        }
      />
      <div className="container mx-auto space-y-8 pb-12 pt-8">

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INTEGRATIONS.map((integration) => {
          const IconComponent = integration.fallbackIcon;
          const isActive = activeIntegration === integration.id;
          const isAvailable = integration.status === "available";

          return (
            <Card
              key={integration.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                isActive ? "border-primary ring-1 ring-primary" : ""
              } ${!isAvailable ? "opacity-60" : ""}`}
              onClick={() => isAvailable && setActiveIntegration(integration.id)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      {integration.version && (
                        <p className="text-xs text-muted-foreground">
                          v{integration.version}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={isAvailable ? "default" : "secondary"}
                    className={isAvailable ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}
                  >
                    {isAvailable ? "Available" : "Coming Soon"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  {integration.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Integration Details */}
      {activePlugin && activePlugin.status === "available" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <activePlugin.fallbackIcon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{activePlugin.name} Integration</CardTitle>
                  <CardDescription>
                    Version {activePlugin.version} {t("full_payment_gateway_integration")}
                  </CardDescription>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => handleDownload(activePlugin.id)}
                className="gap-2"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <RefreshCcw className="h-5 w-5 animate-spin" />
                    {t("downloading_ellipsis")}
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    {t("download_plugin")}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="setup" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="setup">{t("setup_guide")}</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
              </TabsList>

              <TabsContent value="setup" className="space-y-6">
                {/* Requirements */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                  <div className="flex flex-wrap gap-2">
                    {activePlugin.requirements.map((req, index) => (
                      <Badge key={index} variant="outline" className="py-1">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activePlugin.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Installation Steps */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("installation_steps")}</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("download_the_plugin")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("click_the_download_plugin_button_above")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("upload_to_wordpress")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("go_to_your_wordpress_admin_panel")} {t("select_the_downloaded_zip_file_and")}
                        </p>
                        <div className="mt-3 p-4 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">{t("alternative_ftp_upload")}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("extract_the_zip_and_upload_the")} <code className="px-1 py-0.5 bg-background rounded">bicrypto-payment-gateway</code> {t("folder_to")} <code className="px-1 py-0.5 bg-background rounded">/wp-content/plugins/</code>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("activate_the_plugin")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("after_installation_click_activate_to_enable")} {t("youll_see_bicrypto_gateway_in_your")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("configure_api_keys")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("navigate_to_woocommerce_settings_payments_bicrypto")} {t("enter_your_api_keys_from_your_merchant_dashboard")}
                        </p>
                        <Link href="/gateway/settings?tab=api-keys">
                          <Button variant="outline" size="sm" className="mt-2">
                            <Key className="h-4 w-4 mr-2" />
                            {t("get_your_api_keys")}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="configuration" className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>API Keys Required</AlertTitle>
                  <AlertDescription>
                    {t("youll_need_your_live_and_test_api_keys_from_the")}{" "}
                    <Link href="/gateway/settings?tab=api-keys" className="underline">
                      {t("settings_page")}
                    </Link>
                    {" "}{t("to_configure_the_plugin")}
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("plugin_settings")}</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">{t("enable_disable")}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t("toggle_the_payment_gateway_on_or")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">{t("gateway_url")}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {t("the_url_of_your_bicrypto_platform")} {t("this_is_pre_configured_based_on")}
                          </p>
                          <CodeBlock code={`${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}`} />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Key className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">API Keys</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {t("enter_your_live_and_test_api_keys")} {t("the_plugin_uses_the_appropriate_key")}
                          </p>
                          <div className="grid gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">{t("live_key")}</Badge>
                              <span className="text-muted-foreground">{t("used_in_production")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">{t("test_key")}</Badge>
                              <span className="text-muted-foreground">{t("used_in_test_mode")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Wallet className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">{t("allowed_wallet_types")}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t("choose_which_wallet_types_customers_can")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <RefreshCcw className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <h4 className="font-medium">{tExt("webhook_configuration")}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {t("the_plugin_automatically_handles_webhooks_your")}:
                          </p>
                          <CodeBlock code={`https://your-store.com/?wc-api=bicrypto_gateway`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="testing" className="space-y-6">
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-600">{tCommon('test_mode')}</AlertTitle>
                  <AlertDescription>
                    {t("always_test_your_integration_in_test")} {t("test_transactions_dont_affect_real_balances")}
                  </AlertDescription>
                </Alert>

                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("testing_your_integration")}</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-600 font-bold text-sm shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("enable_test_mode")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("in_woocommerce_settings_payments_bicrypto_gateway")} {t("this_will_use_your_test_api")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-600 font-bold text-sm shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("create_a_test_order")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("add_items_to_cart_and_proceed_to_checkout")} {t("select_bicrypto_gateway_as_your_payment")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-600 font-bold text-sm shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("complete_test_payment")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("youll_be_redirected_to_the_bicrypto_checkout_page")} {t("complete_the_payment_using_test_credentials")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-600 font-bold text-sm shrink-0">
                        4
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{t("verify_order_status")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("after_payment_check_that_your_woocommerce")} ({t("woocommerce_order_status_flow")})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("go_live_checklist")}</h3>
                  <div className="space-y-2">
                    {[
                      "Tested successful payment flow",
                      "Tested failed/cancelled payment handling",
                      "Verified webhook delivery",
                      "Checked order status updates",
                      "Tested refund functionality",
                      "Disabled Test Mode",
                      "Entered Live API key",
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                        <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="troubleshooting" className="space-y-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>{t("payment_not_redirecting_to_checkout")}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      <ul className="list-disc list-inside space-y-2">
                        <li>{t("verify_your_api_key_is_correct")}</li>
                        <li>{t("check_that_the_gateway_url_is_set_correctly")}</li>
                        <li>{t("ensure_your_server_can_make_outbound")}</li>
                        <li>{t("check_wordpress_error_logs_for_any_php_errors")}</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>{t("order_status_not_updating_after_payment")}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      <ul className="list-disc list-inside space-y-2">
                        <li>{t("verify_webhooks_are_configured_in_your")}</li>
                        <li>{t("check_that_your_site_is_accessible")} ({t("webhooks_cant_reach_localhost")})</li>
                        <li>{t("ensure_the_webhook_url_is_correct")}: <code className="px-1 py-0.5 bg-muted rounded">https://your-store.com/?wc-api=bicrypto_gateway</code></li>
                        <li>{t("check_webhook_delivery_status_in_your")}</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>SSL/HTTPS errors</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      <ul className="list-disc list-inside space-y-2">
                        <li>{t("the_plugin_requires_your_site_to_use_https")}</li>
                        <li>{t("ensure_your_ssl_certificate_is_valid")}</li>
                        <li>{t("check_that_wordpress_address_and_site")}</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>{t("plugin_conflicts")}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      <ul className="list-disc list-inside space-y-2">
                        <li>{t("deactivate_other_payment_gateway_plugins_temporarily")}</li>
                        <li>{t("switch_to_a_default_theme_like")}</li>
                        <li>{t("disable_caching_plugins_and_test_again")}</li>
                        <li>{t("check_for_javascript_errors_in_browser_console")}</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>{t("currency_mismatch_errors")}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      <ul className="list-disc list-inside space-y-2">
                        <li>{t("ensure_your_woocommerce_currency_is_supported")}</li>
                        <li>{t("check_your_merchant_account_has_the")}</li>
                        <li>{t("the_gateway_supports_usd_eur_gbp")}</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">{t("still_having_issues")}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("check_the_api_documentation_for_detailed")}
                  </p>
                  <div className="flex gap-2">
                    <Link href="/gateway/docs">
                      <Button variant="outline" size="sm">
                        <FileCode className="h-4 w-4 mr-2" />
                        API Docs
                      </Button>
                    </Link>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
