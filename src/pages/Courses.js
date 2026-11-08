import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { COURSE_COLORS } from '../data';
import { courseCompletion, formatMinutes, totalMinutes } from '../utils';
import { CourseCard, CourseDetails, CourseForm } from '../components/courses';
import { Header } from '../components/layout';
import { Button, Modal } from '../components/ui';

function CourseList() {
  const { courses, sessions, assignments, addCourse } = useStudy();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const average = courses.length ? Math.round(courses.reduce((n, c) => n + courseCompletion(c), 0) / courses.length) : 0;
  const tracked = totalMinutes(sessions.filter((s) => courses.some((c) => c.id === s.courseId)));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Header title="Courses" icon="book">
          {courses.length
            ? `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}, ${average}% complete on average, ${formatMinutes(tracked)} studied.`
            : 'Add the courses you are taking this term.'}
        </Header>
        <Button onClick={() => setAdding(true)} className="mb-8">
          Add course
        </Button>
      </div>
      {courses.length ? (
        <ul className="divide-y divide-rule/70 border-y-2 border-[color:var(--page-accent,#1B2A4A)]">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} sessions={sessions} assignments={assignments} />
          ))}
        </ul>
      ) : (
        <div className="border-t border-rule py-10">
          <p className="max-w-prose text-pencil">
            No courses yet. Add one to start tracking chapters, topics, deadlines and study time.
          </p>
          <Button onClick={() => setAdding(true)} variant="quiet" className="mt-4">
            Add your first course
          </Button>
        </div>
      )}
      <Modal open={adding} title="Add a course" onClose={() => setAdding(false)}>
        <CourseForm
          submitLabel="Add course"
          suggestedColor={COURSE_COLORS[courses.length % COURSE_COLORS.length]}
          onCancel={() => setAdding(false)}
          onSubmit={(course) => {
            const id = addCourse(course);
            setAdding(false);
            navigate(`/courses/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}

export default function Courses() {
  const { courseId } = useParams();
  const { courses } = useStudy();

  if (!courseId) return <CourseList />;

  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    return (
      <div>
        <Header title="Course not found">This course may have been deleted.</Header>
        <Button to="/courses" variant="quiet">
          Back to courses
        </Button>
      </div>
    );
  }
  return <CourseDetails course={course} />;
}
