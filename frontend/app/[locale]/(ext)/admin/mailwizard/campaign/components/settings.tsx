import React from "react";
import { Icon } from "@iconify/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCampaignStore } from "./store";
import { useTranslations } from "next-intl";

export function CampaignSettings() {
  const t = useTranslations("ext");
  const {
    campaign,
    setCampaign,
    templates,
    items,
    isLoading,
    handleUpdateCampaign,
    handleCreateCampaign,
    campaignId,
  } = useCampaignStore();

  // If campaignId exists, then it's an edit page; otherwise, it's a create page.
  const isEdit = Boolean(campaignId);
  const onClick = isEdit ? handleUpdateCampaign : handleCreateCampaign;
  const buttonText = isEdit ? "Update Campaign" : "Create Campaign";
  const buttonIcon = isEdit ? (
    <Icon icon="lucide:save" className="mr-2 h-4 w-4" />
  ) : (
    <Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("campaign_settings")}</CardTitle>
        <CardDescription>
          {t("configure_your_campaign’s_email_template")}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {/* Campaign Name */}
          <Input
            id="name"
            title="Campaign Name"
            value={campaign.name}
            onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
            placeholder="Enter campaign name"
          />

          {/* Subject */}
          <Input
            id="subject"
            title="Subject"
            value={campaign.subject}
            onChange={(e) =>
              setCampaign({ ...campaign, subject: e.target.value })
            }
            placeholder="Enter email subject"
          />

          {/* Speed */}
          <Input
            id="speed"
            type="number"
            title="Emails per hour"
            value={campaign.speed}
            onChange={(e) =>
              setCampaign({
                ...campaign,
                speed: parseInt(e.target.value) || 1,
              })
            }
            min={1}
          />

          {/* Template */}
          <div className="space-y-2">
            <Select
              value={campaign.templateId}
              onValueChange={(value) =>
                setCampaign({ ...campaign, templateId: value })
              }
            >
              <SelectTrigger id="template" title="Template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create or Update Campaign Button */}
          <Button
            className="w-full"
            onClick={onClick}
            disabled={
              isLoading ||
              !campaign.name ||
              !campaign.subject ||
              !campaign.templateId ||
              items.length === 0
            }
          >
            {isLoading ? (
              <Icon icon="mdi:loading" className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              buttonIcon
            )}
            {buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
