"use client";

import { useEffect, useState } from "react";
import { asJsonArray } from "@/lib/json-column";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, QrCode, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { extractFeeValue } from "./deposit-helpers";
import { GlassPanel, SectionTitle } from "../../_components/finance-ui";
import { MoneyFigure } from "@/components/ui/money-figure";

interface ManualDepositFormProps {
  method: any;
  currency: string;
  amount: number;
  onSubmit: (values: any) => Promise<void>;
  loading: boolean;
  onBack: () => void;
}

export function ManualDepositForm({
  method,
  currency,
  amount,
  onSubmit,
  loading,
  onBack,
}: ManualDepositFormProps) {
  const t = useTranslations("common");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (method.customFields) {
      try {
        const fields = typeof method.customFields === 'string'
          ? JSON.parse(method.customFields)
          : method.customFields;

        const initialValues: Record<string, any> = {};
        fields.forEach((field: any) => {
          if (field.value) initialValues[field.name] = field.value;
        });

        if (Object.keys(initialValues).length > 0) {
          setCustomFields(initialValues);
        }
      } catch (error) {
        console.error("Error parsing custom fields:", error);
      }
    }
  }, [method.customFields]);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!amount || amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (method.customFields) {
      /*
        THE QUIET ONE. This parse threw on the array shape and its catch was a
        bare console.error, so the required-field loop never ran: a manual
        deposit could be submitted with no payment reference on it, and the
        operator had nothing to match the transfer against.
      */
      asJsonArray<any>(method.customFields).forEach((field: any) => {
        if (field.required && !customFields[field.name]) {
          const label = field.title || field.label || field.name;
          newErrors[field.name] = `${label} is required`;
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit({ amount, customFields });
    } catch (error) {
      console.error("Error submitting manual deposit:", error);
    }
  };

  const renderCustomField = (field: any) => {
    const value = customFields[field.name] || "";
    const error = errors[field.name];

    const handleChange = (newValue: string) => {
      setCustomFields(prev => ({ ...prev, [field.name]: newValue }));
      if (error) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field.name];
          return next;
        });
      }
    };

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {field.title || field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || field.title || field.label || field.name}
              className={`w-full px-3 py-2 border rounded-md bg-card bg-muted text-foreground ${
                error ? "border-destructive" : "border-border-strong"
              } focus:outline-none focus:ring-2 focus:ring-primary`}
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      case "qr":
        return (
          <div key={field.name} className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              {field.title || field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {value ? (
              <div className="flex flex-col items-center space-y-3 p-4 bg-muted border border-border-strong rounded-lg">
                <img src={value} alt={field.title || t("qr_code")} className="w-64 h-64 object-contain" />
                <p className="text-xs text-subtle-foreground text-center">
                  {t("scan_this_qr_code_to_complete_your_payment")}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 border border-dashed border-border-strong rounded-lg bg-muted dark:bg-muted/50">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-subtle-foreground">{t("no_qr_code_available")}</p>
                </div>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      default:
        return (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {field.title || field.label || field.name}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            <Input
              type={field.type || "text"}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={field.placeholder || field.title || field.label || field.name}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
    }
  };

  /**
   * The submit button's leading glyph, or nothing while the POST is out.
   *
   * `null` rather than a second icon: `<Button loading>` already renders a
   * spinner in that slot (components/ui/button.tsx), so returning `Send` too
   * would put two 16px glyphs in the row.
   */
  const SubmitIcon = loading ? null : Send;

  return (
    <GlassPanel>
      <SectionTitle step={5} title={t("complete_deposit")} hint={method.title} />

      {(method.description || method.instructions) && (
        <div className="rounded-2xl border border-border/70 bg-muted/70 p-4 dark:bg-surface-2/40">
          <h3 className="text-sm font-bold text-foreground">{method.title}</h3>
          {method.description && (
            <p className="mt-1 text-xs text-subtle-foreground">{method.description}</p>
          )}
          {method.instructions && (
            <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
              {method.instructions}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-info/20 bg-info/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-subtle-foreground">{t("deposit_amount")}</span>
          <span className="text-base font-bold tabular-nums text-foreground">
            <MoneyFigure value={`${amount} ${currency}`} />
          </span>
        </div>
        {(method.fixedFee || method.percentageFee) && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium text-subtle-foreground">{t("fee")}</span>
            <span className="text-xs font-semibold text-warning">
              {(() => {
                try {
                  const fixed = extractFeeValue(method.fixedFee, currency);
                  const pct = extractFeeValue(method.percentageFee, currency);
                  return `${fixed} + ${pct}%`;
                } catch {
                  return "See method details";
                }
              })()}
            </span>
          </div>
        )}
      </div>

      {method.customFields && (
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
            {t("additional_information")}
          </h4>
          {asJsonArray<any>(method.customFields).map((field: any) =>
            renderCustomField(field)
          )}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={loading} className="h-11 flex-1 gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {/* IN-FLIGHT, NOT PENDING — but still one control, not two subtrees.
            `<Button loading>` draws `LoaderCircle` at `size-4` in the same
            leading slot the `Send` glyph occupies, so the icon steps aside for
            it and the 44px button keeps its `gap-1.5` geometry either way.
            Resolving the glyph to a value leaves one element in the JSX and
            deletes the duplicated `h-4 w-4`. */}
        <Button
          onClick={handleSubmit}
          loading={loading}
          className="h-11 flex-1 gap-1.5 bg-primary text-primary-foreground shadow-md shadow-primary/20"
        >
          {SubmitIcon && <SubmitIcon className="h-4 w-4" />}
          {loading ? t("processing") : t("submit_deposit")}
        </Button>
      </div>
    </GlassPanel>
  );
}
