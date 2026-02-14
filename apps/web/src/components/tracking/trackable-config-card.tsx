"use client";

import { useState } from "react";
import { GripVertical, Trash2, Circle } from "lucide-react";
import { toast } from "sonner";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { getIconComponent } from "@/lib/icons";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useAuthStore } from "@/stores/auth";
import { updateTrackable, deleteTrackable, type Trackable } from "@/lib/api/trackables";
import { GoalEditModal } from "./goal-edit-modal";
import { cn } from "@/lib/utils";

interface DragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

interface TrackableConfigCardProps {
  trackable: Trackable;
  onUpdate?: () => void;
  onEdit?: (trackable: Trackable) => void;
  showDragHandle?: boolean;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
}

function formatSleepHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "jour",
  weekly: "semaine",
  monthly: "mois",
};

export function TrackableConfigCard({
  trackable,
  onUpdate,
  onEdit,
  showDragHandle = false,
  dragHandleProps,
  isDragging = false,
}: TrackableConfigCardProps) {
  const { token } = useAuthStore();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const IconComponent = getIconComponent(trackable.icon) || Circle;

  const handleToggle = async (checked: boolean) => {
    if (!token) return;

    setIsUpdating(true);
    try {
      await updateTrackable(token, trackable.id, { isActive: checked });
      onUpdate?.();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;

    setIsDeleting(true);
    try {
      await deleteTrackable(token, trackable.id);
      toast.success("Trackable supprimé");
      setDeleteDialogOpen(false);
      onUpdate?.();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    if (!trackable.isSystem && onEdit) {
      onEdit(trackable);
    } else {
      setGoalModalOpen(true);
    }
  };

  const isSleep = trackable.name === "Durée sommeil";
  const goalText = trackable.goal
    ? isSleep
      ? `${formatSleepHours(trackable.goal.targetValue)}/${FREQUENCY_LABELS[trackable.goal.frequency]}`
      : `${trackable.goal.targetValue}${trackable.unit ? " " + trackable.unit : ""}/${FREQUENCY_LABELS[trackable.goal.frequency]}`
    : "Aucun objectif";

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50",
          "transition-all duration-200 cursor-pointer active:scale-[0.98]",
          !trackable.isActive && "opacity-60",
          isDragging && "opacity-50"
        )}
        onClick={handleCardClick}
      >
        {/* Drag Handle */}
        {showDragHandle && !trackable.isSystem && dragHandleProps && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-1 -ml-1 touch-none"
            onClick={(e) => e.stopPropagation()}
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="w-5 h-5" />
          </button>
        )}

        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: trackable.color }}
        >
          {IconComponent && <IconComponent className="w-5 h-5 text-white" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-sm truncate">{trackable.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{goalText}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={trackable.isActive}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
            aria-label={`Activer ${trackable.name}`}
          />

          {!trackable.isSystem && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <GoalEditModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        trackable={trackable}
        onSuccess={onUpdate}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le trackable"
        description={
          <>
            Êtes-vous sûr de vouloir supprimer <strong>{trackable.name}</strong> ? Cette action est
            irréversible et supprimera toutes les données associées.
          </>
        }
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
