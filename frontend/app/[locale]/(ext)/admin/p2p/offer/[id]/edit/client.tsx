"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  ArrowLeft,
  AlertTriangle,
  DollarSign,
  Shield,
  CreditCard,
  MapPin,
  Settings,
  TrendingUp,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OfferEditClientProps {
  id: string;
}

// Helper function to parse JSON safely
const safeJsonParse = (jsonString: any, defaultValue = {}) => {
  try {
    if (typeof jsonString === 'object') return jsonString;
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return defaultValue;
  }
};

export default function OfferEditClient({ id }: OfferEditClientProps) {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
  const tExtAdmin = useTranslations("ext_admin");
  const router = useRouter();
  const { updateOffer } = adminOffersStore();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [globalPaymentMethods, setGlobalPaymentMethods] = useState<any[]>([]);
  const [customPaymentMethods, setCustomPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<{value: string, label: string}[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Ensure consistent hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    basic?: string[];
    pricing?: string[];
    payment?: string[];
    location?: string[];
    requirements?: string[];
    settings?: string[];
  }>({});

  // Form state - comprehensive with all fields
  const [formData, setFormData] = useState({
    // Basic Settings
    type: "BUY" as "BUY" | "SELL",
    currency: "USDT",
    walletType: "SPOT" as "SPOT" | "FIAT" | "ECO",
    status: "ACTIVE",

    // Amount Configuration
    amountConfig: {
      total: 0,
      min: 0,
      max: 0,
    },

    // Price Configuration
    priceConfig: {
      model: "fixed" as "fixed" | "dynamic",
      value: 0,
      marketPrice: 0,
      finalPrice: 0,
      margin: 0,
    },

    // Trade Settings
    tradeSettings: {
      autoCancel: 15,
      kycRequired: false,
      visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
      termsOfTrade: "",
      additionalNotes: "",
      autoReplyMessage: "",
    },

    // Location Settings
    locationSettings: {
      country: "",
      region: "",
      city: "",
      restrictions: [] as string[],
    },

    // User Requirements
    userRequirements: {
      minCompletedTrades: 0,
      minSuccessRate: 0,
      minAccountAge: 0,
      trustedOnly: false,
      verifiedOnly: false,
    },

    // Payment Methods
    paymentMethodIds: [] as string[],

    // Admin Notes
    adminNotes: "",
  });

  // Fetch currencies based on wallet type
  const fetchCurrenciesForWalletType = async (walletType: string) => {
    if (!walletType) return;

    setLoadingCurrencies(true);
    try {
      const response = await fetch("/api/finance/currency/valid");
      if (!response.ok) {
        throw new Error("Failed to fetch currencies");
      }

      const data = await response.json();
      // If wallet type is ECO, use FUNDING currencies
      const mappedWalletType = walletType === "ECO" ? "FUNDING" : walletType;
      const walletCurrencies = data[mappedWalletType] || [];

      setAvailableCurrencies(walletCurrencies);
    } catch (err) {
      console.error("Error fetching currencies:", err);
      setAvailableCurrencies([]);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  // Load currencies when wallet type changes
  useEffect(() => {
    if (formData.walletType) {
      fetchCurrenciesForWalletType(formData.walletType);
    }
  }, [formData.walletType]);

  // Load payment methods
  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const { data: methodsData } = await $fetch({
          url: "/api/p2p/payment-method",
          method: "GET",
          silent: true,
        });
        if (methodsData) {
          // Handle new API response format: { global: [...], custom: [...] }
          if (typeof methodsData === "object" && "global" in methodsData) {
            setGlobalPaymentMethods(methodsData.global || []);
            setCustomPaymentMethods(methodsData.custom || []);
          } else if (Array.isArray(methodsData)) {
            // Legacy format: flat array - separate by isCustom flag
            setGlobalPaymentMethods(methodsData.filter((m: any) => !m.isCustom && !m.userId));
            setCustomPaymentMethods(methodsData.filter((m: any) => m.isCustom || m.userId));
          }
        }
      } catch (err) {
        console.error("Error loading payment methods:", err);
      }
    }
    loadPaymentMethods();
  }, []);

  // Get all payment methods combined
  const allPaymentMethods = [...globalPaymentMethods, ...customPaymentMethods];

  // Function to process offer data
  const processOfferData = (offerData: any) => {
    if (!offerData) {
      return;
    }

    // Parse all JSON fields
    const amountConfig = safeJsonParse(offerData.amountConfig, {});
    const priceConfig = safeJsonParse(offerData.priceConfig, {});
    const tradeSettings = safeJsonParse(offerData.tradeSettings, {});
    const locationSettings = safeJsonParse(offerData.locationSettings, {});
    const userRequirements = safeJsonParse(offerData.userRequirements, {});

    // Extract payment method IDs
    const paymentMethodIds = Array.isArray(offerData.paymentMethods)
      ? offerData.paymentMethods.map((pm: any) => pm.id)
      : [];

    setSelectedPaymentMethods(paymentMethodIds);

    // Set form data
    setFormData({
      type: offerData.type || "BUY",
      currency: offerData.currency || "USDT",
      walletType: offerData.walletType || "SPOT",
      status: offerData.status || "ACTIVE",

      amountConfig: {
        total: Number(amountConfig.total) || 0,
        min: Number(amountConfig.min) || 0,
        max: Number(amountConfig.max) || 0,
      },

      priceConfig: {
        model: ((priceConfig.model || "fixed").toLowerCase() === "market" ? "dynamic" : (priceConfig.model || "fixed").toLowerCase()) as "fixed" | "dynamic",
        value: Number(priceConfig.value) || Number(priceConfig.fixedPrice) || 0,
        marketPrice: Number(priceConfig.marketPrice) || 0,
        finalPrice: Number(priceConfig.finalPrice) || 0,
        margin: Number(priceConfig.margin) || Number(priceConfig.dynamicOffset) || 0,
      },

      tradeSettings: {
        autoCancel: Number(tradeSettings.autoCancel) || 15,
        kycRequired: Boolean(tradeSettings.kycRequired),
        visibility: tradeSettings.visibility || "PUBLIC",
        termsOfTrade: String(tradeSettings.termsOfTrade || ""),
        additionalNotes: String(tradeSettings.additionalNotes || ""),
        autoReplyMessage: String(tradeSettings.autoReplyMessage || ""),
      },

      locationSettings: {
        country: String(locationSettings.country || ""),
        region: String(locationSettings.region || ""),
        city: String(locationSettings.city || ""),
        restrictions: Array.isArray(locationSettings.restrictions)
          ? locationSettings.restrictions
          : [],
      },

      userRequirements: {
        minCompletedTrades: Number(userRequirements.minCompletedTrades) || 0,
        minSuccessRate: Number(userRequirements.minSuccessRate) || 0,
        minAccountAge: Number(userRequirements.minAccountAge) || 0,
        trustedOnly: Boolean(userRequirements.trustedOnly),
        verifiedOnly: Boolean(userRequirements.verifiedOnly),
      },

      paymentMethodIds: paymentMethodIds,
      adminNotes: offerData.adminNotes || "",
    });
  };

  // Load offer data on mount
  useEffect(() => {
    loadOfferData();
  }, [id]);

  const loadOfferData = async () => {
    setLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/p2p/offer/${id}`,
        method: "GET",
        silent: true,
      });

      if (error) {
        throw new Error(error);
      }

      if (data) {
        processOfferData(data);
      }
    } catch (err: any) {
      console.error("Error loading offer:", err);
      toast.error(err.message || "Failed to load offer details");
      router.push("/admin/p2p/offer");
    } finally {
      setLoading(false);
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors: typeof validationErrors = {};
    let hasErrors = false;

    // Basic validation
    const basicErrors: string[] = [];
    if (!formData.currency) {
      basicErrors.push("Currency is required");
    }
    if (!formData.type) {
      basicErrors.push("Trade type is required");
    }
    if (!formData.walletType) {
      basicErrors.push("Wallet type is required");
    }
    if (basicErrors.length > 0) {
      errors.basic = basicErrors;
      hasErrors = true;
    }

    // Pricing validation
    const pricingErrors: string[] = [];
    if (formData.amountConfig.total <= 0) {
      pricingErrors.push("Total amount must be greater than 0");
    }
    if (formData.amountConfig.min < 0) {
      pricingErrors.push("Minimum amount cannot be negative");
    }
    if (formData.amountConfig.max < 0) {
      pricingErrors.push("Maximum amount cannot be negative");
    }
    if (formData.amountConfig.min > formData.amountConfig.max && formData.amountConfig.max > 0) {
      pricingErrors.push("Minimum amount cannot be greater than maximum amount");
    }
    if (formData.priceConfig.value <= 0 && formData.priceConfig.model === "fixed") {
      pricingErrors.push("Price must be greater than 0 for fixed pricing");
    }
    if (pricingErrors.length > 0) {
      errors.pricing = pricingErrors;
      hasErrors = true;
    }

    // Payment validation
    const paymentErrors: string[] = [];
    if (selectedPaymentMethods.length === 0) {
      paymentErrors.push("At least one payment method is required");
    }
    if (paymentErrors.length > 0) {
      errors.payment = paymentErrors;
      hasErrors = true;
    }

    // Settings validation
    const settingsErrors: string[] = [];
    if (formData.tradeSettings.autoCancel <= 0) {
      settingsErrors.push("Auto-cancel time must be greater than 0");
    }
    if (settingsErrors.length > 0) {
      errors.settings = settingsErrors;
      hasErrors = true;
    }

    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      // Find first tab with errors
      const tabsWithErrors = Object.keys(validationErrors);
      if (tabsWithErrors.length > 0) {
        setActiveTab(tabsWithErrors[0]);
      }

      toast.error("Please fix the errors before saving");
      return;
    }

    setSaving(true);

    try {
      // Prepare data for API
      const submitData = {
        type: formData.type,
        currency: formData.currency,
        walletType: formData.walletType,
        status: formData.status,
        amountConfig: JSON.stringify(formData.amountConfig),
        priceConfig: JSON.stringify(formData.priceConfig),
        tradeSettings: JSON.stringify(formData.tradeSettings),
        locationSettings: JSON.stringify(formData.locationSettings),
        userRequirements: JSON.stringify(formData.userRequirements),
        paymentMethodIds: selectedPaymentMethods,
        adminNotes: formData.adminNotes,
      };

      await updateOffer(id, submitData);

      toast.success("Offer updated successfully");
      router.push("/admin/p2p/offer");
    } catch (err: any) {
      console.error("Error updating offer:", err);
      toast.error(err?.message || "Failed to update offer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/p2p/offer/${id}`,
        method: "DELETE",
      });

      if (error) {
        throw new Error(error);
      }

      toast.success("Offer deleted successfully");
      router.push("/admin/p2p/offer");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete offer");
    } finally {
      setDeleting(false);
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  // Show loading state - wait for mount to avoid hydration mismatch
  if (!mounted || loading) {
    const AdminOfferEditLoading = require('./loading').default;
    return <AdminOfferEditLoading />;
  }

  return (
    <div className={`container ${PAGE_PADDING} space-y-6`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/p2p/offer")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit P2P Offer</h1>
            <p className="text-sm text-muted-foreground">
              Modify the offer details, pricing, payment methods, and requirements
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Offer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this
                  offer and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Error Summary */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-900 dark:text-orange-200">
            <div className="font-semibold mb-2">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(validationErrors).map(([tab, errors]) => (
                <li key={tab}>
                  <span className="font-medium capitalize">{tab} tab:</span> {errors.length} error{errors.length > 1 ? 's' : ''}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-6">
          <TabsTrigger value="basic" className="relative">
            Basic
            {validationErrors.basic && validationErrors.basic.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pricing" className="relative">
            Pricing
            {validationErrors.pricing && validationErrors.pricing.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment" className="relative">
            Payment
            {validationErrors.payment && validationErrors.payment.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="location" className="relative">
            Location
            {validationErrors.location && validationErrors.location.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requirements" className="relative">
            Requirements
            {validationErrors.requirements && validationErrors.requirements.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="relative">
            Settings
            {validationErrors.settings && validationErrors.settings.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          {validationErrors.basic && validationErrors.basic.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-900 dark:text-orange-200">
                <ul className="list-disc list-inside">
                  {validationErrors.basic.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Core settings for this P2P offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trade Type <span className="text-red-500">*</span></Label>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as "BUY" | "SELL" })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="BUY" id="buy" />
                      <Label htmlFor="buy">Buy</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="SELL" id="sell" />
                      <Label htmlFor="sell">Sell</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                      <SelectItem value="FLAGGED">Flagged</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                    disabled={loadingCurrencies}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCurrencies ? "Loading..." : "Select currency"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.length > 0 ? (
                        availableCurrencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__no_currencies__" disabled>
                          No currencies available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {availableCurrencies.length === 0 && !loadingCurrencies && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      No currencies available for this wallet type
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Wallet Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.walletType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, walletType: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPOT">Spot</SelectItem>
                      <SelectItem value="FIAT">Fiat</SelectItem>
                      <SelectItem value="ECO">Eco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          {validationErrors.pricing && validationErrors.pricing.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-900 dark:text-orange-200">
                <ul className="list-disc list-inside">
                  {validationErrors.pricing.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Pricing & Amount
              </CardTitle>
              <CardDescription>
                Configure pricing model and amount limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pricing Model</Label>
                <RadioGroup
                  value={formData.priceConfig.model}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      priceConfig: { ...formData.priceConfig, model: value as "fixed" | "dynamic" }
                    })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">Fixed Price</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dynamic" id="dynamic" />
                    <Label htmlFor="dynamic">Dynamic (Market-based)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className={`grid gap-4 ${formData.priceConfig.model === "dynamic" ? "grid-cols-2" : "grid-cols-1"}`}>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={formData.priceConfig.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceConfig: {
                          ...formData.priceConfig,
                          value: parseFloat(e.target.value) || 0
                        }
                      })
                    }
                  />
                </div>

                {formData.priceConfig.model === "dynamic" && (
                  <div className="space-y-2">
                    <Label>Margin (%)</Label>
                    <Input
                      type="number"
                      value={formData.priceConfig.margin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priceConfig: {
                            ...formData.priceConfig,
                            margin: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage above/below market price
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Amount Limits</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Total Available <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      value={formData.amountConfig.total}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amountConfig: {
                            ...formData.amountConfig,
                            total: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Minimum Order</Label>
                    <Input
                      type="number"
                      value={formData.amountConfig.min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amountConfig: {
                            ...formData.amountConfig,
                            min: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Order</Label>
                    <Input
                      type="number"
                      value={formData.amountConfig.max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amountConfig: {
                            ...formData.amountConfig,
                            max: parseFloat(e.target.value) || 0
                          }
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-6">
          {validationErrors.payment && validationErrors.payment.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-900 dark:text-orange-200">
                <ul className="list-disc list-inside">
                  {validationErrors.payment.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t("payment_methods")} <span className="text-red-500">*</span>
              </CardTitle>
              <CardDescription>
                {t("select_the_payment_methods")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Global Payment Methods */}
              {globalPaymentMethods.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{t("global")} {t("payment_methods")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {globalPaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPaymentMethods.includes(method.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => togglePaymentMethod(method.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {method?.name?.charAt?.(0) || "?"}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {method?.name || "Unknown"}
                            </p>
                            {method?.processingTime && (
                              <p className="text-xs text-muted-foreground">
                                {method.processingTime}
                              </p>
                            )}
                          </div>
                          {selectedPaymentMethods.includes(method.id) && (
                            <div className="shrink-0">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs text-primary-foreground">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                        {method.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {method.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Payment Methods */}
              {customPaymentMethods.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{t("your_custom_payment_methods")}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customPaymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPaymentMethods.includes(method.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => togglePaymentMethod(method.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="shrink-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {method?.name?.charAt?.(0) || "?"}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">
                                {method?.name || "Unknown"}
                              </p>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {t("custom")}
                              </Badge>
                            </div>
                            {method?.processingTime && (
                              <p className="text-xs text-muted-foreground">
                                {method.processingTime}
                              </p>
                            )}
                          </div>
                          {selectedPaymentMethods.includes(method.id) && (
                            <div className="shrink-0">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <span className="text-xs text-primary-foreground">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                        {method.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {method.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allPaymentMethods.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {tCommon('no_payment_methods')}
                  </p>
                </div>
              )}

              {selectedPaymentMethods.length === 0 && allPaymentMethods.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t("please_select_at_least_one_payment_method")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                <p>{tCommon("selected")}: {selectedPaymentMethods.length} {t("payment_methods")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("location_settings")}
              </CardTitle>
              <CardDescription>
                Configure geographic settings for this offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>{tCommon("country")}</Label>
                  <CountrySelect
                    value={formData.locationSettings.country}
                    onValueChange={(value) => {
                      // When country changes, reset region and city
                      setFormData({
                        ...formData,
                        locationSettings: {
                          ...formData.locationSettings,
                          country: value,
                          region: "",
                          city: "",
                        }
                      });
                    }}
                    placeholder={tCommon("select_country")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("region_state")}</Label>
                  <StateSelect
                    value={formData.locationSettings.region}
                    onValueChange={(value) => {
                      // When region changes, reset city
                      setFormData({
                        ...formData,
                        locationSettings: {
                          ...formData.locationSettings,
                          region: value,
                          city: "",
                        }
                      });
                    }}
                    countryCode={formData.locationSettings.country}
                    placeholder={tCommon("select_state")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{tCommon("city")}</Label>
                  <CitySelect
                    value={formData.locationSettings.city}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        locationSettings: {
                          ...formData.locationSettings,
                          city: value
                        }
                      })
                    }
                    countryCode={formData.locationSettings.country}
                    stateName={formData.locationSettings.region}
                    placeholder={tCommon("select_city")}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>{t("restricted_countries")} ({tExtAdmin("admin_only")})</Label>
                <Textarea
                  value={formData.locationSettings.restrictions.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationSettings: {
                        ...formData.locationSettings,
                        restrictions: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                      }
                    })
                  }
                  placeholder="Enter country codes separated by commas (e.g., US, CN, RU)"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Users from these countries will not be able to trade with this offer
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                User Requirements
              </CardTitle>
              <CardDescription>
                Set minimum requirements for users who can trade with this offer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Completed Trades</Label>
                  <Input
                    type="number"
                    value={formData.userRequirements.minCompletedTrades}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userRequirements: {
                          ...formData.userRequirements,
                          minCompletedTrades: parseInt(e.target.value) || 0
                        }
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minimum Success Rate (%)</Label>
                  <Input
                    type="number"
                    value={formData.userRequirements.minSuccessRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userRequirements: {
                          ...formData.userRequirements,
                          minSuccessRate: parseInt(e.target.value) || 0
                        }
                      })
                    }
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Account Age (days)</Label>
                <Input
                  type="number"
                  value={formData.userRequirements.minAccountAge}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      userRequirements: {
                        ...formData.userRequirements,
                        minAccountAge: parseInt(e.target.value) || 0
                      }
                    })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Trusted Users Only</Label>
                    <p className="text-xs text-muted-foreground">
                      Only users marked as trusted can trade
                    </p>
                  </div>
                  <Switch
                    checked={formData.userRequirements.trustedOnly}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        userRequirements: {
                          ...formData.userRequirements,
                          trustedOnly: checked
                        }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Verified Users Only</Label>
                    <p className="text-xs text-muted-foreground">
                      Only KYC verified users can trade
                    </p>
                  </div>
                  <Switch
                    checked={formData.userRequirements.verifiedOnly}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        userRequirements: {
                          ...formData.userRequirements,
                          verifiedOnly: checked
                        }
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {validationErrors.settings && validationErrors.settings.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-900 dark:text-orange-200">
                <ul className="list-disc list-inside">
                  {validationErrors.settings.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Trade Settings
              </CardTitle>
              <CardDescription>
                Configure trade behavior and messaging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Auto-Cancel Time (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.tradeSettings.autoCancel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tradeSettings: {
                          ...formData.tradeSettings,
                          autoCancel: parseInt(e.target.value) || 15
                        }
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Unpaid orders will be cancelled after this time
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <RadioGroup
                    value={formData.tradeSettings.visibility}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        tradeSettings: {
                          ...formData.tradeSettings,
                          visibility: value as any
                        }
                      })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PUBLIC" id="public" />
                      <Label htmlFor="public">Public</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PRIVATE" id="private" />
                      <Label htmlFor="private">Private</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>KYC Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Users must complete KYC to trade
                  </p>
                </div>
                <Switch
                  checked={formData.tradeSettings.kycRequired}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      tradeSettings: {
                        ...formData.tradeSettings,
                        kycRequired: checked
                      }
                    })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Terms of Trade</Label>
                  <Textarea
                    value={formData.tradeSettings.termsOfTrade}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tradeSettings: {
                          ...formData.tradeSettings,
                          termsOfTrade: e.target.value
                        }
                      })
                    }
                    placeholder="Enter your trading terms and conditions"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Auto-Reply Message</Label>
                  <Textarea
                    value={formData.tradeSettings.autoReplyMessage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tradeSettings: {
                          ...formData.tradeSettings,
                          autoReplyMessage: e.target.value
                        }
                      })
                    }
                    placeholder="Message sent automatically when trade starts"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.tradeSettings.additionalNotes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tradeSettings: {
                          ...formData.tradeSettings,
                          additionalNotes: e.target.value
                        }
                      })
                    }
                    placeholder="Any additional information for traders"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Admin Notes (Internal)</Label>
                <Textarea
                  value={formData.adminNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, adminNotes: e.target.value })
                  }
                  placeholder="Internal notes about this offer (not visible to users)"
                  rows={3}
                  className="bg-yellow-50 dark:bg-yellow-950/20"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
