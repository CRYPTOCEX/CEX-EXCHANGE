import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";

export function Testimonials() {
  const t = useTranslations("ext");
  const testimonials = [
    {
      quote:
        "TokenLaunch made it incredibly easy to invest in promising blockchain projects. The platform's transparency and security features gave me confidence in my investments.",
      author: "Sarah Johnson",
      role: "Angel Investor",
      avatar: "/img/placeholder.svg",
    },
    {
      quote:
        "As a project founder, launching our token on this platform was seamless. The support team guided us through every step, and we reached our funding goal in just 3 days.",
      author: "Michael Chen",
      role: "CEO, BlockTech Solutions",
      avatar: "/img/placeholder.svg",
    },
    {
      quote:
        "The detailed analytics and reporting tools have been invaluable for tracking my portfolio performance. I've recommended TokenLaunch to all my investment partners.",
      author: "David Rodriguez",
      role: "Crypto Fund Manager",
      avatar: "/img/placeholder.svg",
    },
  ];

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
            {t("Testimonials")}
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              {t("what_our_users_say")}
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              {t("hear_from_investors_our_platform")}
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3 mt-10">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-card border">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/40 mb-4" />
                <p className="mb-6 italic">{testimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial.avatar || "/img/placeholder.svg"}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
