const fail = (message) => {
  const error = new Error(message);
  error.status = 400;
  throw error;
};

const text = (value, label, max, optional = false) => {
  if (value == null && optional) return null;
  if (typeof value !== 'string') fail(`${label} must be text`);
  const normalized = value.trim();
  if (!normalized && optional) return null;
  if (!normalized || normalized.length > max) fail(`${label} must be between 1 and ${max} characters`);
  return normalized;
};

const number = (value, label, min, max, optional = true) => {
  if ((value === '' || value == null) && optional) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) fail(`${label} is out of range`);
  return parsed;
};

const validDate = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function validateRegistration(body = {}) {
  const email = text(body.email, 'Email', 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address');
  const password = body.password;
  if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password, 'utf8') > 72) {
    fail('Password must be at least 10 characters and at most 72 bytes');
  }
  const displayName = text(body.displayName, 'Name', 80);
  return { email, password, displayName };
}

export function validateLogin(body = {}) {
  const email = text(body.email, 'Email', 255).toLowerCase();
  if (typeof body.password !== 'string' || !body.password) fail('Password is required');
  return { email, password: body.password };
}

export function validateExercise(body = {}) {
  return {
    name: text(body.name, 'Exercise name', 100),
    muscleGroup: text(body.muscleGroup, 'Muscle group', 60),
    equipment: text(body.equipment, 'Equipment', 60, true),
  };
}

export function validateWorkout(body = {}) {
  const title = body.title == null || body.title === '' ? 'Training session' : text(body.title, 'Workout title', 100);
  const notes = text(body.notes, 'Notes', 1000, true);
  let date = body.date || new Date().toISOString().slice(0, 10);
  if (!validDate(date)) {
    fail('Workout date must use YYYY-MM-DD');
  }
  if (!Array.isArray(body.exercises) || body.exercises.length < 1 || body.exercises.length > 40) {
    fail('Add between 1 and 40 exercises');
  }
  const exercises = body.exercises.map((exercise, index) => {
    if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) fail(`Exercise ${index + 1} is invalid`);
    const exerciseId = Number(exercise.exerciseId);
    if (!Number.isSafeInteger(exerciseId) || exerciseId < 1) fail(`Exercise ${index + 1} is invalid`);
    if (!Array.isArray(exercise.sets) || exercise.sets.length < 1 || exercise.sets.length > 20) {
      fail(`Exercise ${index + 1} needs between 1 and 20 sets`);
    }
    const sets = exercise.sets.map((set, setIndex) => {
      if (!set || typeof set !== 'object' || Array.isArray(set)) fail(`Set ${setIndex + 1} is invalid`);
      const reps = number(set.reps, 'Reps', 1, 100);
      const weightKg = number(set.weightKg, 'Weight', 0, 2000);
      const durationSeconds = number(set.durationSeconds, 'Duration', 1, 86400);
      if (reps == null && durationSeconds == null) fail(`Set ${setIndex + 1} needs reps or a duration`);
      if (typeof set.isWarmup !== 'undefined' && typeof set.isWarmup !== 'boolean') fail('Warm-up must be true or false');
      return { reps, weightKg, durationSeconds, isWarmup: Boolean(set.isWarmup) };
    });
    return { exerciseId, sets };
  });
  return { title, date, notes, exercises };
}

export function validateCheckin(body = {}) {
  const date = body.date || new Date().toISOString().slice(0, 10);
  if (!validDate(date)) {
    fail('Check-in date must use YYYY-MM-DD');
  }
  const fields = {
    bodyweightKg: number(body.bodyweightKg, 'Body weight', 20, 500),
    bodyFatPct: number(body.bodyFatPct, 'Body fat', 1, 80),
    waistCm: number(body.waistCm, 'Waist', 20, 250),
    hipsCm: number(body.hipsCm, 'Hips', 20, 250),
    chestCm: number(body.chestCm, 'Chest', 20, 250),
    armCm: number(body.armCm, 'Arm', 5, 100),
    thighCm: number(body.thighCm, 'Thigh', 10, 150),
  };
  if (Object.values(fields).every((value) => value == null)) fail('Add at least one measurement');
  return { date, ...fields, notes: text(body.notes, 'Notes', 1000, true) };
}
