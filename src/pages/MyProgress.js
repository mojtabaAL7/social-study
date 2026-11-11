import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { achievements, courseCompletion, currentStreak, formatMinutes, longestStreak, totalMinutes } from '../utils';
import { CourseProgress } from '../components/dashboard';
import { Header } from '../components/layout';
import { StatStrip } from '../components/ui';
import { Achievements, HoursByCourse, LastTwoWeeks, StudyCalendar, YourData } from '../components/progress';

export default function MyProgress() {
  const { sessions, tasks, courses, rooms, groups, userId } = useStudy();
  const { hash } = useLocation();

  // "See everything on the calendar" links here with #calendar.
  useEffect(() => {
    if (hash !== '#calendar') return;
    const el = document.getElementById('calendar');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }, [hash]);

  const streak = currentStreak(sessions);
  const longest = longestStreak(sessions);
  const average = courses.length ? Math.round(courses.reduce((n, c) => n + courseCompletion(c), 0) / courses.length) : 0;
  const days = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

  const stats = [
    { label: 'Studied in total', value: formatMinutes(totalMinutes(sessions)) },
    { label: 'Current streak', value: days(streak) },
    { label: 'Longest streak', value: days(longest) },
    { label: 'Tasks completed', value: String(tasks.filter((t) => t.done).length) },
    { label: 'Average course progress', value: `${average}%` },
  ];

  return (
    <div>
      <Header title="My Progress" icon="chart">
        {`${sessions.length} focus ${sessions.length === 1 ? 'session' : 'sessions'} logged. Your calendar of deadlines, and how much you study, when, and on what.`}
      </Header>
      <StatStrip items={stats} />
      <div className="mt-10 grid gap-x-12 gap-y-12 xl:grid-cols-2">
        <StudyCalendar />
        <div className="min-w-0 space-y-12">
          <LastTwoWeeks sessions={sessions} courses={courses} />
          <HoursByCourse sessions={sessions} courses={courses} />
        </div>
      </div>
      <div className="mt-12 grid gap-x-12 gap-y-12 xl:grid-cols-2">
        <CourseProgress />
        <Achievements items={achievements({ sessions, tasks, courses, rooms, groups, userId })} />
      </div>
      <div className="mt-12">
        <YourData />
      </div>
    </div>
  );
}
