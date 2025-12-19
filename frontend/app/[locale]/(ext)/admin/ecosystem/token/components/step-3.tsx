import React from "react";
import { Card } from "@/components/ui/card";
import { useFormContext } from "react-hook-form";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

const StepIconAndExtras: React.FC = () => {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { register, setValue, watch, control } =
    useFormContext<DeployFormData>();
  const icon = watch("icon");
  const mode = watch("mode");

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-lg font-semibold">{tCommon("additional_information")}</h2>

      {/* Token Icon */}
      <ImageUpload value={icon} onChange={(file) => setValue("icon", file)} />

      {/* Precision */}
      <Input
        type="number"
        placeholder={t("e_g_8")}
        title="Precision"
        {...register("precision", { required: true, valueAsNumber: true })}
      />

      {/* Limits: Deposit */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder={t("min_deposit")}
          title={t("deposit_minimum")}
          {...register("limits.deposit.min", {
            required: true,
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          placeholder={t("max_deposit")}
          title={t("deposit_maximum")}
          {...register("limits.deposit.max", {
            required: true,
            valueAsNumber: true,
          })}
        />
      </div>

      {/* Limits: Withdraw */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder={t("min_withdraw")}
          title={t("withdraw_minimum")}
          {...register("limits.withdraw.min", {
            required: true,
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          placeholder={t("max_withdraw")}
          title={t("withdraw_maximum")}
          {...register("limits.withdraw.max", {
            required: true,
            valueAsNumber: true,
          })}
        />
      </div>

      {/* Fee */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder={t("min_fee")}
          title={t("fee_minimum_1")}
          {...register("fee.min", { required: true, valueAsNumber: true })}
        />
        <Input
          type="number"
          placeholder={t("fee_2")}
          title={t('fee_percentage')}
          {...register("fee.percentage", {
            required: true,
            valueAsNumber: true,
          })}
        />
      </div>

      {/* Status using shadcn Select */}
      <Select {...register("status", { required: true })}>
        <SelectTrigger title="Status" className="w-full">
          <SelectValue placeholder={tCommon("select_status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">{tCommon("enabled")}</SelectItem>
          <SelectItem value="false">{tCommon("disabled")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Import Fields */}
      {mode === "import" && (
        <div className="grid grid-cols-2 gap-4">
          <Select {...register("contractType", { required: true })}>
            <SelectTrigger title={t("contract_type")} className="w-full">
              <SelectValue placeholder={t("select_contract_type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERMIT">{t("permit")}</SelectItem>
              <SelectItem value="NO_PERMIT">NO_PERMIT</SelectItem>
              <SelectItem value="NATIVE">{t("native")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder={`${t("network_auto_filled_if_needed")} (auto-filled if needed)`}
            title="Network"
            {...register("network", { required: true })}
          />
          <Input
            type="text"
            placeholder={t("e_g_erc20_spl_etc")}
            title={tExt("token_type")}
            {...register("type", { required: true })}
            className="col-span-2"
          />
        </div>
      )}
    </Card>
  );
};

export default StepIconAndExtras;
