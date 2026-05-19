"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Copy,
  Check,
  Key,
  CreditCard,
  RefreshCcw,
  Webhook,
  AlertCircle,
  Globe,
  Zap,
  BookOpen,
  ChevronRight,
  Banknote,
  Coins,
  CircleDollarSign,
} from "lucide-react";

const CodeBlock = ({
  code,
  language = "javascript",
  title,
}: {
  code: string;
  language?: string;
  title?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg border bg-zinc-950 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
          <span className="text-xs text-zinc-400 font-mono">{title}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-zinc-400 hover:text-white"
            onClick={copyCode}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-500" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      )}
      <ScrollArea className="w-full">
        <pre className="p-4 text-sm overflow-x-auto">
          <code className={`language-${language} text-zinc-100`}>{code}</code>
        </pre>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {!title && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white"
          onClick={copyCode}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
};

const EndpointBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    POST: "bg-green-500/20 text-green-400 border-green-500/30",
    PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <Badge variant="outline" className={`font-mono text-xs ${colors[method] || ""}`}>
      {method}
    </Badge>
  );
};

const ParamTable = ({
  params,
}: {
  params: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: string;
  }>;
}) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="text-left py-3 px-4 font-medium">Parameter</th>
          <th className="text-left py-3 px-4 font-medium">Type</th>
          <th className="text-left py-3 px-4 font-medium">Required</th>
          <th className="text-left py-3 px-4 font-medium">Description</th>
        </tr>
      </thead>
      <tbody>
        {params.map((param, idx) => (
          <tr key={param.name} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
            <td className="py-3 px-4">
              <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">
                {param.name}
              </code>
            </td>
            <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
              {param.type}
            </td>
            <td className="py-3 px-4">
              {param.required ? (
                <Badge variant="destructive" className="text-xs">Required</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Optional</Badge>
              )}
            </td>
            <td className="py-3 px-4 text-muted-foreground">
              {param.description}
              {param.default && (
                <span className="text-xs ml-1">(default: {param.default})</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function GatewayDocsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [baseUrl, setBaseUrl] = useState("https://your-domain.com");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Header */}
      <div className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <Link href="/gateway/dashboard">
            <Button variant="ghost" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold">API Documentation</h1>
                  <p className="text-muted-foreground mt-1">
                    Payment Gateway Integration Guide
                  </p>
                </div>
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Accept payments from customers using FIAT, SPOT, or ECO wallets.
                Complete API reference with examples in multiple languages.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/gateway/settings">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Key className="h-4 w-4 mr-2" />
                  Get API Keys
                </Button>
              </Link>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setActiveTab("payments");
                  document.getElementById("api-tabs")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Quick Start
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Quick Start Steps */}
        <div className="py-8 border-b">
          <h2 className="text-xl font-semibold mb-6">Integration in 3 Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary font-bold text-xl shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Create API Keys</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate your secret and public API keys from the Settings page.
                      Use test keys for development.
                    </p>
                    <Link href="/gateway/settings" className="text-primary text-sm mt-2 inline-flex items-center hover:underline">
                      Go to Settings <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary font-bold text-xl shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Create Payment</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Call the API with amount, currency, and return URL.
                      You'll receive a checkout URL for your customer.
                    </p>
                    <button onClick={() => setActiveTab("payments")} className="text-primary text-sm mt-2 inline-flex items-center hover:underline">
                      View API Reference <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary font-bold text-xl shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Handle Webhooks</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Receive real-time notifications when payments complete, fail, or are refunded.
                    </p>
                    <button onClick={() => setActiveTab("webhooks")} className="text-primary text-sm mt-2 inline-flex items-center hover:underline">
                      Learn More <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Documentation */}
        <div id="api-tabs" className="py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b mb-8 overflow-x-auto">
              <TabsList className="h-12 bg-transparent gap-2 w-full justify-start">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Globe className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="authentication" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Key className="h-4 w-4 mr-2" />
                  Authentication
                </TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="refunds" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refunds
                </TabsTrigger>
                <TabsTrigger value="webhooks" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <Webhook className="h-4 w-4 mr-2" />
                  Webhooks
                </TabsTrigger>
                <TabsTrigger value="errors" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Errors
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Base URL</h2>
                    <CodeBlock code={`${baseUrl}/api/gateway/v1`} language="text" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-4">Wallet Types</h2>
                    <p className="text-muted-foreground mb-4">
                      The gateway supports three wallet types for accepting payments:
                    </p>
                    <div className="space-y-3">
                      <Card>
                        <CardContent className="flex items-center gap-4 py-4">
                          <div className="p-2 rounded-lg bg-green-500/10">
                            <Banknote className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">FIAT</code>
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Traditional fiat currencies (USD, EUR, etc.)
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="flex items-center gap-4 py-4">
                          <div className="p-2 rounded-lg bg-orange-500/10">
                            <Coins className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">SPOT</code>
                            <p className="text-sm text-muted-foreground mt-1">
                              Cryptocurrency spot wallets (BTC, ETH, etc.)
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="flex items-center gap-4 py-4">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <CircleDollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">ECO</code>
                            <p className="text-sm text-muted-foreground mt-1">
                              Ecosystem tokens with private ledger support
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">API Endpoints</h2>
                    <div className="space-y-3">
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("payments")}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <EndpointBadge method="POST" />
                            <code className="font-mono text-sm">/payment</code>
                          </div>
                          <span className="text-sm text-muted-foreground">Create payment</span>
                        </CardContent>
                      </Card>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("payments")}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <EndpointBadge method="GET" />
                            <code className="font-mono text-sm">/payment/:id</code>
                          </div>
                          <span className="text-sm text-muted-foreground">Get payment</span>
                        </CardContent>
                      </Card>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("payments")}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <EndpointBadge method="POST" />
                            <code className="font-mono text-sm">/payment/:id/cancel</code>
                          </div>
                          <span className="text-sm text-muted-foreground">Cancel payment</span>
                        </CardContent>
                      </Card>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("refunds")}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <EndpointBadge method="POST" />
                            <code className="font-mono text-sm">/refund</code>
                          </div>
                          <span className="text-sm text-muted-foreground">Create refund</span>
                        </CardContent>
                      </Card>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("refunds")}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <EndpointBadge method="GET" />
                            <code className="font-mono text-sm">/refund/:id</code>
                          </div>
                          <span className="text-sm text-muted-foreground">Get refund</span>
                        </CardContent>
                      </Card>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setActiveTab("authentication")}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-3">
                            <EndpointBadge method="GET" />
                            <code className="font-mono text-sm">/validate</code>
                          </div>
                          <span className="text-sm text-muted-foreground">Validate API key</span>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Key Authentication
                      </CardTitle>
                      <CardDescription>
                        All API requests must include your API key in the X-API-Key header
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <CodeBlock
                        title="HTTP Header"
                        code={`X-API-Key: sk_live_your_secret_key_here`}
                        language="text"
                      />

                      <CodeBlock
                        title="cURL Example"
                        code={`curl -X POST ${baseUrl}/api/gateway/v1/payment \\
  -H "X-API-Key: sk_live_your_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "returnUrl": "https://your-site.com/success"
  }'`}
                        language="bash"
                      />

                      <CodeBlock
                        title="JavaScript/Node.js"
                        code={`const response = await fetch('${baseUrl}/api/gateway/v1/payment', {
  method: 'POST',
  headers: {
    'X-API-Key': 'sk_live_your_secret_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 99.99,
    currency: 'USD',
    returnUrl: 'https://your-site.com/success'
  })
});

const payment = await response.json();
console.log(payment.checkoutUrl);`}
                        language="javascript"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Validate API Key</CardTitle>
                      <CardDescription>
                        Test your API key and check permissions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <EndpointBadge method="GET" />
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          /api/gateway/v1/validate
                        </code>
                      </div>

                      <CodeBlock
                        title="Response"
                        code={`{
  "valid": true,
  "merchant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Your Business",
    "status": "ACTIVE",
    "verificationStatus": "VERIFIED"
  },
  "mode": "LIVE",
  "permissions": ["*"],
  "keyType": "SECRET"
}`}
                        language="json"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-primary/50">
                    <CardHeader>
                      <CardTitle className="text-base">API Key Types</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Live</Badge>
                          <span className="font-medium">Production</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Use for real transactions. Prefixed with <code className="bg-muted px-1 rounded">sk_live_</code> or <code className="bg-muted px-1 rounded">pk_live_</code>
                        </p>
                      </div>

                      <div className="p-4 rounded-lg border bg-yellow-500/5 border-yellow-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Test</Badge>
                          <span className="font-medium">Development</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Use for testing. Prefixed with <code className="bg-muted px-1 rounded">sk_test_</code> or <code className="bg-muted px-1 rounded">pk_test_</code>
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-600">Security Notice</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Secret keys</strong> (sk_*) should only be used on your server. Never expose them in client-side code.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">IP Whitelisting</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        For enhanced security, you can restrict secret key usage to specific IP addresses.
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="p-2 rounded bg-muted/50">
                          <code className="text-xs">192.168.1.100</code>
                          <span className="text-muted-foreground ml-2">- Single IP</span>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <code className="text-xs">10.0.0.0/24</code>
                          <span className="text-muted-foreground ml-2">- CIDR range</span>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <code className="text-xs">*</code>
                          <span className="text-muted-foreground ml-2">- Allow all (not recommended)</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Configure in API Key settings. Only enforced for secret keys.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Key Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <code className="bg-muted px-1 rounded">payment.create</code>
                          <span className="text-muted-foreground">Secret only</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="bg-muted px-1 rounded">payment.read</code>
                          <span className="text-muted-foreground">Both</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="bg-muted px-1 rounded">payment.cancel</code>
                          <span className="text-muted-foreground">Secret only</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="bg-muted px-1 rounded">refund.create</code>
                          <span className="text-muted-foreground">Secret only</span>
                        </div>
                        <div className="flex justify-between">
                          <code className="bg-muted px-1 rounded">refund.read</code>
                          <span className="text-muted-foreground">Both</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-8">
              {/* Create Payment */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <EndpointBadge method="POST" />
                    <code className="font-mono text-lg">/api/gateway/v1/payment</code>
                  </div>
                  <CardDescription className="mt-2">
                    Create a new payment session. Returns a checkout URL to redirect your customer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Request Parameters</h3>
                    <ParamTable
                      params={[
                        { name: "amount", type: "number", required: true, description: "Payment amount (e.g., 99.99)" },
                        { name: "currency", type: "string", required: true, description: "Three-letter currency code (e.g., USD, EUR, BTC)" },
                        { name: "returnUrl", type: "string", required: true, description: "URL to redirect after successful payment" },
                        { name: "walletType", type: "string", required: false, description: "FIAT, SPOT, or ECO", default: "FIAT" },
                        { name: "merchantOrderId", type: "string", required: false, description: "Your internal order reference ID" },
                        { name: "description", type: "string", required: false, description: "Payment description shown to customer" },
                        { name: "cancelUrl", type: "string", required: false, description: "URL to redirect if payment is cancelled" },
                        { name: "webhookUrl", type: "string", required: false, description: "URL to receive webhook notifications" },
                        { name: "customerEmail", type: "string", required: false, description: "Customer's email address" },
                        { name: "customerName", type: "string", required: false, description: "Customer's name" },
                        { name: "metadata", type: "object", required: false, description: "Custom key-value pairs for your use" },
                        { name: "lineItems", type: "array", required: false, description: "List of items being purchased" },
                        { name: "expiresIn", type: "integer", required: false, description: "Session expiry in seconds (300-86400)", default: "1800" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CodeBlock
                      title="Request"
                      code={`{
  "amount": 99.99,
  "currency": "USD",
  "walletType": "FIAT",
  "merchantOrderId": "order_12345",
  "description": "Premium Subscription",
  "returnUrl": "https://your-site.com/success",
  "cancelUrl": "https://your-site.com/cancel",
  "webhookUrl": "https://your-site.com/webhooks",
  "customerEmail": "customer@example.com",
  "metadata": {
    "customerId": "cust_abc123",
    "plan": "premium"
  },
  "lineItems": [
    {
      "name": "Premium Plan",
      "quantity": 1,
      "unitPrice": 99.99
    }
  ]
}`}
                      language="json"
                    />

                    <CodeBlock
                      title="Response"
                      code={`{
  "id": "pi_abc123xyz789",
  "status": "PENDING",
  "amount": 99.99,
  "currency": "USD",
  "walletType": "FIAT",
  "merchantOrderId": "order_12345",
  "description": "Premium Subscription",
  "feeAmount": 2.99,
  "netAmount": 97.00,
  "checkoutUrl": "${baseUrl}/gateway/checkout/pi_abc123xyz789",
  "expiresAt": "2024-01-15T12:00:00.000Z",
  "createdAt": "2024-01-15T11:30:00.000Z"
}`}
                      language="json"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Get Payment */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <EndpointBadge method="GET" />
                    <code className="font-mono text-lg">/api/gateway/v1/payment/:id</code>
                  </div>
                  <CardDescription className="mt-2">
                    Retrieve the details of an existing payment by its ID.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CodeBlock
                    title="Response"
                    code={`{
  "id": "pi_abc123xyz789",
  "status": "COMPLETED",
  "amount": 99.99,
  "currency": "USD",
  "walletType": "FIAT",
  "merchantOrderId": "order_12345",
  "description": "Premium Subscription",
  "feeAmount": 2.99,
  "netAmount": 97.00,
  "checkoutUrl": "${baseUrl}/gateway/checkout/pi_abc123xyz789",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "metadata": { "customerId": "cust_abc123" },
  "expiresAt": "2024-01-15T12:00:00.000Z",
  "completedAt": "2024-01-15T11:45:00.000Z",
  "createdAt": "2024-01-15T11:30:00.000Z"
}`}
                    language="json"
                  />

                  <div>
                    <h3 className="font-semibold mb-4">Payment Statuses</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { status: "PENDING", desc: "Awaiting payment" },
                        { status: "PROCESSING", desc: "Being processed" },
                        { status: "COMPLETED", desc: "Successfully paid" },
                        { status: "FAILED", desc: "Payment failed" },
                        { status: "CANCELLED", desc: "Cancelled by user" },
                        { status: "EXPIRED", desc: "Session expired" },
                        { status: "REFUNDED", desc: "Fully refunded" },
                        { status: "PARTIALLY_REFUNDED", desc: "Partially refunded" },
                      ].map((s) => (
                        <div key={s.status} className="p-3 rounded-lg border bg-card">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{s.status}</code>
                          <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cancel Payment */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <EndpointBadge method="POST" />
                    <code className="font-mono text-lg">/api/gateway/v1/payment/:id/cancel</code>
                  </div>
                  <CardDescription className="mt-2">
                    Cancel a pending payment session. Only payments with PENDING status can be cancelled.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Path Parameters</h3>
                    <ParamTable
                      params={[
                        { name: "id", type: "string", required: true, description: "The payment intent ID (pi_xxx)" },
                      ]}
                    />
                  </div>

                  <CodeBlock
                    title="Response"
                    code={`{
  "id": "pi_abc123xyz789",
  "status": "CANCELLED",
  "cancelledAt": "2024-01-15T12:00:00.000Z"
}`}
                    language="json"
                  />

                  <Card className="border-yellow-500/30 bg-yellow-500/5">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                        <div>
                          <p className="font-medium text-yellow-600">Important</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Only payments with <code className="bg-muted px-1 rounded">PENDING</code> status can be cancelled.
                            Completed, failed, or expired payments cannot be cancelled.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Refunds Tab */}
            <TabsContent value="refunds" className="space-y-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <EndpointBadge method="POST" />
                    <code className="font-mono text-lg">/api/gateway/v1/refund</code>
                  </div>
                  <CardDescription className="mt-2">
                    Create a refund for a completed payment. Supports full or partial refunds.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Request Parameters</h3>
                    <ParamTable
                      params={[
                        { name: "paymentId", type: "string", required: true, description: "The payment intent ID to refund (pi_xxx)" },
                        { name: "amount", type: "number", required: false, description: "Partial refund amount (defaults to full refund)" },
                        { name: "reason", type: "string", required: false, description: "REQUESTED_BY_CUSTOMER, DUPLICATE, FRAUDULENT, OTHER" },
                        { name: "description", type: "string", required: false, description: "Internal refund description" },
                        { name: "metadata", type: "object", required: false, description: "Custom metadata" },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CodeBlock
                      title="Request"
                      code={`{
  "paymentId": "pi_abc123xyz789",
  "amount": 50.00,
  "reason": "REQUESTED_BY_CUSTOMER",
  "description": "Customer requested partial refund"
}`}
                      language="json"
                    />

                    <CodeBlock
                      title="Response"
                      code={`{
  "id": "rf_xyz789abc123",
  "paymentId": "pi_abc123xyz789",
  "amount": 50.00,
  "currency": "USD",
  "status": "COMPLETED",
  "reason": "REQUESTED_BY_CUSTOMER",
  "description": "Customer requested partial refund",
  "createdAt": "2024-01-16T10:00:00.000Z"
}`}
                      language="json"
                    />
                  </div>

                  <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardContent className="pt-6">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-medium text-blue-600">Fee Handling</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            When processing a refund, a proportional amount of the original fee is also returned.
                            For example, if the original $100 payment had a $3 fee and you refund $50, the customer
                            receives $50 plus $1.50 of the original fee.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>

              {/* Get Refund */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <EndpointBadge method="GET" />
                    <code className="font-mono text-lg">/api/gateway/v1/refund/:id</code>
                  </div>
                  <CardDescription className="mt-2">
                    Retrieve the details of an existing refund by its ID.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Path Parameters</h3>
                    <ParamTable
                      params={[
                        { name: "id", type: "string", required: true, description: "The refund ID (re_xxx)" },
                      ]}
                    />
                  </div>

                  <CodeBlock
                    title="Response"
                    code={`{
  "id": "re_xyz789abc123",
  "paymentId": "pi_abc123xyz789",
  "amount": 50.00,
  "currency": "USD",
  "status": "COMPLETED",
  "reason": "REQUESTED_BY_CUSTOMER",
  "description": "Customer requested partial refund",
  "createdAt": "2024-01-16T10:00:00.000Z"
}`}
                    language="json"
                  />

                  <div>
                    <h3 className="font-semibold mb-4">Refund Statuses</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { status: "PENDING", desc: "Refund being processed" },
                        { status: "COMPLETED", desc: "Refund successful" },
                        { status: "FAILED", desc: "Refund failed" },
                      ].map((s) => (
                        <div key={s.status} className="p-3 rounded-lg border bg-card">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{s.status}</code>
                          <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Refund Reasons</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { reason: "REQUESTED_BY_CUSTOMER", desc: "Customer requested the refund" },
                        { reason: "DUPLICATE", desc: "Duplicate payment was made" },
                        { reason: "FRAUDULENT", desc: "Payment was fraudulent" },
                        { reason: "OTHER", desc: "Other reason" },
                      ].map((r) => (
                        <div key={r.reason} className="p-3 rounded-lg border bg-card">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{r.reason}</code>
                          <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Webhooks Tab */}
            <TabsContent value="webhooks" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Events
                  </CardTitle>
                  <CardDescription>
                    Receive real-time notifications about payment events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Available Events</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { event: "payment.created", desc: "Payment session was created" },
                        { event: "payment.completed", desc: "Payment was successfully completed" },
                        { event: "payment.failed", desc: "Payment attempt failed" },
                        { event: "payment.cancelled", desc: "Customer cancelled the payment" },
                        { event: "payment.expired", desc: "Payment session expired" },
                        { event: "refund.completed", desc: "Refund was processed successfully" },
                      ].map((e) => (
                        <div key={e.event} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                          <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{e.event}</code>
                          <span className="text-sm text-muted-foreground">{e.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Webhook Payload</h3>
                    <CodeBlock
                      title="Example: payment.completed"
                      code={`{
  "id": "evt_pi_abc123xyz789",
  "type": "payment.completed",
  "createdAt": "2024-01-15T11:45:00.000Z",
  "data": {
    "id": "pi_abc123xyz789",
    "merchantOrderId": "order_12345",
    "amount": 99.99,
    "currency": "USD",
    "feeAmount": 2.99,
    "netAmount": 97.00,
    "status": "COMPLETED",
    "customerEmail": "customer@example.com",
    "metadata": { "customerId": "cust_abc123" },
    "completedAt": "2024-01-15T11:45:00.000Z"
  }
}`}
                      language="json"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Verifying Webhook Signatures</h3>
                    <p className="text-muted-foreground mb-4">
                      All webhooks include a signature in the <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header.
                      Verify this signature using your webhook secret to ensure the request is authentic.
                    </p>
                    <CodeBlock
                      title="Node.js Verification"
                      code={`const crypto = require('crypto');

function verifyWebhook(payload, signature, webhookSecret) {
  // Signature format: t=timestamp,v1=signature
  const parts = signature.split(',');
  const timestamp = parts[0].split('=')[1];
  const receivedSig = parts[1].split('=')[1];

  // Create the signed payload
  const signedPayload = timestamp + '.' + JSON.stringify(payload);

  // Generate expected signature
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expectedSig)
  );
}

// Express.js handler
app.post('/webhooks/gateway', express.json(), (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const { type, data } = req.body;

  switch (type) {
    case 'payment.completed':
      // Fulfill the order
      console.log('Payment completed:', data.id);
      break;
    case 'payment.failed':
      // Handle failed payment
      console.log('Payment failed:', data.id);
      break;
    case 'refund.completed':
      // Handle refund
      console.log('Refund processed:', data.id);
      break;
  }

  res.status(200).send('OK');
});`}
                      language="javascript"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Errors Tab */}
            <TabsContent value="errors" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Error Handling
                  </CardTitle>
                  <CardDescription>
                    Understanding and handling API errors
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4">Error Response Format</h3>
                    <CodeBlock
                      code={`{
  "error": true,
  "statusCode": 400,
  "message": "Missing required fields: amount, currency, returnUrl"
}`}
                      language="json"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">HTTP Status Codes</h3>
                    <div className="space-y-2">
                      {[
                        { code: "200", type: "success", desc: "Request completed successfully" },
                        { code: "201", type: "success", desc: "Resource created successfully" },
                        { code: "400", type: "error", desc: "Bad Request - Invalid parameters or missing required fields" },
                        { code: "401", type: "error", desc: "Unauthorized - Invalid or missing API key" },
                        { code: "402", type: "error", desc: "Payment Required - Insufficient funds" },
                        { code: "403", type: "error", desc: "Forbidden - Insufficient permissions or merchant suspended" },
                        { code: "404", type: "error", desc: "Not Found - Resource doesn't exist" },
                        { code: "429", type: "error", desc: "Too Many Requests - Rate limit exceeded" },
                        { code: "500", type: "server", desc: "Internal Server Error - Something went wrong on our end" },
                      ].map((e) => (
                        <div key={e.code} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                          <Badge
                            variant="outline"
                            className={
                              e.type === "success"
                                ? "bg-green-500/10 text-green-600 border-green-500/30"
                                : e.type === "error"
                                  ? "bg-red-500/10 text-red-600 border-red-500/30"
                                  : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                            }
                          >
                            {e.code}
                          </Badge>
                          <span className="text-sm">{e.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-4">Common Errors</h3>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="missing-fields">
                        <AccordionTrigger>Missing Required Fields</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Ensure all required fields (amount, currency, returnUrl) are provided in your request.
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 400,
  "message": "Missing required fields: amount, currency, returnUrl"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="invalid-api-key">
                        <AccordionTrigger>Invalid API Key</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Check that your API key is correct, not expired, and matches the environment (live vs test).
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 401,
  "message": "Invalid API key"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="secret-required">
                        <AccordionTrigger>Secret Key Required</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Some endpoints (create payment, create refund) require a secret key (sk_*), not a public key (pk_*).
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 403,
  "message": "Secret key required to create payments"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="ip-whitelist">
                        <AccordionTrigger>IP Not Whitelisted</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            If you've configured IP whitelisting for your API key, requests from non-whitelisted IPs will be rejected.
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 403,
  "message": "IP address not whitelisted for this API key"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="merchant-inactive">
                        <AccordionTrigger>Merchant Account Inactive</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Your merchant account must be active to process payments or refunds.
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 403,
  "message": "Merchant account is not active"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="insufficient-funds">
                        <AccordionTrigger>Insufficient Funds</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            The customer doesn't have enough balance to complete the payment.
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 402,
  "message": "Insufficient balance. Required: 100.00, Available: 50.00"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="payment-expired">
                        <AccordionTrigger>Payment Expired</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            The payment session has expired. Create a new payment intent.
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 400,
  "message": "Payment session has expired"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="refund-exceeded">
                        <AccordionTrigger>Refund Amount Exceeded</AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            The refund amount exceeds the remaining refundable balance.
                          </p>
                          <CodeBlock
                            code={`{
  "error": true,
  "statusCode": 400,
  "message": "Refund amount 75.00 exceeds remaining refundable amount 50.00"
}`}
                            language="json"
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer CTA */}
        <div className="border-t py-12">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-8 pb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold">Ready to integrate?</h2>
                  <p className="text-muted-foreground mt-1">
                    Get your API keys and start accepting payments in minutes.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/gateway/settings">
                    <Button size="lg" className="w-full sm:w-auto">
                      <Key className="h-4 w-4 mr-2" />
                      Get API Keys
                    </Button>
                  </Link>
                  <Link href="/gateway/payment">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      <CreditCard className="h-4 w-4 mr-2" />
                      View Payments
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
