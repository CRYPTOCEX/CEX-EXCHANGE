"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Star, StarOff, Trash2, MoveUp, MoveDown, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
interface LaunchPlansListProps {
  plans: icoLaunchPlanAttributes[];
  onToggleStatus: (id: string) => void;
  onSetRecommended: (id: string) => void;
  onEdit: (plan: icoLaunchPlanAttributes) => void;
  onDelete: (id: string) => void;
  onReorder: (plans: icoLaunchPlanAttributes[]) => void;
}
export default function LaunchPlansList({
  plans,
  onToggleStatus,
  onSetRecommended,
  onEdit,
  onDelete,
  onReorder,
}: LaunchPlansListProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No launch plans configured. Add a plan to get started.
      </div>
    );
  }

  // Sort plans by sortOrder.
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newPlans = [...sortedPlans];
    const temp = newPlans[index];
    newPlans[index] = newPlans[index - 1];
    newPlans[index - 1] = temp;
    onReorder(newPlans);
  };
  const handleMoveDown = (index: number) => {
    if (index === sortedPlans.length - 1) return;
    const newPlans = [...sortedPlans];
    const temp = newPlans[index];
    newPlans[index] = newPlans[index + 1];
    newPlans[index + 1] = temp;
    onReorder(newPlans);
  };
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Features</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPlans.map((plan, index) => {
          return (
            <TableRow key={plan.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedPlans.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center space-x-2">
                  {plan.name}
                  {plan.recommended && (
                    <Badge variant="secondary" className="ml-2">
                      Recommended
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {plan.price} {plan.currency}
                <div className="text-xs text-muted-foreground">
                  {plan.walletType === "FIAT"
                    ? "Fiat"
                    : plan.walletType === "SPOT"
                      ? "Spot"
                      : plan.walletType === "ECO"
                        ? "Funding"
                        : plan.walletType}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Team: {plan.features.maxTeamMembers}</div>
                  <div>Roadmap: {plan.features.maxRoadmapItems}</div>
                  <div>Phases: {plan.features.maxOfferingPhases}</div>
                  <div>Posts: {plan.features.maxUpdatePosts}</div>{" "}
                  {/* Added posts support */}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={plan.status}
                    onCheckedChange={() => onToggleStatus(plan.id)}
                  />
                  <span>{plan.status ? "Active" : "Inactive"}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onSetRecommended(plan.id)}
                    title={
                      plan.recommended
                        ? "Remove recommended status"
                        : "Set as recommended"
                    }
                  >
                    {plan.recommended ? (
                      <StarOff className="h-4 w-4" />
                    ) : (
                      <Star className="h-4 w-4 text-yellow-500" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onEdit(plan)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Launch Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the {plan.name} plan?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(plan.id)}
                          variant={"destructive"}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
