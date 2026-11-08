import { CourseProgress, FriendsActivity, StudyOverview, TodayTasks, UpcomingDeadlines, WelcomeBanner } from '../components/dashboard';

/**
 * The dashboard reads like a planner page rather than a grid of boxes: today's tasks on an
 * index card, deadlines as a timeline, and the rest under planner-style divider rules.
 */
export default function Dashboard() {
  return (
    <div>
      <WelcomeBanner />
      <StudyOverview />
      {/* Same order on phones and in the two-column layout: tasks, deadlines, courses, friends. */}
      <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <TodayTasks />
        <UpcomingDeadlines />
        <CourseProgress />
        <FriendsActivity />
      </div>
    </div>
  );
}
