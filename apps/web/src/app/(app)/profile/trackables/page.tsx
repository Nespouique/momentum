"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { getTrackables, reorderTrackables, type Trackable } from "@/lib/api/trackables";
import { TrackableConfigCard } from "@/components/tracking/trackable-config-card";
import { CreateTrackableModal } from "@/components/tracking/create-trackable-modal";

function SortableTrackableCard({
  trackable,
  onUpdate,
  onEdit,
}: {
  trackable: Trackable;
  onUpdate: () => void;
  onEdit: (t: Trackable) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: trackable.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TrackableConfigCard
        trackable={trackable}
        onUpdate={onUpdate}
        onEdit={onEdit}
        showDragHandle
        dragHandleProps={{ attributes, listeners }}
        isDragging={isDragging}
      />
    </div>
  );
}

export default function TrackablesConfigPage() {
  const { token } = useAuthStore();
  const [trackables, setTrackables] = useState<Trackable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTrackable, setEditingTrackable] = useState<Trackable | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadTrackables = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await getTrackables(token);
      setTrackables(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTrackables();
  }, [loadTrackables]);

  const systemTrackables = trackables.filter((t) => t.isSystem);
  const customTrackables = trackables.filter((t) => !t.isSystem);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !token) return;

    const oldIndex = customTrackables.findIndex((t) => t.id === active.id);
    const newIndex = customTrackables.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(customTrackables, oldIndex, newIndex);

    // Optimistic update
    const previousTrackables = trackables;
    setTrackables([...systemTrackables, ...reordered]);

    try {
      const items = reordered.map((item, index) => ({
        id: item.id,
        sortOrder: index,
      }));

      await reorderTrackables(token, items);
      await loadTrackables();
    } catch (err) {
      setTrackables(previousTrackables);
      toast.error("Erreur lors du réordonnancement");
    }
  };

  const handleRefresh = () => {
    loadTrackables();
  };

  if (isLoading) {
    return (
      <div className="pb-8">
        <PageHeader title="Configuration du suivi" showBack />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-8">
        <PageHeader title="Configuration du suivi" showBack />
        <div className="text-center py-12">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={loadTrackables}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <PageHeader title="Configuration du suivi" showBack />

      <div className="space-y-8">
        {/* System Trackables Section */}
        {systemTrackables.length > 0 && (
          <div>
            <div className="flex items-center gap-2 pt-4 pb-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Trackables système (Health Connect)
              </h3>
              <div className="flex-1 h-px bg-linear-to-r from-primary/30 to-transparent" />
            </div>
            <div className="space-y-2">
              {systemTrackables.map((trackable) => (
                <TrackableConfigCard
                  key={trackable.id}
                  trackable={trackable}
                  onUpdate={handleRefresh}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom Trackables Section */}
        <div>
          <div className="flex items-center gap-2 pt-4 pb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Trackables personnalisés
            </h3>
            <div className="flex-1 h-px bg-linear-to-r from-primary/30 to-transparent" />
          </div>

          {customTrackables.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={customTrackables.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {customTrackables.map((trackable) => (
                    <SortableTrackableCard
                      key={trackable.id}
                      trackable={trackable}
                      onUpdate={handleRefresh}
                      onEdit={(t) => setEditingTrackable(t)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <h3 className="mb-2 text-lg font-semibold">Aucun trackable personnalisé</h3>
              <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                Ajoutez des éléments personnalisés pour suivre vos habitudes quotidiennes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          size="lg"
          onClick={() => setCreateModalOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg shadow-black/30 p-0"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <CreateTrackableModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleRefresh}
      />

      <CreateTrackableModal
        open={!!editingTrackable}
        onOpenChange={(open) => { if (!open) setEditingTrackable(null); }}
        onSuccess={handleRefresh}
        trackable={editingTrackable ?? undefined}
      />
    </div>
  );
}
