import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { addDays, byDue, formatLongDate, formatMinutes, fromKey, minutesByDate, monthGrid, startOfWeek, todayKey, toKey, typeLabel } from '../utils';
import { DeadlineForm, DeadlineRow } from './deadlines';
import { Badge, Button, ConfirmButton, COURSE_BG, COURSE_PEN, CourseMark, Modal, Section, Segmented } from './ui';

/** "1h 15" or "40m": short enough for a calendar cell or the top of a bar. */
function shortMinutes(total) {
  const minutes = Math.round(total);
  if (minutes < 60) return `${minutes}m`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)}h ${String(rest).padStart(2, '0')}` : `${Math.floor(minutes / 60)}h`;
}

const sumMinutes = (sessions) => sessions.reduce((n, s) => n + s.minutes, 0);

// ---------- Achievements ----------

/**
 * Milestones as small cards. Earned ones are inked in and highlighted;
 * the rest are pencilled outlines that show how far along you are.
 */
export function Achievements({ items }) {
  const sorted = items.slice().sort((a, b) => Number(b.earned) - Number(a.earned) || b.value / b.target - a.value / a.target);
  const earned = items.filter((i) => i.earned).length;

  return (
    <Section title="Achievements" icon="trophy" action={<span className="text-sm text-pencil">{`${earned} of ${items.length} earned`}</span>}>
      <ul className="grid grid-cols-2 gap-2 pt-1 xl:grid-cols-3">
        {sorted.map((item) => (
          <li
            key={item.id}
            className={`flex min-h-[6.5rem] flex-col rounded-sm p-3 ${item.earned ? 'border border-ink bg-white' : 'border border-dashed border-pencil/50 text-pencil'}`}
          >
            <p className="font-serif text-md font-semibold leading-snug">
              {item.earned ? <span className="hl">{item.title}</span> : item.title}
              <span className="sr-only">{item.earned ? ' (earned)' : ' (not yet earned)'}</span>
            </p>
            <p className="mt-1 text-sm">{item.description}</p>
            <div className="mt-auto pt-2">
              {item.earned ? (
                <Badge variant="solid">Earned</Badge>
              ) : (
                <>
                  <div aria-hidden={true} className="h-1 rounded-full bg-rule/50">
                    <div className="h-full rounded-full bg-pencil" style={{ width: `${(item.value / item.target) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs tabular">{item.progressText}</p>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------- HoursByCourse ----------

const RANGES = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

function since(range) {
  if (range === 'week') return toKey(startOfWeek());
  if (range === 'month') return toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  return '';
}

/** How study time splits across courses: one bar cut into the courses' colours, then the figures. */
export function HoursByCourse({ sessions, courses }) {
  const [range, setRange] = useState('all');
  const from = since(range);
  const inRange = sessions.filter((s) => s.date >= from);
  const total = sumMinutes(inRange);

  const rows = courses.map((c) => ({ id: c.id, name: c.name, color: c.color, minutes: sumMinutes(inRange.filter((s) => s.courseId === c.id)) }));
  const other = sumMinutes(inRange.filter((s) => !courses.some((c) => c.id === s.courseId)));
  if (other) rows.push({ id: 'other', name: 'No course or deleted', color: null, minutes: other });
  rows.sort((a, b) => b.minutes - a.minutes);

  return (
    <Section title="Where the hours went" icon="pie" action={<Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />}>
      {total ? (
        <>
          <div aria-hidden={true} className="mt-1 flex h-3.5 gap-0.5 overflow-hidden rounded-sm">
            {rows.map((row) =>
              row.minutes ? <span key={row.id} className={row.color ? COURSE_PEN[row.color] : 'bg-pencil'} style={{ flexGrow: row.minutes, minWidth: 3 }} /> : null
            )}
          </div>
          <ul className="mt-2 divide-y divide-rule/60">
            {rows.map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {row.color ? <CourseMark color={row.color} /> : <span className="inline-block h-3 w-4 shrink-0" />}
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="whitespace-nowrap text-sm tabular">
                  <span className="font-bold">{formatMinutes(row.minutes)}</span>
                  <span className="ml-3 inline-block w-9 text-right text-pencil">{`${Math.round((row.minutes / total) * 100)}%`}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-3 text-pencil">No study time in this range yet. Finished focus sessions show up here, split by course.</p>
      )}
    </Section>
  );
}

// ---------- LastTwoWeeks ----------

const DAYS = 14;
const BAR_AREA_PX = 150;

/** Study time for each of the last 14 days, every bar stacked by course. */
export function LastTwoWeeks({ sessions, courses }) {
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(today, i - (DAYS - 1));
    const key = toKey(date);
    const list = sessions.filter((s) => s.date === key);
    const parts = courses.map((c) => ({ id: c.id, color: c.color, minutes: sumMinutes(list.filter((s) => s.courseId === c.id)) }));
    const other = sumMinutes(list.filter((s) => !courses.some((c) => c.id === s.courseId)));
    if (other) parts.push({ id: 'other', color: null, minutes: other });
    return { key, date, total: sumMinutes(list), parts: parts.filter((p) => p.minutes), isToday: i === DAYS - 1 };
  });
  const max = Math.max(60, ...days.map((d) => d.total));
  const total = days.reduce((n, d) => n + d.total, 0);
  const used = courses.filter((c) => days.some((d) => d.parts.some((p) => p.id === c.id)));

  return (
    <Section
      title="Last 14 days"
      icon="trend"
      action={<span className="text-sm text-pencil">{`${formatMinutes(total)} in total, ${formatMinutes(total / DAYS)} a day`}</span>}
    >
      <ul className="flex items-end gap-1 pt-2 sm:gap-1.5" aria-label="Study time per day for the last 14 days">
        {days.map((d) => (
          <li key={d.key} aria-label={`${formatLongDate(d.key)}: ${formatMinutes(d.total)}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span aria-hidden={true} className="h-4 whitespace-nowrap text-[0.625rem] leading-4 tabular text-pencil">
              {d.total ? shortMinutes(d.total) : ''}
            </span>
            <span aria-hidden={true} className="flex w-full items-end" style={{ height: BAR_AREA_PX }}>
              <span
                className="flex w-full flex-col-reverse gap-px overflow-hidden rounded-t-sm bg-rule/60"
                style={{ height: d.total ? Math.max(3, Math.round((d.total / max) * BAR_AREA_PX)) : 2 }}
              >
                {d.parts.map((p) => (
                  <span key={p.id} className={p.color ? COURSE_PEN[p.color] : 'bg-pencil'} style={{ flexGrow: p.minutes }} />
                ))}
              </span>
            </span>
            <span
              aria-hidden={true}
              className={`flex w-full flex-col items-center border-t-2 border-ink pt-1 text-xs leading-tight tabular ${d.isToday ? 'font-bold text-ink' : 'text-pencil'}`}
            >
              <span>{d.date.toLocaleDateString('en-GB', { weekday: 'narrow' })}</span>
              {d.isToday ? <span className="hl">{d.date.getDate()}</span> : <span>{d.date.getDate()}</span>}
            </span>
          </li>
        ))}
      </ul>
      {used.length ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
          {used.map((c) => (
            <li key={c.id} className="flex items-center gap-1.5">
              <span aria-hidden={true} className={`inline-block h-2.5 w-2.5 rounded-sm ${COURSE_PEN[c.color] || 'bg-pencil'}`} />
              {c.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-pencil">Finished focus sessions show up here, a bar for each day.</p>
      )}
    </Section>
  );
}

// ---------- StudyCalendar ----------

const LEVELS = [
  { min: 0, className: 'bg-white text-ink', label: 'None' },
  { min: 1, className: 'bg-heat-1 text-ink', label: 'Under 30 min' },
  { min: 30, className: 'bg-heat-2 text-ink', label: '30 to 60 min' },
  { min: 60, className: 'bg-heat-3 text-paper', label: '1 to 2 h' },
  { min: 120, className: 'bg-heat-4 text-paper', label: '2 h or more' },
];

function levelFor(minutes) {
  let level = LEVELS[0];
  LEVELS.forEach((l) => {
    if (minutes >= l.min) level = l;
  });
  return level;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_MARKS = 4;

function DayDetails({ dayKey, minutes, deadlines, courses, actions }) {
  const isPastOrToday = dayKey <= todayKey();
  return (
    <div>
      {isPastOrToday ? <p className="text-pencil">{minutes ? `You studied ${formatMinutes(minutes)} this day.` : 'No study time this day.'}</p> : null}
      {deadlines.length ? (
        <ul className="mt-2 divide-y divide-rule/60">
          {deadlines.map((d) => (
            <DeadlineRow
              key={d.id}
              deadline={d}
              course={courses.find((c) => c.id === d.courseId)}
              showDate={false}
              onToggle={actions.toggleAssignment}
              onDelete={actions.deleteAssignment}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-pencil">Nothing due this day.</p>
      )}
      <div className="mt-5 border-t border-rule pt-5">
        <h3 className="mb-3 font-sans text-base font-bold">Add homework or an exam</h3>
        <DeadlineForm key={dayKey} idPrefix="calendar-deadline" courses={courses} defaultDate={dayKey} onSubmit={actions.addAssignment} />
      </div>
    </div>
  );
}

/**
 * A month at a glance. Each day is shaded by how long you studied, with a highlighter
 * mark for every homework or exam due. Click a day to see it in full or add a deadline.
 */
export function StudyCalendar() {
  const study = useStudy();
  const { sessions, assignments, courses } = study;
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(null);

  const byDate = minutesByDate(sessions);
  const deadlinesByDate = {};
  assignments
    .slice()
    .sort(byDue)
    .forEach((a) => {
      (deadlinesByDate[a.due] = deadlinesByDate[a.due] || []).push(a);
    });

  const today = todayKey();
  const weeks = monthGrid(cursor.year, cursor.month);
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const monthKeys = weeks.flat().filter(Boolean);
  const studiedDays = monthKeys.filter((k) => byDate[k]).length;
  const monthTotal = monthKeys.reduce((n, k) => n + (byDate[k] || 0), 0);
  const monthDeadlines = monthKeys.reduce((n, k) => n + (deadlinesByDate[k] || []).length, 0);
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const courseOf = (d) => courses.find((c) => c.id === d.courseId);

  const shift = (delta) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const navButton = (label, onClick) => (
    <button type="button" onClick={onClick} className="rounded-md border border-rule bg-white px-2.5 py-1 text-sm hover:border-ink">
      {label}
    </button>
  );

  return (
    <div id="calendar" className="min-w-0 scroll-mt-8">
      <Section
        title={title}
        icon="calendar"
        action={
          <div className="flex items-center gap-2">
            {navButton('Previous', () => shift(-1))}
            {isCurrentMonth ? null : navButton('This month', () => setCursor({ year: now.getFullYear(), month: now.getMonth() }))}
            {navButton('Next', () => shift(1))}
          </div>
        }
      >
        <p className="text-sm text-pencil" aria-live="polite">
          {`Studied on ${studiedDays} ${studiedDays === 1 ? 'day' : 'days'}, `}
          <span className="font-bold text-ink">{formatMinutes(monthTotal)}</span>
          {' in total. '}
          {monthDeadlines ? `${monthDeadlines} ${monthDeadlines === 1 ? 'deadline' : 'deadlines'}. ` : 'No deadlines. '}
          Click a day to add homework or an exam.
        </p>
        <table className="mt-3 w-full table-fixed border-separate" style={{ borderSpacing: '3px' }}>
          <caption className="sr-only">{`${title}: study time and deadlines per day`}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="pb-1 text-left text-xs font-normal text-pencil">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((key, di) => {
                  if (!key) return <td key={`e-${di}`} />;
                  const minutes = byDate[key] || 0;
                  const dayDeadlines = deadlinesByDate[key] || [];
                  const isToday = key === today;
                  const isFuture = key > today;
                  const level = isFuture ? { min: -1, className: 'bg-transparent text-ink ring-1 ring-inset ring-rule/50' } : levelFor(minutes);
                  const label = [
                    formatLongDate(key),
                    isFuture ? null : minutes ? `studied ${formatMinutes(minutes)}` : 'no study',
                    dayDeadlines.length ? dayDeadlines.map((d) => `${typeLabel(d.type)}: ${d.title}`).join('; ') : null,
                  ]
                    .filter(Boolean)
                    .join('. ');
                  return (
                    <td key={key} className="p-0 align-top">
                      <button
                        type="button"
                        onClick={() => setSelected(key)}
                        aria-label={label}
                        title={label}
                        className={`flex min-h-[3.5rem] w-full flex-col rounded-sm p-1 text-left hover:ring-2 hover:ring-inset hover:ring-ink sm:min-h-[4.25rem] sm:p-1.5 ${level.className} ${level.min === 0 ? 'ring-1 ring-inset ring-rule' : ''} ${isToday ? 'outline outline-2 outline-offset-1 outline-ink' : ''}`}
                      >
                        <span aria-hidden={true} className="text-xs tabular">
                          {isToday ? <span className="hl font-bold text-ink">{fromKey(key).getDate()}</span> : fromKey(key).getDate()}
                        </span>
                        <span aria-hidden={true} className="mt-auto hidden whitespace-nowrap text-[0.6875rem] leading-4 tabular opacity-90 sm:block">
                          {minutes ? shortMinutes(minutes) : ''}
                        </span>
                        <span aria-hidden={true} className="mt-auto flex min-h-[0.5rem] flex-wrap gap-0.5 sm:mt-0.5">
                          {dayDeadlines.slice(0, MAX_MARKS).map((d) => {
                            const course = courseOf(d);
                            return (
                              <span
                                key={d.id}
                                className={`inline-block h-2 w-3.5 -skew-x-12 rounded-sm ring-1 ${course ? COURSE_BG[course.color] : 'bg-white'} ${d.type === 'exam' ? 'ring-ink' : 'ring-white/70'} ${d.done ? 'opacity-50' : ''}`}
                              />
                            );
                          })}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-pencil">
          {LEVELS.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span aria-hidden={true} className={`inline-block h-3 w-3 rounded-sm ${l.className.split(' ')[0]} ${l.min === 0 ? 'ring-1 ring-inset ring-rule' : ''}`} />
              {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span aria-hidden={true} className="inline-block h-2 w-3.5 -skew-x-12 rounded-sm bg-hl-blue" />
            Homework
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden={true} className="inline-block h-2 w-3.5 -skew-x-12 rounded-sm bg-hl-blue ring-1 ring-ink" />
            Exam, in the course colour
          </span>
        </div>
      </Section>
      <Modal open={Boolean(selected)} title={selected ? formatLongDate(selected) : ''} onClose={() => setSelected(null)}>
        {selected ? (
          <DayDetails dayKey={selected} minutes={byDate[selected] || 0} deadlines={deadlinesByDate[selected] || []} courses={courses} actions={study} />
        ) : null}
      </Modal>
    </div>
  );
}

// ---------- YourData ----------

/** Fill the app with example data to look around, or wipe everything and start again. */
export function YourData() {
  const { courses, tasks, sessions, assignments, loadSampleData, resetData } = useStudy();
  const hasData = courses.length + tasks.length + sessions.length + assignments.length > 0;

  return (
    <Section title="Your data" icon="sliders">
      <p className="max-w-prose text-pencil">
        Everything is saved in this browser. Loading the sample data replaces your courses, tasks, deadlines and study history with an example term; your
        friends, groups and rooms stay.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {hasData ? (
          <ConfirmButton label="Load sample data" confirmLabel="Click again to replace your data with the sample" onConfirm={loadSampleData} className="whitespace-normal text-left" />
        ) : (
          <Button variant="quiet" onClick={loadSampleData}>
            Load sample data
          </Button>
        )}
        {hasData ? <ConfirmButton label="Erase everything" confirmLabel="Click again to erase all your data" onConfirm={resetData} className="whitespace-normal text-left" /> : null}
      </div>
    </Section>
  );
}
