"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, AlertTriangle, Info, Pencil, Plus, Trash2, Lock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Link } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";
import { HeroSection } from "@/components/ui/hero-section";

// Helper function to parse JSON safely - handles both objects and JSON strings
const safeJsonParse = (value: any, defaultValue = {}) => {
  // If value is null/undefined, return default
  if (value == null) return defaultValue;

  // If value is already an object, return it directly
  if (typeof value === "object") return value;

  // If value is a string, try to parse it as JSON
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return defaultValue;
    }
  }

  return defaultValue;
};

export default function EditOfferClient() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const params = useParams();
  const offerId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { fetchOfferById } = useP2PStore();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalPaymentMethods, setGlobalPaymentMethods] = useState<any[]>([]);
  const [customPaymentMethods, setCustomPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Edit payment method dialog state
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    processingTime: "",
    metadata: {} as Record<string, string>,
  });
  const [savingMethod, setSavingMethod] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  // Delete payment method state
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  // Ensure consistent hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    priceConfig: {
      model: "fixed" as "fixed" | "dynamic",
      fixedPrice: 0,
      dynamicOffset: 0,
      currency: "USD",
    },
    amountConfig: {
      min: 0,
      max: 0,
      total: 0,
    },
    tradeSettings: {
      autoCancel: 15,
      kycRequired: false,
      visibility: "PUBLIC" as "PUBLIC" | "PRIVATE",
      termsOfTrade: "",
      additionalNotes: "",
    },
    locationSettings: {
      country: "",
      region: "",
      city: "",
      restrictions: [] as string[],
    },
    userRequirements: {
      minCompletedTrades: 0,
      minSuccessRate: 0,
      minAccountAge: 0,
      trustedOnly: false,
    },
    status: "ACTIVE" as "ACTIVE" | "PAUSED",
    paymentMethodIds: [] as string[],
  });

  // Load payment methods
  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const { data, error } = await $fetch({
          url: "/api/p2p/payment-method",
          method: "GET",
          silentSuccess: true
        });

        if (!error && data) {
          // Handle new API response format: { global: [...], custom: [...] }
          if (typeof data === "object" && "global" in data) {
            setGlobalPaymentMethods(data.global || []);
            setCustomPaymentMethods(data.custom || []);
          } else if (Array.isArray(data)) {
            // Legacy format: flat array - separate by isCustom flag
            setGlobalPaymentMethods(data.filter((m: any) => !m.isCustom && !m.userId));
            setCustomPaymentMethods(data.filter((m: any) => m.isCustom || m.userId));
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

  // Toggle method expansion to view details
  const toggleMethodExpansion = (methodId: string) => {
    setExpandedMethod(expandedMethod === methodId ? null : methodId);
  };

  // Parse metadata safely
  const parseMetadata = (metadata: any): Record<string, string> | null => {
    if (!metadata) return null;
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return null;
      }
    }
    if (typeof metadata === "object" && !Array.isArray(metadata)) {
      return metadata;
    }
    return null;
  };

  // Open edit dialog for a payment method
  const openEditDialog = (method: any) => {
    const metadata = parseMetadata(method.metadata) || {};
    setEditingMethod(method);
    setEditFormData({
      name: method.name || "",
      description: method.description || "",
      instructions: method.instructions || "",
      processingTime: method.processingTime || "",
      metadata: { ...metadata },
    });
    setNewFieldKey("");
    setNewFieldValue("");
    setEditDialogOpen(true);
  };

  // Add a new metadata field
  const addMetadataField = () => {
    if (!newFieldKey.trim() || !newFieldValue.trim()) return;
    setEditFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [newFieldKey.trim()]: newFieldValue.trim(),
      },
    }));
    setNewFieldKey("");
    setNewFieldValue("");
  };

  // Remove a metadata field
  const removeMetadataField = (key: string) => {
    setEditFormData((prev) => {
      const newMetadata = { ...prev.metadata };
      delete newMetadata[key];
      return { ...prev, metadata: newMetadata };
    });
  };

  // Update a metadata field value
  const updateMetadataField = (key: string, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value,
      },
    }));
  };

  // Save payment method changes
  const savePaymentMethod = async () => {
    if (!editingMethod) return;

    setSavingMethod(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/p2p/payment-method/${editingMethod.id}`,
        method: "PUT",
        body: {
          name: editFormData.name,
          description: editFormData.description,
          instructions: editFormData.instructions,
          processingTime: editFormData.processingTime,
          metadata: Object.keys(editFormData.metadata).length > 0 ? editFormData.metadata : null,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }

      // Update the local state with the new data
      setCustomPaymentMethods((prev) =>
        prev.map((m) =>
          m.id === editingMethod.id
            ? {
                ...m,
                name: editFormData.name,
                description: editFormData.description,
                instructions: editFormData.instructions,
                processingTime: editFormData.processingTime,
                metadata: editFormData.metadata,
              }
            : m
        )
      );

      toast({
        title: tExt("success"),
        description: t("payment_method_updated_successfully"),
      });

      setEditDialogOpen(false);
      setEditingMethod(null);
    } catch (err) {
      console.error("Error saving payment method:", err);
      toast({
        title: "Error",
        description: t("failed_to_save_payment_method"),
        variant: "destructive",
      });
    } finally {
      setSavingMethod(false);
    }
  };

  // Delete payment method
  const deletePaymentMethod = async (methodId: string) => {
    setDeletingMethodId(methodId);
    try {
      const { error } = await $fetch({
        url: `/api/p2p/payment-method/${methodId}`,
        method: "DELETE",
      });

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }

      // Remove from selected methods if it was selected
      setSelectedPaymentMethods((prev) => prev.filter((id) => id !== methodId));

      // Remove from custom methods list
      setCustomPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));

      toast({
        title: tExt("success"),
        description: t("payment_method_deleted_successfully"),
      });
    } catch (err) {
      console.error("Error deleting payment method:", err);
      toast({
        title: "Error",
        description: t("failed_to_delete_payment_method"),
        variant: "destructive",
      });
    } finally {
      setDeletingMethodId(null);
    }
  };

  // Load offer data
  useEffect(() => {
    async function loadOffer() {
      if (!offerId) return;

      setLoading(true);
      try {
        const offerData = await fetchOfferById(offerId);
        
        if (!offerData) {
          setError("Offer not found");
          return;
        }

        setOffer(offerData);

        // Parse and set form data with safe defaults
        const priceConfig = safeJsonParse(offerData.priceConfig, {});
        const amountConfig = safeJsonParse(offerData.amountConfig, {});
        const tradeSettings = safeJsonParse(offerData.tradeSettings, {});
        const locationSettings = safeJsonParse(offerData.locationSettings, {});
        const userRequirements = safeJsonParse(offerData.userRequirements, {});

        // Extract payment method IDs safely
        const paymentMethodIds = Array.isArray(offerData.paymentMethods)
          ? offerData.paymentMethods.map((pm: any) => pm.id)
          : [];

        setSelectedPaymentMethods(paymentMethodIds);

        setFormData({
          priceConfig: {
            model: ((priceConfig?.model || "fixed").toLowerCase()) as "fixed" | "dynamic",
            fixedPrice: Number(priceConfig?.fixedPrice || priceConfig?.value || 0),
            dynamicOffset: Number(priceConfig?.dynamicOffset || 0),
            currency: String(offerData?.priceCurrency || priceConfig?.currency || "USD"),
          },
          amountConfig: {
            min: Number(amountConfig?.min || 0),
            max: Number(amountConfig?.max || 0),
            total: Number(amountConfig?.total || 0),
          },
          tradeSettings: {
            autoCancel: Number(tradeSettings?.autoCancel) || 15,
            kycRequired: Boolean(tradeSettings?.kycRequired),
            visibility: (tradeSettings?.visibility || "PUBLIC") as "PUBLIC" | "PRIVATE",
            termsOfTrade: String(tradeSettings?.termsOfTrade || ""),
            additionalNotes: String(tradeSettings?.additionalNotes || ""),
          },
          locationSettings: {
            country: String(locationSettings?.country || ""),
            region: String(locationSettings?.region || ""),
            city: String(locationSettings?.city || ""),
            restrictions: Array.isArray(locationSettings?.restrictions) ? locationSettings.restrictions : [],
          },
          userRequirements: {
            minCompletedTrades: Number(userRequirements?.minCompletedTrades) || 0,
            minSuccessRate: Number(userRequirements?.minSuccessRate) || 0,
            minAccountAge: Number(userRequirements?.minAccountAge) || 0,
            trustedOnly: Boolean(userRequirements?.trustedOnly),
          },
          status: (offerData?.status === "PAUSED" ? "PAUSED" : "ACTIVE") as "ACTIVE" | "PAUSED",
          paymentMethodIds: paymentMethodIds,
        });
      } catch (err) {
        console.error("Error loading offer:", err);
        setError("Failed to load offer details");
      } finally {
        setLoading(false);
      }
    }

    loadOffer();
  }, [offerId, fetchOfferById]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate payment methods
    if (selectedPaymentMethods.length === 0) {
      toast({
        title: t("validation_error"),
        description: tExt("please_select_at_least_one_payment_method"),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Prepare the form data with proper structure
      const submitData = {
        ...formData,
        paymentMethodIds: selectedPaymentMethods,
      };

      const { data, error } = await $fetch({
        url: `/api/p2p/offer/${offerId}`,
        method: "PUT",
        body: submitData,
        successMessage: t("offer_updated_successfully_and_is_pending_approval"),
      });

      if (!error) {
        toast({
          title: tExt("success"),
          description: t("offer_updated_successfully_and_is_pending_approval"),
        });
        router.push(`/p2p/offer/${offerId}`);
      }
    } catch (err: any) {
      console.error("Error updating offer:", err);
      toast({
        title: 'Error',
        description: err?.message || t("failed_to_update_offer"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update form data
  const updateFormData = (section: string, field: string, value: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  };

  // Handle payment method selection
  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods(prev => {
      const newSelection = prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId];
      
      // Update form data
      setFormData(prevForm => ({
        ...prevForm,
        paymentMethodIds: newSelection,
      }));
      
      return newSelection;
    });
  };

  // Show loading state - wait for mount to avoid hydration mismatch
  if (!mounted || loading) {
    const EditOfferLoading = require('./loading').default;
    return <EditOfferLoading />;
  }

  if (error || !offer) {
    const { EditOfferErrorState } = require('./error-state');
    return <EditOfferErrorState error={error} offerId={offerId} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Pencil className="h-3.5 w-3.5" />,
          text: "Edit Offer",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[
          { text: tCommon("edit_offer") + " - " },
          { text: `${offer?.type === 'BUY' ? tCommon("buy") : tCommon("sell")} ${offer?.currency}`, gradient: `from-blue-600 via-violet-500 to-blue-600` },
        ]}
        description={t("update_your_offer_settings_and_requirements")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="split"
        rightContent={
          <div className="lg:mt-8">
            <Link href={`/p2p/offer/${offerId}`}>
              <Button variant="outline" className="rounded-xl w-full sm:w-auto border-zinc-300 dark:border-zinc-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back_to_offer")}
              </Button>
            </Link>
          </div>
        }
        background={{
          orbs: [
            { color: "#3b82f6", position: { top: "-10rem", right: "-10rem" }, size: "20rem" },
            { color: "#8b5cf6", position: { bottom: "-5rem", left: "-5rem" }, size: "15rem" },
          ],
        }}
        particles={{ count: 6, type: "floating", colors: ["#3b82f6", "#8b5cf6"], size: 8 }}
      />

      <main className="container mx-auto py-12 space-y-6">
      {/* Info Notice */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{tCommon("note")}</strong>{" "}
          {t("changes_to_price_and_amount_settings")}.
        </AlertDescription>
      </Alert>

      {/* Offer Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{tExt("offer_information")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <label className="font-medium">{tCommon("type")}</label>
              <p className="text-muted-foreground">{offer?.type || "N/A"}</p>
            </div>
            <div>
              <label className="font-medium">{tCommon("currency")}</label>
              <p className="text-muted-foreground">{offer?.currency || "N/A"}</p>
            </div>
            <div>
              <label className="font-medium">{tCommon("wallet")}</label>
              <p className="text-muted-foreground">{offer?.walletType || "N/A"}</p>
            </div>
            <div>
              <label className="font-medium">{tCommon("status")}</label>
              <p className="text-muted-foreground">{offer?.status || "N/A"}</p>
            </div>
          </div>
          
          {offer?.paymentMethods && Array.isArray(offer.paymentMethods) && offer.paymentMethods.length > 0 && (
            <div className="border-t pt-4">
              <label className="font-medium text-sm">{t("current_payment_methods")}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {offer.paymentMethods.map((method: any) => (
                  <Badge key={method?.id || Math.random()} variant="outline">
                    {method?.name || "Unknown Method"}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="price-amount" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="price-amount">{t("price_amount")}</TabsTrigger>
            <TabsTrigger value="trade-settings">{tCommon("trade_settings")}</TabsTrigger>
            <TabsTrigger value="payment-methods">{tExt("payment_methods")}</TabsTrigger>
            <TabsTrigger value="location">{tCommon("location")}</TabsTrigger>
            <TabsTrigger value="requirements">{tExt("requirements")}</TabsTrigger>
            <TabsTrigger value="status">{tCommon("status")}</TabsTrigger>
          </TabsList>

          {/* Price & Amount Settings */}
          <TabsContent value="price-amount">
            <Card>
              <CardHeader>
                <CardTitle>{t("price_amount_settings")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("update_pricing_model_and_trading_limits")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Model */}
                <div className="space-y-4">
                  <Label>{t("pricing_model")}</Label>
                  <RadioGroup
                    value={formData?.priceConfig?.model || "fixed"}
                    onValueChange={(value) => updateFormData("priceConfig", "model", value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed">{tExt("fixed_price")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dynamic" id="dynamic" />
                      <Label htmlFor="dynamic">{`${t("dynamic_price_market_based")} (Market Based)`}</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Fixed Price */}
                {formData?.priceConfig?.model === "fixed" && (
                  <div className="space-y-2">
                    <Label htmlFor="fixedPrice">
                      {tExt("fixed_price")} ({formData?.priceConfig?.currency || "USD"})
                    </Label>
                    <Input
                      id="fixedPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData?.priceConfig?.fixedPrice || 0}
                      onChange={(e) => updateFormData("priceConfig", "fixedPrice", parseFloat(e.target.value) || 0)}
                      placeholder={t("enter_your_fixed_price")}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("the_price_per_unit_of")} {offer?.currency}
                    </p>
                  </div>
                )}

                {/* Dynamic Offset */}
                {formData?.priceConfig?.model === "dynamic" && (
                  <div className="space-y-2">
                    <Label htmlFor="dynamicOffset">{`${t("market_price_offset")} (%)`}</Label>
                    <Input
                      id="dynamicOffset"
                      type="number"
                      min="-50"
                      max="50"
                      step="0.1"
                      value={formData?.priceConfig?.dynamicOffset || 0}
                      onChange={(e) => updateFormData("priceConfig", "dynamicOffset", parseFloat(e.target.value) || 0)}
                      placeholder={t("dynamic_offset_example")}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("dynamic_offset_hint")}
                    </p>
                  </div>
                )}

                {/* Amount Limits */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-lg font-medium">{t("trading_limits")}</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minAmount">
                        {tCommon("minimum_amount")} ({formData?.priceConfig?.currency || "USD"})
                      </Label>
                      <Input
                        id="minAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData?.amountConfig?.min || 0}
                        onChange={(e) => updateFormData("amountConfig", "min", parseFloat(e.target.value) || 0)}
                        placeholder={t("min_trade_amount")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxAmount">
                        {tCommon("maximum_amount")} ({formData?.priceConfig?.currency || "USD"})
                      </Label>
                      <Input
                        id="maxAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData?.amountConfig?.max || 0}
                        onChange={(e) => updateFormData("amountConfig", "max", parseFloat(e.target.value) || 0)}
                        placeholder={t("max_trade_amount")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">
                        {t("total_available")} ({offer?.currency})
                      </Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        min="0"
                        step="0.00000001"
                        value={formData?.amountConfig?.total || 0}
                        onChange={(e) => updateFormData("amountConfig", "total", parseFloat(e.target.value) || 0)}
                        placeholder={t("total_amount_available")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trade Settings */}
          <TabsContent value="trade-settings">
            <Card>
              <CardHeader>
                <CardTitle>{tCommon("trade_settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="autoCancel">{t("auto_cancel_time_minutes")}</Label>
                    <Input
                      id="autoCancel"
                      type="number"
                      min="5"
                      max="1440"
                      value={formData?.tradeSettings?.autoCancel || 15}
                      onChange={(e) => updateFormData("tradeSettings", "autoCancel", parseInt(e.target.value) || 15)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("time_limit_for_payment_5_1440_minutes")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("visibility")}</Label>
                    <RadioGroup
                      value={formData?.tradeSettings?.visibility || "PUBLIC"}
                      onValueChange={(value) => updateFormData("tradeSettings", "visibility", value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PUBLIC" id="public" />
                        <Label htmlFor="public">{tCommon("public")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PRIVATE" id="private" />
                        <Label htmlFor="private">{tCommon("private")}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="kycRequired"
                    checked={formData?.tradeSettings?.kycRequired || false}
                    onCheckedChange={(checked) => updateFormData("tradeSettings", "kycRequired", checked)}
                  />
                  <Label htmlFor="kycRequired">{tExt("require_kyc_verification")}</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termsOfTrade">{t("terms_of_trade")}</Label>
                  <Textarea
                    id="termsOfTrade"
                    placeholder={t("enter_your_terms_and_conditions_for_this_trade")}
                    value={formData?.tradeSettings?.termsOfTrade || ""}
                    onChange={(e) => updateFormData("tradeSettings", "termsOfTrade", e.target.value)}
                    maxLength={1000}
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    {(formData?.tradeSettings?.termsOfTrade?.length || 0)}/1000 {tCommon("characters")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">{t("additional_notes")}</Label>
                  <Textarea
                    id="additionalNotes"
                    placeholder={t("any_additional_information_for_traders")}
                    value={formData?.tradeSettings?.additionalNotes || ""}
                    onChange={(e) => updateFormData("tradeSettings", "additionalNotes", e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-sm text-muted-foreground">
                    {(formData?.tradeSettings?.additionalNotes?.length || 0)}/500 {tCommon("characters")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment-methods">
            <Card>
              <CardHeader>
                <CardTitle>{tExt("payment_methods")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {tExt("select_the_payment_methods")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Global Payment Methods */}
                {globalPaymentMethods.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{tExt("global")} {tExt("payment_methods")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {globalPaymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedPaymentMethods.includes(method.id)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => handlePaymentMethodToggle(method.id)}
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
                    <h3 className="text-sm font-medium text-muted-foreground">{tExt("your_custom_payment_methods")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customPaymentMethods.map((method) => {
                        const isSelected = selectedPaymentMethods.includes(method.id);
                        const isExpanded = expandedMethod === method.id;
                        const metadata = parseMetadata(method.metadata);
                        const canEdit = method.canEdit !== false;
                        const canDelete = method.canDelete !== false;
                        const hasActiveTrade = method.hasActiveTrade === true;
                        const hasActiveOffer = method.hasActiveOffer === true;

                        return (
                          <div
                            key={method.id}
                            className={`border rounded-lg transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div
                              className="p-4 cursor-pointer"
                              onClick={() => handlePaymentMethodToggle(method.id)}
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
                                      {tExt("custom")}
                                    </Badge>
                                    {hasActiveTrade && (
                                      <Badge variant="secondary" className="text-xs shrink-0 gap-1">
                                        <Lock className="h-3 w-3" />
                                        {t("in_trade")}
                                      </Badge>
                                    )}
                                    {hasActiveOffer && !hasActiveTrade && (
                                      <Badge variant="outline" className="text-xs shrink-0 gap-1 border-amber-500 text-amber-600">
                                        {t("in_offer")}
                                      </Badge>
                                    )}
                                    {canDelete && (
                                      <Badge variant="outline" className="text-xs shrink-0 gap-1 border-green-500 text-green-600">
                                        {t("can_delete")}
                                      </Badge>
                                    )}
                                  </div>
                                  {method?.processingTime && (
                                    <p className="text-xs text-muted-foreground">
                                      {method.processingTime}
                                    </p>
                                  )}
                                </div>
                                {isSelected && (
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

                            {/* Action buttons */}
                            <div className="flex border-t">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMethodExpansion(method.id);
                                }}
                                className="flex-1 py-2 text-xs text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1"
                              >
                                {isExpanded ? t("hide_details") : tCommon("view_details")}
                                <span className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canEdit) {
                                    openEditDialog(method);
                                  }
                                }}
                                disabled={!canEdit}
                                className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 border-l ${
                                  canEdit
                                    ? "text-primary hover:bg-primary/10"
                                    : "text-muted-foreground cursor-not-allowed"
                                }`}
                                title={!canEdit ? t("cannot_edit_active_trade") : tCommon("edit_payment_method")}
                              >
                                <Pencil className="h-3 w-3" />
                                {tCommon("edit")}
                              </button>
                              {canDelete && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={deletingMethodId === method.id}
                                      className="flex-1 py-2 text-xs flex items-center justify-center gap-1 border-l text-destructive hover:bg-destructive/10"
                                    >
                                      {deletingMethodId === method.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                      {tCommon("delete")}
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t("delete_payment_method")}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t("are_you_sure_delete_payment_method")} <strong>{method.name}</strong>? {tCommon("this_action_cannot_be_undone")}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deletePaymentMethod(method.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        {tCommon("delete")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4 space-y-3 border-t bg-muted/30">
                                {/* Payment Details (Metadata) */}
                                {metadata && Object.keys(metadata).length > 0 && (
                                  <div className="pt-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{tCommon("payment_details")}</p>
                                    <div className="space-y-1.5">
                                      {Object.entries(metadata).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm bg-background rounded px-2 py-1">
                                          <span className="text-muted-foreground">{key}</span>
                                          <span className="font-medium">{value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Instructions */}
                                {method.instructions && (
                                  <div className="pt-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{tCommon("instructions")}</p>
                                    <p className="text-sm text-foreground bg-background rounded p-2 whitespace-pre-wrap">
                                      {method.instructions}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {allPaymentMethods.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {tCommon("no_payment_methods")}
                    </p>
                  </div>
                )}

                {selectedPaymentMethods.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {tExt("please_select_at_least_one_payment_method")}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-muted-foreground">
                  <p>{tCommon("selected")}: {selectedPaymentMethods.length} {tExt("payment_methods")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Settings */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>{tExt("location_settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>{tCommon("country")}</Label>
                    <CountrySelect
                      value={formData?.locationSettings?.country || ""}
                      onValueChange={(value) => {
                        // When country changes, reset region and city
                        setFormData(prev => ({
                          ...prev,
                          locationSettings: {
                            ...prev.locationSettings,
                            country: value,
                            region: "",
                            city: "",
                          }
                        }));
                      }}
                      placeholder={tCommon("select_country")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{tExt("region_state")}</Label>
                    <StateSelect
                      value={formData?.locationSettings?.region || ""}
                      onValueChange={(value) => {
                        // When region changes, reset city
                        setFormData(prev => ({
                          ...prev,
                          locationSettings: {
                            ...prev.locationSettings,
                            region: value,
                            city: "",
                          }
                        }));
                      }}
                      countryCode={formData?.locationSettings?.country || ""}
                      placeholder={tCommon("select_state")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{tCommon("city")}</Label>
                    <CitySelect
                      value={formData?.locationSettings?.city || ""}
                      onValueChange={(value) => updateFormData("locationSettings", "city", value)}
                      countryCode={formData?.locationSettings?.country || ""}
                      stateName={formData?.locationSettings?.region || ""}
                      placeholder={tCommon("select_city")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Requirements */}
          <TabsContent value="requirements">
            <Card>
              <CardHeader>
                <CardTitle>{t("user_requirements")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minCompletedTrades">{t("minimum_completed_trades")}</Label>
                    <Input
                      id="minCompletedTrades"
                      type="number"
                      min="0"
                      max="1000"
                      value={formData?.userRequirements?.minCompletedTrades || 0}
                      onChange={(e) => updateFormData("userRequirements", "minCompletedTrades", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minSuccessRate">{`${t("minimum_success_rate")} (%)`}</Label>
                    <Input
                      id="minSuccessRate"
                      type="number"
                      min="0"
                      max="100"
                      value={formData?.userRequirements?.minSuccessRate || 0}
                      onChange={(e) => updateFormData("userRequirements", "minSuccessRate", parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minAccountAge">{`${tCommon("minimum_account_age_days")} (days)`}</Label>
                    <Input
                      id="minAccountAge"
                      type="number"
                      min="0"
                      max="365"
                      value={formData?.userRequirements?.minAccountAge || 0}
                      onChange={(e) => updateFormData("userRequirements", "minAccountAge", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="trustedOnly"
                    checked={formData?.userRequirements?.trustedOnly || false}
                    onCheckedChange={(checked) => updateFormData("userRequirements", "trustedOnly", checked)}
                  />
                  <Label htmlFor="trustedOnly">{t("trusted_users_only")}</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle>{t("offer_status")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>{tExt("current_status")}</Label>
                  <RadioGroup
                    value={formData?.status || "ACTIVE"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "ACTIVE" | "PAUSED" }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ACTIVE" id="active" />
                      <Label htmlFor="active">{tCommon("active")}</Label>
                      <span className="text-sm text-muted-foreground">
                        - {t("offer_is_visible_and_available_for_trading")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAUSED" id="paused" />
                      <Label htmlFor="paused">{tCommon("paused")}</Label>
                      <span className="text-sm text-muted-foreground">
                        - {t("offer_is_hidden_and_not_available_for_trading")}
                      </span>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 mt-8">
          <Link href={`/p2p/offer/${offerId}`}>
            <Button type="button" variant="outline">
              {tCommon("cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {tCommon("saving")}...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {tCommon("save_changes")}
              </>
            )}
          </Button>
        </div>
      </form>
      </main>

      {/* Edit Payment Method Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent size="3xl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tCommon("edit_payment_method")}</DialogTitle>
            <DialogDescription>
              {t("update_your_payment_method_details")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">{tCommon("name")}</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("payment_method_name")}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">{tCommon("description")}</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("optional_description")}
                maxLength={500}
                rows={2}
              />
            </div>

            {/* Processing Time */}
            <div className="space-y-2">
              <Label htmlFor="edit-processingTime">{tCommon("processing_time")}</Label>
              <Input
                id="edit-processingTime"
                value={editFormData.processingTime}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, processingTime: e.target.value }))}
                placeholder={t("e_g_instant_1_3_days")}
                maxLength={100}
              />
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor="edit-instructions">{tCommon("instructions")}</Label>
              <Textarea
                id="edit-instructions"
                value={editFormData.instructions}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder={t("payment_instructions_for_buyer")}
                maxLength={1000}
                rows={3}
              />
            </div>

            {/* Payment Details (Metadata) */}
            <div className="space-y-3">
              <Label>{tCommon("payment_details")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("add_custom_fields_like_account_number_email_etc")}
              </p>

              {/* Existing Fields */}
              {Object.entries(editFormData.metadata).length > 0 && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  {Object.entries(editFormData.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{tCommon("field_name")}</Label>
                          <Input
                            value={key}
                            disabled
                            className="h-9 bg-muted"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("field_value")}</Label>
                          <Input
                            value={value}
                            onChange={(e) => updateMetadataField(key, e.target.value)}
                            className="h-9"
                            maxLength={500}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive hover:text-destructive mt-6"
                        onClick={() => removeMetadataField(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Field */}
              <div className="flex gap-2">
                <Input
                  placeholder={tCommon("field_name")}
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  className="flex-1"
                  maxLength={100}
                />
                <Input
                  placeholder={t("field_value")}
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  className="flex-1"
                  maxLength={500}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addMetadataField}
                  disabled={!newFieldKey.trim() || !newFieldValue.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={savingMethod}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={savePaymentMethod}
              disabled={savingMethod || !editFormData.name.trim()}
            >
              {savingMethod ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {tCommon("saving")}...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {tCommon("save_changes")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 