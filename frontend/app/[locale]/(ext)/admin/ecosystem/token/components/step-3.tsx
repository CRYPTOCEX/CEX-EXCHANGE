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
  const t = useTranslations("ext");
  const { register, setValue, watch, control } =
    useFormContext<DeployFormData>();
  const icon = watch("icon");
  const mode = watch("mode");

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-lg font-semibold">{t("additional_information")}</h2>

      {/* Token Icon */}
      <ImageUpload value={icon} onChange={(file) => setValue("icon", file)} />

      {/* Precision */}
      <Input
        type="number"
        placeholder="e.g. 8"
        title="Precision"
        {...register("precision", { required: true, valueAsNumber: true })}
      />

      {/* Limits: Deposit */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          placeholder="Min deposit"
          title="Deposit Minimum"
          {...register("limits.deposit.min", {
            required: true,
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          placeholder="Max deposit"
          title="Deposit Maximum"
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
          placeholder="Min withdraw"
          title="Withdraw Minimum"
          {...register("limits.withdraw.min", {
            required: true,
            valueAsNumber: true,
          })}
        />
        <Input
          type="number"
          placeholder="Max withdraw"
          title="Withdraw Maximum"
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
          placeholder="Min fee"
          title="Fee Minimum"
          {...register("fee.min", { required: true, valueAsNumber: true })}
        />
        <Input
          type="number"
          placeholder="Fee %"
          title="Fee Percentage"
          {...register("fee.percentage", {
            required: true,
            valueAsNumber: true,
          })}
        />
      </div>

      {/* Status using shadcn Select */}
      <Select {...register("status", { required: true })}>
        <SelectTrigger title="Status" className="w-full">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">{t("Enabled")}</SelectItem>
          <SelectItem value="false">{t("Disabled")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Import Fields */}
      {mode === "import" && (
        <div className="grid grid-cols-2 gap-4">
          <Select {...register("contractType", { required: true })}>
            <SelectTrigger title="Contract Type" className="w-full">
              <SelectValue placeholder="Select contract type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERMIT">{t("PERMIT")}</SelectItem>
              <SelectItem value="NO_PERMIT">NO_PERMIT</SelectItem>
              <SelectItem value="NATIVE">{t("NATIVE")}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Network (auto-filled if needed)"
            title="Network"
            {...register("network", { required: true })}
          />
          <Input
            type="text"
            placeholder="e.g. ERC20, SPL, etc."
            title="Token Type"
            {...register("type", { required: true })}
            className="col-span-2"
          />
        </div>
      )}
    </Card>
  );
};

export default StepIconAndExtras;
