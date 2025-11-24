"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLaunchPlanStore } from "@/store/ico/launch-plan-store";
import { useTeamMemberStore } from "@/store/ico/creator/team-member-store";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
import { Link } from "@/i18n/routing";
import SearchSortBar from "./search";
import TeamMemberGridItem from "./grid";
import TeamMemberListItem from "./list";
import DeleteConfirmationDialog from "./delete-dialog";
import LoadingTeam from "./loading";
import TeamMemberSheet from "./sheet";
import { useTranslations } from "next-intl";

type TokenTeamProps = {
  tokenId: string;
};

export default function TokenTeam({ tokenId }: TokenTeamProps) {
  const t = useTranslations("ext");
  const { currentToken, isLoadingToken, tokenError } = useCreatorStore();
  const { teamMembers, isLoading, fetchTeamMembers, removeTeamMember } =
    useTeamMemberStore();
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] =
    useState<icoTeamMemberAttributes | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"name" | "role" | "recent">(
    "recent"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const containerRef = useRef<HTMLDivElement>(null);

  // Check plan limit using currentToken from creator store
  const [canAddMore, setCanAddMore] = useState(true);
  const { canAddTeamMember } = useLaunchPlanStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  // When tokenId changes, fetch team members.
  useEffect(() => {
    if (tokenId) {
      fetchTeamMembers(tokenId);
    }
  }, [tokenId, fetchTeamMembers]);

  // Check plan limit whenever token details or team members change.
  useEffect(() => {
    const checkLimit = async () => {
      if (currentToken) {
        const planId = currentToken.plan?.id;
        if (planId) {
          const result = await canAddTeamMember(planId, teamMembers.length);
          setCanAddMore(result);
        }
      }
    };
    checkLimit();
  }, [currentToken, canAddTeamMember, teamMembers]);

  // Refresh team members data.
  const refreshData = () => {
    if (tokenId) {
      fetchTeamMembers(tokenId);
    }
  };

  const handleAddSuccess = () => {
    setIsAddingMember(false);
    refreshData();
  };

  const handleEditSuccess = () => {
    setEditingMember(null);
    refreshData();
  };

  const handleDelete = async (memberId: string) => {
    await removeTeamMember(tokenId, memberId);
    setShowDeleteConfirm(null);
    refreshData();
  };

  if (isLoadingToken || isLoading) {
    return <LoadingTeam />;
  }

  if (tokenError || !currentToken) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-50">
        <AlertTitle>{t("error_loading_team")}</AlertTitle>
        <AlertDescription>
          {tokenError || "Failed to load token data"}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={refreshData}
          >
            {t("Retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Filtering and sorting logic.
  const getFilteredMembers = () => {
    if (!searchQuery.trim()) return teamMembers;
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query) ||
        member.bio.toLowerCase().includes(query)
    );
  };

  const getSortedMembers = (members: icoTeamMemberAttributes[]) => {
    return [...members].sort((a, b) => {
      if (sortOrder === "name") return a.name.localeCompare(b.name);
      if (sortOrder === "role") return a.role.localeCompare(b.role);
      if (sortOrder === "recent" && a.createdAt && b.createdAt) {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return 0;
    });
  };

  const filteredMembers = getFilteredMembers();
  const sortedMembers = getSortedMembers(filteredMembers);

  const planIdLocal = currentToken.plan?.id;
  const upgradeLink = `/ico/creator/token/${tokenId}/plan/upgrade?currentPlan=${planIdLocal}`;

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
            {t("team_members")}
          </h2>
          <p className="text-muted-foreground">
            {t("showcase_the_talented_token_project")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={!canAddMore}
            onClick={() => setIsAddingMember(true)}
            className="shadow-sm"
          >
            {t("add_team_member")}
          </Button>
        </div>
      </div>

      {/* Alert for plan limit */}
      {!canAddMore && (
        <Alert className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
          <p>
            {t(
              "You've reached the maximum number of team members for your plan"
            )}
            .{" "}
            <Link
              href={upgradeLink}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {t("upgrade_to_add_more")}
            </Link>
          </p>
        </Alert>
      )}

      {/* Search and Sort Toolbar */}
      {teamMembers.length > 0 && (
        <SearchSortBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />
      )}

      {/* Team members list */}
      {teamMembers.length === 0 ? (
        <div className="p-10 text-center">
          <p>
            {t("no_team_members_yet")}. {t("add_your_first_team_member")}.
          </p>
        </div>
      ) : sortedMembers.length === 0 ? (
        <Alert className="bg-muted/50">
          <AlertTitle>{t("no_matching_team_members")}</AlertTitle>
          <AlertDescription>
            {t("try_adjusting_your_looking_for")}.
          </AlertDescription>
        </Alert>
      ) : viewMode === "grid" ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {sortedMembers.map((member) => (
              <TeamMemberGridItem
                key={member.id}
                member={member}
                itemVariants={itemVariants}
                onEdit={() => setEditingMember(member)}
                onDelete={() => setShowDeleteConfirm(member.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {sortedMembers.map((member, index) => (
              <TeamMemberListItem
                key={member.id}
                member={member}
                index={index}
                onEdit={() => setEditingMember(member)}
                onDelete={() => setShowDeleteConfirm(member.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Use the Sheet for both adding and editing */}
      {(isAddingMember || editingMember) && (
        <TeamMemberSheet
          isOpen={isAddingMember || !!editingMember}
          tokenId={tokenId}
          // For adding, member will be undefined
          member={editingMember || undefined}
          onSuccess={editingMember ? handleEditSuccess : handleAddSuccess}
          onCancel={() => {
            setIsAddingMember(false);
            setEditingMember(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(null)}
        onDelete={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        isSubmitting={false}
      />
    </div>
  );
}
