import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { formatMinutes } from '../utils';
import { FocusTimer, SessionSummary } from '../components/focus';
import { Header } from '../components/layout';
import { Button, Field, Section } from '../components/ui';

function clampMinutes(value, max) {
  if (value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(1, n));
}

function FinishedNote({ lastFinished, courses, tasks, toggleTask, dismissSummary }) {
  const course = courses.find((c) => c.id === lastFinished.courseId);
  const task = lastFinished.taskId ? tasks.find((t) => t.id === lastFinished.taskId) : null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-4 rounded-r-md border-l-4 border-ink bg-white px-4 py-3 sm:px-5"
    >
      <p>
        <span className="font-bold">{`Session saved: ${formatMinutes(lastFinished.minutes)}`}</span>
        {course ? ` of ${course.name}.` : '.'}
        {' It counts toward your dashboard, progress and the leaderboard.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {task && !task.done ? (
          <Button
            variant="quiet"
            onClick={() => {
              toggleTask(task.id);
              dismissSummary();
            }}
          >{`Mark “${task.title}” done`}</Button>
        ) : null}
        <Button variant="text" onClick={dismissSummary}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default function FocusStudio() {
  const study = useStudy();
  const { focus, settings, courses, tasks, sessions, rooms } = study;
  const [params, setParams] = useSearchParams();
  const { configureFocus } = study;

  // Arriving from "Start focus session" or "Study this course" pre-fills the setup.
  useEffect(() => {
    const courseId = params.get('course');
    const taskId = params.get('task');
    if (!courseId && !taskId) return;
    if (focus.status === 'idle') {
      const task = taskId ? tasks.find((t) => t.id === taskId) : null;
      configureFocus({
        courseId: courseId || (task && task.courseId) || null,
        taskId: task ? task.id : null,
        goal: task ? task.title : '',
      });
    }
    setParams({}, { replace: true });
  }, [params, setParams, focus.status, tasks, configureFocus]);

  const course = courses.find((c) => c.id === focus.courseId) || null;
  const locked = focus.status !== 'idle';

  return (
    <div>
      <Header title="Focus Studio" icon="timer">
        Pick a course, set a goal for this session, and start the timer. Finished sessions are saved automatically.
      </Header>
      <Section title="This session" icon="target">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <Field
            id="focus-course"
            as="select"
            label="Course"
            value={focus.courseId || ''}
            onChange={(e) =>
              configureFocus({
                courseId: e.target.value || null,
                taskId: null,
              })
            }
          >
            <option value="">No course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Field>
          <Field
            id="focus-goal"
            label="Goal for this session"
            value={focus.goal}
            onChange={(e) =>
              configureFocus({
                goal: e.target.value,
              })
            }
            placeholder="Finish exercises 4.1 to 4.6"
          />
        </div>
      </Section>
      {focus.lastFinished ? (
        <div className="mt-6">
          <FinishedNote
            lastFinished={focus.lastFinished}
            courses={courses}
            tasks={tasks}
            toggleTask={study.toggleTask}
            dismissSummary={study.dismissSummary}
          />
        </div>
      ) : null}
      <FocusTimer focus={focus} settings={settings} course={course} actions={study} />
      <div className="mt-8 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SessionSummary sessions={sessions} courses={courses} rooms={rooms} onDelete={study.deleteSession} />
        <Section title="Timer lengths" icon="sliders" className="order-first lg:order-none">
          <div className="grid grid-cols-2 gap-4">
            <Field
              id="focus-minutes"
              label="Focus (minutes)"
              type="number"
              min={1}
              max={120}
              value={settings.focusMinutes}
              onChange={(e) => {
                const v = clampMinutes(e.target.value, 120);
                if (v)
                  study.updateSettings({
                    focusMinutes: v,
                  });
              }}
            />
            <Field
              id="break-minutes"
              label="Break (minutes)"
              type="number"
              min={1}
              max={60}
              value={settings.breakMinutes}
              onChange={(e) => {
                const v = clampMinutes(e.target.value, 60);
                if (v)
                  study.updateSettings({
                    breakMinutes: v,
                  });
              }}
            />
          </div>
          <p className="mt-3 text-sm text-pencil">
            {locked ? 'New lengths apply from the next round.' : 'Common choices are 25 and 5, or 50 and 10.'}
          </p>
        </Section>
      </div>
    </div>
  );
}
