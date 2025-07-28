import React from "react";
import PropTypes from "prop-types";
import {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Activity,
  BarChart,
  PieChart,
  TrendingUp,
} from "lucide-react";

interface IconProps {
  icon?: string;
}

const iconMap: Record<string, React.ElementType> = {
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Activity,
  BarChart,
  PieChart,
  TrendingUp,
};

// 1) define base function
function IconImpl({ icon }: IconProps) {
  if (!icon) return null;
  const IconComponent = iconMap[icon];
  if (!IconComponent) return null;

  return <IconComponent className="h-5 w-5 text-muted-foreground" />;
}

// 2) define propTypes on the base function
IconImpl.propTypes = {
  icon: PropTypes.oneOf(Object.keys(iconMap)),
};

IconImpl.displayName = "Icon";

// 3) wrap in memo
export const Icon = React.memo(IconImpl);
