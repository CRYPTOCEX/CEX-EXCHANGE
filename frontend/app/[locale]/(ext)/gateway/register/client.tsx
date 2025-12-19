"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import $fetch from "@/lib/api";
import { formatPhoneCode } from "@/lib/countries";
import { useTranslations } from "next-intl";

export default function MerchantRegisterClient() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    website: "",
    description: "",
    businessType: "",
    taxId: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === "name") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleCountryChange = (value: string, countryPhoneCode?: string) => {
    setFormData((prev) => ({
      ...prev,
      country: value,
      state: "",
      city: "",
      phone: countryPhoneCode ? formatPhoneCode(countryPhoneCode) + " " : ""
    }));
    setPhoneCode(countryPhoneCode ? formatPhoneCode(countryPhoneCode) : "");
  };

  const handleStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value, city: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: fetchError } = await $fetch({
        url: "/api/gateway/merchant",
        method: "POST",
        body: formData,
      });

      if (fetchError) {
        setError(fetchError);
        return;
      }

      // Redirect to dashboard on success
      router.push("/gateway/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 pt-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
          <CreditCard className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("register_your_business_to_start_accepting")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{tCommon("business_information")}</CardTitle>
            <CardDescription>{t("tell_us_about_your_business")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tExtAdmin("business_name")}</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t("your_business_name")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="your-business"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{tExtAdmin("business_email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={"business@example.com"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{tCommon("phone_number")} {phoneCode && <span className="text-muted-foreground text-xs">({phoneCode})</span>}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={phoneCode ? `${phoneCode} XXX XXX XXXX` : "+X XXX XXX XXXX"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourbusiness.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("business_description")}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t("describe_your_business_and_what_products")}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessType">{t("business_type")}</Label>
                <Input
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  placeholder={t("e_g_e_commerce_saas_services")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">{t("tax_id_vat_number")}</Label>
                <Input
                  id="taxId"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleChange}
                  placeholder={t("your_tax_identification_number")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("business_address")}</CardTitle>
            <CardDescription>{t("where_your_business_is_located")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Country and State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <CountrySelect
                  value={formData.country}
                  onValueChange={handleCountryChange}
                  placeholder={tCommon('select_country')}
                />
              </div>
              <div className="space-y-2">
                <Label>{tExt("state_province")}</Label>
                <StateSelect
                  value={formData.state}
                  onValueChange={handleStateChange}
                  countryCode={formData.country}
                  placeholder={tCommon('select_state')}
                  disabled={!formData.country}
                />
              </div>
            </div>

            {/* Row 2: City and Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <CitySelect
                  value={formData.city}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
                  countryCode={formData.country}
                  stateName={formData.state}
                  placeholder={tCommon('select_city')}
                  disabled={!formData.state}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">{tExt("postal_code")}</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="12345"
                  disabled={!formData.city}
                />
              </div>
            </div>

            {/* Row 3: Street Address (full width) */}
            <div className="space-y-2">
              <Label htmlFor="address">{tCommon("street_address")}</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder={`123 ${tCommon('business_street_suite_100')}`}
                disabled={!formData.city}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" size="lg" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("register_as_merchant")}
          </Button>
        </div>
      </form>
    </div>
  );
}
