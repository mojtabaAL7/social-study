import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { COURSE_COLORS } from '../data';
import { courseCompletion, formatMinutes, totalMinutes } from '../utils';
import { CourseDetails, CourseForm, CourseList } from '../components/courses';
import { Header } from '../components/layout';
import { Button, Modal } from '../components/ui';

/**
 * Courses down the side, the one you picked beside them.
 * "/courses" opens the first course; "/courses/:courseId" opens that one.
 */
export default function Courses() {
  const { courseId } = useParams();
  const { courses, sessions, addCourse, loadSampleData } = useStudy();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const course = courseId ? courses.find((c) => c.id === courseId) : courses[0];
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
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          <CourseList courses={courses} activeId={course ? course.id : null} />
          {course ? (
            <CourseDetails key={course.id} course={course} />
          ) : (
            <div className="border-t-2 border-[color:var(--page-accent,#1B2A4A)] pt-4">
              <h2 className="text-lg">Course not found</h2>
              <p className="mt-1 text-pencil">This course may have been deleted. Pick another one from the list.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border-t border-rule py-10">
          <p className="max-w-prose text-pencil">No courses yet. Add one to start tracking chapters, topics, deadlines and study time.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setAdding(true)}>Add your first course</Button>
            <Button onClick={loadSampleData} variant="quiet">
              Load sample data
            </Button>
          </div>
        </div>
      )}

      <Modal open={adding} title="Add a course" onClose={() => setAdding(false)}>
        <CourseForm
          submitLabel="Add course"
          suggestedColor={COURSE_COLORS[courses.length % COURSE_COLORS.length]}
          onCancel={() => setAdding(false)}
          onSubmit={(newCourse) => {
            const id = addCourse(newCourse);
            setAdding(false);
            navigate(`/courses/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
