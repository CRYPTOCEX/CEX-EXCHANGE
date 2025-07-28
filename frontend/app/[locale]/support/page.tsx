"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import {
  MessageCircle,
  Ticket,
  Clock,
  Users,
  Shield,
  Headphones,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("support");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="container mx-auto px-6 pt-16 pb-24 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-zinc-100">
            {t("support_center")}
          </h1>
          <p className="text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("get_help_when_support_system")}
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link href="/support/ticket">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t("view_support_tickets")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-zinc-100"
              onClick={() => {
                // Trigger live chat to open
                const liveChatEvent = new CustomEvent("openLiveChat", {
                  detail: {},
                });
                window.dispatchEvent(liveChatEvent);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t("contact_us")}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <Ticket className="h-5 w-5 text-blue-600" />
                {t("support_tickets")}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-zinc-400">
                {t("create_and_manage_support_tickets_for_your_issues")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-zinc-400 mb-4">
                <li>{t("•_track_your_issues_with_unique_ticket_ids")}</li>
                <li>{t("•_set_priority_levels_(low_medium_high)")}</li>
                <li>{t("•_real-time_updates_via_websocket")}</li>
                <li>{t("•_full_conversation_history")}</li>
              </ul>
              <Link href="/support/ticket">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {t("go_to_support_center")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                {t("live_chat")}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-zinc-400">
                {t("get_instant_help_from_our_support_agents")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-zinc-400 mb-4">
                <li>{t("•_direct_connection_with_support_agents")}</li>
                <li>{t("•_real-time_messaging")}</li>
                <li>{t("•_queue_position_tracking")}</li>
                <li>{t("•_file_sharing_capabilities")}</li>
              </ul>
              <Button
                variant="outline"
                className="w-full border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-zinc-100"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {t("try_live_chat_(bottom_right)")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-zinc-100">
                {t("real-time_updates")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                {t("websocket_connections_ensure_status_updates")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-zinc-100">
                {t("agent_assignment")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                {t("automatic_agent_assignment_and_expertise")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-zinc-100">
                {t("secure_communication")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                {t("all_conversations_are_securely_stored")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-16 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 p-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-zinc-100">
            {t("need_help")}
          </h2>
          <p className="text-gray-600 dark:text-zinc-400 mb-6">
            {t("our_support_team_may_have")}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/support/ticket">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                {t("create_support_ticket")}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-900 dark:text-zinc-100"
              onClick={() => {
                // Trigger live chat to open
                const liveChatEvent = new CustomEvent("openLiveChat", {
                  detail: {},
                });
                window.dispatchEvent(liveChatEvent);
              }}
            >
              <Headphones className="h-4 w-4 mr-2" />
              {t("start_live_chat")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
