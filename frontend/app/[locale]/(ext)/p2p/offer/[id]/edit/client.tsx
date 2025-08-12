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
import { ArrowLeft, Save, AlertTriangle, Info } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

// Helper function to parse JSON safely
const safeJsonParse = (jsonString, defaultValue = {}) => {
  try {
    return jsonString ? JSON.parse(jsonString) : defaultValue;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return defaultValue;
  }
};

export default function EditOfferClient() {
  const t = useTranslations("ext");
  const params = useParams();
  const offerId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { fetchOfferById } = useP2PStore();

  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
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
        });

        if (!error && data) {
          setPaymentMethods(data);
        }
      } catch (err) {
        console.error("Error loading payment methods:", err);
      }
    }

    loadPaymentMethods();
  }, []);

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
        const tradeSettings = safeJsonParse(offerData.tradeSettings, {});
        const locationSettings = safeJsonParse(offerData.locationSettings, {});
        const userRequirements = safeJsonParse(offerData.userRequirements, {});

        // Extract payment method IDs safely
        const paymentMethodIds = Array.isArray(offerData.paymentMethods) 
          ? offerData.paymentMethods.map((pm: any) => pm.id)
          : [];
        
        setSelectedPaymentMethods(paymentMethodIds);

        setFormData({
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
        description: t("please_select_at_least_one_payment_method"),
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
          title: t("Success"),
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

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4" style={{ minHeight: 'calc(100vh - 232px)' }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t("loading_offer_details")}...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="container mx-auto py-12 px-4" style={{ minHeight: 'calc(100vh - 232px)' }}>
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || t("offer_not_found_or")}
          </AlertDescription>
        </Alert>
        <Link href="/p2p/offer">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_offers")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4" style={{ minHeight: 'calc(100vh - 232px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("edit_offer")}</h1>
          <p className="text-muted-foreground">
            {t("update_your_offer_settings_and_requirements")}
          </p>
        </div>
        <Link href={`/p2p/offer/${offerId}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_offer")}
          </Button>
        </Link>
      </div>

      {/* Security Notice */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>{t("security_notice")}:</strong>{" "}
          {t("for_security_reasons_you")}. 
          {t("core_offer_details_like")}.
        </AlertDescription>
      </Alert>

      {/* Offer Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t("offer_information")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <label className="font-medium">{t("Type")}</label>
              <p className="text-muted-foreground">{offer?.type || "N/A"}</p>
            </div>
            <div>
              <label className="font-medium">{t("Currency")}</label>
              <p className="text-muted-foreground">{offer?.currency || "N/A"}</p>
            </div>
            <div>
              <label className="font-medium">{t("Wallet")}</label>
              <p className="text-muted-foreground">{offer?.walletType || "N/A"}</p>
            </div>
            <div>
              <label className="font-medium">{t("Status")}</label>
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
        <Tabs defaultValue="trade-settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trade-settings">{t("trade_settings")}</TabsTrigger>
            <TabsTrigger value="payment-methods">{t("payment_methods")}</TabsTrigger>
            <TabsTrigger value="location">{t("Location")}</TabsTrigger>
            <TabsTrigger value="requirements">{t("Requirements")}</TabsTrigger>
            <TabsTrigger value="status">{t("Status")}</TabsTrigger>
          </TabsList>

          {/* Trade Settings */}
          <TabsContent value="trade-settings">
            <Card>
              <CardHeader>
                <CardTitle>{t("trade_settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="autoCancel">{t("auto_cancel_time_(minutes)")}</Label>
                    <Input
                      id="autoCancel"
                      type="number"
                      min="5"
                      max="1440"
                      value={formData?.tradeSettings?.autoCancel || 15}
                      onChange={(e) => updateFormData("tradeSettings", "autoCancel", parseInt(e.target.value) || 15)}
                    />
                    <p className="text-sm text-muted-foreground">
                      {t("time_limit_for_payment_(5-1440_minutes)")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("Visibility")}</Label>
                    <RadioGroup
                      value={formData?.tradeSettings?.visibility || "PUBLIC"}
                      onValueChange={(value) => updateFormData("tradeSettings", "visibility", value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PUBLIC" id="public" />
                        <Label htmlFor="public">{t("Public")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PRIVATE" id="private" />
                        <Label htmlFor="private">{t("Private")}</Label>
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
                  <Label htmlFor="kycRequired">{t("require_kyc_verification")}</Label>
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
                    {(formData?.tradeSettings?.termsOfTrade?.length || 0)}/1000 {t("characters")}
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
                    {(formData?.tradeSettings?.additionalNotes?.length || 0)}/500 {t("characters")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment-methods">
            <Card>
              <CardHeader>
                <CardTitle>{t("payment_methods")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("select_the_payment_methods")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {paymentMethods.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentMethods.map((method) => (
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
                          <div className="flex-shrink-0">
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
                            <div className="flex-shrink-0">
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
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {t("no_payment_methods_available")}
                    </p>
                  </div>
                )}
                
                {selectedPaymentMethods.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t("please_select_at_least_one_payment_method")}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="text-sm text-muted-foreground">
                  <p>{t("selected")}: {selectedPaymentMethods.length} {t("payment_methods")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Settings */}
          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle>{t("location_settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="country">{t("Country")}</Label>
                    <Input
                      id="country"
                      placeholder={t("enter_country")}
                      value={formData?.locationSettings?.country || ""}
                      onChange={(e) => updateFormData("locationSettings", "country", e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="region">{t("region/state")}</Label>
                    <Input
                      id="region"
                      placeholder={t("enter_region_or_state")}
                      value={formData?.locationSettings?.region || ""}
                      onChange={(e) => updateFormData("locationSettings", "region", e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">{t("City")}</Label>
                    <Input
                      id="city"
                      placeholder={t("enter_city")}
                      value={formData?.locationSettings?.city || ""}
                      onChange={(e) => updateFormData("locationSettings", "city", e.target.value)}
                      maxLength={100}
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
                    <Label htmlFor="minSuccessRate">{t("minimum_success_rate_(%)")}</Label>
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
                    <Label htmlFor="minAccountAge">{t("minimum_account_age_(days)")}</Label>
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
                  <Label>{t("current_status")}</Label>
                  <RadioGroup
                    value={formData?.status || "ACTIVE"}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "ACTIVE" | "PAUSED" }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ACTIVE" id="active" />
                      <Label htmlFor="active">{t("Active")}</Label>
                      <span className="text-sm text-muted-foreground">
                        - {t("offer_is_visible_and_available_for_trading")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PAUSED" id="paused" />
                      <Label htmlFor="paused">{t("Paused")}</Label>
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
              {t("Cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t("Saving")}...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t("save_changes")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 