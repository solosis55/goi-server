export type WorkoutSetRow = {
  reps: string;
  weight: string;
  setType: string;
};

export type WorkoutExerciseBlock = {
  exerciseId: string;
  equipmentSlug?: string;
  laterality?: "bilateral" | "unilateral";
  sets: WorkoutSetRow[];
};

export type Exercise = {
  id: string;
  name: string;
  muscles?: string[];
  equipmentTags?: string[];
  equipment?: string;
  description?: string;
  instructions?: string;
};

export type Workout = {
  id: string;
  userId: string;
  title: string;
  description: string;
  exerciseIds: string[];
  exerciseBlocks: WorkoutExerciseBlock[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSession = {
  id: string;
  userId: string;
  workoutId: string;
  performedAt: string;
  notes: string;
  snapshot?: unknown;
  createdAt: string;
};

export type WorkoutSessionWithTitle = WorkoutSession & {
  workoutTitle: string;
};

export type WorkoutSessionDetail = WorkoutSessionWithTitle & {
  authorUsername: string;
  authorAvatarUrl: string;
};
