import {
  Type,
  AlignLeft,
  List,
  CheckSquare,
  Calendar,
  Upload,
  Hash,
  Mail,
  Phone,
  MapPin,
  Settings,
  Radio,
} from "lucide-react";
import type { ReactNode } from "react";

// Helper function to get the appropriate icon for a field type
export const getFieldIcon = (type: string): ReactNode => {
  switch (type) {
    case "TEXT":
      return <Type className="h-4 w-4" />;
    case "TEXTAREA":
      return <AlignLeft className="h-4 w-4" />;
    case "SELECT":
    case "MULTISELECT":
      return <List className="h-4 w-4" />;
    case "CHECKBOX":
      return <CheckSquare className="h-4 w-4" />;
    case "RADIO":
      return <Radio className="h-4 w-4" />;
    case "DATE":
      return <Calendar className="h-4 w-4" />;
    case "FILE":
      return <Upload className="h-4 w-4" />;
    case "NUMBER":
      return <Hash className="h-4 w-4" />;
    case "EMAIL":
      return <Mail className="h-4 w-4" />;
    case "PHONE":
      return <Phone className="h-4 w-4" />;
    case "ADDRESS":
      return <MapPin className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
};

// Get field type display name
export const getFieldTypeName = (type: string): string => {
  return type.charAt(0) + type.slice(1).toLowerCase();
};

// Get color for field type
export const getFieldTypeColor = (type: string): string => {
  switch (type) {
    case "TEXT":
    case "TEXTAREA":
    case "NUMBER":
      return "blue";
    case "SELECT":
    case "MULTISELECT":
    case "CHECKBOX":
    case "RADIO":
      return "purple";
    case "DATE":
    case "FILE":
      return "amber";
    case "EMAIL":
    case "PHONE":
    case "ADDRESS":
      return "emerald";
    default:
      return "gray";
  }
};

// Get category for field type
export const getFieldCategory = (type: string): string => {
  switch (type) {
    case "TEXT":
    case "TEXTAREA":
    case "NUMBER":
      return "Basic";
    case "SELECT":
    case "MULTISELECT":
    case "CHECKBOX":
    case "RADIO":
      return "Choice";
    case "DATE":
    case "FILE":
      return "Special";
    case "EMAIL":
    case "PHONE":
    case "ADDRESS":
      return "Contact";
    default:
      return "Other";
  }
};
