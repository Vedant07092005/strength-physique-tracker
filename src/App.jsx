import { useCallback, useEffect, useMemo, useState } from 'react';

const navItems = [
  { id: 'overview', label: 'Overview', mark: '◫' },
  { id: 'workouts', label: 'Workouts', mark: '↗' },
  { id: 'checkins', label: 'Physique', mark: '◎' },
  { id: 'progress', label: 'Progress', mark: '⌁' },
  { id: 'exercises', label: 'Exercises', mark: '＋' },
];

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed. Please try again.');
  return body;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`));
}

function amount(value, digits = 1) {
  if (value == null || value === '') return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function ErrorLine({ children }) {
  return children ? <p className="form-error" role="alert">{children}</p> : null;
}

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST', body: JSON.stringify(form),
      });
      onSignedIn(result.user);
    } catch (caught) {
      setError(caught.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-mark">F<span>.</span></div>
        <div className="auth-art-copy"><span>BUILT BY REP.</span><strong>Progress<br />has a paper trail.</strong><i>Strength. Physique. Consistency.</i></div>
        <div className="art-lines"><b /><b /><b /><b /></div>
      </div>
      <section className="auth-panel">
        <div className="brand auth-brand"><span className="brand-icon">F</span><span>FORGE<small>TRAINING LOG</small></span></div>
        <div className="auth-content">
          <p className="eyebrow">YOUR WORK. YOUR DATA.</p>
          <h1>{mode === 'login' ? 'Good to have you back.' : 'Start building.'}</h1>
          <p className="muted">{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account to start tracking your training.'}</p>
          <form className="stack-form" onSubmit={submit}>
            {mode === 'register' && <label>Your name<input autoComplete="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={80} /></label>}
            <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={mode === 'register' ? 10 : 1} /></label>
            <ErrorLine>{error}</ErrorLine>
            <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}<span>→</span></button>
          </form>
          <p className="auth-switch">{mode === 'login' ? 'New to FORGE?' : 'Already have an account?'} <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
        </div>
        <p className="auth-footer">Your progress, in your hands.</p>
      </section>
    </main>
  );
}

function MetricCard({ label, value, unit, caption, accent = false }) {
  return <article className={`metric-card${accent ? ' metric-accent' : ''}`}>
    <span className="metric-label">{label}</span>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <span className="metric-caption">{caption}</span>
  </article>;
}

function Overview({ data, loading, onNavigate, onOpenWorkout }) {
  const hasStarted = Boolean(data?.recentWorkouts?.length || data?.latestCheckin);
  return <>
    <div className="page-heading">
      <div><p className="eyebrow">THE LONG GAME</p><h1>Your progress, <em>in motion.</em></h1><p className="muted">Every session compounds. Keep showing up.</p></div>
      <button className="button button-primary" onClick={() => onNavigate('workouts')}>Log a workout <span>↗</span></button>
    </div>
    <section className="metric-grid">
      <MetricCard label="SESSIONS · 7 DAYS" value={loading ? '—' : data?.workoutsThisWeek ?? 0} unit="" caption="Keep your rhythm" accent />
      <MetricCard label="BODY WEIGHT" value={amount(data?.latestCheckin?.bodyweightKg)} unit={data?.latestCheckin?.bodyweightKg == null ? '' : 'kg'} caption={data?.latestCheckin ? `Last check-in · ${formatDate(data.latestCheckin.date)}` : 'Add your first check-in'} />
      <MetricCard label="BODY FAT" value={amount(data?.latestCheckin?.bodyFatPct)} unit={data?.latestCheckin?.bodyFatPct == null ? '' : '%'} caption="A data point, not the whole story" />
      <MetricCard label="BEST LIFT" value={amount(data?.bestLifts?.[0]?.bestWeightKg, 0)} unit={data?.bestLifts?.[0]?.bestWeightKg == null ? '' : 'kg'} caption={data?.bestLifts?.[0]?.name || 'Log a weighted set'} />
    </section>
    {!loading && !hasStarted && <section className="first-session-panel">
      <div className="first-session-copy">
        <p className="eyebrow">YOUR BASELINE STARTS HERE</p>
        <h2>Make the first mark.</h2>
        <p>One session gives your progress a starting point. Add a check-in whenever you’re ready.</p>
        <div className="first-session-actions">
          <button className="button button-primary" onClick={() => onNavigate('workouts')}>Log your first workout <span>↗</span></button>
          <button className="text-button" onClick={() => onNavigate('checkins')}>Add a physique check-in <span>→</span></button>
        </div>
      </div>
      <div className="first-session-steps" aria-label="Three steps to get started">
        <div className="first-session-step"><span>01</span><strong>Train</strong><small>Record your sets</small></div>
        <div className="first-session-step"><span>02</span><strong>Check in</strong><small>Save a baseline</small></div>
        <div className="first-session-step"><span>03</span><strong>Track</strong><small>See the trend</small></div>
      </div>
    </section>}
    <section className="dashboard-grid">
      <article className="panel recent-panel">
        <div className="panel-heading"><div><p className="eyebrow">THE WORK</p><h2>Recent sessions</h2></div><button className="text-button" onClick={() => onNavigate('workouts')}>View all ↗</button></div>
        {data?.recentWorkouts?.length ? <div className="session-list">{data.recentWorkouts.map((workout, index) => <button className="session-row" key={workout.id} onClick={() => onOpenWorkout(workout.id)}>
          <span className="session-index">{String(index + 1).padStart(2, '0')}</span><span className="session-info"><strong>{workout.title}</strong><small>{workout.exerciseCount} exercises · {workout.setCount} sets</small></span><span className="session-date">{formatDate(workout.date)}</span><span className="row-arrow">↗</span>
        </button>)}</div> : <div className="empty-state"><span className="empty-icon">↗</span><strong>Nothing logged yet</strong><p>Your first session is one click away.</p><button className="text-button" onClick={() => onNavigate('workouts')}>Start your log ↗</button></div>}
      </article>
      <article className="panel lifts-panel">
        <div className="panel-heading"><div><p className="eyebrow">PERSONAL BESTS</p><h2>Top lifts</h2></div><span className="small-mark">F.</span></div>
        {data?.bestLifts?.length ? <div className="lift-list">{data.bestLifts.map((lift, index) => <div className="lift-row" key={lift.exerciseId}><span className="lift-rank">0{index + 1}</span><span className="lift-name">{lift.name}</span><strong>{amount(lift.bestWeightKg, 1)} <small>kg</small></strong></div>)}</div> : <div className="empty-state compact"><span className="empty-icon">⌁</span><strong>Your numbers start here</strong><p>Log a weighted set to see your best lifts.</p></div>}
        <button className="subtle-link" onClick={() => onNavigate('progress')}>Explore progress <span>→</span></button>
      </article>
    </section>
    <section className="quote-strip"><span className="quote-mark">“</span><p>Small improvements, repeated consistently, create remarkable change.</p><span className="quote-author">THE FORGE PRINCIPLE</span></section>
  </>;
}

function SetEditor({ set, onChange, onRemove, canRemove }) {
  return <div className="set-row">
    <span className="set-dot">{set.setNumber}</span>
    <label><span>Reps</span><input type="number" min="1" max="100" value={set.reps} onChange={(e) => onChange({ ...set, reps: e.target.value })} placeholder="8" /></label>
    <label><span>Weight · kg</span><input type="number" min="0" max="2000" step="0.25" value={set.weightKg} onChange={(e) => onChange({ ...set, weightKg: e.target.value })} placeholder="—" /></label>
    {canRemove && <button type="button" className="icon-button remove-set" onClick={onRemove} aria-label="Remove set">×</button>}
  </div>;
}

function WorkoutDetail({ workoutId, onClose, onDeleted }) {
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api(`/workouts/${workoutId}`).then((result) => setWorkout(result.workout)).catch((caught) => setError(caught.message)); }, [workoutId]);
  async function remove() {
    if (!window.confirm('Delete this workout and its sets?')) return;
    setBusy(true);
    try { await api(`/workouts/${workoutId}`, { method: 'DELETE' }); onDeleted(); }
    catch (caught) { setError(caught.message); setBusy(false); }
  }
  if (error) return <div className="inline-error">{error}<button className="text-button" onClick={onClose}>Close</button></div>;
  if (!workout) return <div className="detail-card">Loading session…</div>;
  return <article className="detail-card">
    <div className="detail-head"><div><p className="eyebrow">{formatDate(workout.date)}</p><h3>{workout.title}</h3></div><div className="detail-actions"><button className="button button-quiet" disabled={busy} onClick={remove}>Delete</button><button className="icon-button" onClick={onClose} aria-label="Close workout">×</button></div></div>
    {workout.notes && <p className="detail-notes">{workout.notes}</p>}
    {workout.exercises.map((exercise) => <div className="detail-exercise" key={exercise.id}><div className="detail-exercise-title"><strong>{exercise.name}</strong><small>{exercise.muscleGroup}{exercise.equipment ? ` · ${exercise.equipment}` : ''}</small></div><div className="detail-sets">{exercise.sets.map((set) => <span key={set.setNumber}>Set {set.setNumber} <b>{set.reps ?? `${set.durationSeconds}s`} reps</b>{set.weightKg != null && <b>{amount(set.weightKg)} kg</b>}</span>)}</div></div>)}
  </article>;
}

function Workouts({ notify, initialWorkoutId }) {
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [draft, setDraft] = useState({ title: '', date: today(), notes: '' });
  const [draftExercises, setDraftExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [workoutResult, exerciseResult] = await Promise.all([api('/workouts'), api('/exercises')]);
    setWorkouts(workoutResult.workouts);
    setExercises(exerciseResult.exercises.filter((exercise) => !exercise.archivedAt));
  }, []);
  useEffect(() => { refresh().catch((caught) => setError(caught.message)); }, [refresh]);
  useEffect(() => { if (initialWorkoutId) setDetailId(initialWorkoutId); }, [initialWorkoutId]);

  function addExercise() {
    const exercise = exercises.find((item) => String(item.id) === selectedExercise);
    if (!exercise) return;
    setDraftExercises((items) => [...items, { exerciseId: exercise.id, name: exercise.name, sets: [{ setNumber: 1, reps: '8', weightKg: '' }] }]);
    setSelectedExercise('');
  }
  function updateSet(exerciseIndex, setIndex, value) {
    setDraftExercises((items) => items.map((item, i) => i !== exerciseIndex ? item : { ...item, sets: item.sets.map((set, j) => j === setIndex ? value : set) }));
  }
  function addSet(exerciseIndex) {
    setDraftExercises((items) => items.map((item, i) => i !== exerciseIndex ? item : { ...item, sets: [...item.sets, { setNumber: item.sets.length + 1, reps: '8', weightKg: item.sets.at(-1)?.weightKg || '' }] }));
  }
  async function save(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/workouts', { method: 'POST', body: JSON.stringify({
        ...draft,
        exercises: draftExercises.map((exercise) => ({ exerciseId: exercise.exerciseId, sets: exercise.sets.map((set) => ({ reps: set.reps ? Number(set.reps) : null, weightKg: set.weightKg === '' ? null : Number(set.weightKg) })) })),
      }) });
      setDraft({ title: '', date: today(), notes: '' });
      setDraftExercises([]);
      await refresh();
      notify('Workout saved. Keep stacking good sessions.');
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">SHOW UP. LOG IT.</p><h1>Training <em>sessions.</em></h1><p className="muted">Capture the work while it’s fresh.</p></div></div>
    <div className="workout-layout">
      <section className="panel workout-builder">
        <div className="panel-heading"><div><p className="eyebrow">NEW ENTRY</p><h2>Log a workout</h2></div><span className="builder-number">01</span></div>
        <form onSubmit={save} className="stack-form">
          <div className="form-pair"><label>Session name<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Upper body A" maxLength={100} /></label><label>Date<input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} required /></label></div>
          <label>Notes <span className="optional">OPTIONAL</span><textarea rows="2" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="How did it feel? Anything to remember?" maxLength={1000} /></label>
          <div className="exercise-picker"><label htmlFor="exercise-select">Add an exercise</label><div className="picker-row"><select id="exercise-select" value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}><option value="">Choose from your library…</option>{exercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}{exercise.isCustom ? ' · custom' : ''}</option>)}</select><button type="button" className="button button-outline" onClick={addExercise} disabled={!selectedExercise}>Add <span>＋</span></button></div></div>
          {draftExercises.length > 0 && <div className="draft-exercises">{draftExercises.map((exercise, exerciseIndex) => <article className="draft-exercise" key={`${exercise.exerciseId}-${exerciseIndex}`}>
            <div className="draft-exercise-head"><div><span className="set-dot">{String(exerciseIndex + 1).padStart(2, '0')}</span><strong>{exercise.name}</strong></div><button type="button" className="text-button danger-link" onClick={() => setDraftExercises((items) => items.filter((_, index) => index !== exerciseIndex))}>Remove</button></div>
            {exercise.sets.map((set, setIndex) => <SetEditor key={setIndex} set={set} canRemove={exercise.sets.length > 1} onChange={(value) => updateSet(exerciseIndex, setIndex, value)} onRemove={() => setDraftExercises((items) => items.map((item, i) => i !== exerciseIndex ? item : { ...item, sets: item.sets.filter((_, j) => j !== setIndex).map((row, j) => ({ ...row, setNumber: j + 1 })) }))} />)}
            <button type="button" className="add-set" onClick={() => addSet(exerciseIndex)}>＋ Add set</button>
          </article>)}</div>}
          {!draftExercises.length && <div className="builder-empty">Your exercise list will take shape here.</div>}
          <ErrorLine>{error}</ErrorLine>
          <button className="button button-primary button-wide" disabled={busy || !draftExercises.length}>{busy ? 'Saving session…' : 'Save workout'} <span>→</span></button>
        </form>
      </section>
      <section className="panel history-panel">
        <div className="panel-heading"><div><p className="eyebrow">YOUR LOG</p><h2>Recent history</h2></div><span className="history-count">{workouts.length} sessions</span></div>
        {error && <ErrorLine>{error}</ErrorLine>}
        {workouts.length ? <div className="history-list">{workouts.map((workout) => <button className={`history-row${detailId === workout.id ? ' selected' : ''}`} key={workout.id} onClick={() => setDetailId(workout.id)}><span className="history-day">{new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${String(workout.date).slice(0, 10)}T00:00:00Z`))}</span><span className="history-title"><strong>{workout.title}</strong><small>{workout.exerciseCount} movements · {workout.setCount} sets</small></span><span className="row-arrow">↗</span></button>)}</div> : <div className="empty-state"><span className="empty-icon">↗</span><strong>Your history starts today</strong><p>Log a session to build your training record.</p></div>}
        {detailId && <WorkoutDetail workoutId={detailId} onClose={() => setDetailId(null)} onDeleted={() => { setDetailId(null); refresh(); notify('Workout deleted.'); }} />}
      </section>
    </div>
  </>;
}

const measurementFields = [
  ['bodyweightKg', 'Body weight', 'kg', 20, 500],
  ['bodyFatPct', 'Body fat', '%', 1, 80],
  ['waistCm', 'Waist', 'cm', 20, 250],
  ['hipsCm', 'Hips', 'cm', 20, 250],
  ['chestCm', 'Chest', 'cm', 20, 250],
  ['armCm', 'Arm', 'cm', 5, 100],
  ['thighCm', 'Thigh', 'cm', 10, 150],
];

function Checkins({ notify }) {
  const empty = () => ({ date: today(), bodyweightKg: '', bodyFatPct: '', waistCm: '', hipsCm: '', chestCm: '', armCm: '', thighCm: '', notes: '' });
  const [form, setForm] = useState(empty);
  const [checkins, setCheckins] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => api('/checkins').then((result) => setCheckins(result.checkins)), []);
  useEffect(() => { refresh().catch((caught) => setError(caught.message)); }, [refresh]);
  async function save(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const values = Object.fromEntries(measurementFields.map(([key]) => [key, form[key] === '' ? null : Number(form[key])]));
      await api('/checkins', { method: 'POST', body: JSON.stringify({ ...form, ...values }) });
      setForm(empty()); await refresh(); notify('Check-in saved. Progress is more than one number.');
    } catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">MORE THAN A NUMBER</p><h1>Physique <em>check-ins.</em></h1><p className="muted">Track the trend. Leave room for the rest of the story.</p></div></div>
    <div className="checkin-layout">
      <section className="panel checkin-form-panel"><div className="panel-heading"><div><p className="eyebrow">MEASURE IN</p><h2>New check-in</h2></div><span className="small-mark">◎</span></div>
        <form className="stack-form" onSubmit={save}>
          <label>Check-in date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
          <div className="measurement-grid">{measurementFields.map(([key, label, unit, min, max]) => <label key={key}>{label}<span className="unit-input"><input type="number" step="0.1" min={min} max={max} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder="—" /><i>{unit}</i></span></label>)}</div>
          <label>Notes <span className="optional">OPTIONAL</span><textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Energy, sleep, how you feel…" maxLength={1000} /></label>
          <ErrorLine>{error}</ErrorLine><button className="button button-primary button-wide" disabled={busy}>{busy ? 'Saving…' : 'Save check-in'} <span>→</span></button>
        </form>
      </section>
      <section className="panel checkin-history"><div className="panel-heading"><div><p className="eyebrow">OVER TIME</p><h2>Your check-ins</h2></div><span className="history-count">{checkins.length} entries</span></div>
        {checkins.length ? <div className="checkin-list">{checkins.map((checkin) => <article className="checkin-row" key={checkin.id}><div className="checkin-date"><strong>{formatDate(checkin.date)}</strong><small>{checkin.notes || 'Check-in recorded'}</small></div><div className="checkin-values">{checkin.bodyweightKg != null && <span><b>{amount(checkin.bodyweightKg)}</b><small>kg</small></span>}{checkin.bodyFatPct != null && <span><b>{amount(checkin.bodyFatPct)}</b><small>% fat</small></span>}{checkin.waistCm != null && <span><b>{amount(checkin.waistCm)}</b><small>cm waist</small></span>}</div></article>)}</div> : <div className="empty-state"><span className="empty-icon">◎</span><strong>Your baseline is waiting</strong><p>Add a check-in. You can track just one measurement or several.</p></div>}
      </section>
    </div>
  </>;
}

function Exercises({ notify }) {
  const [exercises, setExercises] = useState([]);
  const [form, setForm] = useState({ name: '', muscleGroup: '', equipment: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => api('/exercises').then((result) => setExercises(result.exercises)), []);
  useEffect(() => { refresh().catch((caught) => setError(caught.message)); }, [refresh]);
  async function add(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/exercises', { method: 'POST', body: JSON.stringify(form) }); setForm({ name: '', muscleGroup: '', equipment: '' }); await refresh(); notify('Exercise added to your library.'); }
    catch (caught) { setError(caught.message); }
    finally { setBusy(false); }
  }
  async function saveName(exercise) {
    setError('');
    try { await api(`/exercises/${exercise.id}`, { method: 'PATCH', body: JSON.stringify({ name: editing.name }) }); setEditing(null); await refresh(); notify('Name updated across your history.'); }
    catch (caught) { setError(caught.message); }
  }
  async function toggleArchive(exercise) {
    setError('');
    try { await api(`/exercises/${exercise.id}`, { method: 'PATCH', body: JSON.stringify({ archived: !exercise.archivedAt }) }); await refresh(); notify(exercise.archivedAt ? 'Exercise restored.' : 'Exercise archived. Past sessions still keep their link.'); }
    catch (caught) { setError(caught.message); }
  }
  const active = exercises.filter((exercise) => !exercise.archivedAt);
  const archived = exercises.filter((exercise) => exercise.archivedAt);
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR MOVEMENT LIBRARY</p><h1>Exercises <em>that build.</em></h1><p className="muted">Your names carry through every session you’ve logged.</p></div></div>
    <section className="panel exercise-create"><div className="panel-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h2>Add a custom exercise</h2></div><span className="small-mark">＋</span></div>
      <form className="exercise-create-form" onSubmit={add}><label>Exercise name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pause squat" maxLength={100} required /></label><label>Muscle group<input value={form.muscleGroup} onChange={(e) => setForm({ ...form, muscleGroup: e.target.value })} placeholder="e.g. Quadriceps" maxLength={60} required /></label><label>Equipment<input value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="Optional" maxLength={60} /></label><button className="button button-primary" disabled={busy}>{busy ? 'Adding…' : 'Add exercise'} <span>＋</span></button></form><ErrorLine>{error}</ErrorLine>
    </section>
    <section className="panel exercise-library"><div className="panel-heading"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Exercise library</h2></div><span className="history-count">{active.length} active</span></div>
      <div className="exercise-list">{active.map((exercise) => <article className="exercise-row" key={exercise.id}><span className="exercise-glyph">↗</span><div className="exercise-main">{editing?.id === exercise.id ? <div className="rename-row"><input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={100} /><button className="text-button" onClick={() => saveName(exercise)}>Save</button><button className="text-button" onClick={() => setEditing(null)}>Cancel</button></div> : <><strong>{exercise.name}</strong><small>{exercise.muscleGroup}{exercise.equipment ? ` · ${exercise.equipment}` : ''}{exercise.isCustom ? ' · CUSTOM' : ' · FORGE LIBRARY'}</small></>}</div>{exercise.isCustom && <div className="exercise-actions">{editing?.id !== exercise.id && <button className="text-button" onClick={() => setEditing({ id: exercise.id, name: exercise.name })}>Rename</button>}<button className="text-button danger-link" onClick={() => toggleArchive(exercise)}>Archive</button></div>}</article>)}</div>
      {archived.length > 0 && <div className="archived-group"><p className="eyebrow">ARCHIVED · STILL IN YOUR HISTORY</p>{archived.map((exercise) => <article className="exercise-row archived-row" key={exercise.id}><span className="exercise-glyph">⌁</span><div className="exercise-main"><strong>{exercise.name}</strong><small>{exercise.muscleGroup} · ARCHIVED</small></div><button className="text-button" onClick={() => toggleArchive(exercise)}>Restore</button></article>)}</div>}
    </section>
  </>;
}

function Progress({ exercises }) {
  const [exerciseId, setExerciseId] = useState('');
  const [progress, setProgress] = useState([]);
  const [error, setError] = useState('');
  const available = useMemo(() => exercises.filter((exercise) => !exercise.archivedAt), [exercises]);
  useEffect(() => { if (!exerciseId && available.length) setExerciseId(String(available[0].id)); }, [available, exerciseId]);
  useEffect(() => {
    if (!exerciseId) return;
    setError('');
    api(`/progress?exerciseId=${encodeURIComponent(exerciseId)}`).then((result) => setProgress(result.progress)).catch((caught) => setError(caught.message));
  }, [exerciseId]);
  const maxWeight = Math.max(1, ...progress.map((row) => Number(row.maxWeightKg) || 0));
  const selected = available.find((exercise) => String(exercise.id) === exerciseId);
  return <>
    <div className="page-heading"><div><p className="eyebrow">THE TREND IS THE STORY</p><h1>Progress <em>over time.</em></h1><p className="muted">One session at a time. See your work add up.</p></div></div>
    <section className="panel progress-panel"><div className="panel-heading"><div><p className="eyebrow">STRENGTH TRACKER</p><h2>{selected?.name || 'Choose an exercise'}</h2></div><label className="progress-select"><span>Movement</span><select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}><option value="">Choose exercise</option>{available.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label></div>
      {error && <ErrorLine>{error}</ErrorLine>}
      {progress.length ? <div className="chart-wrap"><div className="chart-y-label">MAX WEIGHT · KG</div><div className="bar-chart">{progress.map((row) => <div className="bar-column" key={row.workoutId} title={`${formatDate(row.date)} · ${amount(row.maxWeightKg)} kg`}><strong>{amount(row.maxWeightKg, 0)}</strong><div className="bar-track"><span style={{ height: `${Math.max(4, (Number(row.maxWeightKg || 0) / maxWeight) * 100)}%` }} /></div><small>{new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${String(row.date).slice(0, 10)}T00:00:00Z`))}</small></div>)}</div><div className="chart-foot"><span>{progress.length} logged sessions</span><span>Numbers are shown in the units you log</span></div></div> : <div className="empty-state chart-empty"><span className="empty-icon">⌁</span><strong>{selected ? 'Your line starts with a session' : 'Choose from your library'}</strong><p>Log weighted sets for this exercise to see the trend.</p></div>}
    </section>
  </>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [page, setPage] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [notice, setNotice] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [openWorkoutId, setOpenWorkoutId] = useState(null);
  const [dataError, setDataError] = useState('');

  const loadData = useCallback(async () => {
    setLoadingData(true); setDataError('');
    try {
      const [dashboardResult, exerciseResult] = await Promise.all([api('/dashboard'), api('/exercises')]);
      setDashboard(dashboardResult); setExercises(exerciseResult.exercises);
    } catch (caught) { setDataError(caught.message); }
    finally { setLoadingData(false); }
  }, []);

  useEffect(() => {
    api('/auth/me').then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setCheckingSession(false));
  }, []);
  useEffect(() => { if (user) loadData(); }, [user, loadData]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    setUser(null); setDashboard(null); setPage('overview');
  }
  function openWorkout(id) { setOpenWorkoutId(id); setPage('workouts'); }
  function notify(message) { setNotice(message); loadData(); }

  if (checkingSession) return <div className="loading-screen"><div className="brand"><span className="brand-icon">F</span><span>FORGE<small>TRAINING LOG</small></span></div><span className="loader" /></div>;
  if (!user) return <AuthScreen onSignedIn={setUser} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon">F</span><span>FORGE<small>TRAINING LOG</small></span></div>
      <div className="side-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => { setPage(item.id); setOpenWorkoutId(null); }}><span className="nav-mark">{item.mark}</span>{item.label}{item.id === 'overview' && <i />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="side-label">BUILT BY REP.</div><div className="sidebar-note">Your training,<br /><strong>on the record.</strong></div><div className="profile-row"><span className="avatar">{user.displayName?.[0]?.toUpperCase() || 'F'}</span><span className="profile-info"><strong>{user.displayName}</strong><small>{user.email}</small></span><button className="icon-button signout" onClick={signOut} title="Sign out" aria-label="Sign out">↗</button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand brand"><span className="brand-icon">F</span><span>FORGE<small>TRAINING LOG</small></span></div><span className="breadcrumb">WORKSPACE <b>/</b> {navItems.find((item) => item.id === page)?.label.toUpperCase()}</span><div className="topbar-right"><span className="live-dot" /> <span>TRACKING ON</span><button className="top-avatar" title={user.displayName}>{user.displayName?.[0]?.toUpperCase() || 'F'}</button></div></header>
      <nav className="mobile-nav" aria-label="Main navigation">{navItems.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => { setPage(item.id); setOpenWorkoutId(null); }}><span>{item.mark}</span>{item.label}</button>)}</nav>
      <div className="content-wrap">
        {dataError && <div className="global-error" role="alert">{dataError}</div>}
        {page === 'overview' && <Overview data={dashboard} loading={loadingData} onNavigate={(target) => setPage(target)} onOpenWorkout={openWorkout} />}
        {page === 'workouts' && <Workouts key="workouts" notify={notify} initialWorkoutId={openWorkoutId} />}
        {page === 'checkins' && <Checkins notify={notify} />}
        {page === 'exercises' && <Exercises notify={notify} />}
        {page === 'progress' && <Progress exercises={exercises} />}
        <footer className="page-footer"><span>FORGE <b>·</b> BUILT BY REP.</span><span>YOUR PROGRESS. YOUR PACE.</span></footer>
      </div>
    </main>
    {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
  </div>;
}
