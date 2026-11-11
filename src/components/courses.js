import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { COURSE_COLORS } from '../data';
import { byDue, courseCompletion, courseUnits, formatLongDate, formatMinutes, formatTime, isChapterDone, startOfWeek, toKey } from '../utils';
import { DeadlineForm, DeadlineTimeline } from './deadlines';
import { Badge, Button, ConfirmButton, COURSE_BG, COURSE_COLOR_NAMES, COURSE_PEN, Field, Modal, ProgressBar, Section } from './ui';

// The highlighter behind a course name, in that course's own colour.
const HIGHLIGHTER = { blue: '#8FD3FF', green: '#9BEA8B', orange: '#FFB870', pink: '#FF9ECF' };
const highlighter = (color) => ({ '--hl-color': HIGHLIGHTER[color] || '#FFE94D' });

// ---------- CourseList ----------

/** Every course down the side of the page. The one you are looking at is highlighted. */
export function CourseList({ courses, activeId }) {
  return (
    <nav aria-label="Your courses" className="border-t-2 border-[color:var(--page-accent,#1B2A4A)]">
      <ul className="divide-y divide-rule/70 border-b border-rule/70">
        {courses.map((course) => {
          const percent = courseCompletion(course);
          const active = course.id === activeId;
          return (
            <li key={course.id}>
              <Link
                to={`/courses/${course.id}`}
                aria-current={active ? 'page' : undefined}
                className={`group relative block py-3.5 pl-5 pr-3 ${active ? 'bg-white' : 'hover:bg-white/60'}`}
              >
                {/* A stripe in the course colour, so courses are told apart before reading. */}
                <span
                  aria-hidden={true}
                  className={`absolute bottom-3.5 left-0 top-3.5 w-1.5 rounded-full ${(active ? COURSE_PEN : COURSE_BG)[course.color] || 'bg-rule'}`}
                />
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 font-serif text-md font-semibold leading-snug">
                    {active ? (
                      <span className="hl" style={highlighter(course.color)}>
                        {course.name}
                      </span>
                    ) : (
                      <span className="group-hover:underline group-hover:decoration-rule group-hover:underline-offset-4">{course.name}</span>
                    )}
                  </span>
                  <span className="text-sm tabular text-pencil">{`${percent}%`}</span>
                </span>
                {course.code ? <span className="mt-0.5 block text-xs text-pencil">{course.code}</span> : null}
                <ProgressBar value={percent} color={course.color} label={`${course.name} completion`} className="mt-2 h-1.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ---------- CourseDetails ----------

function Checkbox({ id, checked, onChange, label }) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="task-check mt-0.5" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className={`strike ${checked ? 'strike-on text-pencil' : ''}`}>{label}</span>
      </label>
    </span>
  );
}

/** One line to type into and a button: adds a topic or a chapter. */
function InlineAdd({ id, label, placeholder, buttonLabel, onAdd }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="flex gap-2"
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
      <input id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="field min-w-0 flex-1 py-1.5 text-sm" />
      <Button type="submit" variant="quiet" className="py-1.5 text-sm">
        {buttonLabel}
      </Button>
    </form>
  );
}

/** A chapter: its number, a tick for the whole chapter, how many topics are done, then the topics. */
function Chapter({ course, chapter, index, actions }) {
  const done = isChapterDone(chapter);
  const topicsDone = chapter.topics.filter((t) => t.done).length;
  const inputId = `chapter-${chapter.id}`;

  return (
    <li className="border-b border-rule/70 py-4 last:border-b-0">
      <div className="flex items-center gap-3">
        <span aria-hidden={true} className="w-6 shrink-0 text-sm tabular text-pencil">
          {String(index + 1).padStart(2, '0')}
        </span>
        <input id={inputId} type="checkbox" checked={done} onChange={() => actions.toggleChapter(course.id, chapter.id)} className="task-check" />
        <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
          <span className="sr-only">{`Chapter ${index + 1}: `}</span>
          <span className={`strike font-serif text-md font-semibold ${done ? 'strike-on text-pencil' : ''}`}>{chapter.title}</span>
        </label>
        <span className="whitespace-nowrap text-sm tabular text-pencil">
          {chapter.topics.length ? `${topicsDone} of ${chapter.topics.length}` : 'No topics'}
        </span>
        <ConfirmButton
          label="Remove"
          confirmLabel="Remove chapter?"
          ariaLabel={`Remove chapter: ${chapter.title}`}
          onConfirm={() => actions.deleteChapter(course.id, chapter.id)}
        />
      </div>
      <div className="ml-9 sm:ml-[3.75rem]">
        {chapter.topics.length ? (
          <ul className="mt-2">
            {chapter.topics.map((topic) => (
              <li key={topic.id} className="group flex items-start gap-3 border-b border-rule/40 py-2 last:border-b-0">
                <Checkbox
                  id={`topic-${topic.id}`}
                  checked={topic.done}
                  onChange={() => actions.toggleTopic(course.id, chapter.id, topic.id)}
                  label={topic.title}
                />
                <ConfirmButton
                  label="Remove"
                  confirmLabel="Remove topic?"
                  ariaLabel={`Remove topic: ${topic.title}`}
                  onConfirm={() => actions.deleteTopic(course.id, chapter.id, topic.id)}
                  className="opacity-100 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 max-w-md">
          <InlineAdd
            id={`new-topic-${chapter.id}`}
            label={`New topic in ${chapter.title}`}
            placeholder="Add a topic"
            buttonLabel="Add"
            onAdd={(title) => actions.addTopic(course.id, chapter.id, title)}
          />
        </div>
      </div>
    </li>
  );
}

/** The course you picked: where it stands, its chapters and topics, then its homework and exams. */
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

  const figure = (value, label) => (
    <span>
      <span className="font-bold tabular text-ink">{value}</span>
      {` ${label}`}
    </span>
  );

  return (
    <article className="min-w-0">
      <div aria-hidden={true} className={`h-1.5 rounded-full ${COURSE_PEN[course.color] || 'bg-ink'}`} />
      <header className="pt-5">
        {course.code ? <Badge>{course.code}</Badge> : null}
        <h2 className="mt-2 text-2xl md:text-3xl">
          <span className="hl" style={highlighter(course.color)}>
            {course.name}
          </span>
        </h2>
        <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-pencil">
          {figure(`${percent}%`, 'complete')}
          {figure(`${units.filter((u) => u.done).length} of ${units.length}`, 'topics')}
          {figure(formatMinutes(total), 'studied')}
          {figure(formatMinutes(week), 'this week')}
        </p>
        <ProgressBar value={percent} color={course.color} label={`${course.name} completion`} className="mt-4 h-2.5" />
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button to={`/focus?course=${encodeURIComponent(course.id)}`}>Study this course</Button>
          <Button variant="quiet" onClick={() => setEditing(true)}>
            Edit course
          </Button>
          <ConfirmButton
            label="Delete course"
            confirmLabel={`Click again to delete ${course.name} and its deadlines`}
            onConfirm={() => {
              study.deleteCourse(course.id);
              navigate('/courses');
            }}
            className="whitespace-normal text-left"
          />
        </div>
      </header>

      <div className="mt-10 space-y-12">
        <Section title="Chapters and topics" icon="layers">
          {course.chapters.length ? (
            <ol>
              {course.chapters.map((chapter, index) => (
                <Chapter key={chapter.id} course={course} chapter={chapter} index={index} actions={study} />
              ))}
            </ol>
          ) : (
            <p className="py-3 text-pencil">Break the course into chapters, then add the topics in each one. Ticking topics moves the course forward.</p>
          )}
          <div className="mt-2 max-w-lg border-t border-rule/70 pt-4">
            <InlineAdd id="new-chapter" label="New chapter" placeholder="Add a chapter, for example “Eigenvalues”" buttonLabel="Add chapter" onAdd={(title) => study.addChapter(course.id, title)} />
          </div>
        </Section>

        <Section
          title="Homework and exams"
          icon="flag"
          action={
            <Button variant="text" className="text-sm" onClick={() => setAddingDeadline(true)}>
              Add homework or exam
            </Button>
          }
        >
          {deadlines.length ? (
            <DeadlineTimeline items={deadlines} courses={study.courses} showCourse={false} onToggle={study.toggleAssignment} onDelete={study.deleteAssignment} />
          ) : (
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
      <Modal open={addingDeadline} title={`Add to ${course.name}`} onClose={() => setAddingDeadline(false)}>
        <DeadlineForm
          idPrefix="course-deadline"
          courses={study.courses}
          courseId={course.id}
          onCancel={() => setAddingDeadline(false)}
          onSubmit={(deadline) => {
            study.addAssignment(deadline);
            setAddingDeadline(false);
          }}
        />
      </Modal>
    </article>
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
      <Field id="course-code" label="Course code (optional)" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH 210" />
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Highlighter colour</legend>
        <div className="flex flex-wrap gap-2">
          {COURSE_COLORS.map((c) => (
            <label
              key={c}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${color === c ? 'border-ink bg-white font-bold' : 'border-rule'}`}
            >
              <input type="radio" name="course-color" value={c} checked={color === c} onChange={() => setColor(c)} className="sr-only" />
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
