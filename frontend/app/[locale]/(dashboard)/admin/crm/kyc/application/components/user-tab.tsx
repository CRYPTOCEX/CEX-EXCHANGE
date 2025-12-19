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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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
      stiffness: 100,
      damping: 15,
    },
  },
};

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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 section-content"
      >
        <motion.div variants={itemVariants}>
          <UserProfileHeader
            user={user}
            userName={userName}
            userInitials={userInitials}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <ContactInformation
              user={user}
              copiedField={copiedField}
              onCopy={onCopy}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <AccountSecurity user={user} />
          </motion.div>
        </div>
      </motion.div>
    </CardContent>
  );
};
