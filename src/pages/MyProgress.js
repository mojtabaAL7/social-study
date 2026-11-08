import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { achievements, courseCompletion, currentStreak, formatMinutes, longestStreak, totalMinutes } from '../utils';
import { CourseProgress } from '../components/dashboard';
import { Header } from '../components/layout';
import { StatStrip } from '../components/ui';
import { Achievements, CourseDistribution, StudyChart, StudyHeatmap } from '../components/progress';

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

  const stats = [
    { label: 'Studied in total', value: formatMinutes(totalMinutes(sessions)) },
    { label: 'Focus sessions', value: String(sessions.length) },
    { label: 'Current streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}` },
    { label: 'Longest streak', value: `${longest} ${longest === 1 ? 'day' : 'days'}` },
    { label: 'Tasks completed', value: String(tasks.filter((t) => t.done).length) },
    { label: 'Average course progress', value: `${average}%` },
  ];

  return (
    <div>
      <Header title="My Progress" icon="chart">
        Your calendar of deadlines, and how much you study, when, and on what.
      </Header>
      <StatStrip items={stats} />
      <div className="mt-10">
        <StudyHeatmap />
      </div>
      <div className="mt-12">
        <StudyChart sessions={sessions} />
      </div>
      <div className="mt-12 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <CourseDistribution sessions={sessions} courses={courses} />
        <CourseProgress />
        <div className="lg:col-span-2">
          <Achievements
            items={achievements({
              sessions,
              tasks,
              courses,
              rooms,
              groups,
              userId,
            })}
          />
        </div>
      </div>
    </div>
  );
}
