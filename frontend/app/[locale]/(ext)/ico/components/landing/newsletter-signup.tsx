"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function NewsletterSignup() {
  const t = useTranslations("ext");
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      setEmail("");
    }, 1000);
  };

  return (
    <section className="w-full py-16 md:py-24 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
          <div className="lg:w-1/2 space-y-4">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
              {t("stay_updated")}
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {t("never_miss_a_token_launch")}
            </h2>
            <p className="text-muted-foreground md:text-xl">
              {t("subscribe_to_our_exclusive_opportunities")}.
            </p>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="rounded-xl border bg-card p-8 shadow-2xs">
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    {t("thank_you_for_subscribing")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("youve_been_added_to_our_newsletter")}.{" "}
                    {t("well_keep_you_platform_news")}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">
                      {t("subscribe_to_our_newsletter")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("join_25000+_subscribers_weekly_updates")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Subscribing..." : "Subscribe"}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("by_subscribing_you_privacy_policy")}.{" "}
                    {t("we_respect_your_your_information")}.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
