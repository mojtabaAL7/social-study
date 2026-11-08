import { useNow } from '../hooks';
import { addDays, formatClock, formatLongDate, formatMinutes, formatTime, minutesThisWeek, minutesToday, timeLeft, todayKey, toKey } from '../utils';
import { Button, ConfirmButton, CourseMark, Section } from './ui';

// ---------- FocusTimer ----------

/**
 * The page's one bold element: large clock numerals over a highlighter swipe
 * that fills across the page as the session runs.
 */
export function FocusTimer({ focus, settings, course, actions }) {
  const now = useNow(focus.status === 'running' ? 250 : 60000);
  const phaseMs = (focus.phase === 'break' ? settings.breakMinutes : settings.focusMinutes) * 60000;
  const duration = focus.durationMs || phaseMs;
  const left = timeLeft(focus, now);
  const remaining = left === null ? phaseMs : left;
  const progress = left === null ? 0 : Math.min(1, Math.max(0, 1 - remaining / duration));
  const isBreak = focus.phase === 'break';

  let status = 'Ready when you are';
  if (focus.status === 'running') status = isBreak ? 'On a break' : 'Focusing';
  if (focus.status === 'paused') status = 'Paused';
  if (focus.status === 'idle' && isBreak) status = 'Break is ready';

  return (
    <section aria-label="Study timer" className="py-6">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-pencil">
        <span className="font-bold text-ink">{status}</span>
        {!isBreak && course ? (
          <span className="flex items-center gap-2">
            <CourseMark color={course.color} />
            {course.name}
          </span>
        ) : null}
        {isBreak ? <span>{`${formatMinutes(settings.breakMinutes)} to rest, then the next round`}</span> : null}
      </p>
      <p
        role="timer"
        aria-label={`${formatClock(remaining)} ${isBreak ? 'of break' : 'of focus'} left`}
        className="mt-2 font-serif font-semibold leading-none tabular"
        style={{
          fontSize: 'clamp(4.5rem, 16vw, 10rem)',
          letterSpacing: '-0.02em',
        }}
      >
        {formatClock(remaining)}
      </p>
      <div
        role="progressbar"
        aria-label={isBreak ? 'Break progress' : 'Session progress'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="relative mt-6 h-10 w-full overflow-hidden rounded-md bg-rule/30"
      >
        <div
          className={`swipe-fill absolute inset-y-0 left-0 ${isBreak ? 'swipe-break' : 'swipe-focus'}`}
          style={{
            width: `${progress * 100}%`,
          }}
        />
      </div>
      <div className="mt-6">
        <TimerControls focus={focus} actions={actions} />
      </div>
    </section>
  );
}

// ---------- SessionSummary ----------

/** Session history for the last week, newest first, grouped by day. */
export function SessionSummary({ sessions, courses, rooms, onDelete }) {
  const since = toKey(addDays(new Date(), -6));
  const recent = sessions.filter((s) => s.date >= since).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const days = Array.from(new Set(recent.map((s) => s.date)));
  const today = todayKey();
  const countToday = sessions.filter((s) => s.date === today).length;

  return (
    <Section
      title="Session history"
      icon="history"
      action={
        <span className="text-sm text-pencil">{`${formatMinutes(minutesToday(sessions))} today in ${countToday} ${countToday === 1 ? 'session' : 'sessions'}, ${formatMinutes(minutesThisWeek(sessions))} this week`}</span>
      }
    >
      {days.length ? (
        days.map((day) => (
          <div key={day} className="mt-4 first:mt-1">
            <h3 className="font-sans text-sm font-bold text-pencil">{day === today ? 'Today' : formatLongDate(day)}</h3>
            <ul className="divide-y divide-rule/60">
              {recent
                .filter((s) => s.date === day)
                .map((s) => {
                  const course = courses.find((c) => c.id === s.courseId);
                  const room = s.roomId ? rooms.find((r) => r.id === s.roomId) : null;
                  return (
                    <li key={s.id} className="group flex items-start justify-between gap-4 py-2.5">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          {course ? <CourseMark color={course.color} /> : null}
                          <span className="truncate">{course ? course.name : 'No course'}</span>
                        </p>
                        <p className="text-sm text-pencil">
                          {[formatTime(s.startedAt), s.goal, room ? `in ${room.name}` : null].filter(Boolean).join(', ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="whitespace-nowrap text-sm tabular">{formatMinutes(s.minutes)}</span>
                        <ConfirmButton
                          label="Delete"
                          confirmLabel="Delete session?"
                          ariaLabel={`Delete the ${formatMinutes(s.minutes)} session at ${formatTime(s.startedAt)}`}
                          onConfirm={() => onDelete(s.id)}
                          className="sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))
      ) : (
        <p className="py-3 text-pencil">No sessions in the last week. Finished sessions are saved here automatically.</p>
      )}
    </Section>
  );
}

// ---------- TimerControls ----------

/** The buttons under the timer change with its state, so only valid actions are offered. */
export function TimerControls({ focus, actions }) {
  const { status, phase } = focus;
  const buttons = [];

  if (phase === 'focus') {
    if (status === 'idle')
      buttons.push(
        <Button key="start" onClick={actions.startFocus}>
          Start focus session
        </Button>
      );
    if (status === 'running')
      buttons.push(
        <Button key="pause" onClick={actions.pauseFocus}>
          Pause
        </Button>
      );
    if (status === 'paused')
      buttons.push(
        <Button key="resume" onClick={actions.resumeFocus}>
          Resume
        </Button>
      );
    if (status !== 'idle') {
      buttons.push(
        <Button key="finish" variant="quiet" onClick={actions.finishFocusEarly}>
          Finish and save
        </Button>
      );
      buttons.push(
        <Button key="reset" variant="text" onClick={actions.resetFocus} className="ml-2">
          Reset without saving
        </Button>
      );
    }
  } else {
    if (status === 'idle')
      buttons.push(
        <Button key="start" onClick={actions.startFocus}>
          Start break
        </Button>
      );
    if (status === 'running')
      buttons.push(
        <Button key="pause" variant="quiet" onClick={actions.pauseFocus}>
          Pause break
        </Button>
      );
    if (status === 'paused')
      buttons.push(
        <Button key="resume" variant="quiet" onClick={actions.resumeFocus}>
          Resume break
        </Button>
      );
    buttons.push(
      <Button key="skip" onClick={actions.skipBreak}>
        Skip break
      </Button>
    );
  }

  return <div className="flex flex-wrap items-center gap-3">{buttons}</div>;
}
