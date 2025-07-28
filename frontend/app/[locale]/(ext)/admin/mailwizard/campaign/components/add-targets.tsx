import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useCampaignStore } from "./store";
import { useTranslations } from "next-intl";

export function AddTargetsDialog() {
  const t = useTranslations("ext");
  const {
    open,
    setOpen,
    users,
    selectedUsers,
    userFilter,
    setUserFilter,
    userPagination,
    setUserPagination,
    totalUsersInDatabase,
    isLoading,
    handleAddAllUsers,
    handleAddUsers,
    handleSelectUser,
    items,
    fetchUsers,
    setSelectedUsers,
  } = useCampaignStore();

  // 1) FETCH USERS WHEN DIALOG OPENS OR FILTER/PAGINATION CHANGES
  useEffect(() => {
    if (open) {
      fetchUsers(
        userFilter,
        userPagination.currentPage,
        userPagination.perPage,
        false
      );
    }
  }, [
    open,
    userFilter,
    userPagination.currentPage,
    userPagination.perPage,
    fetchUsers,
  ]);

  // 2) Pre-check users if they are already in the campaign items
  useEffect(() => {
    if (open) {
      const existingIds = items.map((item) => item.id);
      setSelectedUsers(users.filter((u) => existingIds.includes(u.id)));
    }
  }, [open, items, users, setSelectedUsers]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Icon icon="mdi:plus" className="mr-1 h-4 w-4" />
          {t("add_targets")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("select_targets")}</DialogTitle>
          <DialogDescription>
            {t("please_select_the_this_campaign")}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4">
            <Input
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Search users..."
              icon="lucide:search"
              iconPosition="left"
              className="w-full"
            />
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border-zinc-200 dark:border-zinc-700">
            {users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUsers.some((u) => u.id === user.id)}
                    onCheckedChange={() => handleSelectUser(user)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar || "/img/avatars/placeholder.webp"}
                    />
                    <AvatarFallback>{user.firstName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {user.email}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <Icon
                  icon="arcticons:samsung-finder"
                  className="mx-auto h-16 w-16 text-zinc-500 dark:text-zinc-400"
                />
                <h3 className="mt-2 text-lg font-medium">
                  {t("no_users_found")}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("try_adjusting_your_search_terms")}.
                </p>
              </div>
            )}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    userPagination.currentPage > 1 &&
                    setUserPagination({
                      ...userPagination,
                      currentPage: userPagination.currentPage - 1,
                    })
                  }
                />
              </PaginationItem>
              {Array.from({ length: userPagination.totalPages }, (_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    isActive={i + 1 === userPagination.currentPage}
                    onClick={() =>
                      setUserPagination({
                        ...userPagination,
                        currentPage: i + 1,
                      })
                    }
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    userPagination.currentPage < userPagination.totalPages &&
                    setUserPagination({
                      ...userPagination,
                      currentPage: userPagination.currentPage + 1,
                    })
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("selected")}
              {selectedUsers.length}
              {t("targets")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleAddAllUsers}
                disabled={isLoading || items.length === totalUsersInDatabase}
              >
                {t("select_all")}
              </Button>
              <Button
                onClick={handleAddUsers}
                disabled={isLoading || selectedUsers.length === 0}
              >
                {t("add_selected")}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
