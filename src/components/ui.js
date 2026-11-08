import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

// ---------- Avatar ----------

// Soft tints, deliberately unlike the course highlighters, so a person never reads as a course.
const TINTS = ['bg-avatar-lilac', 'bg-avatar-sand', 'bg-avatar-mint', 'bg-avatar-rose'];

function initials(name) {
  return name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}

/** The same person always gets the same tint, so friends are easy to tell apart. */
function tintFor(name) {
  const clean = name.replace(/\(.*?\)/g, '').trim();
  let sum = 0;
  for (let i = 0; i < clean.length; i += 1) sum += clean.charCodeAt(i);
  return TINTS[sum % TINTS.length];
}

export function Avatar({ name, className = '' }) {
  return (
    <span
      aria-hidden={true}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-ink ${tintFor(name)} ${className}`.trim()}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping initials for a group of people, with the full list for screen readers. */
export function AvatarStack({ names, max = 4 }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex items-center">
      <span className="sr-only">{names.join(', ')}</span>
      {shown.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} className={`h-7 w-7 text-xs ring-2 ring-white ${i ? '-ml-2' : ''}`} />
      ))}
      {extra > 0 ? <span aria-hidden={true} className="ml-1.5 text-sm text-pencil">{`+${extra}`}</span> : null}
    </span>
  );
}

// ---------- Badge ----------

// solid: the strongest (Exam, Studying). outline: a lighter kind (Homework, Online).
// soft: background information (Private, Offline, a course code).
const BADGE_VARIANTS = {
  solid: 'bg-ink text-paper',
  outline: 'border border-ink text-ink',
  soft: 'bg-rule/50 text-ink',
};

/** A small label that tells similar things apart at a glance. Always readable text, never colour alone. */
export function Badge({ variant = 'soft', className = '', children }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-px text-xs font-bold leading-5 ${BADGE_VARIANTS[variant]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}

/** Exam or Homework, consistently styled everywhere a deadline appears. */
export function DeadlineBadge({ type }) {
  return type === 'exam' ? <Badge variant="solid">Exam</Badge> : <Badge variant="outline">Homework</Badge>;
}

/** Studying, Online or Offline, for friends and study room members. */
export function StatusBadge({ status }) {
  if (status === 'studying') return <Badge variant="solid">Studying</Badge>;
  if (status === 'online') return <Badge variant="outline">Online</Badge>;
  return <Badge variant="soft">Offline</Badge>;
}

// ---------- Button ----------

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50';

// Padding lives in each variant so no two padding utilities ever compete.
const BUTTON_VARIANTS = {
  primary: 'bg-ink px-5 py-2.5 font-bold text-paper hover:bg-ink-soft',
  quiet: 'border border-rule bg-white px-4 py-2 font-bold text-ink hover:border-ink',
  text: 'p-0 text-ink underline decoration-rule decoration-2 underline-offset-4 hover:decoration-ink',
};

/** Renders a router Link when `to` is given, otherwise a button. */
export function Button({ to, variant = 'primary', className = '', type = 'button', children, ...rest }) {
  const classes = `${BASE} ${BUTTON_VARIANTS[variant]} ${className}`.trim();
  if (to)
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

// ---------- ConfirmButton ----------

/**
 * A destructive action that asks for a second click, in place, before it runs.
 * It disarms itself after a few seconds or when focus leaves it.
 */
export function ConfirmButton({ label, confirmLabel, ariaLabel, onConfirm, className = '' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      aria-label={ariaLabel ? (armed ? `${confirmLabel} ${ariaLabel}` : ariaLabel) : undefined}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
      className={`whitespace-nowrap text-sm underline underline-offset-4 ${armed ? 'font-bold text-ink decoration-ink opacity-100' : 'text-pencil decoration-rule hover:text-ink'} ${className}`.trim()}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

// ---------- CourseMark ----------

// Full class names so Tailwind can find them.
export const COURSE_BG = {
  blue: 'bg-hl-blue',
  green: 'bg-hl-green',
  orange: 'bg-hl-orange',
  pink: 'bg-hl-pink',
};

// Deeper version of each hue, for bars and chart marks.
export const COURSE_PEN = {
  blue: 'bg-pen-blue',
  green: 'bg-pen-green',
  orange: 'bg-pen-orange',
  pink: 'bg-pen-pink',
};

export const COURSE_COLOR_NAMES = {
  blue: 'Blue',
  green: 'Green',
  orange: 'Orange',
  pink: 'Pink',
};

/** A short highlighter stroke in the course's colour. */
export function CourseMark({ color, className = '' }) {
  return (
    <span
      aria-hidden={true}
      className={`inline-block h-3 w-4 shrink-0 -skew-x-12 rounded-sm ${COURSE_BG[color] || 'bg-rule'} ${className}`.trim()}
    />
  );
}

// ---------- Field ----------

/** A labelled input, select or textarea, stacked. */
export function Field({ id, label, hint, as = 'input', className = '', children, ...rest }) {
  // JSX needs a capitalised name to render a tag chosen at runtime ('input', 'select' or 'textarea').
  const Control = as;
  return (
    <div className={`flex flex-col gap-1 ${className}`.trim()}>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <Control id={id} className="field w-full" {...rest}>
        {children}
      </Control>
      {hint ? <p className="text-sm text-pencil">{hint}</p> : null}
    </div>
  );
}

// ---------- Icon ----------

// Simple line icons (24×24, drawn with the current text colour) so each page and section
// has a shape you can recognise at a glance.
const PATHS = {
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  book: ['M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z', 'M5 19.5A1.5 1.5 0 0 0 6.5 21H19', 'M9 7.5h6'],
  timer: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 9v4l2.5 2.5', 'M9.5 2.5h5'],
  users: [
    'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
    'M2.5 20a6.5 6.5 0 0 1 13 0',
    'M16 4.6a3.5 3.5 0 0 1 0 6.8',
    'M18 14.3a6.5 6.5 0 0 1 3.5 5.7',
  ],
  chart: ['M3 20.5h18', 'M5.5 20.5v-8', 'M10.5 20.5V5', 'M15.5 20.5v-10', 'M20 20.5V9'],
  calendar: ['M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 10h18', 'M8 3v4', 'M16 3v4'],
  checklist: ['M10 6.5h10', 'M10 12h10', 'M10 17.5h10', 'M3.5 6.5 5 8l2.5-3', 'M3.5 12 5 13.5l2.5-3', 'M3.5 17.5 5 19l2.5-3'],
  flag: ['M5 21V4', 'M5 4h12l-2.5 4.5L17 13H5'],
  bell: ['M6 10a6 6 0 1 1 12 0c0 5.5 2.5 7 2.5 7h-17S6 15.5 6 10z', 'M10 20.5a2 2 0 0 0 4 0'],
  history: ['M12 21a9 9 0 1 0-9-9', 'M3 12V7.5', 'M3 12h4.5', 'M12 7.5V12l3 2'],
  sliders: [
    'M4 7h9',
    'M17 7h3',
    'M4 17h3',
    'M11 17h9',
    'M15 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M9 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ],
  trophy: [
    'M8 3.5h8v5.5a4 4 0 0 1-8 0z',
    'M8 5.5H5.5A2.5 2.5 0 0 0 8 10',
    'M16 5.5h2.5A2.5 2.5 0 0 1 16 10',
    'M12 13v4',
    'M8.5 20.5h7',
    'M10 17h4v3.5h-4z',
  ],
  door: ['M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17', 'M3.5 21h17', 'M14.5 12.5v.01'],
  group: [
    'M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M5.5 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M18.5 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M7 20a5 5 0 0 1 10 0',
    'M2 19a3.5 3.5 0 0 1 4-3.5',
    'M22 19a3.5 3.5 0 0 0-4-3.5',
  ],
  pie: ['M12 3a9 9 0 1 0 9 9h-9z', 'M15 3.5a9 9 0 0 1 5.5 5.5H15z'],
  target: [
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
    'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z',
    'M12 12.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z',
  ],
  layers: ['M12 3 3 8l9 5 9-5z', 'M3 12.5l9 5 9-5', 'M3 16.5l9 5 9-5'],
  podium: ['M9 21V9h6v12', 'M3 21v-7h6', 'M15 21v-5h6v5', 'M2 21h20'],
  trend: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  chat: ['M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z', 'M8 10h8', 'M8 13.5h5'],
  pin: ['M9 3h6l-1 6 3.5 3.5h-11L10 9z', 'M12 12.5V21'],
};

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {(PATHS[name] || []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

// ---------- Modal ----------

/** Native <dialog>: focus is trapped and Escape closes it. */
export function Modal({ open, title, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open && dialog.showModal) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className="w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-rule bg-paper p-0 text-ink backdrop:bg-ink/40"
    >
      {open ? (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-lg">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="text-sm text-pencil underline underline-offset-4 hover:text-ink">
              Close
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

// ---------- ProgressBar ----------

export function ProgressBar({ value, color, label, className = '' }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 w-full overflow-hidden rounded-full bg-rule/50 ${className}`.trim()}
    >
      <div
        className={`h-full rounded-full ${COURSE_PEN[color] || 'bg-ink'}`}
        style={{
          width: `${clamped}%`,
        }}
      />
    </div>
  );
}

// ---------- Section ----------

/**
 * A section in the style of a paper planner: no box, just a heavy ink rule above a title
 * with a small icon, like the dividers in a student's planner.
 */
export function Section({ title, icon, action, children, className = '' }) {
  return (
    <section className={`min-w-0 border-t-2 border-[color:var(--page-accent,#1B2A4A)] pt-3 ${className}`.trim()}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2 text-lg">
          {icon ? (
            <Icon name={icon} className="h-[1.1rem] w-[1.1rem] text-[color:var(--page-accent,#1B2A4A)]" />
          ) : null}
          {title}
        </h2>
        {action || null}
      </div>
      {children}
    </section>
  );
}

// ---------- Segmented ----------

/** A small set of mutually exclusive choices, shown as a row of buttons. */
export function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-rule bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1.5 text-sm ${value === option.value ? 'bg-ink font-bold text-paper' : 'text-ink hover:bg-rule/40'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------- StatStrip ----------

/**
 * Headline numbers as one line of figures between two rules, split by thin dividers. No box.
 * On phones they sit two to a row.
 */
export function StatStrip({ items, className = '' }) {
  return (
    <dl className={`grid grid-cols-2 gap-y-4 border-y border-rule py-5 sm:flex sm:flex-wrap ${className}`.trim()}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex flex-col-reverse sm:pr-8 ${i ? 'sm:border-l sm:border-rule sm:pl-8' : ''} ${i % 2 ? 'border-l border-rule pl-4 sm:pl-8' : ''}`}
        >
          <dt className="text-sm text-pencil">{item.label}</dt>
          <dd className="font-serif text-xl font-semibold tabular">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
