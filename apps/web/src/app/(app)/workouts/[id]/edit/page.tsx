"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkoutBuilder } from "@/components/workouts";
import { useAuthStore } from "@/stores/auth";
import { getWorkout, type Workout } from "@/lib/api/workouts";
import { toast } from "sonner";

export default function EditWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const workoutId = params["id"] as string;

  useEffect(() => {
    async function loadWorkout() {
      if (!token || !workoutId) return;

      try {
        const data = await getWorkout(token, workoutId);
        setWorkout(data);
      } catch (error) {
        console.error("Failed to load workout:", error);
        toast.error("Programme non trouvé");
        router.push("/workouts");
      } finally {
        setIsLoading(false);
      }
    }

    loadWorkout();
  }, [token, workoutId, router]);

  if (isLoading) {
    return (
      <div className="pb-24">
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-secondary/50" />
          <div className="h-10 animate-pulse rounded-lg bg-secondary/50" />
          <div className="h-20 animate-pulse rounded-lg bg-secondary/50" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/50" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!workout) {
    return null;
  }

  return <WorkoutBuilder workout={workout} mode="edit" />;
}
