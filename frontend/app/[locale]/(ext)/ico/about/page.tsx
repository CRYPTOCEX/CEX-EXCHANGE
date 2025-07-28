import type { Metadata } from "next";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mash3div.com";
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Initial Token Offering Platform";

export const metadata: Metadata = {
  title: `About ${siteName}`,
  description: siteDescription,
};

export default function AboutPage() {
  const t = useTranslations("ext");
  return (
    <div className="container py-10">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">
          {t("About")}
          {siteName}
        </h1>
        <p className="text-muted-foreground max-w-3xl">
          {t("were_building_the_regulated_platform")}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 items-center">
        <div>
          <h2 className="text-2xl font-bold mb-4">{t("our_mission")}</h2>
          <p className="text-muted-foreground mb-4">
            {siteName}
            {t("was_founded_with_and_compliance")}.
          </p>
          <p className="text-muted-foreground mb-4">
            {t("we_believe_that_and_investment")}.{" "}
            {t("however_the_space_regulatory_uncertainty")}.
          </p>
          <p className="text-muted-foreground">
            {t("our_platform_addresses_with_confidence")}.
          </p>
        </div>
        <div className="bg-linear-to-br from-primary/20 via-primary/10 to-background rounded-xl aspect-video flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-xl font-medium">{t("our_vision")}</p>
            <p className="text-muted-foreground max-w-md mx-auto px-4">
              {t("a_world_where_and_security")}.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {t("our_core_values")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("Security")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("we_prioritize_the_all_else")}.{" "}
                {t("all_projects_undergo_being_listed")}.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Transparency")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("we_believe_in_we_list")}.{" "}
                {t("all_information_is_our_users")}.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("Compliance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {t("we_work_within_and_regulations")}.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Our Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "Alex Johnson",
              role: "CEO & Co-founder",
              bio: "Former fintech executive with 15+ years experience in financial markets and blockchain technology.",
              image: "/img/placeholder.svg",
            },
            {
              name: "Sarah Chen",
              role: "CTO & Co-founder",
              bio: "Blockchain developer and security expert with a background in cryptography and distributed systems.",
              image: "/img/placeholder.svg",
            },
            {
              name: "Michael Rodriguez",
              role: "Chief Compliance Officer",
              bio: "Former regulator with extensive experience in securities law and financial compliance.",
              image: "/img/placeholder.svg",
            },
            {
              name: "Emily Kim",
              role: "Head of Business Development",
              bio: "Experienced in building partnerships and growing blockchain ecosystems across global markets.",
              image: "/img/placeholder.svg",
            },
          ].map((member, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Image
                  src={member.image || "/img/placeholder.svg"}
                  alt={member.name}
                  width={300}
                  height={300}
                  className="rounded-md mb-4"
                />
                <CardTitle className="text-lg">{member.name}</CardTitle>
                <CardDescription>{member.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div> */}

      <div className="bg-muted/50 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">{t("join_our_journey")}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          {t("whether_youre_a_token_offerings")}.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/ico/creator/launch">
            <Button size="lg">{t("launch_your_token")}</Button>
          </Link>
          <Link href="/ico/offer">
            <Button size="lg" variant="outline">
              {t("explore_offerings")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
