import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { useNow } from '../hooks';
import { activeReminders, byDue, courseCompletion, courseTopics, currentStreak, dueSentence, formatDue, formatLongDate, formatMinutes, greeting, minutesForCourse, minutesThisWeek, minutesToday, tasksForDay, todayKey } from '../utils';
import { DeadlineForm, DeadlineTimeline } from './deadlines';
import { Avatar, Button, ConfirmButton, CourseMark, DeadlineBadge, Modal, ProgressBar, Section, StatStrip } from './ui';

// ---------- CourseProgress ----------

export function CourseProgress() {
  const { courses, sessions } = useStudy();

  return (
    <Section
      title="Course progress"
      icon="book"
      action={
        <Button to="/courses" variant="text" className="text-sm">
          Manage courses
        </Button>
      }
    >
      {courses.length ? (
        <ul className="space-y-5 pt-2">
          {courses.map((course) => {
            const topics = courseTopics(course);
            const done = topics.filter((t) => t.done).length;
            const percent = courseCompletion(course);
            return (
              <li key={course.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-2">
                    <CourseMark color={course.color} />
                    <span className="truncate font-bold">{course.name}</span>
                    <span className="hidden text-sm text-pencil sm:inline">{course.code}</span>
                  </span>
                  <span className="text-sm tabular">{percent}%</span>
                </div>
                <ProgressBar value={percent} color={course.color} label={`${course.name} completion`} />
                <p className="mt-1.5 text-sm text-pencil">
                  {done} of {topics.length} topics done, {formatMinutes(minutesForCourse(sessions, course.id))} studied
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-3">
          <p className="mb-3 text-pencil">Add your courses to track chapters, topics and study time.</p>
          <Button to="/courses" variant="quiet">
            Add a course
          </Button>
        </div>
      )}
    </Section>
  );
}

// ---------- FriendsActivity ----------

export function FriendsActivity() {
  const { friends } = useStudy();
  const now = useNow(30000);
  const studying = friends.filter((f) => f.status === 'studying');
  const online = friends.filter((f) => f.status === 'online').length;

  return (
    <Section
      title="Friends studying now"
      icon="users"
      action={
        <Button to="/together" variant="text" className="text-sm">
          Study together
        </Button>
      }
    >
      {studying.length ? (
        <ul className="divide-y divide-rule/60">
          {studying.map((friend) => (
            <li key={friend.id} className="flex items-center gap-3 py-3">
              <Avatar name={friend.name} />
              <div className="min-w-0">
                <p className="truncate">{friend.name}</p>
                <p className="text-sm text-pencil">
                  {friend.activity}, {formatMinutes((now - new Date(friend.startedAt).getTime()) / 60000)} so far
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-pencil">None of your friends are studying right now.</p>
      )}

      {online ? (
        <p className="mt-2 text-sm text-pencil">
          {online} more {online === 1 ? 'friend is' : 'friends are'} online.
        </p>
      ) : null}
    </Section>
  );
}

// ---------- Reminders ----------

/**
 * Homework and exams whose reminder window has started. Shown only when there is something
 * to remind you of; each can be marked done, snoozed to tomorrow, or dismissed.
 */
export function Reminders() {
  const { assignments, courses, toggleAssignment, snoozeReminder, dismissReminder } = useStudy();
  const reminders = activeReminders(assignments);
  if (!reminders.length) return null;

  return (
    <section aria-labelledby="reminders-title" className="mt-8 rounded-r-md border-l-4 border-ink bg-white px-4 py-3 sm:px-5">
      <h2 id="reminders-title" className="font-sans text-base font-bold">
        {reminders.length === 1 ? 'Reminder' : `Reminders (${reminders.length})`}
      </h2>

      <ul className="divide-y divide-rule/60">
        {reminders.map((r) => {
          const course = courses.find((c) => c.id === r.courseId);
          const urgent = r.daysLeft <= 1;
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
              <div className="min-w-0 flex-1 basis-72">
                <p>
                  <span className="font-bold">{r.title}</span>
                  {course ? <span className="text-pencil"> ({course.name})</span> : null}{' '}
                  <span className={urgent ? 'font-bold' : ''}>{dueSentence(r, r.daysLeft)}</span>.
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-pencil">
                  <DeadlineBadge type={r.type} />
                  {formatDue(r)}
                  {course ? <CourseMark color={course.color} /> : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button variant="quiet" className="py-1.5 text-sm" onClick={() => toggleAssignment(r.id)}>
                  Mark done
                </Button>
                {r.daysLeft > 0 ? (
                  <Button variant="text" className="text-sm" onClick={() => snoozeReminder(r.id)}>
                    Remind me tomorrow
                  </Button>
                ) : null}
                <Button variant="text" className="text-sm" onClick={() => dismissReminder(r.id)}>
                  Dismiss
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------- StudyOverview ----------

export function StudyOverview() {
  const { sessions, tasks } = useStudy();
  const todays = tasksForDay(tasks, todayKey());
  const done = todays.filter((t) => t.done).length;
  const pending = todays.length - done;
  const streak = currentStreak(sessions);

  const items = [
    { label: 'Studied today', value: formatMinutes(minutesToday(sessions)) },
    { label: 'This week', value: formatMinutes(minutesThisWeek(sessions)) },
    { label: 'Study streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}` },
    { label: pending ? `Tasks done, ${pending} to go` : 'Tasks done', value: `${done} of ${todays.length}` },
  ];

  return <StatStrip items={items} />;
}

// ---------- TodayTasks ----------

function TaskRow({ task, course, isNext, onToggle, onDelete }) {
  const inputId = `task-${task.id}`;
  return (
    <li className="group flex items-start gap-3 border-b border-card-line px-4 py-3 sm:px-6">
      <input id={inputId} type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} className="task-check mt-0.5" />
      <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer">
        <span className={`strike ${task.done ? 'strike-on text-pencil' : ''}`}>
          {isNext ? <span className="hl">{task.title}</span> : task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-sm text-pencil">
          {course ? <CourseMark color={course.color} /> : null}
          {course ? course.name : 'No course'}
        </span>
      </label>
      {/* Always visible on touch screens; on desktop it appears on hover or keyboard focus. */}
      <ConfirmButton
        label="Delete"
        confirmLabel="Delete task?"
        ariaLabel={`Delete task: ${task.title}`}
        onConfirm={() => onDelete(task.id)}
        className="pt-0.5 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
      />
    </li>
  );
}

/**
 * Today's tasks on a ruled index card: a red line under the heading, each task on its own
 * blue writing line, and the last line left blank to write a new one.
 */
export function TodayTasks() {
  const { tasks, courses, toggleTask, addTask, deleteTask } = useStudy();
  const today = todayKey();
  const todays = tasksForDay(tasks, today);
  const next = todays.find((t) => !t.done);
  const done = todays.filter((t) => t.done).length;

  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState(courses[0] ? courses[0].id : '');

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({ title: trimmed, courseId: courseId || null, date: today });
    setTitle('');
  }

  return (
    <section aria-labelledby="today-tasks-title" className="index-card min-w-0 self-start">
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-card-red px-4 pb-2 pt-4 sm:px-6">
        <h2 id="today-tasks-title" className="text-lg">
          Today’s tasks
        </h2>
        {todays.length ? (
          <span className="text-sm text-pencil tabular">
            {done} of {todays.length} done
          </span>
        ) : null}
      </div>

      {todays.length ? (
        <ul>
          {todays.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              course={courses.find((c) => c.id === task.courseId)}
              isNext={Boolean(next && next.id === task.id)}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          ))}
        </ul>
      ) : (
        <p className="border-b border-card-line px-4 py-3 text-pencil sm:px-6">
          Nothing planned for today. Write your first task on the line below.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <label htmlFor="new-task" className="sr-only">
          New task
        </label>
        {/* Written straight onto the card's line rather than into a boxed field. */}
        <input
          id="new-task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task for today"
          className="min-w-0 flex-1 basis-56 border-0 border-b border-dashed border-pencil/40 bg-transparent px-0 py-1.5 text-base placeholder:text-pencil focus:border-solid focus:border-ink"
        />
        <label htmlFor="new-task-course" className="sr-only">
          Course
        </label>
        <select
          id="new-task-course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="field max-w-[12rem] py-1.5 text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="">No course</option>
        </select>
        <Button type="submit" variant="quiet" className="py-1.5 text-sm">
          Add task
        </Button>
      </form>
    </section>
  );
}

// ---------- UpcomingDeadlines ----------

export function UpcomingDeadlines() {
  const { assignments, courses, addAssignment, toggleAssignment } = useStudy();
  const [adding, setAdding] = useState(false);
  const today = todayKey();
  // Ticked items stay in view (crossed out, can be unticked) until their date has passed.
  const upcoming = assignments
    .filter((a) => a.due >= today)
    .sort(byDue)
    .slice(0, 6);

  return (
    <Section
      title="Upcoming deadlines"
      icon="flag"
      action={
        <Button variant="text" className="text-sm" onClick={() => setAdding(true)}>
          Add homework or exam
        </Button>
      }
    >
      {upcoming.length ? (
        <DeadlineTimeline items={upcoming} courses={courses} onToggle={toggleAssignment} />
      ) : (
        <p className="py-2 text-pencil">No homework or exams coming up. Add one and you get a reminder here before it is due.</p>
      )}

      <Button to="/progress#calendar" variant="text" className="mt-3 text-sm">
        See everything on the calendar
      </Button>

      <Modal open={adding} title="Add homework or an exam" onClose={() => setAdding(false)}>
        <DeadlineForm
          idPrefix="dashboard-deadline"
          courses={courses}
          onCancel={() => setAdding(false)}
          onSubmit={(deadline) => {
            addAssignment(deadline);
            setAdding(false);
          }}
        />
      </Modal>
    </Section>
  );
}

// ---------- WelcomeBanner ----------

// Greeting plus the one thing to do next: the first unfinished task of the day.
export function WelcomeBanner() {
  const { user, tasks, courses, loadSampleData } = useStudy();
  const today = todayKey();
  const todays = tasksForDay(tasks, today);
  const next = todays.find((t) => !t.done);

  const focusLink = next
    ? `/focus?course=${encodeURIComponent(next.courseId || '')}&task=${encodeURIComponent(next.id)}`
    : '/focus';

  // What to say when there is no next task: a brand-new account, an empty day, or a finished one.
  let headline = 'Everything on today’s list is done.';
  let action = (
    <Button to={focusLink} className="shrink-0">
      Start focus session
    </Button>
  );

  if (!next && !courses.length && !todays.length) {
    headline = 'Start by adding your courses.';
    action = (
      <div className="flex shrink-0 flex-wrap gap-3">
        <Button to="/courses">Add your courses</Button>
        <Button variant="quiet" onClick={loadSampleData}>
          Load sample data
        </Button>
      </div>
    );
  } else if (!next && !todays.length) {
    headline = 'Nothing planned for today yet.';
  }

  return (
    <div className="pb-8">
      <h1 className="text-2xl md:text-3xl">
        {greeting()}, {user.name}
      </h1>
      <p className="mt-1 text-pencil">{formatLongDate(today)}</p>
      <Reminders />

      <div className="mt-10">
        <h2 className="font-sans text-base font-bold text-pencil">Up next</h2>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div className="min-w-0 max-w-2xl">
            <p className="text-balance font-serif text-xl font-semibold md:text-2xl">
              {next ? <span className="hl hl-draw">{next.title}</span> : headline}
            </p>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
