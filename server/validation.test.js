import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckin, validateExercise, validateLogin, validateRegistration, validateWorkout } from './validation.js';

test('normalizes registration and login email addresses', () => {
  assert.equal(validateRegistration({ email: '  Lifter@Example.com ', password: 'strong-password', displayName: 'Lifter' }).email, 'lifter@example.com');
  assert.equal(validateLogin({ email: 'LIFTER@example.com', password: 'pw' }).email, 'lifter@example.com');
});

test('rejects short passwords and malformed emails', () => {
  assert.throws(() => validateRegistration({ email: 'bad', password: 'short', displayName: 'Lifter' }), /valid email/);
  assert.throws(() => validateRegistration({ email: 'lifter@example.com', password: 'short', displayName: 'Lifter' }), /Password/);
});

test('validates a complete workout and rejects missing set values', () => {
  const workout = validateWorkout({ title: 'Push', date: '2026-11-18', exercises: [{ exerciseId: '2', sets: [{ reps: '8', weightKg: '50' }] }] });
  assert.equal(workout.exercises[0].exerciseId, 2);
  assert.equal(workout.exercises[0].sets[0].weightKg, 50);
  assert.throws(() => validateWorkout({ exercises: [{ exerciseId: 2, sets: [{}] }] }), /needs reps or a duration/);
  assert.throws(() => validateWorkout({ date: '2026-02-31', exercises: [{ exerciseId: 2, sets: [{ reps: 8 }] }] }), /YYYY-MM-DD/);
});

test('requires at least one physique measurement', () => {
  assert.throws(() => validateCheckin({}), /at least one measurement/);
  assert.equal(validateCheckin({ bodyweightKg: '82.5' }).bodyweightKg, 82.5);
});

test('normalizes exercise fields and accepts optional equipment', () => {
  assert.deepEqual(validateExercise({ name: ' Squat ', muscleGroup: ' Legs ', equipment: '' }), { name: 'Squat', muscleGroup: 'Legs', equipment: null });
});
