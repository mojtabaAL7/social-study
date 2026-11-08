import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { byDue, dailySeries, formatLongDate, formatMinutes, fromKey, minutesByDate, monthGrid, monthlySeries, startOfWeek, todayKey, toKey, typeLabel, weeklySeries } from '../utils';
import { DeadlineForm, DeadlineRow } from './deadlines';
import { COURSE_BG, COURSE_PEN, CourseMark, Modal, Section, Segmented } from './ui';

// ---------- Achievements ----------

function Seal({ earned }) {
  return (
    <span
      aria-hidden={true}
      className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${earned ? 'bg-ink text-paper' : 'border-2 border-rule'}`}
    >
      {earned ? (
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      ) : null}
    </span>
  );
}

/** Milestones: earned ones first, the rest with how far along you are. */
export function Achievements({ items }) {
  const sorted = items.slice().sort((a, b) => Number(b.earned) - Number(a.earned) || b.value / b.target - a.value / a.target);
  const earned = items.filter((i) => i.earned).length;

  return (
    <Section
      title="Achievements"
      icon="trophy"
      action={<span className="text-sm text-pencil">{`${earned} of ${items.length} earned`}</span>}
    >
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {sorted.map((item) => (
          <li key={item.id} className="flex gap-3 border-b border-rule/60 py-3">
            <Seal earned={item.earned} />
            <div className="min-w-0 flex-1">
              <p className={item.earned ? 'font-bold' : ''}>
                {item.title}
                <span className="sr-only">{item.earned ? ' (earned)' : ' (not yet earned)'}</span>
              </p>
              <p className="text-sm text-pencil">{item.description}</p>
              {item.earned ? null : (
                <div className="mt-1.5">
                  <div aria-hidden={true} className="h-1 rounded-full bg-rule/50">
                    <div
                      className="h-full rounded-full bg-pencil"
                      style={{
                        width: `${(item.value / item.target) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-pencil tabular">{item.progressText}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------- CourseDistribution ----------

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

/** How study time splits across courses: one bar per course in its own colour, labelled. */
export function CourseDistribution({ sessions, courses }) {
  const [range, setRange] = useState('month');
  const from = since(range);
  const inRange = sessions.filter((s) => s.date >= from);
  const total = inRange.reduce((n, s) => n + s.minutes, 0);

  const rows = courses.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    minutes: inRange.filter((s) => s.courseId === c.id).reduce((n, s) => n + s.minutes, 0),
  }));
  const other = inRange.filter((s) => !courses.some((c) => c.id === s.courseId)).reduce((n, s) => n + s.minutes, 0);
  if (other) rows.push({ id: 'other', name: 'No course or deleted', color: null, minutes: other });
  rows.sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...rows.map((r) => r.minutes));

  return (
    <Section
      title="Time per course"
      icon="pie"
      action={<Segmented label="Time range" value={range} onChange={setRange} options={RANGES} />}
    >
      {total ? (
        <ul className="space-y-4 pt-1">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="mb-1.5 flex items-baseline justify-between gap-4 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {row.color ? <CourseMark color={row.color} /> : <span className="inline-block h-3 w-4" />}
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="whitespace-nowrap tabular">{`${formatMinutes(row.minutes)}, ${Math.round((row.minutes / total) * 100)}%`}</span>
              </div>
              <div aria-hidden={true} className="h-3">
                <div
                  className={`h-full rounded-r ${row.color ? COURSE_PEN[row.color] : 'bg-pencil'}`}
                  style={{
                    width: `${(row.minutes / max) * 100}%`,
                    minWidth: row.minutes ? 2 : 0,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-pencil">
          No study time in this range yet. Finished focus sessions show up here, split by course.
        </p>
      )}
    </Section>
  );
}

// ---------- StudyChart ----------

const PERIODS = {
  daily: { label: 'Daily', unit: 'day', build: (s) => dailySeries(s, 14), current: 'Today', span: 'the last 14 days' },
  weekly: { label: 'Weekly', unit: 'week', build: (s) => weeklySeries(s, 12), current: 'This week', span: 'the last 12 weeks' },
  monthly: {
    label: 'Monthly',
    unit: 'month',
    build: (s) => monthlySeries(s, 6),
    current: 'This month',
    span: 'the last 6 months',
  },
};

/** Round the axis up to a clean number of hours. */
function niceAxis(maxMinutes) {
  const hours = Math.max(1, maxMinutes / 60);
  const steps = [0.5, 1, 2, 5, 10, 20, 50, 100];
  const step = steps.find((s) => hours / s <= 4) || 100;
  const top = Math.ceil(hours / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return { topMinutes: top * 60, ticks };
}

const hoursLabel = (v) => (v === 0 ? '0' : `${Number.isInteger(v) ? v : v.toFixed(1)} h`);

/** Study time per day, week or month: a single-series column chart with a table view. */
export function StudyChart({ sessions }) {
  const [period, setPeriod] = useState('weekly');
  const [showTable, setShowTable] = useState(false);
  const config = PERIODS[period];
  const points = config.build(sessions);

  const max = Math.max(0, ...points.map((p) => p.minutes));
  const best = points.reduce((b, p) => (p.minutes > b.minutes ? p : b), points[0]);
  const current = points[points.length - 1];
  const finished = points.slice(0, -1);
  const average = finished.length ? finished.reduce((n, p) => n + p.minutes, 0) / finished.length : 0;
  const { topMinutes, ticks } = niceAxis(max);
  const dense = points.length > 8;

  return (
    <Section
      title="Study time"
      icon="trend"
      action={
        <Segmented
          label="Group study time by"
          value={period}
          onChange={setPeriod}
          options={Object.keys(PERIODS).map((k) => ({
            value: k,
            label: PERIODS[k].label,
          }))}
        />
      }
    >
      <p className="max-w-prose text-pencil">
        {`${config.current}: `}
        <span className="font-bold text-ink">{formatMinutes(current.minutes)}</span>
        {`. Over ${config.span} you averaged ${formatMinutes(average)} per ${config.unit}`}
        {best && best.minutes
          ? `, and your best ${config.unit} was ${best.longLabel.replace(/^Week of /, 'the week of ')} with ${formatMinutes(best.minutes)}.`
          : '.'}
      </p>
      {showTable ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{`Study time per ${config.unit}`}</caption>
            <thead>
              <tr className="border-b border-rule">
                <th className="py-2 font-bold">{config.unit.charAt(0).toUpperCase() + config.unit.slice(1)}</th>
                <th className="py-2 text-right font-bold">Study time</th>
              </tr>
            </thead>
            <tbody>
              {points
                .slice()
                .reverse()
                .map((p) => (
                  <tr key={p.key} className="border-b border-rule/50">
                    <td className="py-1.5">{p.longLabel}</td>
                    <td className="py-1.5 text-right tabular">{formatMinutes(p.minutes)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[2.75rem_minmax(0,1fr)]">
          {/* Y axis labels */}
          <div aria-hidden={true} className="relative h-48">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2 text-xs text-pencil tabular"
                style={{
                  bottom: `${((t * 60) / topMinutes) * 100}%`,
                  transform: 'translateY(50%)',
                }}
              >
                {hoursLabel(t)}
              </span>
            ))}
          </div>
          <div>
            <div className="relative h-48">
              {/* Gridlines */}
              {ticks.map((t) => (
                <div
                  key={t}
                  aria-hidden={true}
                  className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-pencil/60' : 'bg-rule/60'}`}
                  style={{
                    bottom: `${((t * 60) / topMinutes) * 100}%`,
                  }}
                />
              ))}
              <ul className="absolute inset-0 flex" aria-label={`Study time per ${config.unit}`}>
                {points.map((p, i) => {
                  const height = topMinutes ? (p.minutes / topMinutes) * 100 : 0;
                  const labelled = p.isCurrent || (p === best && p.minutes > 0);
                  // Tooltips near the ends line up with the bar's edge so they never stick out of the page.
                  const tooltipPosition =
                    i < 2 ? 'left-0' : i >= points.length - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                  return (
                    <li
                      key={p.key}
                      tabIndex={0}
                      aria-label={`${p.longLabel}: ${formatMinutes(p.minutes)}`}
                      className="group relative flex flex-1 items-end justify-center outline-none focus-visible:bg-rule/30"
                    >
                      <span
                        className="relative block w-full max-w-[24px] rounded-t bg-ink transition-colors group-hover:bg-ink-soft"
                        style={{
                          height: `${height}%`,
                          minHeight: p.minutes ? 2 : 0,
                          margin: '0 1px',
                        }}
                      >
                        {labelled && p.minutes ? (
                          <span
                            aria-hidden={true}
                            className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-xs font-bold tabular group-hover:invisible"
                          >
                            {formatMinutes(p.minutes).replace(' min', 'm')}
                          </span>
                        ) : null}
                      </span>
                      {/* Tooltip on hover or keyboard focus */}
                      <span
                        role="presentation"
                        className={`pointer-events-none invisible absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs text-paper group-hover:visible group-focus-visible:visible ${tooltipPosition}`}
                      >
                        <span className="block font-bold">{formatMinutes(p.minutes)}</span>
                        {p.longLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {/* X axis labels */}
            <div aria-hidden={true} className="mt-2 flex">
              {points.map((p, i) => (
                <span
                  key={p.key}
                  /* On narrow screens every other label hides (counted from the current period), so the visible ones have room. */ className={`flex min-w-0 flex-1 justify-center whitespace-nowrap text-xs ${p.isCurrent ? 'font-bold text-ink' : 'text-pencil'} ${dense && (points.length - 1 - i) % 2 === 1 ? 'invisible sm:visible' : ''}`}
                >
                  {p.isCurrent ? <span className="hl">{p.label}</span> : p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowTable(!showTable)}
        className="mt-4 text-sm underline decoration-rule underline-offset-4 hover:decoration-ink"
      >
        {showTable ? 'Show as chart' : 'Show as table'}
      </button>
    </Section>
  );
}

// ---------- StudyHeatmap ----------

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
const MAX_CHIPS = 2;

/** A deadline on the calendar, in its course's highlighter colour. Exams are bold with a dark edge. */
function Chip({ deadline, course }) {
  const exam = deadline.type === 'exam';
  return (
    <span
      className={`block truncate rounded-sm px-1 text-[0.6875rem] leading-4 text-ink ${course ? COURSE_BG[course.color] : 'bg-white ring-1 ring-inset ring-rule'} ${exam ? 'border-l-[3px] border-ink font-bold' : ''} ${deadline.done ? 'line-through opacity-60' : ''}`}
    >
      {deadline.title}
    </span>
  );
}

function DayDetails({ dayKey, minutes, deadlines, courses, actions, onAdded }) {
  const isPastOrToday = dayKey <= todayKey();
  return (
    <div>
      {isPastOrToday ? (
        <p className="text-pencil">{minutes ? `You studied ${formatMinutes(minutes)} this day.` : 'No study time this day.'}</p>
      ) : null}
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
        <DeadlineForm
          key={dayKey}
          idPrefix="calendar-deadline"
          courses={courses}
          defaultDate={dayKey}
          onSubmit={(deadline) => {
            actions.addAssignment(deadline);
            onAdded();
          }}
        />
      </div>
    </div>
  );
}

/**
 * A month calendar. Each day is shaded by how long you studied and lists the homework
 * and exams due that day. Click a day to see it in full or add a deadline.
 */
export function StudyHeatmap() {
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

  const navButton = (label, onClick, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-rule bg-white px-2.5 py-1 text-sm hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );

  return (
    <div id="calendar" className="scroll-mt-8">
      <Section
        title="Calendar"
        icon="calendar"
        action={
          <div className="flex items-center gap-2">
            {navButton('Previous', () => shift(-1))}
            {isCurrentMonth
              ? null
              : navButton('This month', () =>
                  setCursor({
                    year: now.getFullYear(),
                    month: now.getMonth(),
                  })
                )}
            {navButton('Next', () => shift(1))}
          </div>
        }
      >
        <p className="text-pencil" aria-live="polite">
          <span className="font-bold text-ink">{title}</span>
          {`: studied on ${studiedDays} ${studiedDays === 1 ? 'day' : 'days'}, ${formatMinutes(monthTotal)} in total. `}
          {monthDeadlines
            ? `${monthDeadlines} homework and exam ${monthDeadlines === 1 ? 'deadline' : 'deadlines'}.`
            : 'No deadlines.'}
          {' Click a day to add homework or an exam.'}
        </p>
        <table
          className="mt-4 w-full table-fixed border-separate"
          style={{
            borderSpacing: '3px',
          }}
        >
          <caption className="sr-only">{`${title}: study time and deadlines per day`}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th key={d} scope="col" className="pb-1 text-xs font-normal text-pencil">
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
                  const level = isFuture
                    ? {
                        min: -1,
                        className: 'bg-transparent text-ink ring-1 ring-inset ring-rule/50',
                      }
                    : levelFor(minutes);
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
                        className={`flex min-h-[3.25rem] w-full flex-col gap-0.5 rounded p-1 text-left hover:ring-2 hover:ring-inset hover:ring-ink sm:min-h-[5.5rem] sm:p-1.5 ${level.className} ${level.min === 0 ? 'ring-1 ring-inset ring-rule' : ''}`}
                      >
                        <span aria-hidden={true} className="flex items-baseline justify-between gap-1 text-xs tabular">
                          {isToday ? (
                            <span className="hl font-bold text-ink">{fromKey(key).getDate()}</span>
                          ) : (
                            <span>{fromKey(key).getDate()}</span>
                          )}
                          {minutes ? (
                            <span className="hidden sm:inline">{formatMinutes(minutes).replace(' min', 'm')}</span>
                          ) : null}
                        </span>
                        {/* Phones: a small mark per deadline. Wider screens: the deadline titles. */}
                        {dayDeadlines.length ? (
                          <span aria-hidden={true} className="flex flex-wrap gap-0.5 sm:hidden">
                            {dayDeadlines.slice(0, 3).map((d) => {
                              const course = courseOf(d);
                              return (
                                <span
                                  key={d.id}
                                  className={`inline-block h-1.5 w-3 -skew-x-12 rounded-sm ${course ? COURSE_BG[course.color] : 'bg-white ring-1 ring-ink'} ${d.type === 'exam' ? 'ring-1 ring-ink' : ''}`}
                                />
                              );
                            })}
                          </span>
                        ) : null}
                        {dayDeadlines.length ? (
                          <span aria-hidden={true} className="hidden min-w-0 space-y-0.5 sm:block">
                            {dayDeadlines.slice(0, MAX_CHIPS).map((d) => (
                              <Chip key={d.id} deadline={d} course={courseOf(d)} />
                            ))}
                            {dayDeadlines.length > MAX_CHIPS ? (
                              <span className="block text-[0.6875rem]">{`+${dayDeadlines.length - MAX_CHIPS} more`}</span>
                            ) : null}
                          </span>
                        ) : null}
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
              <span
                aria-hidden={true}
                className={`inline-block h-3 w-3 rounded-sm ${l.className.split(' ')[0]} ${l.min === 0 ? 'ring-1 ring-inset ring-rule' : ''}`}
              />
              {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden={true}
              className="inline-block rounded-sm border-l-[3px] border-ink bg-hl-blue px-1 font-bold text-ink"
            >
              Exam
            </span>
            <span aria-hidden={true} className="inline-block rounded-sm bg-hl-blue px-1 text-ink">
              Homework
            </span>
            <span className="sr-only">Exams are bold with a dark edge; homework is plain.</span>in the course colour
          </span>
        </div>
      </Section>
      <Modal open={Boolean(selected)} title={selected ? formatLongDate(selected) : ''} onClose={() => setSelected(null)}>
        {selected ? (
          <DayDetails
            dayKey={selected}
            minutes={byDate[selected] || 0}
            deadlines={deadlinesByDate[selected] || []}
            courses={courses}
            actions={study}
            onAdded={() => {}}
          />
        ) : null}
      </Modal>
    </div>
  );
}
