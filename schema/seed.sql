USE forge;

INSERT INTO exercises (owner_id, name, muscle_group, equipment)
SELECT NULL, seed.name, seed.muscle_group, seed.equipment
FROM (
  SELECT 'Barbell Bench Press' AS name, 'Chest' AS muscle_group, 'Barbell' AS equipment
  UNION ALL SELECT 'Incline Dumbbell Press', 'Chest', 'Dumbbell'
  UNION ALL SELECT 'Cable Fly', 'Chest', 'Cable'
  UNION ALL SELECT 'Overhead Press', 'Shoulders', 'Barbell'
  UNION ALL SELECT 'Dumbbell Lateral Raise', 'Shoulders', 'Dumbbell'
  UNION ALL SELECT 'Face Pull', 'Shoulders', 'Cable'
  UNION ALL SELECT 'Barbell Back Squat', 'Quadriceps', 'Barbell'
  UNION ALL SELECT 'Romanian Deadlift', 'Hamstrings', 'Barbell'
  UNION ALL SELECT 'Leg Press', 'Quadriceps', 'Machine'
  UNION ALL SELECT 'Leg Curl', 'Hamstrings', 'Machine'
  UNION ALL SELECT 'Walking Lunge', 'Legs', 'Dumbbell'
  UNION ALL SELECT 'Standing Calf Raise', 'Calves', 'Machine'
  UNION ALL SELECT 'Conventional Deadlift', 'Back', 'Barbell'
  UNION ALL SELECT 'Barbell Row', 'Back', 'Barbell'
  UNION ALL SELECT 'Lat Pulldown', 'Back', 'Cable'
  UNION ALL SELECT 'Pull-Up', 'Back', 'Bodyweight'
  UNION ALL SELECT 'Seated Cable Row', 'Back', 'Cable'
  UNION ALL SELECT 'Barbell Curl', 'Biceps', 'Barbell'
  UNION ALL SELECT 'Dumbbell Curl', 'Biceps', 'Dumbbell'
  UNION ALL SELECT 'Triceps Pushdown', 'Triceps', 'Cable'
  UNION ALL SELECT 'Overhead Triceps Extension', 'Triceps', 'Cable'
  UNION ALL SELECT 'Hip Thrust', 'Glutes', 'Barbell'
  UNION ALL SELECT 'Hanging Knee Raise', 'Core', 'Bodyweight'
  UNION ALL SELECT 'Plank', 'Core', 'Bodyweight'
) AS seed
WHERE NOT EXISTS (
  SELECT 1 FROM exercises existing
  WHERE existing.owner_id IS NULL AND existing.name = seed.name
);
