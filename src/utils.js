

// ---------- dateUtils ----------

// Dates are stored as local "YYYY-MM-DD" keys so they compare as plain strings.

export function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date = new Date()) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (day.getDay() + 6) % 7;
  return addDays(day, -offset);
}

export function daysBetween(fromKeyValue, toKeyValue) {
  return Math.round((fromKey(toKeyValue) - fromKey(fromKeyValue)) / 86400000);
}

export function formatMinutes(total) {
  const minutes = Math.max(0, Math.round(total));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatLongDate(key) {
  return fromKey(key).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatWeekdayShort(key) {
  return fromKey(key).toLocaleDateString('en-GB', { weekday: 'short' });
}

/** "in 2 days", "tomorrow", "today". */
export function relativeDay(key) {
  const n = daysBetween(todayKey(), key);
  if (n < 0) return n === -1 ? 'yesterday' : `${-n} days ago`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 14) return `in ${n} days`;
  return `in ${Math.round(n / 7)} weeks`;
}

/** Phrase for "… is due ___": "today", "tomorrow", "on Friday", "on 21 November". */
export function dueWords(key) {
  const n = daysBetween(todayKey(), key);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1 && n < 7) return `on ${fromKey(key).toLocaleDateString('en-GB', { weekday: 'long' })}`;
  return `on ${fromKey(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
}

/** "24:13" from milliseconds. */
export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(key) {
  return fromKey(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Weeks (Monday first) covering a month; days outside the month are null. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(toKey(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// ---------- deadlineUtils ----------

export const DEADLINE_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'exam', label: 'Exam' },
];

export const typeLabel = (type) => (type === 'exam' ? 'Exam' : 'Homework');

export const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day before' },
  { value: '2', label: '2 days before' },
  { value: '3', label: '3 days before' },
  { value: '7', label: '1 week before' },
  { value: '14', label: '2 weeks before' },
];

export const defaultReminder = (type) => (type === 'exam' ? 3 : 1);

/** Days before the deadline that the reminder starts; null means no reminder. */
export function reminderDays(deadline) {
  if (deadline.remindDaysBefore === undefined) return defaultReminder(deadline.type);
  return deadline.remindDaysBefore;
}

export function reminderLabel(deadline) {
  const days = reminderDays(deadline);
  if (days === null) return 'No reminder';
  const option = REMINDER_OPTIONS.find((o) => o.value === String(days));
  return `Reminder ${option ? option.label.toLowerCase() : `${days} days before`}`;
}

/** Sort by date, then by time (deadlines without a time go last on their day). */
export function byDue(a, b) {
  return a.due.localeCompare(b.due) || (a.time || '99:99').localeCompare(b.time || '99:99');
}

const OVERDUE_WINDOW_DAYS = 7;

/**
 * Deadlines that should show a reminder today: not done, not dismissed or snoozed,
 * and inside their reminder window. Overdue ones stay for a week.
 */
export function activeReminders(deadlines, today = todayKey()) {
  return deadlines
    .filter((d) => !d.done && !d.reminderDismissed && reminderDays(d) !== null)
    .filter((d) => !d.snoozedUntil || d.snoozedUntil <= today)
    .map((d) => ({ ...d, daysLeft: daysBetween(today, d.due) }))
    .filter((d) => d.daysLeft <= reminderDays(d) && d.daysLeft >= -OVERDUE_WINDOW_DAYS)
    .sort(byDue);
}

export function tomorrowKey() {
  return toKey(addDays(new Date(), 1));
}

/** "Tuesday 10 November at 09:00" */
export function formatDue(deadline) {
  const date = fromKey(deadline.due).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return deadline.time ? `${date} at ${deadline.time}` : date;
}

/** "is in 3 days", "is due tomorrow", "was due 2 days ago". */
export function dueSentence(deadline, daysLeft) {
  const exam = deadline.type === 'exam';
  if (daysLeft < 0) return `was ${exam ? 'on' : 'due'} ${-daysLeft === 1 ? 'yesterday' : `${-daysLeft} days ago`}`;
  if (daysLeft === 0) return exam ? 'is today' : 'is due today';
  if (daysLeft === 1) return exam ? 'is tomorrow' : 'is due tomorrow';
  return exam ? `is in ${daysLeft} days` : `is due in ${daysLeft} days`;
}

// ---------- progressUtils ----------

const sum = (list) => list.reduce((total, s) => total + s.minutes, 0);

/**
 * The units a course's completion is counted in: every topic, plus any chapter
 * that has no topics yet (so it can still be ticked off on its own).
 */
export function courseUnits(course) {
  return course.chapters.flatMap((chapter) =>
    chapter.topics.length ? chapter.topics : [{ id: chapter.id, done: Boolean(chapter.done) }]
  );
}

export function courseTopics(course) {
  return courseUnits(course);
}

export function isChapterDone(chapter) {
  return chapter.topics.length ? chapter.topics.every((t) => t.done) : Boolean(chapter.done);
}

export function courseCompletion(course) {
  const units = courseUnits(course);
  if (!units.length) return 0;
  return Math.round((units.filter((t) => t.done).length / units.length) * 100);
}

export function totalMinutes(sessions) {
  return sum(sessions);
}

export function minutesOnDay(sessions, key) {
  return sum(sessions.filter((s) => s.date === key));
}

export function minutesToday(sessions) {
  return minutesOnDay(sessions, todayKey());
}

export function minutesThisWeek(sessions) {
  const start = toKey(startOfWeek());
  return sum(sessions.filter((s) => s.date >= start));
}

export function minutesForCourse(sessions, courseId) {
  return sum(sessions.filter((s) => s.courseId === courseId));
}

export function minutesByDate(sessions) {
  const map = {};
  sessions.forEach((s) => {
    map[s.date] = (map[s.date] || 0) + s.minutes;
  });
  return map;
}

/** Consecutive study days ending today (or yesterday, if today has nothing yet). */
export function currentStreak(sessions) {
  const days = new Set(sessions.map((s) => s.date));
  let cursor = new Date();
  if (!days.has(toKey(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (days.has(toKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(sessions) {
  const days = Array.from(new Set(sessions.map((s) => s.date))).sort();
  let best = 0;
  let run = 0;
  let previous = null;
  days.forEach((key) => {
    run = previous && toKey(addDays(new Date(`${previous}T12:00:00`), 1)) === key ? run + 1 : 1;
    best = Math.max(best, run);
    previous = key;
  });
  return best;
}

export function tasksForDay(tasks, key) {
  return tasks.filter((t) => t.date === key);
}

export function upcomingAssignments(assignments, fromKey = todayKey()) {
  return assignments
    .filter((a) => !a.done && a.due >= fromKey)
    .sort((a, b) => a.due.localeCompare(b.due) || (a.time || '99:99').localeCompare(b.time || '99:99'));
}

// ---- Series for the progress charts. Each point: { key, label, minutes, isCurrent }.

export function dailySeries(sessions, days = 14) {
  const byDate = minutesByDate(sessions);
  const today = new Date();
  const points = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const key = toKey(day);
    points.push({
      key,
      label: day.toLocaleDateString('en-GB', { weekday: 'narrow' }),
      longLabel: day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      minutes: byDate[key] || 0,
      isCurrent: i === 0,
    });
  }
  return points;
}

export function weeklySeries(sessions, weeks = 12) {
  const thisWeek = startOfWeek();
  const points = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(thisWeek, -7 * i);
    const startKey = toKey(start);
    const endKey = toKey(addDays(start, 7));
    points.push({
      key: startKey,
      label: formatShortDate(startKey),
      longLabel: `Week of ${formatShortDate(startKey)}`,
      minutes: sum(sessions.filter((s) => s.date >= startKey && s.date < endKey)),
      isCurrent: i === 0,
    });
  }
  return points;
}

export function monthlySeries(sessions, months = 6) {
  const now = new Date();
  const points = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = toKey(start).slice(0, 7);
    points.push({
      key: prefix,
      label: start.toLocaleDateString('en-GB', { month: 'short' }),
      longLabel: start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      minutes: sum(sessions.filter((s) => s.date.startsWith(prefix))),
      isCurrent: i === 0,
    });
  }
  return points;
}

// ---- Achievements

export function achievements({ sessions, tasks, courses, rooms, groups, userId }) {
  const total = totalMinutes(sessions);
  const longest = longestStreak(sessions);
  const doneTasks = tasks.filter((t) => t.done).length;
  const chaptersDone = courses.reduce((n, c) => n + c.chapters.filter((ch) => isChapterDone(ch)).length, 0);
  const bestCourse = courses.reduce((best, c) => Math.max(best, courseCompletion(c)), 0);
  const earlySessions = sessions.filter((s) => new Date(s.startedAt).getHours() < 8).length;
  const together =
    rooms.filter((r) => r.participantIds.includes(userId)).length +
    groups.filter((g) => g.memberIds.includes(userId)).length;

  const item = (id, title, description, value, target, format = (v) => v) => ({
    id,
    title,
    description,
    earned: value >= target,
    value: Math.min(value, target),
    target,
    progressText: `${format(Math.min(value, target))} of ${format(target)}`,
  });
  const hours = (m) => `${Math.floor(m / 60)} h`;

  return [
    item('first', 'First session', 'Finish one focus session.', sessions.length, 1),
    item('ten-hours', '10 hours in', 'Study for 10 hours in total.', total, 600, hours),
    item('fifty-hours', '50 hours in', 'Study for 50 hours in total.', total, 3000, hours),
    item('week-streak', 'A full week', 'Study 7 days in a row.', longest, 7, (v) => `${v} days`),
    item('month-streak', 'A full month', 'Study 30 days in a row.', longest, 30, (v) => `${v} days`),
    item('sessions-50', 'Fifty sessions', 'Finish 50 focus sessions.', sessions.length, 50),
    item('tasks-25', 'List keeper', 'Tick off 25 tasks.', doneTasks, 25),
    item('chapter', 'Chapter closed', 'Complete every topic in a chapter.', chaptersDone, 1),
    item('course', 'Course complete', 'Reach 100% on a course.', bestCourse, 100, (v) => `${v}%`),
    item('early', 'Early start', 'Start a session before 8:00.', earlySessions, 1),
    item('together', 'Study buddy', 'Join a study room or group.', together, 1),
  ];
}

// ---------- timerUtils ----------

/** Milliseconds left on a timer ({ status, endsAt, remainingMs }), or null when idle. */
export function timeLeft(timer, now) {
  if (timer.status === 'running') return Math.max(0, timer.endsAt - now);
  if (timer.status === 'paused') return timer.remainingMs;
  return null;
}

export function phaseMinutes(timer) {
  return timer.phase === 'break' ? timer.breakMinutes : timer.focusMinutes;
}

const STALE_AFTER_MS = 3 * 60 * 60000;

/**
 * Moves a shared room timer forward to `now`, cycling focus and break.
 * Returns the updated room and the end times of focus rounds that finished.
 * A room stops when its goal is reached, or if nobody touched it for hours.
 */
export function advanceRoom(room, now) {
  let timer = room.timer;
  let goal = room.goal;
  const finishedRounds = [];

  if (timer.status === 'running' && now - timer.endsAt > STALE_AFTER_MS) {
    return { room: { ...room, timer: { ...timer, status: 'idle', phase: 'focus', endsAt: null } }, finishedRounds };
  }

  while (timer.status === 'running' && timer.endsAt <= now) {
    if (timer.phase === 'focus') {
      finishedRounds.push(timer.endsAt);
      goal = { ...goal, rounds: goal.rounds + 1 };
      if (goal.rounds >= goal.targetRounds) {
        timer = { ...timer, status: 'idle', phase: 'focus', endsAt: null };
      } else {
        timer = { ...timer, phase: 'break', endsAt: timer.endsAt + timer.breakMinutes * 60000 };
      }
    } else {
      timer = { ...timer, phase: 'focus', endsAt: timer.endsAt + timer.focusMinutes * 60000 };
    }
  }

  if (timer === room.timer) return { room, finishedRounds };
  return { room: { ...room, timer, goal }, finishedRounds };
}
