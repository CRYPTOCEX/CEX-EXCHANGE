import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Settings, DollarSign, BarChart3, Plus, Trash2, X } from "lucide-react";

interface GatewayEditFormProps {
  gateway: any;
  onChange: (field: string, value: any) => void;
}

export function GatewayEditForm({ gateway, onChange }: GatewayEditFormProps) {
  const t = useTranslations("admin");

  if (!gateway) return null;

  // Handle image upload
  const handleImageChange = (fileOrNull: File | null) => {
    onChange('imageFile', fileOrNull);
  };

  // Get supported currencies array
  const supportedCurrencies = Array.isArray(gateway.currencies) ? gateway.currencies : [];

  // Render fee/limit input based on type and currencies
  const renderFeeInput = (field: string, label: string, value: any) => {
    const isObject = typeof value === 'object' && value !== null;
    const isCurrencySpecific = supportedCurrencies.length > 1;
    
    return (
      <div className="space-y-4">
        <Label htmlFor={field}>{label}</Label>
        
        {/* Toggle between global and currency-specific */}
        {isCurrencySpecific && (
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant={!isObject ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isObject) {
                  // Convert to global value (use first currency value or 0)
                  const firstValue = Object.values(value)[0] as number || 0;
                  onChange(field, firstValue);
                }
              }}
            >
              {t("global_value")}
            </Button>
            <Button
              type="button"
              variant={isObject ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!isObject) {
                  // Convert to currency-specific object
                  const currencyObj: Record<string, number> = {};
                  supportedCurrencies.forEach(currency => {
                    currencyObj[currency] = typeof value === 'number' ? value : 0;
                  });
                  onChange(field, currencyObj);
                }
              }}
            >
              {t("per_currency")}
            </Button>
          </div>
        )}

        {isObject ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("currency-specific_values")}:
            </p>
            <div className="space-y-2">
              {Object.entries(value).map(([currency, amount]) => (
                <div key={currency} className="flex items-center gap-3">
                  <Badge variant="outline" className="min-w-16 justify-center font-mono">
                    {currency}
                  </Badge>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount as number}
                    onChange={(e) => {
                      const newValue = { ...value, [currency]: parseFloat(e.target.value) || 0 };
                      onChange(field, newValue);
                    }}
                    className="flex-1"
                    placeholder="0.00"
                  />
                  {field.includes('Fee') && (
                    <span className="text-sm text-muted-foreground min-w-8">
                      {field.includes('percentage') ? '%' : supportedCurrencies.includes(currency) ? currency : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add missing currencies */}
            {supportedCurrencies.some(currency => !(currency in value)) && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">{t("add_missing_currencies")}:</p>
                <div className="flex flex-wrap gap-2">
                  {supportedCurrencies
                    .filter(currency => !(currency in value))
                    .map(currency => (
                      <Button
                        key={currency}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newValue = { ...value, [currency]: 0 };
                          onChange(field, newValue);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {currency}
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Input
              id={field}
              type="number"
              step="0.01"
              min="0"
              value={value || ''}
              onChange={(e) => onChange(field, parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="flex-1"
            />
            {field.includes('Fee') && (
              <span className="text-sm text-muted-foreground min-w-8">
                {field.includes('percentage') ? '%' : gateway.type === 'FIAT' ? 'USD' : 'Global'}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">
            <Settings className="mr-2 h-4 w-4" />
            {t("basic_settings")}
          </TabsTrigger>
          <TabsTrigger value="fees">
            <DollarSign className="mr-2 h-4 w-4" />
            {t("Fees")}
          </TabsTrigger>
          <TabsTrigger value="limits">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t("Limits")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("gateway_information")}</CardTitle>
              <CardDescription>
                {t("basic_gateway_configuration_and_display_settings")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("gateway_name")}</Label>
                  <Input
                    id="name"
                    value={gateway.name || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("gateway_name_cannot_be_changed")}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alias">{t("Alias")}</Label>
                  <Input
                    id="alias"
                    value={gateway.alias || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("alias_cannot_be_changed")}
                  </p>
                </div>
              </div>

              {/* Two column layout for title/description and image */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Title and Description */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("display_title")} *</Label>
                    <Input
                      id="title"
                      value={gateway.title || ''}
                      onChange={(e) => onChange('title', e.target.value)}
                      placeholder={t("enter_display_title")}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">{t("Description")} *</Label>
                    <Textarea
                      id="description"
                      value={gateway.description || ''}
                      onChange={(e) => onChange('description', e.target.value)}
                      placeholder={t("enter_gateway_description")}
                      rows={4}
                      required
                    />
                  </div>
                </div>

                {/* Right column - Image */}
                <div className="lg:col-span-1 space-y-2">
                  <Label>{t("gateway_image")}</Label>
                  <ImageUpload
                    onChange={handleImageChange}
                    value={gateway.imageFile || gateway.image || null}
                    title={t("upload_gateway_logo_(recommended_200x100px)")}
                    size="sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("upload_a_logo_for")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currencies">{t("supported_currencies")}</Label>
                <div className="space-y-3">
                  {/* Current currencies display */}
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(gateway.currencies) && gateway.currencies.length > 0 ? (
                      gateway.currencies.map((currency, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                        >
                          <span>{currency}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-destructive/20"
                            onClick={() => {
                              const newCurrencies = gateway.currencies.filter((_, i) => i !== index);
                              onChange('currencies', newCurrencies);
                            }}
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("no_currencies_added_yet")}
                      </p>
                    )}
                  </div>
                  
                  {/* Global currency selector */}
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</div>
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                          <p className="font-medium">{t("important_notice")}</p>
                          <p>{t("adding_a_currency_not")}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>{t("add_global_currencies")}</Label>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1">
                        {[
                          'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NOK',
                          'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RSD', 'TRY', 'RUB',
                          'UAH', 'BYN', 'KZT', 'GEL', 'AMD', 'AZN', 'UZS', 'KGS', 'TJS', 'TMT',
                          'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'BTN', 'MVR', 'AFN', 'IRR', 'IQD',
                          'SAR', 'AED', 'QAR', 'BHD', 'KWD', 'OMR', 'JOD', 'LBP', 'SYP', 'YER',
                          'EGP', 'LYD', 'TND', 'DZD', 'MAD', 'MRU', 'CDF', 'AOA', 'ZAR', 'BWP',
                          'SZL', 'LSL', 'NAD', 'ZMW', 'ZWL', 'MWK', 'MZN', 'MGA', 'KMF', 'SCR',
                          'MUR', 'ETB', 'ERN', 'DJF', 'SOS', 'KES', 'UGX', 'TZS', 'RWF', 'BIF',
                          'XAF', 'XOF', 'GHS', 'GMD', 'GNF', 'LRD', 'SLE', 'CIV', 'BFA', 'MLI',
                          'NER', 'TCD', 'CMR', 'CAF', 'GNQ', 'GAB', 'COG', 'STP', 'CVE', 'NGN',
                          'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VED', 'GYD',
                          'SRD', 'FKP', 'MXN', 'GTQ', 'BZD', 'SVC', 'HNL', 'NIO', 'CRC', 'PAB',
                          'CUP', 'DOP', 'HTG', 'JMD', 'KYD', 'TTD', 'BBD', 'XCD', 'AWG', 'ANG',
                          'KRW', 'KPW', 'MNT', 'LAK', 'KHR', 'VND', 'THB', 'MMK', 'BND', 'SGD',
                          'MYR', 'IDR', 'PHP', 'TWD', 'HKD', 'MOP', 'FJD', 'PGK', 'SBD', 'VUV',
                          'WST', 'TOP', 'NZD', 'CKI', 'NUE', 'TKL', 'TVD', 'KIR', 'NRU', 'PLW'
                        ].map((currency) => (
                          <Button
                            key={currency}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs font-mono"
                            disabled={gateway.currencies?.includes(currency)}
                            onClick={() => {
                              if (!gateway.currencies?.includes(currency)) {
                                const newCurrencies = [...(gateway.currencies || []), currency];
                                onChange('currencies', newCurrencies);
                              }
                            }}
                          >
                            {currency}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("select_currencies_that_this")}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status">{t("gateway_status")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("enable_or_disable_this_payment_gateway")}
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={gateway.status || false}
                  onCheckedChange={(checked) => onChange('status', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("fee_configuration")}</CardTitle>
              <CardDescription>
                {t("configure_fixed_and_percentage")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderFeeInput('fixedFee', t("fixed_fee"), gateway.fixedFee)}
              
              <Separator />
              
              {renderFeeInput('percentageFee', t("percentage_fee"), gateway.percentageFee)}
              
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{t("fee_information")}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t("fixed_fees_are_charged")}</li>
                  <li>• {t("percentage_fees_are_calculated")}</li>
                  <li>• {t("you_can_set_global")}</li>
                  <li>• {t("currency-specific_fees_override_global")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("transaction_limits")}</CardTitle>
              <CardDescription>
                {t("set_minimum_and_maximum")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderFeeInput('minAmount', t("minimum_amount"), gateway.minAmount)}
              
              <Separator />
              
              {renderFeeInput('maxAmount', t("maximum_amount"), gateway.maxAmount)}
              
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{t("limits_information")}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t("minimum_amount_is_the")}</li>
                  <li>• {t("maximum_amount_is_the")}</li>
                  <li>• {t("you_can_set_global")}</li>
                  <li>• {t("leave_maximum_amount_as_0_for_no_upper_limit")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}