import React from "react";
import { Card } from "@/components/ui/card";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

const StepMode: React.FC = () => {
  const t = useTranslations("ext");
  const { register, watch } = useFormContext<DeployFormData>();
  const mode = watch("mode");
  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-lg font-semibold">{t("token_creation_mode")}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {t("choose_whether_to_existing_contract")}.
      </p>
      <div className="flex items-center space-x-6 mt-3">
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="deploy"
            {...register("mode", { required: true })}
            defaultChecked
          />
          <span>{t("deploy_new_token")}</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            value="import"
            {...register("mode", { required: true })}
          />
          <span>{t("import_existing_token")}</span>
        </label>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
        {t("current_mode")}
        <strong>{mode}</strong>
      </p>
    </Card>
  );
};

export default StepMode;
