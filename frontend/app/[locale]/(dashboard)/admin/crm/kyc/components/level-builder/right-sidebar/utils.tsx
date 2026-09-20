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

// Colour and category now live in ../field-tokens: see FIELD_TONE and
// getFieldCategoryLabel. The copy that used to sit here returned a bare hue
// name that callers pasted into a template literal, which Tailwind never sees.
