"use client";

import { Link } from "@/i18n/routing";
import { ArrowRight, Shield, TrendingUp, Wallet, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function OffersCTA() {
  const t = useTranslations("ext_p2p");
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mt-8"
    >
      {/* Background glow */}
      <div className="relative">
        <div className={`absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-violet-500/30 to-blue-600/30 rounded-4xl blur-2xl`} />

        <Card className={`relative overflow-hidden border-0 bg-gradient-to-r from-blue-600 via-violet-500 to-blue-600 bg-size-[200%_100%] animate-gradient-x`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

          <CardContent className="relative px-8 py-12 md:px-12">
            <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
              <div className="text-center lg:text-left max-w-xl">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  {t("create_your_own_trading_offer")}
                </h2>
                <p className="text-white/90 mb-6 text-base md:text-lg">
                  {t("cant_find_what_and_price")}. {t("set_your_own_your_offer")}.
                </p>

                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  {[
                    { icon: Shield, text: t("secure_escrow_protection") },
                    { icon: TrendingUp, text: t("set_your_own_price") },
                    { icon: Wallet, text: t("multiple_payment_methods") },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.1 * i }}
                      className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20"
                    >
                      <item.icon className="h-4 w-4 text-white" />
                      <span className="text-sm text-white font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-60"
              >
                <Link href="/p2p/offer/create" className="w-full">
                  <Button
                    size="lg"
                    className={`w-full h-12 rounded-xl bg-white text-blue-600 hover:bg-white/90 font-semibold shadow-lg`}
                  >
                    {t("create_buy_offer")}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/p2p/offer/create" className="w-full">
                  <Button
                    size="lg"
                    variant="glass"
                    className="w-full h-12 rounded-xl"
                  >
                    {t("create_sell_offer")}
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Bottom trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 pt-6 border-t border-white/20"
            >
              <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                {[
                  t("zero_trading_fees"),
                  t("verified_traders"),
                  t("instant_settlement"),
                ].map((item, i) => (
                  <div key={i} className="flex items-center text-white/80 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2 text-white" />
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
