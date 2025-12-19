"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  Zap,
  Star,
  Headphones,
  Activity,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { $fetch } from "@/lib/api";
import DataTable from "@/components/blocks/data-table";
import { useColumns } from "./columns";
import { useAnalytics } from "./analytics";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PAGE_PADDING } from "../../../theme-config";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
  hover: {
    y: -4,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 20,
    },
  },
};

// Animated counter component
const AnimatedCounter = ({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  );
};

// Stat card component
interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend?: string;
  trendIcon?: React.ElementType;
  gradient: string;
  iconBg: string;
  delay?: number;
}

const StatCard = ({
  title,
  value,
  suffix = "",
  icon: Icon,
  trend,
  trendIcon: TrendIcon,
  gradient,
  iconBg,
  delay = 0,
}: StatCardProps) => (
  <motion.div
    variants={statCardVariants}
    initial="hidden"
    animate="visible"
    whileHover="hover"
    transition={{ delay }}
  >
    <Card
      className={cn(
        "relative overflow-hidden border-0 shadow-lg backdrop-blur-sm",
        "bg-white/80 dark:bg-zinc-900/80",
        "hover:shadow-xl transition-shadow duration-300"
      )}
    >
      {/* Gradient accent */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", gradient)} />

      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <CardContent className="relative p-5 h-[140px]">
        <div className="flex items-start justify-between h-full">
          <div className="flex flex-col justify-between h-full min-w-0 flex-1 pr-2">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <motion.p
              className="text-3xl font-bold tracking-tight"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: delay + 0.2,
                type: "spring",
                stiffness: 200,
              }}
            >
              <AnimatedCounter value={value} suffix={suffix} />
            </motion.p>
            {trend && (
              <motion.div
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.4 }}
              >
                {TrendIcon && <TrendIcon className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">{trend}</span>
              </motion.div>
            )}
          </div>
          <motion.div
            className={cn("p-3 rounded-xl shrink-0", iconBg)}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function AdminSupportPage() {
  const t = useTranslations("common");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const columns = useColumns();
  const analytics = useAnalytics();

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    closed: 0,
    unassigned: 0,
    avgResponseTime: 0,
    satisfaction: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: statsData } = await $fetch({
        url: "/api/admin/crm/support/stat",
        silent: true,
        errorMessage: "Failed to load statistics",
      });
      if (statsData) {
        setStats({
          total: statsData.total || 0,
          open: statsData.open || 0,
          pending: statsData.pending || 0,
          closed: statsData.closed || 0,
          unassigned: statsData.unassigned || 0,
          avgResponseTime: statsData.avgResponseTime || 0,
          satisfaction: Number.parseFloat(statsData.satisfaction) || 0,
        });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary" />
          </motion.div>
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {t("loading_tickets")}...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const resolutionRate =
    stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0;

  return (
    <motion.div
      className={`space-y-6 container ${PAGE_PADDING}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Header */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 p-6 md:p-8">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <motion.div
                  className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25"
                  whileHover={{ scale: 1.05, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Headphones className="h-7 w-7 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {tDashboardAdmin("admin_support_center")}
                  </h1>
                  <p className="text-slate-400 text-sm md:text-base mt-0.5">
                    {tDashboardAdmin(
                      "manage_customer_support_expert_assistance"
                    )}
                  </p>
                </div>
              </motion.div>

              {/* Quick stats row */}
              <motion.div
                className="flex flex-wrap items-center gap-4 md:gap-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 bg-emerald-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-medium text-emerald-400">
                    {tDashboardAdmin("system_online")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm">
                    <span className="font-semibold text-white">
                      {stats.avgResponseTime}
                    </span>{" "}
                    min {t("avg_response").toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm">
                    <span className="font-semibold text-white">
                      {stats.satisfaction.toFixed(1)}
                    </span>{" "}
                    {tDashboardAdmin("out_of_5_rating")}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Decorative element */}
            <motion.div
              className="hidden lg:flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full blur-xl opacity-50"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <div className="relative flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">
                    {stats.open + stats.pending} Active
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        variants={containerVariants}
      >
        <StatCard
          title={t("total_tickets")}
          value={stats.total}
          icon={MessageCircle}
          trend={`${stats.total} ${t("all_time")}`}
          trendIcon={TrendingUp}
          gradient="bg-gradient-to-r from-blue-500 to-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
          delay={0}
        />
        <StatCard
          title={t("pending")}
          value={stats.pending}
          icon={Clock}
          trend={t("awaiting_response")}
          trendIcon={AlertCircle}
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          iconBg="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
          delay={0.05}
        />
        <StatCard
          title={tDashboardAdmin("unassigned")}
          value={stats.unassigned}
          icon={Users}
          trend={tDashboardAdmin("needs_attention")}
          trendIcon={Sparkles}
          gradient="bg-gradient-to-r from-red-500 to-rose-500"
          iconBg="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
          delay={0.1}
        />
        <StatCard
          title={t("resolved")}
          value={stats.closed}
          icon={CheckCircle}
          trend={`${resolutionRate}% ${t("success_rate")}`}
          trendIcon={ArrowUpRight}
          gradient="bg-gradient-to-r from-emerald-500 to-green-500"
          iconBg="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          delay={0.15}
        />
        <StatCard
          title={t("avg_response")}
          value={stats.avgResponseTime}
          suffix="m"
          icon={Zap}
          trend={t("lightning_fast")}
          trendIcon={Activity}
          gradient="bg-gradient-to-r from-violet-500 to-purple-500"
          iconBg="bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400"
          delay={0.2}
        />
      </motion.div>

      {/* Data Table */}
      <motion.div variants={itemVariants} className="relative">
        <DataTable
          apiEndpoint="/api/admin/crm/support/ticket"
          model="supportTicket"
          permissions={{
            access: "access.support.ticket",
            view: "view.support.ticket",
            create: "create.support.ticket",
            edit: "edit.support.ticket",
            delete: "delete.support.ticket",
          }}
          pageSize={12}
          canCreate={false}
          canEdit={false}
          canDelete={true}
          canView={true}
          title="Support Tickets"
          description="Manage customer support tickets and inquiries"
          itemTitle="Support Ticket"
          columns={columns}
          analytics={analytics}
          isParanoid={true}
          viewLink="/admin/crm/support/[id]"
        />
      </motion.div>
    </motion.div>
  );
}
