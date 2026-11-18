import assert from 'node:assert/strict';

const baseUrl = process.env.FORGE_URL || 'http://127.0.0.1:3001';
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const password = 'Forge-smoke-test-password-2026';

async function request(path, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${baseUrl}/api${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = response.status === 204 ? null : await response.json();
  assert.ok(response.ok, `${method} ${path} returned ${response.status}: ${payload?.error || ''}`);
  return { response, payload };
}

const health = await request('/health');
assert.equal(health.payload.database, 'ok');

const firstEmail = `forge-smoke-${suffix}@example.test`;
const first = await request('/auth/register', {
  method: 'POST',
  body: { displayName: 'Forge Smoke', email: firstEmail, password },
});
const firstCookie = first.response.headers.get('set-cookie')?.split(';', 1)[0];
assert.ok(firstCookie, 'Registration should set the HttpOnly session cookie');
assert.equal((await request('/auth/me', { cookie: firstCookie })).payload.user.email, firstEmail);

const exerciseName = `Smoke Row ${suffix}`;
const exercise = await request('/exercises', {
  method: 'POST',
  cookie: firstCookie,
  body: { name: exerciseName, muscleGroup: 'Back', equipment: 'Cable' },
});
const exerciseId = exercise.payload.exercise.id;
const date = new Date().toISOString().slice(0, 10);
const saved = await request('/workouts', {
  method: 'POST',
  cookie: firstCookie,
  body: {
    title: 'Container smoke session',
    date,
    exercises: [{ exerciseId, sets: [{ reps: 8, weightKg: 42.5 }, { reps: 7, weightKg: 45 }] }],
  },
});
const workoutId = saved.payload.workout.id;
let detail = await request(`/workouts/${workoutId}`, { cookie: firstCookie });
assert.equal(detail.payload.workout.exercises[0].sets.length, 2, 'The full workout should save both sets');
assert.equal(detail.payload.workout.exercises[0].name, exerciseName);

const renamedExercise = `Renamed Row ${suffix}`;
await request(`/exercises/${exerciseId}`, { method: 'PATCH', cookie: firstCookie, body: { name: renamedExercise } });
detail = await request(`/workouts/${workoutId}`, { cookie: firstCookie });
assert.equal(detail.payload.workout.exercises[0].name, renamedExercise, 'Exercise renames should appear in history');
await request(`/exercises/${exerciseId}`, { method: 'PATCH', cookie: firstCookie, body: { archived: true } });
detail = await request(`/workouts/${workoutId}`, { cookie: firstCookie });
assert.equal(detail.payload.workout.exercises[0].name, renamedExercise, 'Archiving should preserve historical links');

await request('/checkins', {
  method: 'POST',
  cookie: firstCookie,
  body: { date, bodyweightKg: 81.2, waistCm: 82 },
});
const checkins = await request('/checkins', { cookie: firstCookie });
assert.equal(Number(checkins.payload.checkins[0].bodyweightKg), 81.2);
const dashboard = await request('/dashboard', { cookie: firstCookie });
assert.ok(Number(dashboard.payload.workoutsThisWeek) >= 1);
const progress = await request(`/progress?exerciseId=${exerciseId}`, { cookie: firstCookie });
assert.equal(progress.payload.progress.length, 1);
assert.equal(Number(progress.payload.progress[0].maxWeightKg), 45);

const secondEmail = `forge-smoke-other-${suffix}@example.test`;
const second = await request('/auth/register', {
  method: 'POST',
  body: { displayName: 'Other Smoke', email: secondEmail, password },
});
const secondCookie = second.response.headers.get('set-cookie')?.split(';', 1)[0];
assert.ok(secondCookie);
const otherWorkouts = await request('/workouts', { cookie: secondCookie });
assert.equal(otherWorkouts.payload.workouts.length, 0, 'A second user should not see the first user’s workouts');
const otherExercises = await request('/exercises', { cookie: secondCookie });
assert.ok(!otherExercises.payload.exercises.some((item) => item.id === exerciseId), 'A second user should not see custom exercises');

await request('/auth/login', {
  method: 'POST',
  body: { email: firstEmail, password },
});

console.log('FORGE container smoke test passed: database, auth, workouts, rename/archive, check-ins, progress, and user isolation.');
