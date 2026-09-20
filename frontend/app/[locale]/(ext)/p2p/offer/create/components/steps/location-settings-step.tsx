"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";
import { useWizard } from "../trading-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Globe, Info, X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountrySelect } from "@/components/ui/country-select";
import { StateSelect } from "@/components/ui/state-select";
import { CitySelect } from "@/components/ui/city-select";

export function LocationSettingsStep() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const { tradeData, updateTradeData, markStepComplete, currentStep } =
    useWizard();
  const [country, setCountry] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [newRestriction, setNewRestriction] = useState<string>("");
  const initialized = useRef(false);

  // Initialize from existing data if available
  useEffect(() => {
    if (!initialized.current) {
      if (tradeData.locationSettings) {
        setCountry(tradeData.locationSettings.country || "");
        setRegion(tradeData.locationSettings.region || "");
        setCity(tradeData.locationSettings.city || "");
        setRestrictions(tradeData.locationSettings.restrictions || []);
      } else {
        // Initialize with empty location settings
        updateTradeData({
          locationSettings: {
            country: "",
            region: "",
            city: "",
            restrictions: [],
          },
        });
      }

      // Mark as initialized
      initialized.current = true;

      // Only mark step complete if country is selected (required field)
      if (tradeData.locationSettings?.country) {
        markStepComplete(currentStep);
      }
    }
  }, [tradeData, updateTradeData, markStepComplete, currentStep]);

  // Update trade data when fields change
  const updateLocationSettings = () => {
    const locationSettings = {
      country,
      region,
      city,
      restrictions,
    };

    updateTradeData({ locationSettings });
    
    // Only mark step complete if country is selected (required field)
    if (country) {
      markStepComplete(currentStep);
    }
  };

  // Handle country change
  const handleCountryChange = (value: string) => {
    setCountry(value);
    // Reset region and city when country changes
    setRegion("");
    setCity("");

    // Update location settings with new country
    const locationSettings = {
      country: value,
      region: "",
      city: "",
      restrictions,
    };

    updateTradeData({ locationSettings });

    // Mark step complete if country is selected (required field)
    if (value) {
      markStepComplete(currentStep);
    }
  };

  // Handle region change
  const handleRegionChange = (value: string) => {
    setRegion(value);
    // Reset city when region changes
    setCity("");

    const locationSettings = {
      country,
      region: value,
      city: "",
      restrictions,
    };

    updateTradeData({ locationSettings });

    // Mark step complete if country is selected (required field)
    if (country) {
      markStepComplete(currentStep);
    }
  };

  // Handle city change
  const handleCityChange = (value: string) => {
    setCity(value);

    const locationSettings = {
      country,
      region,
      city: value,
      restrictions,
    };

    updateTradeData({ locationSettings });

    // Mark step complete if country is selected (required field)
    if (country) {
      markStepComplete(currentStep);
    }
  };

  // Add a new restriction
  const addRestriction = () => {
    if (newRestriction && !restrictions.includes(newRestriction)) {
      const updatedRestrictions = [...restrictions, newRestriction];
      setRestrictions(updatedRestrictions);
      setNewRestriction("");

      // Update trade data with new restrictions
      const locationSettings = {
        country,
        region,
        city,
        restrictions: updatedRestrictions,
      };

      updateTradeData({ locationSettings });
      markStepComplete(currentStep);
    }
  };

  // Remove a restriction
  const removeRestriction = (restriction: string) => {
    const updatedRestrictions = restrictions.filter((r) => r !== restriction);
    setRestrictions(updatedRestrictions);

    // Update trade data with new restrictions
    const locationSettings = {
      country,
      region,
      city,
      restrictions: updatedRestrictions,
    };

    updateTradeData({ locationSettings });
    markStepComplete(currentStep);
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        {t("specify_your_location_trade_offer")}.
      </p>

      {!country && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-600 dark:text-red-400">
{t("country_selection_is_required_to_create")} {t("this_helps_match_you_with_nearby")}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t("your_trading_location")}
          </CardTitle>
          <CardDescription>
            {t("specify_where_youre_nearby_traders")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {tCommon("country")} <span className="text-red-500">*</span>
              </Label>
              <CountrySelect
                value={country}
                onValueChange={handleCountryChange}
                placeholder={t("select_country_required")}
                className={!country ? "border-red-300 focus:border-red-500" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("region_state_optional")}</Label>
              <StateSelect
                value={region}
                onValueChange={handleRegionChange}
                countryCode={country}
                placeholder={tCommon("select_state")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("city_optional")}</Label>
              <CitySelect
                value={city}
                onValueChange={handleCityChange}
                countryCode={country}
                stateName={region}
                placeholder={tCommon("select_city")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            {t("geographical_restrictions")}
          </CardTitle>
          <CardDescription>
            {t("specify_any_countries_trade_with")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder={t("add_a_country_or_region_to_exclude")}
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRestriction();
                }
              }}
              className="flex-1"
            />
            <Button type="button" onClick={addRestriction} className="px-4 h-10">
              {tCommon("add")}
            </Button>
          </div>

          {restrictions.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {restrictions.map((restriction, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {restriction}
                  <button
                    type="button"
                    onClick={() => removeRestriction(restriction)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove</span>
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("no_restrictions_added_yet")}.
            </p>
          )}

          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-600 dark:text-blue-400">
              {t("adding_geographical_restrictions_preferred_markets")}.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
