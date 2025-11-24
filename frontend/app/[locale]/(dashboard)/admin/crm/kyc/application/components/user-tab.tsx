import { CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  AccountSecurity,
  ContactInformation,
  UserProfileHeader,
} from "./user-profile";

interface UserProfileTabProps {
  user: any;
  userName: string;
  userInitials: string;
  copiedField: string | null;
  onCopy: (text: string, fieldId: string) => void;
}

export const UserProfileTab = ({
  user,
  userName,
  userInitials,
  copiedField,
  onCopy,
}: UserProfileTabProps) => {
  return (
    <CardContent className="pt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 section-content"
      >
        <UserProfileHeader
          user={user}
          userName={userName}
          userInitials={userInitials}
        />

        <div className="grid grid-cols-1 gap-6">
          <ContactInformation
            user={user}
            copiedField={copiedField}
            onCopy={onCopy}
          />
          <AccountSecurity user={user} />
        </div>
      </motion.div>
    </CardContent>
  );
};
