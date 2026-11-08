import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { COURSE_COLORS } from '../data';
import { byDue, courseCompletion, courseUnits, dueWords, formatLongDate, formatMinutes, formatTime, isChapterDone, minutesForCourse, startOfWeek, toKey, upcomingAssignments } from '../utils';
import { DeadlineForm, DeadlineTimeline } from './deadlines';
import { Badge, Button, ConfirmButton, COURSE_BG, COURSE_COLOR_NAMES, COURSE_PEN, CourseMark, Field, Modal, ProgressBar, Section, StatStrip } from './ui';

// ---------- CourseCard ----------

/** One course in the list: a full-width row, linking to its details. */
export function CourseCard({ course, sessions, assignments }) {
  const percent = courseCompletion(course);
  const units = courseUnits(course);
  const next = upcomingAssignments(assignments.filter((a) => a.courseId === course.id))[0];

  return (
    <li>
      <Link
        to={`/courses/${course.id}`}
        className="group relative grid gap-x-8 gap-y-3 py-5 pl-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center"
      >
        {/* A stripe in the course colour runs down the row, so courses are told apart before reading. */}
        <span
          aria-hidden={true}
          className={`absolute bottom-5 left-0 top-5 w-1.5 rounded-full ${COURSE_PEN[course.color] || 'bg-rule'}`}
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="font-serif text-lg font-semibold group-hover:underline group-hover:decoration-rule group-hover:underline-offset-4">
              {course.name}
            </span>
            {course.code ? <Badge>{course.code}</Badge> : null}
          </p>
          <p className="mt-1 text-sm text-pencil">
            {`${course.chapters.length} ${course.chapters.length === 1 ? 'chapter' : 'chapters'}, ${formatMinutes(minutesForCourse(sessions, course.id))} studied.`}
            {next ? ` ${next.title} is due ${dueWords(next.due)}.` : ''}
          </p>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="text-pencil">{`${units.filter((u) => u.done).length} of ${units.length} topics`}</span>
            <span className="tabular">{`${percent}%`}</span>
          </div>
          <ProgressBar value={percent} color={course.color} label={`${course.name} completion`} />
        </div>
      </Link>
    </li>
  );
}

// ---------- CourseDetails ----------

function Checkbox({ id, checked, onChange, label, sub, className = '' }) {
  return (
    <span className={`flex min-w-0 flex-1 items-start gap-3 ${className}`.trim()}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="task-check mt-0.5" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className={`strike ${checked ? 'strike-on text-pencil' : ''}`}>{label}</span>
        {sub ? <span className="block text-sm text-pencil">{sub}</span> : null}
      </label>
    </span>
  );
}

/** A small inline form: one text field and a submit button. */
function InlineAdd({ id, label, placeholder, buttonLabel, onAdd, collapsed = false }) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(!collapsed);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm underline decoration-rule underline-offset-4 hover:decoration-ink"
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value.trim());
        setValue('');
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={value}
        autoFocus={collapsed}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && collapsed) setOpen(false);
        }}
        placeholder={placeholder}
        className="field min-w-0 flex-1 basis-48 py-1.5"
      />
      <Button type="submit" variant="quiet" className="py-1.5">
        {buttonLabel}
      </Button>
      {collapsed ? (
        <Button variant="text" className="text-sm" onClick={() => setOpen(false)}>
          Done
        </Button>
      ) : null}
    </form>
  );
}

function Chapter({ course, chapter, index, actions }) {
  const done = isChapterDone(chapter);
  const topicsDone = chapter.topics.filter((t) => t.done).length;

  const inputId = `chapter-${chapter.id}`;

  // Laid out like a textbook's table of contents: a big chapter number, the title,
  // a dotted leader, and how many topics are done; the topics indented beneath.
  return (
    <li className="py-4">
      <div className="flex items-end gap-3">
        <span aria-hidden={true} className="w-8 shrink-0 font-serif text-2xl font-semibold leading-none tabular text-pencil">
          {index + 1}
        </span>
        <input
          id={inputId}
          type="checkbox"
          checked={done}
          onChange={() => actions.toggleChapter(course.id, chapter.id)}
          className="task-check mb-0.5"
        />
        <label htmlFor={inputId} className="min-w-0 cursor-pointer">
          <span className="sr-only">{`Chapter ${index + 1}: `}</span>
          <span className={`strike font-serif text-md font-semibold ${done ? 'strike-on text-pencil' : ''}`}>
            {chapter.title}
          </span>
        </label>
        <span aria-hidden={true} className="mb-1.5 min-w-[1rem] flex-1 border-b-2 border-dotted border-pencil/40" />
        <span className="whitespace-nowrap text-sm text-pencil tabular">
          {chapter.topics.length ? `${topicsDone} of ${chapter.topics.length}` : 'No topics'}
        </span>
      </div>
      <ul className="ml-11 mt-2 space-y-1">
        {chapter.topics.map((topic) => (
          <li key={topic.id} className="group flex items-start gap-3 py-1">
            <Checkbox
              id={`topic-${topic.id}`}
              checked={topic.done}
              onChange={() => actions.toggleTopic(course.id, chapter.id, topic.id)}
              label={topic.title}
            />
            <ConfirmButton
              label="Remove"
              confirmLabel="Remove topic?"
              onConfirm={() => actions.deleteTopic(course.id, chapter.id, topic.id)}
              className="opacity-100 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
            />
          </li>
        ))}
      </ul>
      <div className="ml-11 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <InlineAdd
            id={`new-topic-${chapter.id}`}
            label={`New topic in ${chapter.title}`}
            placeholder="Add a topic"
            buttonLabel="Add topic"
            collapsed={true}
            onAdd={(title) => actions.addTopic(course.id, chapter.id, title)}
          />
        </div>
        <ConfirmButton
          label="Delete chapter"
          confirmLabel="Click again to delete"
          onConfirm={() => actions.deleteChapter(course.id, chapter.id)}
        />
      </div>
    </li>
  );
}

export function CourseDetails({ course }) {
  const study = useStudy();
  const { sessions, assignments } = study;
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [addingDeadline, setAddingDeadline] = useState(false);

  const percent = courseCompletion(course);
  const units = courseUnits(course);
  const courseSessions = sessions.filter((s) => s.courseId === course.id);
  const total = courseSessions.reduce((n, s) => n + s.minutes, 0);
  const weekStart = toKey(startOfWeek());
  const week = courseSessions.filter((s) => s.date >= weekStart).reduce((n, s) => n + s.minutes, 0);
  const deadlines = assignments.filter((a) => a.courseId === course.id).sort(byDue);
  const recent = courseSessions
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

  return (
    <div>
      <Link to="/courses" className="text-sm text-pencil underline decoration-rule underline-offset-4 hover:text-ink">
        All courses
      </Link>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-x-3 text-2xl md:text-3xl">
            <CourseMark color={course.color} className="h-5 w-7" />
            {course.name}
          </h1>
          {course.code ? (
            <p className="mt-2">
              <Badge>{course.code}</Badge>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button to={`/focus?course=${encodeURIComponent(course.id)}`}>Study this course</Button>
          <Button variant="quiet" onClick={() => setEditing(true)}>
            Edit course
          </Button>
        </div>
      </header>
      <div className="mt-8">
        <StatStrip
          items={[
            {
              label: `${units.filter((u) => u.done).length} of ${units.length} topics`,
              value: `${percent}% complete`,
            },
            {
              label: 'Studied in total',
              value: formatMinutes(total),
            },
            {
              label: 'This week',
              value: formatMinutes(week),
            },
            {
              label: 'Focus sessions',
              value: String(courseSessions.length),
            },
          ]}
        />
        <ProgressBar value={percent} color={course.color} label={`${course.name} completion`} className="mt-4 h-2.5" />
      </div>
      <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section title="Chapters and topics" icon="layers">
          {course.chapters.length ? (
            <ol>
              {course.chapters.map((chapter, index) => (
                <Chapter key={chapter.id} course={course} chapter={chapter} index={index} actions={study} />
              ))}
            </ol>
          ) : (
            <p className="py-3 text-pencil">Break the course into chapters, then add the topics in each one.</p>
          )}
          <div className="mt-4 border-t border-rule/70 pt-4">
            <InlineAdd
              id="new-chapter"
              label="New chapter"
              placeholder="Add a chapter"
              buttonLabel="Add chapter"
              onAdd={(title) => study.addChapter(course.id, title)}
            />
          </div>
        </Section>
        <div className="space-y-12">
          <Section
            title="Homework and exams"
            icon="flag"
            action={
              addingDeadline ? null : (
                <Button variant="text" className="text-sm" onClick={() => setAddingDeadline(true)}>
                  Add homework or exam
                </Button>
              )
            }
          >
            {addingDeadline ? (
              <div className="mb-4 border-b border-rule/70 pb-5">
                <DeadlineForm
                  idPrefix="course-deadline"
                  courses={study.courses}
                  courseId={course.id}
                  onSubmit={(deadline) => {
                    study.addAssignment(deadline);
                    setAddingDeadline(false);
                  }}
                  onCancel={() => setAddingDeadline(false)}
                />
              </div>
            ) : null}
            {deadlines.length ? (
              <DeadlineTimeline
                items={deadlines}
                courses={study.courses}
                showCourse={false}
                onToggle={study.toggleAssignment}
                onDelete={study.deleteAssignment}
              />
            ) : addingDeadline ? null : (
              <p className="py-3 text-pencil">No homework or exams yet. Add them here and you get a reminder on the dashboard.</p>
            )}
          </Section>
          <Section title="Recent sessions" icon="history">
            {recent.length ? (
              <ul className="divide-y divide-rule/60">
                {recent.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block">{s.goal || 'Focus session'}</span>
                      <span className="block text-sm text-pencil">{`${formatLongDate(s.date)}, ${formatTime(s.startedAt)}`}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm tabular">{formatMinutes(s.minutes)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-pencil">No sessions yet. Start one with “Study this course”.</p>
            )}
          </Section>
          <div className="px-1">
            <ConfirmButton
              label="Delete this course"
              confirmLabel={`Click again to delete ${course.name} and its deadlines`}
              onConfirm={() => {
                study.deleteCourse(course.id);
                navigate('/courses');
              }}
            />
            <p className="mt-1 text-sm text-pencil">Your past study time stays in My Progress.</p>
          </div>
        </div>
      </div>
      <Modal open={editing} title="Edit course" onClose={() => setEditing(false)}>
        <CourseForm
          initial={course}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={(changes) => {
            study.updateCourse(course.id, changes);
            setEditing(false);
          }}
        />
      </Modal>
    </div>
  );
}

// ---------- CourseForm ----------

/** Create or edit a course's name, code and highlighter colour. */
export function CourseForm({ initial, submitLabel, onSubmit, onCancel, suggestedColor = 'blue' }) {
  const [name, setName] = useState(initial ? initial.name : '');
  const [code, setCode] = useState(initial ? initial.code : '');
  const [color, setColor] = useState(initial ? initial.color : suggestedColor);
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a course name.');
      return;
    }
    onSubmit({ name: name.trim(), code: code.trim(), color });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={true}>
      <Field
        id="course-name"
        label="Course name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
        placeholder="Linear Algebra"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'course-name-error' : undefined}
        autoFocus={true}
      />
      {error ? (
        <p id="course-name-error" className="text-sm font-bold">
          {error}
        </p>
      ) : null}
      <Field
        id="course-code"
        label="Course code (optional)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="MATH 210"
      />
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Highlighter colour</legend>
        <div className="flex flex-wrap gap-2">
          {COURSE_COLORS.map((c) => (
            <label
              key={c}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${color === c ? 'border-ink bg-white font-bold' : 'border-rule'}`}
            >
              <input
                type="radio"
                name="course-color"
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
                className="sr-only"
              />
              <span aria-hidden={true} className={`inline-block h-3.5 w-5 -skew-x-12 rounded-sm ${COURSE_BG[c]}`} />
              {COURSE_COLOR_NAMES[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
