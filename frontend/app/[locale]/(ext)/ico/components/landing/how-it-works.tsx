import { Search, CreditCard, BarChart3, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("ext");
  const steps = [
    {
      icon: <Search className="h-10 w-10 text-primary" />,
      title: "Discover Projects",
      description:
        "Browse through our curated list of token offerings and find projects that align with your investment goals.",
    },
    {
      icon: <CreditCard className="h-10 w-10 text-primary" />,
      title: "Invest Securely",
      description:
        "Use our secure platform to invest in projects with as little as $100. All transactions are protected and verified.",
    },
    {
      icon: <BarChart3 className="h-10 w-10 text-primary" />,
      title: "Track Performance",
      description:
        "Monitor your investments in real-time with detailed analytics and performance metrics.",
    },
    {
      icon: <Rocket className="h-10 w-10 text-primary" />,
      title: "Launch Your Token",
      description:
        "Have a project? Use our platform to launch your token and reach thousands of potential investors.",
    },
  ];

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
            {t("simple_process")}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {t("how_it_works")}
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              {t("get_started_with_simple_steps")}
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mt-10">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center space-y-4 p-6 rounded-lg border bg-card transition-all hover:shadow-md"
            >
              <div className="p-3 rounded-full bg-primary/10">{step.icon}</div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
