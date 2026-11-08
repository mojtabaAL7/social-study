import { useState } from 'react';
import { daysBetween, DEADLINE_TYPES, defaultReminder, formatShortDate, fromKey, relativeDay, REMINDER_OPTIONS, reminderLabel, todayKey, typeLabel } from '../utils';
import { Button, ConfirmButton, CourseMark, DeadlineBadge, Field, Segmented } from './ui';

// ---------- DeadlineForm ----------

/**
 * Add homework or an exam. Used on the dashboard, in the calendar and on a course page.
 * `courseId` fixes the course (course page); otherwise a course can be picked.
 */
export function DeadlineForm({
  idPrefix = 'deadline',
  courses,
  courseId: fixedCourseId,
  defaultDate,
  onSubmit,
  onCancel,
}) {
  const [type, setType] = useState('homework');
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(fixedCourseId || '');
  const [due, setDue] = useState(defaultDate || todayKey());
  const [time, setTime] = useState('');
  const [reminder, setReminder] = useState(String(defaultReminder('homework')));
  const [reminderTouched, setReminderTouched] = useState(false);
  const [errors, setErrors] = useState({});

  function changeType(next) {
    setType(next);
    // Exams default to an earlier reminder, unless you already picked one.
    if (!reminderTouched) setReminder(String(defaultReminder(next)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = type === 'exam' ? 'Enter what the exam is.' : 'Enter what is due.';
    if (!due) nextErrors.due = 'Pick a date.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onSubmit({
      type,
      title: title.trim(),
      courseId: fixedCourseId || courseId || null,
      due,
      time: time || null,
      remindDaysBefore: reminder === 'none' ? null : Number(reminder),
    });
    setTitle('');
    setTime('');
    setErrors({});
  }

  const id = (name) => `${idPrefix}-${name}`;
  const errorText = (name) =>
    errors[name] ? (
      <p id={id(`${name}-error`)} className="text-sm font-bold">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate={true} className="space-y-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold" id={id('type-label')}>
          Type
        </span>
        <Segmented label="Deadline type" value={type} onChange={changeType} options={DEADLINE_TYPES} />
      </div>
      <div>
        <Field
          id={id('title')}
          label={type === 'exam' ? 'Exam' : 'What is due'}
          value={title}
          placeholder={type === 'exam' ? 'Midterm exam' : 'Problem set 4'}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? id('title-error') : undefined}
        />
        {errorText('title')}
      </div>
      {fixedCourseId ? null : (
        <Field id={id('course')} as="select" label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="">No course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field
            id={id('due')}
            label="Date"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-invalid={Boolean(errors.due)}
            aria-describedby={errors.due ? id('due-error') : undefined}
          />
          {errorText('due')}
        </div>
        <Field id={id('time')} label="Time (optional)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Field
        id={id('reminder')}
        as="select"
        label="Remind me on the dashboard"
        value={reminder}
        onChange={(e) => {
          setReminder(e.target.value);
          setReminderTouched(true);
        }}
      >
        {REMINDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Field>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit">{type === 'exam' ? 'Add exam' : 'Add homework'}</Button>
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

// ---------- DeadlineRow ----------

/** One homework or exam: tick it off when done, or delete it if it was entered by mistake. */
export function DeadlineRow({ deadline, course, showCourse = true, showDate = true, onToggle, onDelete }) {
  const inputId = `deadline-${deadline.id}`;
  const today = todayKey();
  const overdue = !deadline.done && deadline.due < today;

  const when = [
    showDate ? formatShortDate(deadline.due) : null,
    deadline.time,
    deadline.done ? 'done' : overdue ? 'overdue' : relativeDay(deadline.due),
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <li className="group flex items-start gap-3 py-3">
      <input
        id={inputId}
        type="checkbox"
        checked={Boolean(deadline.done)}
        onChange={() => onToggle(deadline.id)}
        className="task-check mt-0.5"
      />
      <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
        <span className={`strike ${deadline.done ? 'strike-on text-pencil' : ''} ${deadline.type === 'exam' ? 'font-bold' : ''}`}>
          {deadline.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pencil">
          <DeadlineBadge type={deadline.type} />
          <span className={overdue ? 'font-bold text-ink' : ''}>{when}</span>
          {showCourse && course ? (
            <span className="flex items-center gap-1.5">
              <CourseMark color={course.color} />
              {course.name}
            </span>
          ) : null}
        </span>
        {deadline.done ? null : <span className="block text-xs text-pencil">{reminderLabel(deadline)}</span>}
      </label>
      <ConfirmButton
        label="Delete"
        confirmLabel="Delete?"
        ariaLabel={`Delete ${typeLabel(deadline.type).toLowerCase()}: ${deadline.title}`}
        onConfirm={() => onDelete(deadline.id)}
        className="pt-0.5 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
      />
    </li>
  );
}

// ---------- DeadlineTimeline ----------

/**
 * Deadlines as a timeline down the page, because they happen in order.
 * Exams are filled dots, homework hollow ones. With onToggle, each dot is a round checkbox
 * (the title ticks it too); with onDelete, each item gets a Delete link.
 */
export function DeadlineTimeline({ items, courses, showCourse = true, onToggle, onDelete }) {
  const today = todayKey();
  return (
    <ol className="pt-2">
      {items.map((item) => {
        const course = courses.find((c) => c.id === item.courseId);
        const daysLeft = daysBetween(today, item.due);
        const soon = !item.done && daysLeft >= 0 && daysLeft <= 2;
        const overdue = !item.done && daysLeft < 0;
        const exam = item.type === 'exam';
        const date = fromKey(item.due).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        const when = item.done ? 'done' : overdue ? 'overdue' : relativeDay(item.due);
        const inputId = `timeline-${item.id}`;
        const title = <span className={item.done ? 'line-through' : ''}>{item.title}</span>;

        return (
          <li key={item.id} className={`group relative pb-5 pl-8 last:pb-1 ${item.done ? 'text-pencil' : ''}`}>
            <span aria-hidden={true} className="absolute bottom-0 left-[7px] top-5 w-0.5 bg-rule group-last:hidden" />
            {onToggle ? (
              <input
                id={inputId}
                type="checkbox"
                checked={Boolean(item.done)}
                onChange={() => onToggle(item.id)}
                className={`timeline-check absolute left-0 top-1 ${exam ? 'timeline-check-exam' : ''}`}
              />
            ) : (
              <span
                aria-hidden={true}
                className={`absolute left-0 top-1 h-4 w-4 rounded-full ${exam ? 'bg-ink' : 'border-2 border-ink bg-paper'}`}
              />
            )}
            <p className="text-sm">
              <span className="font-bold tabular">{`${date}${item.time ? `, ${item.time}` : ''}`}</span>
              <span className={soon || overdue ? 'font-bold' : 'text-pencil'}>{` (${when})`}</span>
            </p>
            <p className={`mt-1 flex flex-wrap items-center gap-2 ${exam ? 'font-bold' : ''}`}>
              <DeadlineBadge type={item.type} />
              {onToggle ? (
                <label htmlFor={inputId} className="cursor-pointer">
                  <span className="sr-only">{item.done ? 'Done: ' : 'Mark done: '}</span>
                  {title}
                </label>
              ) : (
                title
              )}
            </p>
            {showCourse && course ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-pencil">
                <CourseMark color={course.color} />
                {course.name}
              </p>
            ) : null}
            {onDelete ? (
              <div className="mt-1.5">
                <ConfirmButton
                  label="Delete"
                  confirmLabel="Delete?"
                  ariaLabel={`Delete ${exam ? 'exam' : 'homework'}: ${item.title}`}
                  onConfirm={() => onDelete(item.id)}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
