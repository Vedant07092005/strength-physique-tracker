import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { validateCheckin, validateExercise, validateLogin, validateRegistration, validateWorkout } from './validation.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters');
}

const app = express();
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COOKIE_NAME = 'forge_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

function issueToken(user) {
  return jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
}

function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, issueToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

function requireUser(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Sign in to continue' });
  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const id = Number(claims.sub);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid session');
    req.user = { id };
    return next();
  } catch {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  }
}

function parseId(value, label = 'ID') {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    const error = new Error(`${label} is invalid`);
    error.status = 400;
    throw error;
  }
  return id;
}

function optionalName(body) {
  if (typeof body.name !== 'string') {
    const error = new Error('Exercise name is required');
    error.status = 400;
    throw error;
  }
  const name = body.name.trim();
  if (!name || name.length > 100) {
    const error = new Error('Exercise name must be between 1 and 100 characters');
    error.status = 400;
    throw error;
  }
  return name;
}

router.get('/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, displayName } = validateRegistration(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      'INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)',
      [email, displayName, passwordHash],
    );
    const user = { id: result.insertId, email, displayName };
    setSessionCookie(res, user);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = validateLogin(req.body);
    const [rows] = await pool.execute(
      'SELECT id, email, display_name AS displayName, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect' });
    }
    setSessionCookie(res, user);
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  res.status(204).end();
});

router.get('/auth/me', requireUser, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, email, display_name AS displayName FROM users WHERE id = ? LIMIT 1',
      [req.user.id],
    );
    if (!rows[0]) return res.status(401).json({ error: 'Account not found' });
    res.json({ user: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/exercises', requireUser, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, muscle_group AS muscleGroup, equipment, archived_at AS archivedAt,
              (owner_id = ?) AS isCustom
       FROM exercises
       WHERE (owner_id = ? OR owner_id IS NULL) AND (archived_at IS NULL OR owner_id = ?)
       ORDER BY archived_at IS NOT NULL, muscle_group, name`,
      [req.user.id, req.user.id, req.user.id],
    );
    res.json({ exercises: rows });
  } catch (error) {
    next(error);
  }
});

router.post('/exercises', requireUser, async (req, res, next) => {
  try {
    const exercise = validateExercise(req.body);
    const [result] = await pool.execute(
      'INSERT INTO exercises (owner_id, name, muscle_group, equipment) VALUES (?, ?, ?, ?)',
      [req.user.id, exercise.name, exercise.muscleGroup, exercise.equipment],
    );
    res.status(201).json({ exercise: { id: result.insertId, ...exercise, isCustom: 1, archivedAt: null } });
  } catch (error) {
    next(error);
  }
});

router.patch('/exercises/:id', requireUser, async (req, res, next) => {
  try {
    const id = parseId(req.params.id, 'Exercise ID');
    const hasName = Object.hasOwn(req.body, 'name');
    const hasArchived = Object.hasOwn(req.body, 'archived');
    if (!hasName && !hasArchived) {
      const error = new Error('Provide a new name or archived status');
      error.status = 400;
      throw error;
    }
    const [ownedRows] = await pool.execute('SELECT id FROM exercises WHERE id = ? AND owner_id = ? LIMIT 1', [id, req.user.id]);
    if (!ownedRows.length) return res.status(404).json({ error: 'Custom exercise not found' });
    if (hasName) {
      const name = optionalName(req.body);
      await pool.execute(
        'UPDATE exercises SET name = ? WHERE id = ? AND owner_id = ?',
        [name, id, req.user.id],
      );
    }
    if (hasArchived) {
      if (typeof req.body.archived !== 'boolean') {
        const error = new Error('Archived must be true or false');
        error.status = 400;
        throw error;
      }
      await pool.execute(
        'UPDATE exercises SET archived_at = IF(?, COALESCE(archived_at, CURRENT_TIMESTAMP), NULL) WHERE id = ? AND owner_id = ?',
        [req.body.archived, id, req.user.id],
      );
    }
    const [rows] = await pool.execute(
      'SELECT id, name, muscle_group AS muscleGroup, equipment, archived_at AS archivedAt, TRUE AS isCustom FROM exercises WHERE id = ? AND owner_id = ?',
      [id, req.user.id],
    );
    res.json({ exercise: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/workouts', requireUser, async (req, res, next) => {
  try {
    const [workouts] = await pool.execute(
      `SELECT w.id, w.workout_date AS date, w.title, w.notes,
              COUNT(DISTINCT we.id) AS exerciseCount, COUNT(ws.id) AS setCount,
              COALESCE(SUM(ws.reps * ws.weight_kg), 0) AS volumeKg
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
       WHERE w.user_id = ?
       GROUP BY w.id
       ORDER BY w.workout_date DESC, w.id DESC
       LIMIT 100`,
      [req.user.id],
    );
    res.json({ workouts });
  } catch (error) {
    next(error);
  }
});

router.post('/workouts', requireUser, async (req, res, next) => {
  let connection;
  try {
    const workout = validateWorkout(req.body);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const exerciseIds = [...new Set(workout.exercises.map((item) => item.exerciseId))];
    const placeholders = exerciseIds.map(() => '?').join(', ');
    const [available] = await connection.execute(
      `SELECT id FROM exercises
       WHERE id IN (${placeholders}) AND archived_at IS NULL AND (owner_id = ? OR owner_id IS NULL)`,
      [...exerciseIds, req.user.id],
    );
    if (available.length !== exerciseIds.length) {
      const error = new Error('One or more exercises are unavailable');
      error.status = 400;
      throw error;
    }
    const [result] = await connection.execute(
      'INSERT INTO workouts (user_id, workout_date, title, notes) VALUES (?, ?, ?, ?)',
      [req.user.id, workout.date, workout.title, workout.notes],
    );
    const workoutId = result.insertId;
    for (const [position, exercise] of workout.exercises.entries()) {
      const [entry] = await connection.execute(
        'INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?)',
        [workoutId, exercise.exerciseId, position + 1],
      );
      for (const [setIndex, set] of exercise.sets.entries()) {
        await connection.execute(
          'INSERT INTO workout_sets (workout_exercise_id, set_number, reps, weight_kg, duration_seconds, is_warmup) VALUES (?, ?, ?, ?, ?, ?)',
          [entry.insertId, setIndex + 1, set.reps, set.weightKg, set.durationSeconds, set.isWarmup],
        );
      }
    }
    await connection.commit();
    res.status(201).json({ workout: { id: workoutId, ...workout } });
  } catch (error) {
    if (connection) await connection.rollback();
    next(error);
  } finally {
    connection?.release();
  }
});

router.get('/workouts/:id', requireUser, async (req, res, next) => {
  try {
    const id = parseId(req.params.id, 'Workout ID');
    const [rows] = await pool.execute(
      `SELECT w.id, w.workout_date AS date, w.title, w.notes,
              we.id AS workoutExerciseId, we.position, e.id AS exerciseId, e.name,
              e.muscle_group AS muscleGroup, e.equipment,
              ws.set_number AS setNumber, ws.reps, ws.weight_kg AS weightKg,
              ws.duration_seconds AS durationSeconds, ws.is_warmup AS isWarmup
       FROM workouts w
       LEFT JOIN workout_exercises we ON we.workout_id = w.id
       LEFT JOIN exercises e ON e.id = we.exercise_id
       LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
       WHERE w.id = ? AND w.user_id = ?
       ORDER BY we.position, ws.set_number`,
      [id, req.user.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Workout not found' });
    const first = rows[0];
    const exercises = new Map();
    for (const row of rows) {
      if (row.exerciseId == null) continue;
      if (!exercises.has(row.workoutExerciseId)) {
        exercises.set(row.workoutExerciseId, {
          id: row.exerciseId,
          name: row.name,
          muscleGroup: row.muscleGroup,
          equipment: row.equipment,
          sets: [],
        });
      }
      if (row.setNumber != null) {
        exercises.get(row.workoutExerciseId).sets.push({
          setNumber: row.setNumber,
          reps: row.reps,
          weightKg: row.weightKg,
          durationSeconds: row.durationSeconds,
          isWarmup: Boolean(row.isWarmup),
        });
      }
    }
    res.json({ workout: { id: first.id, date: first.date, title: first.title, notes: first.notes, exercises: [...exercises.values()] } });
  } catch (error) {
    next(error);
  }
});

router.delete('/workouts/:id', requireUser, async (req, res, next) => {
  try {
    const id = parseId(req.params.id, 'Workout ID');
    const [result] = await pool.execute('DELETE FROM workouts WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Workout not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/checkins', requireUser, async (req, res, next) => {
  try {
    const [checkins] = await pool.execute(
      `SELECT id, checkin_date AS date, bodyweight_kg AS bodyweightKg, body_fat_pct AS bodyFatPct,
              waist_cm AS waistCm, hips_cm AS hipsCm, chest_cm AS chestCm, arm_cm AS armCm,
              thigh_cm AS thighCm, notes
       FROM physique_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 100`,
      [req.user.id],
    );
    res.json({ checkins });
  } catch (error) {
    next(error);
  }
});

router.post('/checkins', requireUser, async (req, res, next) => {
  try {
    const checkin = validateCheckin(req.body);
    const values = [
      req.user.id, checkin.date, checkin.bodyweightKg, checkin.bodyFatPct, checkin.waistCm,
      checkin.hipsCm, checkin.chestCm, checkin.armCm, checkin.thighCm, checkin.notes,
    ];
    const [result] = await pool.execute(
      `INSERT INTO physique_checkins
       (user_id, checkin_date, bodyweight_kg, body_fat_pct, waist_cm, hips_cm, chest_cm, arm_cm, thigh_cm, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE bodyweight_kg = VALUES(bodyweight_kg), body_fat_pct = VALUES(body_fat_pct),
         waist_cm = VALUES(waist_cm), hips_cm = VALUES(hips_cm), chest_cm = VALUES(chest_cm),
         arm_cm = VALUES(arm_cm), thigh_cm = VALUES(thigh_cm), notes = VALUES(notes)`,
      values,
    );
    res.status(201).json({ checkin: { id: result.insertId || null, ...checkin } });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', requireUser, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [[countRows], [latestRows], [recentWorkouts], [bestLifts]] = await Promise.all([
      pool.execute('SELECT COUNT(*) AS workoutsThisWeek FROM workouts WHERE user_id = ? AND workout_date >= CURDATE() - INTERVAL 6 DAY', [userId]),
      pool.execute('SELECT checkin_date AS date, bodyweight_kg AS bodyweightKg, body_fat_pct AS bodyFatPct FROM physique_checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1', [userId]),
      pool.execute(
        `SELECT w.id, w.workout_date AS date, w.title, COUNT(DISTINCT we.id) AS exerciseCount, COUNT(ws.id) AS setCount
         FROM workouts w LEFT JOIN workout_exercises we ON we.workout_id = w.id
         LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
         WHERE w.user_id = ? GROUP BY w.id ORDER BY w.workout_date DESC, w.id DESC LIMIT 5`,
        [userId],
      ),
      pool.execute(
        `SELECT e.id AS exerciseId, e.name, MAX(ws.weight_kg) AS bestWeightKg
         FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id
         JOIN exercises e ON e.id = we.exercise_id JOIN workout_sets ws ON ws.workout_exercise_id = we.id
         WHERE w.user_id = ? GROUP BY e.id, e.name HAVING MAX(ws.weight_kg) IS NOT NULL
         ORDER BY bestWeightKg DESC LIMIT 5`,
        [userId],
      ),
    ]);
    res.json({
      workoutsThisWeek: countRows[0].workoutsThisWeek,
      latestCheckin: latestRows[0] || null,
      recentWorkouts,
      bestLifts,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/progress', requireUser, async (req, res, next) => {
  try {
    const exerciseId = parseId(req.query.exerciseId, 'Exercise ID');
    const [rows] = await pool.execute(
      `SELECT w.id AS workoutId, w.workout_date AS date, MAX(ws.weight_kg) AS maxWeightKg,
              MAX(ws.reps) AS maxReps
       FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id
       JOIN exercises e ON e.id = we.exercise_id JOIN workout_sets ws ON ws.workout_exercise_id = we.id
       WHERE w.user_id = ? AND e.id = ? AND (e.owner_id = ? OR e.owner_id IS NULL)
       GROUP BY w.id, w.workout_date ORDER BY w.workout_date ASC, w.id ASC LIMIT 60`,
      [req.user.id, exerciseId, req.user.id],
    );
    res.json({ progress: rows });
  } catch (error) {
    next(error);
  }
});

app.use('/api', router);
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
app.use(express.static(path.resolve(__dirname, '../dist')));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'), (error) => {
    if (error) res.status(404).send('Forge frontend is not built. Run npm run build.');
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That value is already in use' });
  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'This record is linked to existing training history' });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Try again.' : error.message });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => console.log(`FORGE API listening on port ${port}`));
