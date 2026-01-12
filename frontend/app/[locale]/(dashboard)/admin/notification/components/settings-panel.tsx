"use client";

import { useState, useEffect } from "react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, RefreshCw, CheckCircle2, XCircle, Mail, MessageSquare, Smartphone, Inbox, Database, Clock } from "lucide-react";
import { toast } from "sonner";

interface SettingsData {
  timestamp: string;
  channels: {
    [key: string]: {
      enabled: boolean;
      provider?: string;
      from?: string;
      description?: string;
      configured?: boolean;
    };
  };
  providers: {
    [key: string]: {
      configured: boolean;
    };
  };
  features: {
    idempotency: {
      enabled: boolean;
      ttl: string;
    };
    userPreferences: {
      enabled: boolean;
      cacheTTL: string;
    };
    deliveryTracking: {
      enabled: boolean;
      ttl: string;
    };
    priorityLevels: string[];
    notificationTypes: string[];
  };
}

export function SettingsPanel() {
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/system/notification/settings",
        silent: true,
      });

      if (error) {
        toast.error("Failed to fetch settings");
      } else {
        setSettingsData(data);
      }
    } catch (err) {
      console.error("Settings fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const channelIcons: Record<string, any> = {
    inApp: { icon: Inbox, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    email: { icon: Mail, color: "text-green-500", bgColor: "bg-green-500/10" },
    sms: { icon: MessageSquare, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    push: { icon: Smartphone, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Service Configuration
                </CardTitle>
                <CardDescription>
                  Current notification service settings and configuration
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchSettings}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {settingsData && (
        <>
          {/* Channel Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Channel Configuration</CardTitle>
                <CardDescription>Notification channel settings and providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(settingsData.channels).map(([channel, config]) => {
                    const channelInfo = channelIcons[channel] || {
                      icon: Settings,
                      color: "text-gray-500",
                      bgColor: "bg-gray-500/10",
                    };
                    const Icon = channelInfo.icon;

                    return (
                      <div key={channel} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${channelInfo.bgColor} mt-0.5`}>
                              <Icon className={`h-5 w-5 ${channelInfo.color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold capitalize">{channel}</h3>
                                <Badge
                                  variant={config.enabled ? "default" : "secondary"}
                                  className={
                                    config.enabled
                                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                      : ""
                                  }
                                >
                                  {config.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </div>
                              {config.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {config.description}
                                </p>
                              )}
                              <div className="space-y-1 text-sm">
                                {config.provider && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Provider:</span>
                                    <span className="font-medium">{config.provider}</span>
                                  </div>
                                )}
                                {config.from && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">From:</span>
                                    <span className="font-medium">{config.from}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Provider Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Provider Status</CardTitle>
                <CardDescription>Third-party service provider configuration status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(settingsData.providers).map(([provider, status]) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        {status.configured ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium capitalize">{provider}</span>
                      </div>
                      <Badge
                        variant={status.configured ? "default" : "secondary"}
                        className={
                          status.configured
                            ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            : ""
                        }
                      >
                        {status.configured ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Service Features</CardTitle>
                <CardDescription>Enabled features and capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Idempotency */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Idempotency</span>
                    </div>
                    <Badge
                      variant={settingsData.features.idempotency.enabled ? "default" : "secondary"}
                      className={
                        settingsData.features.idempotency.enabled
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : ""
                      }
                    >
                      {settingsData.features.idempotency.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prevents duplicate notifications • TTL: {settingsData.features.idempotency.ttl}
                  </p>
                </div>

                {/* User Preferences */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">User Preferences</span>
                    </div>
                    <Badge
                      variant={settingsData.features.userPreferences.enabled ? "default" : "secondary"}
                      className={
                        settingsData.features.userPreferences.enabled
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : ""
                      }
                    >
                      {settingsData.features.userPreferences.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Respects user notification preferences • Cache TTL:{" "}
                    {settingsData.features.userPreferences.cacheTTL}
                  </p>
                </div>

                {/* Delivery Tracking */}
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Delivery Tracking</span>
                    </div>
                    <Badge
                      variant={settingsData.features.deliveryTracking.enabled ? "default" : "secondary"}
                      className={
                        settingsData.features.deliveryTracking.enabled
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : ""
                      }
                    >
                      {settingsData.features.deliveryTracking.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tracks notification delivery status • TTL:{" "}
                    {settingsData.features.deliveryTracking.ttl}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* System Capabilities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>System Capabilities</CardTitle>
                <CardDescription>Available priority levels and notification types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Priority Levels</h3>
                  <div className="flex flex-wrap gap-2">
                    {settingsData.features.priorityLevels.map((level) => (
                      <Badge key={level} variant="outline">
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Notification Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {settingsData.features.notificationTypes.map((type) => (
                      <Badge key={type} variant="outline">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {!settingsData && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No settings data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
