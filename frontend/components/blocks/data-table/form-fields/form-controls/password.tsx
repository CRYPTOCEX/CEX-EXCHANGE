import React from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface PasswordFormControlProps {
  field: any; // from react-hook-form
  error?: string; // the error message (e.g. "Required")
  placeholder: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
}

/**
 * A masked text field with a reveal toggle.
 *
 * Rendering this through `TextFormControl` with `type="password"` would be
 * shorter, but a password an operator cannot read back is a password they
 * mistype in silence — and the one field in the form whose error arrives from
 * the server, several seconds later, as "Incorrect password".
 */
export function PasswordFormControl({
  field,
  error,
  placeholder,
  icon: Icon,
  title,
  description,
}: PasswordFormControlProps) {
  const t = useTranslations("components_blocks");
  const tCommon = useTranslations("common");
  const [revealed, setRevealed] = React.useState(false);
  const safeValue = typeof field.value === "undefined" ? "" : field.value;

  return (
    <Input
      type={revealed ? "text" : "password"}
      value={safeValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        field.onChange(e.target.value)
      }
      placeholder={placeholder}
      error={!!error}
      errorMessage={error}
      icon={Icon}
      title={title}
      description={description}
      autoComplete="off"
      postfix={
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          aria-label={revealed ? tCommon("hide_password") : tCommon("show_password")}
          aria-pressed={revealed}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      }
    />
  );
}
