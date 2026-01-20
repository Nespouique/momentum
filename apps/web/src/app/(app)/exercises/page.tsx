"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Search, X, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout";
import {
  ExerciseCard,
  ExerciseFormModal,
  DeleteExerciseDialog,
  MuscleGroupFilter,
} from "@/components/exercises";
import { useAuthStore } from "@/stores/auth";
import {
  getExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  type Exercise,
} from "@/lib/api/exercises";
import { ExerciseFormValues } from "@/lib/validations/exercise";
import { MuscleGroup } from "@/lib/constants/muscle-groups";
import { toast } from "sonner";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Empty State Component
function EmptyState({
  hasFilter,
  searchQuery,
  onAdd,
}: {
  hasFilter: boolean;
  searchQuery: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-500/20 to-transparent border border-zinc-500/20">
        <Dumbbell className="h-8 w-8 text-zinc-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        {hasFilter || searchQuery ? "Aucun résultat" : "Aucun exercice"}
      </h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        {searchQuery
          ? `Aucun exercice ne correspond à "${searchQuery}"`
          : hasFilter
            ? "Aucun exercice dans cette catégorie"
            : "Commencez par ajouter des exercices à la bibliothèque"}
      </p>
      {!hasFilter && !searchQuery && (
        <Button onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un exercice
        </Button>
      )}
    </div>
  );
}

export default function ExercisesPage() {
  const { token } = useAuthStore();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroup[]>([]);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load all exercises once on mount
  const loadExercises = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const data = await getExercises(token);
      setExercises(data.data);
    } catch (error) {
      console.error("Failed to load exercises:", error);
      toast.error("Erreur lors du chargement des exercices");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  // Filter exercises client-side by muscle groups and search query
  const filteredExercises = useMemo(() => {
    let result = exercises;

    // Filter by muscle groups (exercise must have ALL selected groups)
    if (selectedMuscleGroups.length > 0) {
      result = result.filter((exercise) =>
        selectedMuscleGroups.every((group) => exercise.muscleGroups.includes(group))
      );
    }

    // Filter by search query
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter((exercise) =>
        exercise.name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [exercises, selectedMuscleGroups, debouncedSearch]);

  // Sort exercises alphabetically
  const sortedExercises = useMemo(() => {
    return [...filteredExercises].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [filteredExercises]);

  // Handlers
  const handleAddClick = () => {
    setEditingExercise(null);
    setShowFormModal(true);
  };

  const handleEditClick = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowFormModal(true);
  };

  const handleDeleteClick = (exercise: Exercise) => {
    setDeletingExercise(exercise);
  };

  const handleFormSubmit = async (data: ExerciseFormValues) => {
    if (!token) return;

    setIsSubmitting(true);
    try {
      if (editingExercise) {
        await updateExercise(token, editingExercise.id, data);
        toast.success("Exercice modifié");
      } else {
        await createExercise(token, data);
        toast.success("Exercice créé");
      }
      setShowFormModal(false);
      setEditingExercise(null);
      loadExercises();
    } catch (error) {
      console.error("Failed to save exercise:", error);
      toast.error(editingExercise ? "Erreur lors de la modification" : "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!token || !deletingExercise) return;

    setIsDeleting(true);
    try {
      await deleteExercise(token, deletingExercise.id);
      toast.success("Exercice supprimé");
      setDeletingExercise(null);
      loadExercises();
    } catch (error) {
      console.error("Failed to delete exercise:", error);
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="pb-24">
        <PageHeader
          title="Exercices"
          actions={
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          }
        />
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-secondary/50" />
          <div className="h-10 animate-pulse rounded-lg bg-secondary/50" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Exercices"
        actions={
          <Button size="sm" onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        }
      />

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher un exercice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 bg-zinc-900/50 border-zinc-800 focus:border-zinc-700"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Muscle group filter */}
      <div className="mb-6">
        <MuscleGroupFilter
          selected={selectedMuscleGroups}
          onChange={setSelectedMuscleGroups}
        />
      </div>

      {/* Exercise list */}
      {sortedExercises.length === 0 ? (
        <EmptyState
          hasFilter={selectedMuscleGroups.length > 0}
          searchQuery={debouncedSearch}
          onAdd={handleAddClick}
        />
      ) : (
        <div className="space-y-2">
          {sortedExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onEdit={() => handleEditClick(exercise)}
              onDelete={() => handleDeleteClick(exercise)}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {sortedExercises.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-6">
          {sortedExercises.length} exercice{sortedExercises.length > 1 ? "s" : ""}
          {debouncedSearch && ` pour "${debouncedSearch}"`}
        </p>
      )}

      {/* Form Modal */}
      <ExerciseFormModal
        open={showFormModal}
        onOpenChange={(open) => {
          setShowFormModal(open);
          if (!open) setEditingExercise(null);
        }}
        exercise={editingExercise}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Delete Dialog */}
      <DeleteExerciseDialog
        open={!!deletingExercise}
        onOpenChange={(open) => {
          if (!open) setDeletingExercise(null);
        }}
        exercise={deletingExercise}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
